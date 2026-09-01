-- Fase 5: cualquier ciudad de Colombia (lista curada en `@/lib/site#CITIES`).
-- Se quita el default 'Barranquilla' de las tablas; la ciudad la elige el
-- usuario en el onboarding / perfil / publicar y viaja en el payload de las RPC.
-- `profiles.city` pasa a ser NULLABLE: el trigger `handle_new_user` crea la fila
-- sin ciudad y el onboarding la completa. `listings.city` sigue NOT NULL (la RPC
-- `create_listing` siempre la exige).

alter table public.profiles alter column city drop default;
alter table public.profiles alter column city drop not null;

alter table public.listings alter column city drop default;
