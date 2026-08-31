-- Solo para desarrollo: baja TODO lo que crearon las migraciones
--   20260830130000_catalog_collection_listings.sql
--   20260831000000_multi_collections.sql
-- para poder volver a correrlas desde cero.
--
-- ⚠️ Borra datos: cartas, colecciones, anuncios y sus fotos. No lo corras en
-- producción. Si NO puedes hacer reset, no lo uses: la migración
-- 20260831000000_multi_collections.sql es hacia adelante (ALTER) y no requiere
-- reset.
--
-- Uso: pega esto en el SQL Editor, ejecútalo, y luego re-ejecuta esas dos
-- migraciones en orden.

begin;

-- Storage: quitar objetos, políticas y bucket
delete from storage.objects where bucket_id = 'listing-photos';
drop policy if exists "listing-photos: subir en carpeta propia" on storage.objects;
drop policy if exists "listing-photos: actualizar propias"    on storage.objects;
drop policy if exists "listing-photos: borrar propias"         on storage.objects;
delete from storage.buckets where id = 'listing-photos';

-- Triggers y funciones
drop trigger if exists profiles_default_collection on public.profiles;
drop function if exists public.create_listing(jsonb);
drop function if exists public.get_collection_by_token(uuid);
drop function if exists public.get_public_collections(text);
drop function if exists public.create_default_collection() cascade;
drop function if exists public.reparent_collection_items() cascade;

-- Tablas (cascade se lleva políticas, triggers, índices y FKs)
drop table if exists public.listing_photos   cascade;
drop table if exists public.listings         cascade;
drop table if exists public.collection_items cascade;
drop table if exists public.collections      cascade;
drop table if exists public.cards            cascade;
drop table if exists public.sets             cascade;

-- Columnas antiguas de profiles (visibilidad ahora es por colección)
alter table public.profiles
  drop column if exists collection_public,
  drop column if exists collection_share_token;

commit;
