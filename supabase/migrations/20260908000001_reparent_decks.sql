-- Fase 5: al borrar un deck sus cartas se van con él (FK on delete cascade),
-- en vez de reparentarse a la colección por defecto como las carpetas.
-- Un archivo por función (editor SQL del dashboard).

create or replace function public.reparent_collection_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default uuid;
begin
  if old.kind = 'deck' then
    return old;
  end if;

  select id into v_default
  from public.collections
  where user_id = old.user_id and is_default
  limit 1;

  if v_default is not null then
    update public.collection_items
    set collection_id = v_default
    where collection_id = old.id;
  end if;

  return old;
end;
$$;

create or replace trigger collections_reparent_items
  before delete on public.collections
  for each row execute function public.reparent_collection_items();
