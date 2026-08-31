-- Fase 3 slice 1: matching busco / vendo por trigger AFTER INSERT on listings.
-- No toca create_listing (INSERT directo esta revocado, solo entra por la RPC).
--   offer con card_id -> avisa a quienes tienen un want activo de esa carta.
--   want con card_id  -> avisa al que publica si ya hay ofertas de esa carta.

create or replace function public.listings_match_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $listings_match_notify$
declare
  v_hits int;
begin
  if new.card_id is null or new.status <> 'active' then
    return new;
  end if;

  if new.kind = 'offer' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    select w.user_id, 'match_offer',
           'Publicaron una carta que buscas',
           new.card_name,
           '/anuncio/' || new.id::text,
           new.user_id
    from public.listings w
    where w.kind = 'want'
      and w.status = 'active'
      and w.card_id = new.card_id
      and w.user_id <> new.user_id;

  elsif new.kind = 'want' then
    select count(*) into v_hits
    from public.listings o
    where o.kind = 'offer'
      and o.status = 'active'
      and o.card_id = new.card_id
      and o.user_id <> new.user_id;

    if v_hits > 0 then
      insert into public.notifications (user_id, type, title, body, link)
      values (
        new.user_id, 'match_want_hint',
        'Ya hay anuncios de una carta que buscas',
        new.card_name || ' (' || v_hits || ' en venta o cambio)',
        '/explorar'
      );
    end if;
  end if;

  return new;
end;
$listings_match_notify$;

drop trigger if exists listings_match_notify_trg on public.listings;
create trigger listings_match_notify_trg
  after insert on public.listings
  for each row execute function public.listings_match_notify();
