-- Fase 2 · slice 1 (ajuste de flujo): un trato lleva cantidad y al confirmarse
-- descuenta esa cantidad del anuncio en vez de cerrarlo siempre.
--
-- Motivo: en "busco" la persona indica cuántas cartas quiere; quien responde no
-- podía decir cuántas trae. Y para venta/cambio pasa lo mismo: si el anuncio
-- tiene varias unidades, confirmar un trato lo cerraba entero y la carta
-- desaparecía de /explorar y de la home aunque quedara stock.
--
-- Ahora `deals.quantity` (>= 1) y el trigger AFTER UPDATE descuenta
-- `listings.quantity - deals.quantity` al pasar el trato a `confirmed`; sólo si
-- el remanente llega a 0 se marca `status = 'closed'` (nunca toca `removed`).
--
-- Reemplaza a `deals_close_listing` de 20260910000000. Idempotente, una función.

alter table public.deals
  add column if not exists quantity int not null default 1 check (quantity >= 1);

drop trigger if exists deals_close_listing_trg on public.deals;
drop function if exists public.deals_close_listing();

create or replace function public.deals_settle_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $deals_settle_listing$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    update public.listings
    set quantity = greatest(quantity - new.quantity, 0),
        status = case
          when greatest(quantity - new.quantity, 0) = 0 then 'closed'
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
