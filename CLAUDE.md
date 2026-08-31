@AGENTS.md

# TCG Barranquilla

Marketplace comunitario de cartas de Pokémon TCG para Barranquilla (Colombia):
vender / cambiar / marcar como "busco". La plataforma sólo conecta usuarios
(WhatsApp o en persona), no procesa pagos.

## Stack

- Next.js 16 (App Router, TS) + Tailwind v4 + shadcn/ui (base `radix-nova`)
- Supabase: Postgres + Auth + Storage + RLS
- pnpm. Deploy previsto en Vercel + Supabase Cloud.

## Convenciones

- **Next.js 16**: el antiguo `middleware` es `proxy` (`src/proxy.ts`, runtime Node).
  `cookies()` / `headers()` / `params` / `searchParams` son asíncronos (`await`).
- Tres clientes de Supabase según contexto:
  - `@/lib/supabase/client` → componentes `"use client"`
  - `@/lib/supabase/server` → Server Components / Actions / Route Handlers
  - `@/lib/supabase/proxy` → sólo `src/proxy.ts` (refresco de sesión)
- Mutaciones vía **Server Actions** en `@/lib/**/actions.ts` (`"use server"`),
  validando con **Zod** (`@/lib/validation`). Formularios con `useActionState`.
- UI y textos en **español**. Componentes shadcn en `src/components/ui` (no editar
  a mano salvo necesidad; re-generar con `pnpm dlx shadcn@latest add`).
- Rutas protegidas: prefijos en `PROTECTED_PREFIXES` (`@/lib/site`), aplicados en
  `src/proxy.ts`.

## Base de datos

- Migraciones SQL versionadas en `supabase/migrations/`. Tras cambiar el esquema,
  regenerar `src/types/database.ts` con `supabase gen types`.
- `profiles` (1:1 con `auth.users`): trigger `handle_new_user` crea la fila;
  `onboarding_completed` marca si pasó por `/bienvenido`. RLS activo; columnas
  `is_verified` / `rating_*` no son editables por el usuario (grants por columna).

## Fase 1 (en curso)

- **Colecciones** (dos niveles): `collections` (carpeta con `name`,
  `visibility` = `private` | `unlisted` | `public`, `share_token`, `is_default`)
  → `collection_items` (`collection_id` FK, sin precio/foto). Cada perfil recibe
  una colección "Mi colección" por defecto (trigger `profiles_default_collection`
  + backfill). Borrar una colección reparenta sus cartas a la de por defecto
  (trigger `collections_reparent_items`); la de por defecto no se puede borrar
  (RLS). `/c/[token]` (RPC `get_collection_by_token`, sólo unlisted/public) y
  `get_public_collections(username)` para el perfil. Páginas: `/coleccion` (lista),
  `/coleccion/[id]` (una), `/coleccion/agregar?c=<id>`.
- **Anuncios** (`listings`): `kind` = `offer` | `want`. Un `offer` lleva
  `for_sale` y/o `for_trade` (≥1 true); `want` los tiene en false y sin precio.
  Se insertan SÓLO por la RPC `create_listing(payload jsonb)` (SECURITY DEFINER)
  — `revoke insert` directo; la RPC exige ≥1 foto para todo `offer` y precio si
  `for_sale`. `source_collection_item_id` liga con la colección. Detalle en
  `/anuncio/[id]`. Etiqueta de UI vía `listingModeLabel()` ("Venta o cambio", …).
- **Fotos**: bucket `listing-photos` (público). Se suben desde el **cliente**
  (comprimidas a webp con `browser-image-compression`) a `{uid}/{grupo}/{i}.webp`;
  el path se pasa a `create_listing`. RLS de Storage: primera carpeta = `auth.uid()`.
- **Catálogo TCGdex** (`src/lib/tcgdex.ts`, `server-only`): usa el **SDK oficial
  `@tcgdex/sdk`** (`new TCGdex('es')` + `setEndpoint(...)`, singleton).
  `searchCards` baja la lista completa de cartas una vez (cache 6 h en memoria) y
  filtra en el servidor. `/api/cards/search` es la ruta.
  `src/lib/catalog.ts#resolveCard` cachea la carta + su set con la **secret key**
  (`src/lib/supabase/admin.ts`) al elegirla; si TCGdex falla, degrada a texto
  libre. Tablas `sets`/`cards` = lectura pública, escritura sólo service key.
- **`api.tcgdex.net` (nodo principal) no es alcanzable desde la red del usuario.**
  Se usa el mirror **`api.eu1.tcgdex.net/v2`** — es el default en el código.
  Override con `TCGDEX_ENDPOINT` en `.env.local` (p. ej. volver a
  `https://api.tcgdex.net/v2` cuando el principal se recupere). Las imágenes
  vienen siempre de `assets.tcgdex.net` (no hay mirror de assets).
- Tipos en `src/types/database.ts` a mano (regenerar con `supabase gen types`).

## Roadmap

- Fase 0 (hecha): scaffold, auth email + Google, `profiles` + RLS, onboarding, shell.
- Fase 1 slice 1 (hecha): catálogo + colección + publicar + detalle.
- Fase 1 slice 2 (hecha): `/explorar` (feed + filtros por URL: texto `ilike` sobre
  `card_name` con GIN trgm, modo venta/cambio/busco, idioma, estado, rango de
  precio, orden, paginación) y perfil público `/u/[username]` (anuncios activos +
  colecciones públicas vía RPC `get_public_collections`). Lógica en
  `src/lib/listings/query.ts` (server-only) + `src/lib/listings/explore.ts`
  (parámetros compartidos). Sin cambios de esquema.
- Fase 1 slice 3 (hecha): `/panel` = "Mis anuncios" (activos/pausados/cerrados)
  con acciones sobre anuncios propios — `setListingStatus` (activo↔reservado↔
  cerrado), `bumpListing` (sube `bumped_at`, sólo activos, cooldown 6 h),
  `removeListing` (borrado suave → `status='removed'`) en
  `src/lib/listings/actions.ts`; edición en `/panel/[id]/editar` (`updateListing`,
  `useActionState`) de los campos mutables. Componentes: `listing-manage-row`,
  `edit-listing-form`.
- Fase 1 slice 4 (hecha — cierra Fase 1): `/perfil` (editar display_name, bio,
  ciudad, WhatsApp, show_whatsapp vía `src/lib/profile/actions.ts#updateProfile`
  con grants por columna; el `username` no se cambia). Menú móvil (`mobile-nav.tsx`
  en el header, `sm:hidden`). Home con "Últimos anuncios". Edición de fotos de un
  anuncio publicado: RPC `replace_listing_photos(uuid, text[])` (migración
  `20260901000000`, SECURITY DEFINER — `listing_photos` tiene `revoke insert`) +
  `saveListingPhotos` + `listing-photo-manager.tsx` en `/panel/[id]/editar`;
  helper de subida compartido en `src/lib/listings/photo-upload.ts`.
- Fase 1 pendiente (menor): reordenar fotos; avatar para usuarios de email;
  búsqueda tolerante a typos (ranking `similarity`).
- Fase 2 slice 1 (hecha): `deals` — la otra parte registra un trato desde el
  anuncio (`create_deal`), el vendedor lo confirma (`confirm_deal`); con ambas
  confirmaciones queda `confirmed` (habilita reseñas). `cancel_deal` mientras
  esté `pending`. Tabla `deals` (RLS: sólo las dos partes leen; escritura sólo
  por las 3 RPCs SECURITY DEFINER) — migración `20260902000000_deals.sql`, no
  toca `listings`. UI: `StartDeal` en `/anuncio/[id]`, `/panel/tratos` con
  `DealRow`. Lógica en `src/lib/deals/{actions,query}.ts`.
- Fase 2 slice 2 (hecha): `reviews` — cada parte de un `deal` `confirmed` deja
  una reseña (1–5 + comentario) de la otra. INSERT/UPDATE/DELETE por RLS (el
  `with check` valida que el trato esté confirmado y que `reviewee_id` sea la
  contraparte); SELECT público. Trigger `reviews_rating_sync` recalcula
  `profiles.rating_avg`/`rating_count` (SECURITY DEFINER, columnas con grant).
  Migración `20260903000000_reviews.sql`. UI: `ReviewForm` en `DealRow`
  (`/panel/tratos`), sección "Reseñas" + estrellas en `/u/[username]`.
  Lógica en `src/lib/reviews/{actions,query}.ts`, componente `reviews/stars.tsx`.
- Fase 2 slice 3 (hecha — cierra Fase 2): `reports` — usuario con sesión reporta
  un anuncio o un perfil (motivo enum + detalle). RLS: crea el propio, ve sólo
  los propios; sin update/delete (moderación manual desde Supabase). Constraint
  de forma (`target_type` ↔ columna) + índice único parcial (un reporte abierto
  por reportante/objetivo). Migración `20260904000000_reports.sql`. UI:
  `ReportDialog` en `/anuncio/[id]` y `/u/[username]`. `src/lib/reports/actions.ts`
  + `src/lib/reports.ts` (motivos).
- Fase 3 slice 1 (hecha): notificaciones in-app + matching busco↔vendo. Tabla
  `notifications` (sólo lectura + `read_at` para el dueño; se crean server-side).
  Triggers `deals_notify` (trato nuevo / confirmado / cancelado) y `reviews_notify`
  (reseña nueva). `create_listing` redefinida: al publicar un `offer` con
  `card_id` notifica a quienes tienen un `want` activo de esa carta (y al revés,
  un aviso al que publica el `want` si ya hay ofertas). Migración
  `20260905000000_notifications.sql`. UI: campana en el header (`NotificationBell`)
  + `/notificaciones` (`NotificationList`). `src/lib/notifications/{actions,query}.ts`,
  `timeAgo()` en `src/lib/utils.ts`.
- Fase 3 slice 2 (pendiente): email con Resend (opt-in `profiles.email_notifications`;
  enviar desde las server actions en paralelo al trigger in-app).
- Fase 4: SEO, PWA, términos + Habeas Data, analítica, lanzamiento.
