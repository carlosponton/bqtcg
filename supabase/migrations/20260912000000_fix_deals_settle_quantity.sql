-- Hotfix de 20260911000000: al confirmar un trato, el trigger
-- `deals_settle_listing` hacía
--   listings.quantity = greatest(quantity - deals.quantity, 0)
-- Con un anuncio de cantidad 1 (el caso normal — incluye todos los "busco") y
-- un trato de cantidad 1, eso daba quantity = 0, que viola
-- `listings_quantity_check` (between 1 and 999) y aborta `confirm_deal`. Nadie
-- podía confirmar un trato ni ver el WhatsApp de la otra persona.
--
-- Ahora la cantidad nunca baja de 1; si el remanente llega a 0 (o menos) sólo
-- se marca `status = 'closed'`. No hace falta arreglar datos: la constraint
-- impidió que se guardaran filas con quantity = 0.

create or replace function public.deals_settle_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $deals_settle_listing$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
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
