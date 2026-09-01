-- deals_settle_listing ahora se dispara al CERRAR el trato (completed), no al
-- confirmarlo. Mientras el trato está en curso el anuncio sigue visible.
-- Incluye el piso en 1 de 20260912000000 (poner quantity 0 violaba
-- listings_quantity_check y abortaba la operación).
-- Un archivo por función; sin comentarios dentro del cuerpo plpgsql.

create or replace function public.deals_settle_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $deals_settle_listing$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.listings
    set quantity = greatest(quantity - new.quantity, 1),
        status = case
          when quantity - new.quantity <= 0 then 'closed'
          else status
        end
    where id = new.listing_id
      and status in ('active', 'reserved');
  end if;
  return new;
end;
$deals_settle_listing$;

drop trigger if exists deals_settle_listing_trg on public.deals;
create trigger deals_settle_listing_trg
  after update on public.deals
  for each row execute function public.deals_settle_listing();
