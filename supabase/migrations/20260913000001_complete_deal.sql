-- complete_deal(): cualquiera de las dos partes cierra el trato una vez que
-- está EN CURSO (confirmed). Habilita reseñas y dispara `deals_settle_listing`.
-- Un archivo por función; sin comentarios dentro del cuerpo plpgsql.

create or replace function public.complete_deal(p_deal_id uuid)
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
  if d.status <> 'confirmed' then
    raise exception 'El trato todavía no está en curso' using errcode = '22023';
  end if;

  update public.deals set
    status = 'completed',
    completed_at = now(),
    completed_by = v_uid
  where id = p_deal_id and status = 'confirmed';
end;
$$;

grant execute on function public.complete_deal(uuid) to authenticated;
