-- Fase 1: permitir cambiar las fotos de un anuncio ya publicado.
--
-- `listing_photos` tiene `revoke insert` (sólo se llenaba vía `create_listing`).
-- Esta RPC SECURITY DEFINER reemplaza el set completo de fotos de un anuncio
-- propio, validando el dueño y la regla "un offer necesita >= 1 foto".
-- Migración hacia adelante: sólo crea una función. Idempotente.

create or replace function public.replace_listing_photos(
  p_listing_id uuid,
  p_paths text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_kind text;
  v_n int := coalesce(array_length(p_paths, 1), 0);
  v_path text;
  v_i int := 0;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select user_id, kind into v_owner, v_kind
  from public.listings
  where id = p_listing_id;

  if v_owner is null then
    raise exception 'Anuncio no encontrado' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_kind = 'offer' and v_n = 0 then
    raise exception 'Un anuncio de venta o cambio necesita al menos una foto.'
      using errcode = '23514';
  end if;
  if v_n > 6 then
    raise exception 'Máximo 6 fotos por anuncio.' using errcode = '23514';
  end if;

  delete from public.listing_photos where listing_id = p_listing_id;

  foreach v_path in array coalesce(p_paths, '{}'::text[]) loop
    if length(trim(v_path)) > 0 then
      insert into public.listing_photos (listing_id, storage_path, sort_order)
      values (p_listing_id, v_path, v_i);
      v_i := v_i + 1;
    end if;
  end loop;
end;
$$;

grant execute on function public.replace_listing_photos(uuid, text[])
  to authenticated;
