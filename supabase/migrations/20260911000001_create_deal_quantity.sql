-- Fase 2 · slice 1 (ajuste de flujo): create_deal() recibe la cantidad del trato.
--
-- Cambia la firma (uuid) -> (uuid, int default 1), así que se dropea la anterior
-- primero. La cantidad se acota a [1, cantidad del anuncio]. Un archivo por
-- función; sin comentarios dentro del cuerpo plpgsql a propósito.

drop function if exists public.create_deal(uuid);

create or replace function public.create_deal(
  p_listing_id uuid,
  p_quantity int default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_seller uuid;
  v_status text;
  v_listing_qty int;
  v_qty int;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select user_id, status, quantity
    into v_seller, v_status, v_listing_qty
  from public.listings where id = p_listing_id;

  if v_seller is null or v_status = 'removed' then
    raise exception 'Anuncio no disponible' using errcode = 'P0002';
  end if;
  if v_seller = v_uid then
    raise exception 'No puedes registrar un trato con tu propio anuncio'
      using errcode = '42501';
  end if;

  v_qty := least(
    greatest(coalesce(p_quantity, 1), 1),
    greatest(coalesce(v_listing_qty, 1), 1)
  );

  insert into public.deals (
    listing_id, seller_id, buyer_id, buyer_confirmed, quantity
  )
  values (p_listing_id, v_seller, v_uid, true, v_qty)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya tienes un trato registrado para este anuncio'
      using errcode = '23505';
end;
$$;

grant execute on function public.create_deal(uuid, int) to authenticated;
