-- Fase 3 slice 2: preferencia de notificaciones por correo.
-- Por defecto true. El usuario la cambia desde /perfil (grant por columna).

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

grant update (email_notifications) on public.profiles to authenticated;
