-- Un anuncio puede estar en varios idiomas (la carta existe en ES y EN, por
-- ejemplo) o en "cualquier idioma". Antes había un solo `listings.language` y
-- la gente publicaba el mismo anuncio dos veces.
--
-- `listings.languages text[]`:
--   - array vacío `{}`  -> "cualquier idioma" (sin restricción).
--   - array con valores -> los idiomas concretos.
--
-- `collection_items.language` NO cambia (una carta que tienes es de un idioma).
--
-- Correr esta migración y luego 20260914000001 (nueva create_listing) seguidas:
-- entre una y otra, publicar da error unos segundos.

alter table public.listings
  add column if not exists languages text[] not null default '{}';

-- El idioma único pasa a ser un array de un elemento.
update public.listings
set languages = array[language]
where cardinality(languages) = 0 and language is not null and language <> '';

alter table public.listings drop column if exists language;
