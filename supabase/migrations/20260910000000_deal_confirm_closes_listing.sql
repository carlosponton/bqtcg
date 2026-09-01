-- Fase 2 · slice 1 (ajuste de flujo): al confirmarse un trato, se cierra el
-- anuncio de origen.
--
-- Antes el vendedor tenía que cerrar el anuncio a mano; si no lo hacía, la
-- carta seguía apareciendo en "Últimos anuncios", en /explorar y en el perfil
-- público aunque el intercambio ya se hubiera concretado. Ahora un trigger
-- AFTER UPDATE pone `status = 'closed'` cuando el trato pasa a `confirmed`
-- (nunca toca los `removed`). El vendedor puede reactivarlo desde /panel.
--
-- Migración idempotente: una sola función + su trigger. No toca `listings`
-- ni las RPCs de deals.

create or replace function public.deals_close_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $deals_close_listing$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    update public.listings
    set status = 'closed'
    where id = new.listing_id
      and status in ('active', 'reserved');
  end if;
  return new;
end;
$deals_close_listing$;

drop trigger if exists deals_close_listing_trg on public.deals;
create trigger deals_close_listing_trg
  after update on public.deals
  for each row execute function public.deals_close_listing();
