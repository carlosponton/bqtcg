-- Fase 4 slice 2: registrar la aceptación de Términos + Política de Datos.
-- Se sella en el onboarding. Grant por columna para poder actualizarla.

alter table public.profiles
  add column if not exists tos_accepted_at timestamptz;

grant update (tos_accepted_at) on public.profiles to authenticated;
