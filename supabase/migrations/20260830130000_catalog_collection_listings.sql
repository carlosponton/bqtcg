-- Fase 1 · slice 1: catálogo (TCGdex), colección y anuncios.
--
-- Escrita para poder re-ejecutarse sin error. OJO: `create table if not exists`
-- NO agrega columnas nuevas a una tabla que ya existía. Si ya corriste esta
-- migración y el esquema cambió, primero ejecuta
-- `supabase/dev/reset_catalog_collection_listings.sql` y luego esta.

create extension if not exists pg_trgm with schema extensions;

-------------------------------------------------------------------------------
-- Catálogo TCGdex (solo lectura pública; se escribe con la service key)
-------------------------------------------------------------------------------
create table if not exists public.sets (
  id text primary key,                     -- id de TCGdex, ej. "sv08"
  name text not null,                       -- nombre en español
  serie_id text,
  serie_name text,
  logo_url text,
  symbol_url text,
  card_count_official integer,
  card_count_total integer,
  release_date date,
  synced_at timestamptz not null default now()
);

create table if not exists public.cards (
  id text primary key,                     -- id de TCGdex, ej. "sv08-125"
  name text not null,                      -- nombre en español
  set_id text references public.sets (id),
  local_id text,                           -- número dentro del set, ej. "125"
  rarity text,
  category text,                           -- Pokémon / Trainer / Energy
  types text[],
  image_small text,
  image_large text,
  synced_at timestamptz not null default now()
);
create index if not exists cards_set_id_idx on public.cards (set_id);

alter table public.sets enable row level security;
alter table public.cards enable row level security;

drop policy if exists "Sets visibles para todos" on public.sets;
create policy "Sets visibles para todos"
  on public.sets for select using (true);

drop policy if exists "Cards visibles para todos" on public.cards;
create policy "Cards visibles para todos"
  on public.cards for select using (true);

-------------------------------------------------------------------------------
-- profiles: visibilidad de la colección
-- (reemplazado por colecciones múltiples en 20260831000000_multi_collections.sql)
-------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists collection_public boolean not null default false,
  add column if not exists collection_share_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_collection_share_token_key
  on public.profiles (collection_share_token);

grant update (collection_public) on public.profiles to authenticated;

-------------------------------------------------------------------------------
-- Colección: cartas que el usuario tiene (sin precio, sin foto)
-------------------------------------------------------------------------------
create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text references public.cards (id),        -- null => carta de texto libre
  custom_card_name text,
  card_name text not null,                          -- nombre resuelto (catálogo o libre)
  set_name text,
  image_url text,
  language text not null default 'es',
  condition text,
  quantity integer not null default 1 check (quantity between 1 and 999),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_item_card_ref
    check (card_id is not null or custom_card_name is not null)
);
create index if not exists collection_items_user_idx
  on public.collection_items (user_id, created_at desc);
create index if not exists collection_items_card_idx
  on public.collection_items (card_id);
create index if not exists collection_items_name_trgm
  on public.collection_items using gin (card_name gin_trgm_ops);

create or replace trigger collection_items_set_updated_at
  before update on public.collection_items
  for each row execute function public.set_updated_at();

alter table public.collection_items enable row level security;

drop policy if exists "Ver colección propia o pública" on public.collection_items;
create policy "Ver colección propia o pública"
  on public.collection_items for select
  using (
    user_id = (select auth.uid())
    or (select collection_public from public.profiles where id = user_id)
  );

drop policy if exists "Insertar en la colección propia" on public.collection_items;
create policy "Insertar en la colección propia"
  on public.collection_items for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Editar la colección propia" on public.collection_items;
create policy "Editar la colección propia"
  on public.collection_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Borrar de la colección propia" on public.collection_items;
create policy "Borrar de la colección propia"
  on public.collection_items for delete to authenticated
  using (user_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- Anuncios: "ofrezco una carta" (la vendo y/o la cambio) o "busco una carta".
-------------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('offer', 'want')),
  for_sale boolean not null default false,
  for_trade boolean not null default false,
  source_collection_item_id uuid
    references public.collection_items (id) on delete set null,

  card_id text references public.cards (id),
  custom_card_name text,
  card_name text not null,
  set_name text,
  image_url text,

  language text not null default 'es',
  condition text,
  quantity integer not null default 1 check (quantity between 1 and 999),

  price_cop integer check (price_cop is null or price_cop >= 0),
  price_negotiable boolean not null default false,
  trade_for text check (trade_for is null or char_length(trade_for) <= 500),

  description text check (description is null or char_length(description) <= 1000),
  city text not null default 'Barranquilla',

  status text not null default 'active'
    check (status in ('active', 'reserved', 'closed', 'removed')),
  bumped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listing_card_ref
    check (card_id is not null or custom_card_name is not null),
  -- Un "offer" debe venderse, cambiarse o ambas.
  constraint listing_offer_mode
    check (kind <> 'offer' or for_sale or for_trade),
  -- Un "want" no vende ni cambia ni lleva precio.
  constraint listing_want_clean
    check (
      kind <> 'want'
      or (for_sale = false and for_trade = false and price_cop is null)
    ),
  -- Si se vende, tiene que haber precio.
  constraint listing_sale_price
    check (for_sale = false or price_cop is not null)
);
create index if not exists listings_status_bumped_idx
  on public.listings (status, bumped_at desc);
create index if not exists listings_user_idx
  on public.listings (user_id, created_at desc);
create index if not exists listings_kind_idx on public.listings (kind);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_offer_flags_idx
  on public.listings (for_sale, for_trade) where kind = 'offer';
create index if not exists listings_card_idx on public.listings (card_id);
create index if not exists listings_source_item_idx
  on public.listings (source_collection_item_id);
create index if not exists listings_name_trgm
  on public.listings using gin (card_name gin_trgm_ops);

create or replace trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;

drop policy if exists "Anuncios visibles (no removidos) o propios" on public.listings;
create policy "Anuncios visibles (no removidos) o propios"
  on public.listings for select
  using (status <> 'removed' or user_id = (select auth.uid()));

drop policy if exists "Editar anuncios propios" on public.listings;
create policy "Editar anuncios propios"
  on public.listings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Borrar anuncios propios" on public.listings;
create policy "Borrar anuncios propios"
  on public.listings for delete to authenticated
  using (user_id = (select auth.uid()));

-- La inserción se hace SOLO por la función create_listing() (para poder exigir
-- la foto en los "offer"). No damos INSERT directo.
revoke insert on public.listings from anon, authenticated;

-------------------------------------------------------------------------------
-- Fotos de anuncios (path dentro del bucket 'listing-photos')
-------------------------------------------------------------------------------
create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_photos_listing_idx
  on public.listing_photos (listing_id, sort_order);

alter table public.listing_photos enable row level security;

drop policy if exists "Fotos visibles si el anuncio es visible" on public.listing_photos;
create policy "Fotos visibles si el anuncio es visible"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status <> 'removed' or l.user_id = (select auth.uid()))
    )
  );

drop policy if exists "Editar fotos de anuncios propios" on public.listing_photos;
create policy "Editar fotos de anuncios propios"
  on public.listing_photos for update to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.user_id = (select auth.uid()))
  );

drop policy if exists "Borrar fotos de anuncios propios" on public.listing_photos;
create policy "Borrar fotos de anuncios propios"
  on public.listing_photos for delete to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.user_id = (select auth.uid()))
  );

revoke insert on public.listing_photos from anon, authenticated;

-------------------------------------------------------------------------------
-- create_listing(): inserta anuncio + fotos en una sola transacción y exige
-- al menos una foto para los "offer". SECURITY DEFINER: valida el dueño a mano.
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
  v_id uuid;
  v_path text;
  v_i int := 0;
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
    nullif(payload ->> 'card_id', ''),
    nullif(payload ->> 'custom_card_name', ''),
    payload ->> 'card_name',
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

  return v_id;
end;
$$;

grant execute on function public.create_listing(jsonb) to authenticated;

-------------------------------------------------------------------------------
-- get_collection_by_token(): colección compartible por enlace secreto.
-- (Reescrita para colecciones múltiples en 20260831000000_multi_collections.sql)
-------------------------------------------------------------------------------
create or replace function public.get_collection_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.id is null then null else jsonb_build_object(
    'owner', jsonb_build_object(
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'city', p.city
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ci.id,
        'card_name', ci.card_name,
        'set_name', ci.set_name,
        'image_url', ci.image_url,
        'language', ci.language,
        'condition', ci.condition,
        'quantity', ci.quantity,
        'note', ci.note
      ) order by ci.created_at desc)
      from public.collection_items ci
      where ci.user_id = p.id
    ), '[]'::jsonb)
  ) end
  from public.profiles p
  where p.collection_share_token = p_token;
$$;

grant execute on function public.get_collection_by_token(uuid) to anon, authenticated;

-------------------------------------------------------------------------------
-- Storage: bucket público para fotos de anuncios
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos', 'listing-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "listing-photos: subir en carpeta propia" on storage.objects;
create policy "listing-photos: subir en carpeta propia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "listing-photos: actualizar propias" on storage.objects;
create policy "listing-photos: actualizar propias"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "listing-photos: borrar propias" on storage.objects;
create policy "listing-photos: borrar propias"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
