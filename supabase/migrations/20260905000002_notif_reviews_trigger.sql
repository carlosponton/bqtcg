-- Fase 3 slice 1: trigger de notificaciones sobre reviews.
-- Resena nueva -> aviso al resenado (texto con acentos abajo).

create or replace function public.reviews_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $reviews_notify$
declare
  v_username text;
begin
  select username into v_username
  from public.profiles where id = new.reviewee_id;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    new.reviewee_id, 'review_new',
    'Te dejaron una reseña',
    'Ábrela en tu perfil',
    coalesce('/u/' || v_username, '/panel/tratos'),
    new.reviewer_id
  );
  return new;
end;
$reviews_notify$;

drop trigger if exists reviews_notify_trg on public.reviews;
create trigger reviews_notify_trg
  after insert on public.reviews
  for each row execute function public.reviews_notify();
