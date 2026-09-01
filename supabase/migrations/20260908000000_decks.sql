-- Fase 5: decks. Un "deck" es una colección con kind='deck' + carta de portada.
-- Se puede publicar como anuncio (listings.format = 'deck'); al publicar se
-- guarda una copia congelada de sus cartas en listing_deck_cards.
--
-- Migración HACIA ADELANTE: sólo ALTER + CREATE ... IF NOT EXISTS. Idempotente.
-- Las funciones plpgsql van en archivos aparte (20260908000001, 20260908000002)
-- para no romper el editor SQL del dashboard.

-------------------------------------------------------------------------------
-- 1. collections: tipo de carpeta + portada del deck
-------------------------------------------------------------------------------
alter table public.collections
  add column if not exists kind text not null default 'folder'
    check (kind in ('folder', 'deck')),
  add column if not exists cover_card_id text references public.cards (id),
  add column if not exists cover_card_name text,
  add column if not exists cover_image_url text;

create index if not exists collections_kind_idx
  on public.collections (user_id, kind);

-------------------------------------------------------------------------------
-- 2. listings: formato ('single' | 'deck') + enlace a la colección-deck origen
-------------------------------------------------------------------------------
alter table public.listings
  add column if not exists format text not null default 'single'
    check (format in ('single', 'deck')),
  add column if not exists source_collection_id uuid
    references public.collections (id) on delete set null;

-- Un deck siempre es "offer" (no tiene sentido "busco deck").
alter table public.listings drop constraint if exists listing_deck_offer;
alter table public.listings add constraint listing_deck_offer
  check (format = 'single' or kind = 'offer');

create index if not exists listings_format_idx on public.listings (format);
create index if not exists listings_source_collection_idx
  on public.listings (source_collection_id);

-------------------------------------------------------------------------------
-- 3. listing_deck_cards: copia congelada de las cartas del deck al publicar
--    (análoga a listing_photos; se llena SÓLO por la RPC create_listing)
-------------------------------------------------------------------------------
create table if not exists public.listing_deck_cards (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  card_id text references public.cards (id),
  card_name text not null,
  set_name text,
  image_url text,
  quantity integer not null default 1 check (quantity between 1 and 999),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_deck_cards_listing_idx
  on public.listing_deck_cards (listing_id, sort_order);

alter table public.listing_deck_cards enable row level security;

drop policy if exists "Cartas del deck visibles si el anuncio es visible"
  on public.listing_deck_cards;
create policy "Cartas del deck visibles si el anuncio es visible"
  on public.listing_deck_cards for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status <> 'removed' or l.user_id = (select auth.uid()))
    )
  );

revoke insert, update, delete on public.listing_deck_cards
  from anon, authenticated;

-------------------------------------------------------------------------------
-- 4. get_collection_by_token: exponer kind + portada para rotular un deck
--    (language sql, una sola sentencia: seguro en este archivo)
-------------------------------------------------------------------------------
create or replace function public.get_collection_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when c.id is null then null else jsonb_build_object(
    'collection', jsonb_build_object(
      'name', c.name,
      'description', c.description,
      'visibility', c.visibility,
      'kind', c.kind,
      'cover_image_url', c.cover_image_url
    ),
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
      where ci.collection_id = c.id
    ), '[]'::jsonb)
  ) end
  from public.collections c
  join public.profiles p on p.id = c.user_id
  where c.share_token = p_token and c.visibility <> 'private';
$$;

grant execute on function public.get_collection_by_token(uuid) to anon, authenticated;

-------------------------------------------------------------------------------
-- 5. get_public_collections: sólo carpetas en el perfil público (los decks
--    aparecen como anuncios cuando se publican).
-------------------------------------------------------------------------------
create or replace function public.get_public_collections(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by ord, nm), '[]'::jsonb)
  from (
    select
      c.sort_order as ord,
      c.name as nm,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'description', c.description,
        'share_token', c.share_token,
        'item_count', (
          select count(*) from public.collection_items ci
          where ci.collection_id = c.id
        )
      ) as x
    from public.collections c
    join public.profiles p on p.id = c.user_id
    where p.username = p_username
      and c.visibility = 'public'
      and c.kind = 'folder'
  ) sub;
$$;

grant execute on function public.get_public_collections(text) to anon, authenticated;
