-- deals_notify: avisos acordes a los 3 pasos.
--   INSERT      -> al dueño: registraron un trato.
--   confirmed   -> a ambos: trato aceptado, ya pueden coordinar por WhatsApp.
--   completed   -> a ambos: trato cerrado, ya pueden dejar su reseña.
--   cancelled   -> a la contraparte.
-- Un archivo por función; sin comentarios dentro del cuerpo plpgsql.

create or replace function public.deals_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $deals_notify$
declare
  v_card text;
begin
  select card_name into v_card
  from public.listings
  where id = coalesce(new.listing_id, old.listing_id);
  v_card := coalesce(v_card, 'Una carta');

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      new.seller_id, 'deal_new',
      'Registraron un trato contigo',
      v_card || ' - acéptalo si es correcto',
      '/panel/tratos', new.buyer_id
    );
    return new;
  end if;

  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into public.notifications (user_id, type, title, body, link)
    select uid, 'deal_confirmed',
           'Trato aceptado',
           v_card || ' - ya pueden coordinar por WhatsApp',
           '/panel/tratos'
    from unnest(array[new.seller_id, new.buyer_id]) as uid;
  elsif new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.notifications (user_id, type, title, body, link)
    select uid, 'deal_completed',
           'Trato cerrado',
           v_card || ' - ya puedes dejar tu reseña',
           '/panel/tratos'
    from unnest(array[new.seller_id, new.buyer_id]) as uid;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      case when new.cancelled_by = new.seller_id
           then new.buyer_id else new.seller_id end,
      'deal_cancelled',
      'Cancelaron un trato',
      v_card,
      '/panel/tratos',
      new.cancelled_by
    );
  end if;
  return new;
end;
$deals_notify$;

drop trigger if exists deals_notify_trg on public.deals;
create trigger deals_notify_trg
  after insert or update on public.deals
  for each row execute function public.deals_notify();
