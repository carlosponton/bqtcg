-- Fase 2 · slice 3: reportes de anuncios y usuarios.
--
-- Un usuario con sesión reporta un anuncio o un perfil. Sólo ve sus propios
-- reportes; la moderación se hace por ahora desde el panel de Supabase.
-- Migración hacia adelante: tabla + policies + índices. Idempotente.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user')),
  target_listing_id uuid references public.listings (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete cascade,
  reason text not null
    check (reason in ('scam', 'fake', 'inappropriate', 'spam', 'other')),
  detail text check (detail is null or char_length(detail) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_target_shape check (
    (target_type = 'listing'
      and target_listing_id is not null and target_user_id is null)
    or (target_type = 'user'
      and target_user_id is not null and target_listing_id is null)
  ),
  constraint reports_not_self check (
    target_user_id is null or target_user_id <> reporter_id
  )
);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);
create index if not exists reports_listing_idx
  on public.reports (target_listing_id) where target_listing_id is not null;
create index if not exists reports_user_idx
  on public.reports (target_user_id) where target_user_id is not null;
-- Un solo reporte abierto por (reportante, objetivo).
create unique index if not exists reports_one_open
  on public.reports (
    reporter_id, target_type, coalesce(target_listing_id, target_user_id)
  ) where status = 'open';

alter table public.reports enable row level security;

drop policy if exists "Ver mis reportes" on public.reports;
create policy "Ver mis reportes"
  on public.reports for select
  using (reporter_id = (select auth.uid()));

drop policy if exists "Crear reporte propio" on public.reports;
create policy "Crear reporte propio"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- Sin update/delete para usuarios: la moderación es manual por ahora.
revoke update, delete on public.reports from anon, authenticated;
