-- Fase 3 slice 1: tabla notifications (avisos in-app).
-- Se llenan solo desde el servidor (triggers / rpc). El usuario lee las suyas
-- y marca read_at. Correr en orden: 20260905000000 -> 000001 -> 000002 -> 000003.

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

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
