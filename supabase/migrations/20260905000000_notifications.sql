-- Fase 3 · slice 1: notificaciones in-app + matching busco <-> vendo.
--
-- Tabla `notifications` (una fila = un aviso para un usuario). Se llenan SÓLO
-- desde el servidor: triggers en `deals` y `reviews`, y dentro de la RPC
-- `create_listing` (matching). El usuario sólo lee las suyas y marca `read_at`.
-- Migración hacia adelante. Idempotente.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  actor_id uuid references auth.users (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Ver mis notificaciones" on public.notifications;
create policy "Ver mis notificaciones"
  on public.notifications for select
  using (user_id = (select auth.uid()));

drop policy if exists "Marcar mis notificaciones" on public.notifications;
create policy "Marcar mis notificaciones"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Borrar mis notificaciones" on public.notifications;
create policy "Borrar mis notificaciones"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- El usuario sólo puede tocar `read_at`; la creación es sólo server-side.
revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-------------------------------------------------------------------------------
-- Triggers de `deals`
-------------------------------------------------------------------------------
create or replace function public.deals_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card text;
begin
  select card_name into v_card
  from public.listings
  where id = coalesce(new.listing_id, old.listing_id);
  v_card := coalesce(v_card, 'Una carta');

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      new.seller_id, 'deal_new',
      'Registraron un trato contigo',
      v_card || ' — confírmalo si es correcto',
      '/panel/tratos', new.buyer_id
    );
    return new;
  end if;

  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into public.notifications (user_id, type, title, body, link)
    select uid, 'deal_confirmed',
           'Trato confirmado',
           v_card || ' — ya puedes dejar tu reseña',
           '/panel/tratos'
    from unnest(array[new.seller_id, new.buyer_id]) as uid;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      case when new.cancelled_by = new.seller_id
           then new.buyer_id else new.seller_id end,
      'deal_cancelled',
      'Cancelaron un trato',
      v_card,
      '/panel/tratos',
      new.cancelled_by
    );
  end if;
  return new;
end;
$$;

create or replace trigger deals_notify_trg
  after insert or update on public.deals
  for each row execute function public.deals_notify();

-------------------------------------------------------------------------------
-- Trigger de `reviews`
-------------------------------------------------------------------------------
create or replace function public.reviews_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  select username into v_username
  from public.profiles where id = new.reviewee_id;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    new.reviewee_id, 'review_new',
    'Te dejaron una reseña',
    'Ábrela en tu perfil',
    coalesce('/u/' || v_username, '/panel/tratos'),
    new.reviewer_id
  );
  return new;
end;
$$;

create or replace trigger reviews_notify_trg
  after insert on public.reviews
  for each row execute function public.reviews_notify();

-------------------------------------------------------------------------------
-- create_listing(): + matching busco <-> vendo por `card_id` exacto.
-- (Redefinición de la función de 20260830130000; añade el bloque final.)
-------------------------------------------------------------------------------
create or replace function public.create_listing(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_kind text := payload ->> 'kind';
  v_src uuid := nullif(payload ->> 'source_collection_item_id', '')::uuid;
  v_paths text[] := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(payload -> 'photo_paths')),
    '{}'::text[]
  );
  v_is_want boolean := (v_kind = 'want');
  v_for_sale boolean := (not v_is_want) and coalesce((payload ->> 'for_sale')::boolean, false);
  v_for_trade boolean := (not v_is_want) and coalesce((payload ->> 'for_trade')::boolean, false);
  v_card_id text := nullif(payload ->> 'card_id', '');
  v_card_name text := payload ->> 'card_name';
  v_id uuid;
  v_path text;
  v_i int := 0;
  v_hits int;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if v_kind not in ('offer', 'want') then
    raise exception 'Tipo de anuncio no válido' using errcode = '22023';
  end if;

  if v_kind = 'offer' and not (v_for_sale or v_for_trade) then
    raise exception 'Marca si la vendes, la cambias, o ambas.' using errcode = '23514';
  end if;

  if v_kind = 'offer' and coalesce(array_length(v_paths, 1), 0) = 0 then
    raise exception 'Este anuncio necesita al menos una foto real de la carta.'
      using errcode = '23514';
  end if;

  if v_src is not null and not exists (
    select 1 from public.collection_items
    where id = v_src and user_id = v_uid
  ) then
    raise exception 'Ítem de colección no válido' using errcode = '42501';
  end if;

  if v_is_want then
    v_paths := '{}'::text[];
  end if;

  insert into public.listings (
    user_id, kind, for_sale, for_trade, source_collection_item_id,
    card_id, custom_card_name, card_name, set_name, image_url,
    language, condition, quantity,
    price_cop, price_negotiable, trade_for, description, city
  )
  values (
    v_uid, v_kind, v_for_sale, v_for_trade, v_src,
    v_card_id,
    nullif(payload ->> 'custom_card_name', ''),
    v_card_name,
    nullif(payload ->> 'set_name', ''),
    nullif(payload ->> 'image_url', ''),
    coalesce(nullif(payload ->> 'language', ''), 'es'),
    nullif(payload ->> 'condition', ''),
    coalesce((payload ->> 'quantity')::int, 1),
    case when v_for_sale then (payload ->> 'price_cop')::int else null end,
    v_for_sale and coalesce((payload ->> 'price_negotiable')::boolean, false),
    case when v_for_trade then nullif(payload ->> 'trade_for', '') else null end,
    nullif(payload ->> 'description', ''),
    coalesce(nullif(payload ->> 'city', ''), 'Barranquilla')
  )
  returning id into v_id;

  foreach v_path in array v_paths loop
    insert into public.listing_photos (listing_id, storage_path, sort_order)
    values (v_id, v_path, v_i);
    v_i := v_i + 1;
  end loop;

  -- Matching busco <-> vendo (sólo catálogo, por card_id exacto).
  if v_card_id is not null then
    if not v_is_want then
      insert into public.notifications (user_id, type, title, body, link, actor_id)
      select w.user_id, 'match_offer',
             'Publicaron una carta que buscas',
             v_card_name,
             '/anuncio/' || v_id::text,
             v_uid
      from public.listings w
      where w.kind = 'want'
        and w.status = 'active'
        and w.card_id = v_card_id
        and w.user_id <> v_uid;
    else
      select count(*) into v_hits
      from public.listings o
      where o.kind = 'offer'
        and o.status = 'active'
        and o.card_id = v_card_id
        and o.user_id <> v_uid;

      if v_hits > 0 then
        insert into public.notifications (user_id, type, title, body, link)
        values (
          v_uid, 'match_want_hint',
          'Ya hay anuncios de una carta que buscas',
          v_card_name || ' · ' || v_hits || ' en venta o cambio',
          '/explorar'
        );
      end if;
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_listing(jsonb) to authenticated;
