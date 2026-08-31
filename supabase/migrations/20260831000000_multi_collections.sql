-- Fase 1: colecciones múltiples (carpetas con visibilidad propia).
--
-- Migración HACIA ADELANTE: no recrea tablas, sólo ALTER + backfill. Idempotente
-- (se puede re-ejecutar). Aplica sobre una BD que ya tiene
-- 20260830130000_catalog_collection_listings.sql (versión anterior).

-------------------------------------------------------------------------------
-- 1. Tabla `collections`
-------------------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  share_token uuid not null default gen_random_uuid() unique,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_user_idx
  on public.collections (user_id, sort_order, created_at);
create unique index if not exists collections_one_default
  on public.collections (user_id) where is_default;

create or replace trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.collections enable row level security;

drop policy if exists "Ver colecciones propias o públicas" on public.collections;
create policy "Ver colecciones propias o públicas"
  on public.collections for select
  using (user_id = (select auth.uid()) or visibility = 'public');

drop policy if exists "Crear colección propia" on public.collections;
create policy "Crear colección propia"
  on public.collections for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Editar colección propia" on public.collections;
create policy "Editar colección propia"
  on public.collections for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Borrar colección propia (no la de por defecto)"
  on public.collections;
create policy "Borrar colección propia (no la de por defecto)"
  on public.collections for delete to authenticated
  using (user_id = (select auth.uid()) and not is_default);

-------------------------------------------------------------------------------
-- 2. Triggers de colecciones
-------------------------------------------------------------------------------
create or replace function public.reparent_collection_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default uuid;
begin
  select id into v_default
  from public.collections
  where user_id = old.user_id and is_default
  limit 1;

  if v_default is not null then
    update public.collection_items
    set collection_id = v_default
    where collection_id = old.id;
  end if;

  return old;
end;
$$;

create or replace trigger collections_reparent_items
  before delete on public.collections
  for each row execute function public.reparent_collection_items();

create or replace function public.create_default_collection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.collections where user_id = new.id
  ) then
    insert into public.collections (user_id, name, is_default, visibility)
    values (new.id, 'Mi colección', true, 'private');
  end if;
  return new;
end;
$$;

create or replace trigger profiles_default_collection
  after insert on public.profiles
  for each row execute function public.create_default_collection();

-------------------------------------------------------------------------------
-- 3. Backfill: colección "Mi colección" por usuario, arrastrando la visibilidad
--    y el enlace que estaban en `profiles`.
-------------------------------------------------------------------------------
insert into public.collections (user_id, name, is_default, visibility)
select u.id, 'Mi colección', true, 'private'
from auth.users u
where not exists (
  select 1 from public.collections c where c.user_id = u.id
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'collection_share_token'
  ) then
    update public.collections c
    set
      visibility = case
        when coalesce(p.collection_public, false) then 'public'
        else c.visibility
      end,
      share_token = coalesce(p.collection_share_token, c.share_token)
    from public.profiles p
    where p.id = c.user_id and c.is_default;
  end if;
end
$$;

-------------------------------------------------------------------------------
-- 4. `collection_items.collection_id`
-------------------------------------------------------------------------------
alter table public.collection_items
  add column if not exists collection_id uuid
    references public.collections (id) on delete cascade;

update public.collection_items ci
set collection_id = c.id
from public.collections c
where c.user_id = ci.user_id
  and c.is_default
  and ci.collection_id is null;

alter table public.collection_items
  alter column collection_id set not null;

create index if not exists collection_items_collection_idx
  on public.collection_items (collection_id, created_at desc);

-------------------------------------------------------------------------------
-- 5. Políticas de `collection_items` (la visibilidad ahora es por colección)
-------------------------------------------------------------------------------
drop policy if exists "Ver colección propia o pública" on public.collection_items;
create policy "Ver colección propia o pública"
  on public.collection_items for select
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.visibility = 'public'
    )
  );

drop policy if exists "Insertar en la colección propia" on public.collection_items;
create policy "Insertar en la colección propia"
  on public.collection_items for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editar la colección propia" on public.collection_items;
create policy "Editar la colección propia"
  on public.collection_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Borrar de la colección propia" on public.collection_items;
create policy "Borrar de la colección propia"
  on public.collection_items for delete to authenticated
  using (user_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- 6. RPCs
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
      'visibility', c.visibility
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
    where p.username = p_username and c.visibility = 'public'
  ) sub;
$$;

grant execute on function public.get_public_collections(text) to anon, authenticated;

-------------------------------------------------------------------------------
-- 7. Quitar la visibilidad vieja de `profiles`
-------------------------------------------------------------------------------
alter table public.profiles
  drop column if exists collection_public,
  drop column if exists collection_share_token;
