-- Fase 5: complete_onboarding() sin el fallback 'Barranquilla'. La ciudad la
-- valida el cliente (Zod, `z.enum(CITIES)`); aquí sólo se normaliza.
-- Un archivo por función (editor SQL del dashboard).

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
    nullif(trim(payload ->> 'city'), ''),
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
