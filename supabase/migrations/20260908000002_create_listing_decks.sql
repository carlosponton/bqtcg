-- Fase 5: create_listing() aprende a publicar un deck.
--   payload.format = 'deck' + payload.source_collection_id = <colección kind='deck'>
--   -> el anuncio toma nombre/portada del deck y se copia una foto congelada de
--      sus cartas en listing_deck_cards.
-- Un archivo por función (editor SQL del dashboard). Sin comentarios dentro del
-- cuerpo plpgsql a propósito.

create or replace function public.create_listing(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_kind text := payload ->> 'kind';
  v_format text := coalesce(nullif(payload ->> 'format', ''), 'single');
  v_src uuid := nullif(payload ->> 'source_collection_item_id', '')::uuid;
  v_src_coll uuid := nullif(payload ->> 'source_collection_id', '')::uuid;
  v_paths text[] := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(payload -> 'photo_paths')),
    '{}'::text[]
  );
  v_is_want boolean := (v_kind = 'want');
  v_for_sale boolean := (not v_is_want) and coalesce((payload ->> 'for_sale')::boolean, false);
  v_for_trade boolean := (not v_is_want) and coalesce((payload ->> 'for_trade')::boolean, false);
  v_deck public.collections%rowtype;
  v_deck_count int := 0;
  v_card_id text := nullif(payload ->> 'card_id', '');
  v_custom_name text := nullif(payload ->> 'custom_card_name', '');
  v_card_name text := payload ->> 'card_name';
  v_set_name text := nullif(payload ->> 'set_name', '');
  v_image_url text := nullif(payload ->> 'image_url', '');
  v_id uuid;
  v_path text;
  v_i int := 0;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if v_kind not in ('offer', 'want') then
    raise exception 'Tipo de anuncio no válido' using errcode = '22023';
  end if;

  if v_format not in ('single', 'deck') then
    raise exception 'Formato de anuncio no válido' using errcode = '22023';
  end if;

  if v_format = 'deck' then
    if v_kind <> 'offer' then
      raise exception 'Un deck sólo se puede ofrecer.' using errcode = '23514';
    end if;

    select * into v_deck
    from public.collections
    where id = v_src_coll and user_id = v_uid and kind = 'deck';

    if v_deck.id is null then
      raise exception 'Deck no válido' using errcode = '42501';
    end if;

    select count(*) into v_deck_count
    from public.collection_items
    where collection_id = v_deck.id;

    if v_deck_count = 0 then
      raise exception 'El deck no tiene cartas.' using errcode = '23514';
    end if;

    v_card_id := null;
    v_custom_name := v_deck.name;
    v_card_name := v_deck.name;
    v_set_name := null;
    v_image_url := v_deck.cover_image_url;
  else
    v_src_coll := null;
  end if;

  if v_kind = 'offer' and not (v_for_sale or v_for_trade) then
    raise exception 'Marca si la vendes, la cambias, o ambas.' using errcode = '23514';
  end if;

  if v_kind = 'offer' and coalesce(array_length(v_paths, 1), 0) = 0 then
    raise exception 'Este anuncio necesita al menos una foto real de la carta.'
      using errcode = '23514';
  end if;

  if v_src is not null and not exists (
    select 1 from public.collection_items
    where id = v_src and user_id = v_uid
  ) then
    raise exception 'Ítem de colección no válido' using errcode = '42501';
  end if;

  if v_is_want then
    v_paths := '{}'::text[];
  end if;

  insert into public.listings (
    user_id, kind, format, for_sale, for_trade,
    source_collection_item_id, source_collection_id,
    card_id, custom_card_name, card_name, set_name, image_url,
    language, condition, quantity,
    price_cop, price_negotiable, trade_for, description, city
  )
  values (
    v_uid, v_kind, v_format, v_for_sale, v_for_trade,
    v_src, v_src_coll,
    v_card_id,
    v_custom_name,
    v_card_name,
    v_set_name,
    v_image_url,
    coalesce(nullif(payload ->> 'language', ''), 'es'),
    nullif(payload ->> 'condition', ''),
    coalesce((payload ->> 'quantity')::int, 1),
    case when v_for_sale then (payload ->> 'price_cop')::int else null end,
    v_for_sale and coalesce((payload ->> 'price_negotiable')::boolean, false),
    case when v_for_trade then nullif(payload ->> 'trade_for', '') else null end,
    nullif(payload ->> 'description', ''),
    coalesce(nullif(payload ->> 'city', ''), 'Barranquilla')
  )
  returning id into v_id;

  foreach v_path in array v_paths loop
    insert into public.listing_photos (listing_id, storage_path, sort_order)
    values (v_id, v_path, v_i);
    v_i := v_i + 1;
  end loop;

  if v_format = 'deck' then
    insert into public.listing_deck_cards (
      listing_id, card_id, card_name, set_name, image_url, quantity, sort_order
    )
    select
      v_id, ci.card_id, ci.card_name, ci.set_name, ci.image_url, ci.quantity,
      (row_number() over (order by ci.created_at)) - 1
    from public.collection_items ci
    where ci.collection_id = v_deck.id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_listing(jsonb) to authenticated;
