-- Fase 2 · slice 1: tratos (deals) + confirmación por ambas partes.
--
-- Un "trato" registra que dos usuarios concretaron una transacción a partir de
-- un anuncio. Lo abre la OTRA parte (comprador/interesado); el vendedor (dueño
-- del anuncio) lo confirma. Con ambas confirmaciones queda `confirmed` — y eso
-- es lo que habilitará las reseñas (slice 2).
--
-- Migración hacia adelante: crea una tabla y 3 RPCs. Idempotente. No toca
-- `listings` (el vendedor cierra su anuncio a mano si ya no le quedan).

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  seller_confirmed boolean not null default false,
  buyer_confirmed boolean not null default false,
  buyer_note text check (buyer_note is null or char_length(buyer_note) <= 500),
  cancelled_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_distinct_parties check (seller_id <> buyer_id)
);

create index if not exists deals_seller_idx
  on public.deals (seller_id, created_at desc);
create index if not exists deals_buyer_idx
  on public.deals (buyer_id, created_at desc);
create index if not exists deals_listing_idx on public.deals (listing_id);
-- Un solo trato "vivo" por (anuncio, comprador).
create unique index if not exists deals_one_active_per_buyer
  on public.deals (listing_id, buyer_id) where status <> 'cancelled';

create or replace trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

alter table public.deals enable row level security;

drop policy if exists "Ver tratos propios" on public.deals;
create policy "Ver tratos propios"
  on public.deals for select
  using (seller_id = (select auth.uid()) or buyer_id = (select auth.uid()));

-- Toda escritura pasa por las RPCs de abajo.
revoke insert, update, delete on public.deals from anon, authenticated;

-------------------------------------------------------------------------------
-- create_deal(): el interesado registra el trato, ya con su confirmación.
-------------------------------------------------------------------------------
create or replace function public.create_deal(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_seller uuid;
  v_status text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select user_id, status into v_seller, v_status
  from public.listings where id = p_listing_id;

  if v_seller is null or v_status = 'removed' then
    raise exception 'Anuncio no disponible' using errcode = 'P0002';
  end if;
  if v_seller = v_uid then
    raise exception 'No puedes registrar un trato con tu propio anuncio'
      using errcode = '42501';
  end if;

  insert into public.deals (listing_id, seller_id, buyer_id, buyer_confirmed)
  values (p_listing_id, v_seller, v_uid, true)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya tienes un trato registrado para este anuncio'
      using errcode = '23505';
end;
$$;

grant execute on function public.create_deal(uuid) to authenticated;

-------------------------------------------------------------------------------
-- confirm_deal(): cada parte marca su confirmación; con ambas -> confirmed.
-------------------------------------------------------------------------------
create or replace function public.confirm_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.deals;
begin
  select * into d from public.deals where id = p_deal_id;
  if d.id is null then
    raise exception 'Trato no encontrado' using errcode = 'P0002';
  end if;
  if v_uid <> d.seller_id and v_uid <> d.buyer_id then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if d.status <> 'pending' then
    raise exception 'El trato ya no está pendiente' using errcode = '22023';
  end if;

  update public.deals set
    seller_confirmed = seller_confirmed or (v_uid = seller_id),
    buyer_confirmed  = buyer_confirmed  or (v_uid = buyer_id)
  where id = p_deal_id;

  update public.deals set
    status = 'confirmed',
    confirmed_at = now()
  where id = p_deal_id
    and seller_confirmed and buyer_confirmed
    and status = 'pending';
end;
$$;

grant execute on function public.confirm_deal(uuid) to authenticated;

-------------------------------------------------------------------------------
-- cancel_deal(): cualquiera de las dos partes, sólo mientras esté pendiente.
-------------------------------------------------------------------------------
create or replace function public.cancel_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.deals;
begin
  select * into d from public.deals where id = p_deal_id;
  if d.id is null then
    raise exception 'Trato no encontrado' using errcode = 'P0002';
  end if;
  if v_uid <> d.seller_id and v_uid <> d.buyer_id then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if d.status <> 'pending' then
    raise exception 'Sólo se puede cancelar un trato pendiente'
      using errcode = '22023';
  end if;

  update public.deals set status = 'cancelled', cancelled_by = v_uid
  where id = p_deal_id;
end;
$$;

grant execute on function public.cancel_deal(uuid) to authenticated;
