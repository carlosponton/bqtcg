-- Perfiles públicos de usuario para el marketplace de Pokémon TCG de Barranquilla.
-- Fase 0. Escrito para poder re-ejecutarse sin error.

-------------------------------------------------------------------------------
-- Tabla
-------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  whatsapp text,
  show_whatsapp boolean not null default true,
  city text not null default 'Barranquilla',
  is_verified boolean not null default false,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_whatsapp_format
    check (whatsapp is null or whatsapp ~ '^\+?[0-9]{7,15}$'),
  constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 300)
);

comment on table public.profiles is
  'Perfil público, relación 1:1 con auth.users.';

-- Se usaba "zona" (sector de Barranquilla); ahora es "city".
alter table public.profiles drop column if exists zona;

-------------------------------------------------------------------------------
-- updated_at automático
-------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- Crear el perfil automáticamente cuando se registra un usuario
-------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill: crea el perfil de usuarios que ya existían antes de esta tabla
-- (p. ej. si se recreó `profiles` durante el desarrollo).
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-------------------------------------------------------------------------------
-- Row Level Security
-------------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Perfiles visibles para todos" on public.profiles;
create policy "Perfiles visibles para todos"
  on public.profiles
  for select
  using (true);

drop policy if exists "Cada quien inserta su propio perfil" on public.profiles;
create policy "Cada quien inserta su propio perfil"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Cada quien edita su propio perfil" on public.profiles;
create policy "Cada quien edita su propio perfil"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-------------------------------------------------------------------------------
-- Columnas que el usuario NO puede tocar (verificación y reputación).
-- Se administran desde el servidor con la service_role o con triggers propios.
-------------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;

grant update (
  username,
  display_name,
  avatar_url,
  bio,
  whatsapp,
  show_whatsapp,
  city,
  onboarding_completed
) on public.profiles to authenticated;

-------------------------------------------------------------------------------
-- Índices
-------------------------------------------------------------------------------
create index if not exists profiles_city_idx on public.profiles (city);

-------------------------------------------------------------------------------
-- complete_onboarding(): guarda el perfil del onboarding sin depender de los
-- grants por columna ni de que exista la fila. SECURITY DEFINER: valida el
-- dueño a mano y sólo escribe columnas seguras.
-------------------------------------------------------------------------------
create or replace function public.complete_onboarding(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_username text := lower(trim(payload ->> 'username'));
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Nombre de usuario no válido' using errcode = '22023';
  end if;

  insert into public.profiles (
    id, username, display_name, city, whatsapp, show_whatsapp, onboarding_completed
  )
  values (
    v_uid,
    v_username,
    nullif(trim(payload ->> 'display_name'), ''),
    coalesce(nullif(trim(payload ->> 'city'), ''), 'Barranquilla'),
    nullif(trim(payload ->> 'whatsapp'), ''),
    coalesce((payload ->> 'show_whatsapp')::boolean, true),
    true
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    city = excluded.city,
    whatsapp = excluded.whatsapp,
    show_whatsapp = excluded.show_whatsapp,
    onboarding_completed = true;
end;
$$;

grant execute on function public.complete_onboarding(jsonb) to authenticated;
