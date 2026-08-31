-- Fase 2 · slice 2: reseñas + reputación.
--
-- Cada parte de un trato `confirmed` puede dejar UNA reseña (1–5 + comentario)
-- de la otra. Un trigger recalcula `profiles.rating_avg` / `rating_count` del
-- reseñado (esas columnas no son editables por el usuario: grants por columna).
--
-- Migración hacia adelante: tabla + policies + funciones + trigger. Idempotente.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewee_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_distinct_parties check (reviewer_id <> reviewee_id)
);

create unique index if not exists reviews_one_per_reviewer
  on public.reviews (deal_id, reviewer_id);
create index if not exists reviews_reviewee_idx
  on public.reviews (reviewee_id, created_at desc);

create or replace trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "Reseñas visibles para todos" on public.reviews;
create policy "Reseñas visibles para todos"
  on public.reviews for select using (true);

-- Crear: sólo el reseñador, sobre un trato CONFIRMADO en el que participa, y el
-- reseñado tiene que ser la contraparte de ese trato.
drop policy if exists "Crear reseña de un trato confirmado" on public.reviews;
create policy "Crear reseña de un trato confirmado"
  on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.deals d
      where d.id = deal_id
        and d.status = 'confirmed'
        and (select auth.uid()) in (d.seller_id, d.buyer_id)
        and reviews.reviewee_id = case
          when d.seller_id = (select auth.uid()) then d.buyer_id
          else d.seller_id
        end
    )
  );

drop policy if exists "Editar la reseña propia" on public.reviews;
create policy "Editar la reseña propia"
  on public.reviews for update to authenticated
  using (reviewer_id = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()));

drop policy if exists "Borrar la reseña propia" on public.reviews;
create policy "Borrar la reseña propia"
  on public.reviews for delete to authenticated
  using (reviewer_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- Reputación: recalcular el promedio del reseñado.
-------------------------------------------------------------------------------
create or replace function public.recalc_profile_rating(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set rating_count = sub.cnt,
      rating_avg = coalesce(sub.avg, 0)
  from (
    select count(*)::int as cnt,
           round(avg(rating)::numeric, 2) as avg
    from public.reviews
    where reviewee_id = p_user
  ) sub
  where p.id = p_user;
end;
$$;

create or replace function public.reviews_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_profile_rating(old.reviewee_id);
    return old;
  end if;

  perform public.recalc_profile_rating(new.reviewee_id);
  if tg_op = 'UPDATE' and new.reviewee_id <> old.reviewee_id then
    perform public.recalc_profile_rating(old.reviewee_id);
  end if;
  return new;
end;
$$;

create or replace trigger reviews_rating_sync
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_sync_rating();
