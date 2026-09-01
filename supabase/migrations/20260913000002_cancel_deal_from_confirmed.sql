-- cancel_deal(): ahora se puede cancelar desde `pending` o `confirmed` (si
-- coordinaron pero el trato se cayó). No desde `completed`.
-- Un archivo por función; sin comentarios dentro del cuerpo plpgsql.

create or replace function public.cancel_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.deals;
begin
  select * into d from public.deals where id = p_deal_id;
  if d.id is null then
    raise exception 'Trato no encontrado' using errcode = 'P0002';
  end if;
  if v_uid <> d.seller_id and v_uid <> d.buyer_id then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if d.status not in ('pending', 'confirmed') then
    raise exception 'Este trato ya no se puede cancelar' using errcode = '22023';
  end if;

  update public.deals set status = 'cancelled', cancelled_by = v_uid
  where id = p_deal_id;
end;
$$;

grant execute on function public.cancel_deal(uuid) to authenticated;
