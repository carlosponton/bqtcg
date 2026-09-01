@AGENTS.md

# El Cambista TCG

Marketplace comunitario de cartas de Pokémon TCG para Colombia:
vender / cambiar / marcar como "busco". La plataforma sólo conecta usuarios
(WhatsApp o en persona), no procesa pagos. Dominio: `elcambistatcg.com`.
(Antes se llamaba "TCG Barranquilla" y arrancó solo en esa ciudad; el rebrand
vive en `feat/rediseño-el-cambista`.)

## Stack

- Next.js 16 (App Router, TS) + Tailwind v4 + shadcn/ui (base `radix-nova`)
- Supabase: Postgres + Auth + Storage + RLS
- pnpm. Deploy previsto en Vercel + Supabase Cloud.

## Marca y diseño

- Nombre en `SITE_NAME` (`@/lib/site`) — no hardcodear "El Cambista TCG".
- Paleta "papel cálido" en `src/app/globals.css` (`:root` claro + `.dark` cálido,
  hex, no OKLCH): fondo `#fff8f0`, `--primary` rojo `#e63946`, token extra
  `--gold` `#f4a935` (`bg-gold` / `text-gold`). `--radius` 0.5rem.
- Fuente: `Plus_Jakarta_Sans` (`--font-sans`) vía `next/font/google` en el layout.
- Logo (isotipo globo + carta): `@/components/brand/logo` (`Logo`, `LogoMark`);
  ilustración del hero: `@/components/brand/trade-cart` (`TradeCart`, SVG con
  `var(--...)`, decorativa). `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx`
  usan el isotipo (SVG plano, sin degradado, para Satori).

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
  **`listings.languages text[]`** (migraciones `20260914000000..001`): varios
  idiomas o "cualquier idioma" (sentinela `["any"]`, `ANY_LANGUAGE` en
  `@/lib/listings`) — antes era un solo `language` y la gente duplicaba el
  anuncio. `LanguageMultiPicker` (checkboxes nativos `name="languages"` +
  `name="any_language"`) en publicar y editar; `languagesLabel()` en las
  tarjetas y el detalle. Filtro `?idioma=` de `/explorar`: un `want`/`offer` en
  ese idioma **o** `{any}` (`languages.cs.{X},languages.cs.{any}` en
  `listings/query.ts`). `collection_items.language` sigue siendo un solo idioma.
- **Fotos**: bucket `listing-photos` (público). Se comprimen a webp en el
  navegador (`browser-image-compression`) y se suben por el route handler
  **`/api/listings/photos`** (`POST` multipart → `{path}`, `DELETE` `{paths}`).
  El handler autentica al usuario con la cookie de sesión y hace la subida real
  con la **secret key** (`createAdminClient`, ignora RLS) forzando el prefijo
  `{uid}/` en el path — la subida directa navegador → Storage daba
  `403 new row violates row-level security policy`. El path (`{uid}/{grupo}/{i}.webp`)
  se pasa a `create_listing`. Helper `src/lib/listings/photo-upload.ts`
  (`uploadListingPhotos` / `removeStoragePhotos`).
- **Catálogo TCGdex** (`src/lib/tcgdex.ts`, `server-only`): usa el **SDK oficial
  `@tcgdex/sdk`** (`new TCGdex('es')` + `setEndpoint(...)`, singleton).
  `searchCards` baja la lista completa de cartas una vez (cache 6 h en memoria) y
  filtra en el servidor. `/api/cards/search` es la ruta. Se **excluyen** las
  series de `EXCLUDED_SERIE_IDS` (`tcgp` = Pokémon TCG Pocket): `getExcludedSetIds`
  baja los sets de esas series (cache 6 h; reserva por regex `POCKET_ID_RE`) y
  `getAllCards` los filtra por prefijo de `card.id`. El emparejamiento usa
  `normalize()` (minúsculas, sin acentos, signos → espacio) en ambos lados, así
  "Mega Starmie ex" encuentra "Mega-Starmie ex".
  `src/lib/catalog.ts#resolveCard` cachea la carta + su set con la **secret key**
  (`src/lib/supabase/admin.ts`) al elegirla; si TCGdex falla, degrada a texto
  libre. En modo "a mano" el `CardPicker` (con `userId`) deja subir una imagen
  opcional que va a `image_url` vía `resolveCard` (`safeImageUrl` exige https).
  Tablas `sets`/`cards` = lectura pública, escritura sólo service key.
- **`api.tcgdex.net` (nodo principal) no es alcanzable desde la red del usuario.**
  Se usa el mirror **`api.eu1.tcgdex.net/v2`** — es el default en el código.
  Override con `TCGDEX_ENDPOINT` en `.env.local` (p. ej. volver a
  `https://api.tcgdex.net/v2` cuando el principal se recupere). Las imágenes
  vienen siempre de `assets.tcgdex.net` (no hay mirror de assets).
- **Precio de referencia (TCGplayer)**: TCGdex reexpone precios en
  `variants_detailed[].pricing.tcgplayer` (sub-objeto por acabado). El SDK no
  los tipa pero `tcgdex.fetch("cards", id)` devuelve el JSON crudo.
  `getCardPriceUsd()` (`src/lib/tcgdex.ts`) junta los acabados y elige uno
  (`normal` → `holofoil` → `reverse-holofoil` → primero); `getUsdToCop()`
  (`src/lib/fx.ts`, open.er-api.com sin key, cache 12 h, respaldo
  `FX_COP_PER_USD`) convierte. Ruta `GET /api/cards/price?id=` → `{ available,
  cop:{market,min,max}, finish, updatedAt }`. `PriceHint` lo pinta bajo el
  campo de precio en `PublishForm` (sólo `offer` + `for_sale` + carta del
  catálogo; `CardPicker` avisa con `onSelect`). Es orientativo (mercado
  internacional), nunca precio sugerido; no se guarda en `listings`.
- **Escaneo de carta con la cámara** (todo gratis, sin servidor de OCR): botón
  "Escanear con la cámara" en `CardPicker` (modo catálogo, no `locked`).
  Vía normal — **`CardLiveCapture`** (`src/components/cards/`): cámara en vivo
  (`getUserMedia`, `facingMode: environment`, se pide `2560×1440` ideal) en un
  visor con `aspect-ratio` de carta (2.5:3.5) + `object-fit: cover` y una guía
  dibujada; el usuario encaja la carta y toca "Capturar". La captura usa
  `ImageCapture.takePhoto()` a resolución de sensor cuando existe
  (Chrome/Android) y encaja con el encuadre del preview; si no, el frame del
  `<video>`. `frameToCardCanvas()` recorta con el mismo `object-fit: cover`
  que la vista → lo que se veía en la guía es lo que se lee, sin ajustes a
  mano. Respaldo — **`CardAlignCrop`**: si `getUserMedia` falla o el usuario
  elige "subir foto", toma una foto (`<input capture>`, resolución nativa del
  teléfono) y arrastra/redimensiona un recuadro con la proporción de carta.
  Ambas vías producen un canvas de proporción de carta a la resolución nativa
  del recorte (hasta 2400 px de ancho — a baja resolución el OCR no leía el
  número) que alimenta `scanCard()`.
  `src/lib/ocr/scan-card.ts` corre **Tesseract.js** en el navegador (`import()`
  dinámico, ~4 MB desde su CDN, sólo al usar el escáner), **dos pasadas por
  zona** sobre ese recorte ya alineado (recortadas de nuevo y ampliadas):
  `NAME_REGION` (banda superior, `PSM.SINGLE_BLOCK`) para el nombre y
  `BOTTOM_REGION` (inferior izquierda, `PSM.SPARSE_TEXT`) para número `N/T`,
  total y sigla S&V; `parseCardText(nameText, bottomText)` los separa. Los
  campos son editables; `GET /api/cards/scan?name=&number=&total=&code=` llama
  a `matchScannedCard()` (`src/lib/tcgdex.ts`): **ponderación, sin filtro
  duro** — cada carta del catálogo cacheado suma por número
  exacto/dígitos/1-error (`digitsClose`), total oficial del set
  (`getSetsMap`, cache 6 h), sigla (`SV_SET_CODES`) y nombre
  (exacto/prefijo/substring/tokens/`trigramSim`). Así, si el OCR leyó mal un
  campo, los otros dos igual sacan la carta al tope. Siempre muestra
  candidatas para confirmar; nunca elige solo. La foto no se sube a ningún
  lado. `pnpm-workspace.yaml` marca `tesseract.js` como `allowBuilds: false`
  (su postinstall es sólo un aviso de donación).
- Tipos en `src/types/database.ts` a mano (regenerar con `supabase gen types`).

## Roadmap

- Fase 0 (hecha): scaffold, auth email + Google, `profiles` + RLS, onboarding, shell.
- Fase 1 slice 1 (hecha): catálogo + colección + publicar + detalle.
- Fase 1 slice 2 (hecha): `/explorar` (feed + filtros por URL: texto `ilike` sobre
  `card_name` con GIN trgm, modo venta/cambio/busco, ciudad (`?ciudad=`, `.eq`
  contra `CITIES` de `@/lib/site`), idioma, estado, rango de precio, orden,
  paginación) y perfil público `/u/[username]` (anuncios activos +
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
- Fase 2 slice 1 (hecha): `deals` — **flujo de 3 pasos** (migraciones
  `20260913000000..004`, sobre `20260902000000_deals.sql`):
  1. `pending` — la otra parte propone el trato (`create_deal`).
  2. `confirmed` = **EN CURSO** — el dueño lo acepta (`confirm_deal`, ambas
     confirmaciones). Ya se ven el **WhatsApp del otro** para coordinar la
     entrega; el anuncio sigue visible.
  3. `completed` = **CERRADO** — cualquiera de los dos lo cierra
     (`complete_deal`, un solo click). Recién ahí se habilitan las reseñas y el
     trigger `deals_settle_listing` descuenta `listings.quantity -= deals.quantity`
     (**piso en 1** — poner 0 violaba `listings_quantity_check`; si el remanente
     llega a 0 marca `status='closed'`, nunca toca `removed`).
  `cancel_deal` desde `pending` o `confirmed`. `deals.quantity` (≥1, en
  `create_deal(uuid, int)`, acotada a la cantidad del anuncio); el picker sale en
  `StartDeal` si `listingQuantity > 1`, `DealRow` muestra `×N`. `deals_notify`
  avisa en cada paso; `deals.completed_at` / `completed_by` nuevos.
  El **WhatsApp del otro se revela con el trato en `confirmed` o `completed`**
  (no basta con tener sesión): `/anuncio/[id]` mira `myDeal.status`,
  `/u/[username]` y `DealRow` usan `hasActiveDealWith` / el `whatsapp` que trae
  `listMyDeals` (`src/lib/deals/query.ts`, sólo para esos estados). RLS: escritura
  sólo por las 4 RPCs SECURITY DEFINER. UI: `StartDeal` en `/anuncio/[id]`,
  `/panel/tratos` con `DealRow`. Lógica en `src/lib/deals/{actions,query}.ts`.
- Fase 2 slice 2 (hecha): `reviews` — cada parte de un `deal` `completed` deja
  una reseña (1–5 + comentario) de la otra. INSERT/UPDATE/DELETE por RLS (el
  `with check` valida que el trato esté cerrado y que `reviewee_id` sea la
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
  Triggers: `deals_notify` (trato nuevo/confirmado/cancelado), `reviews_notify`
  (reseña nueva), `listings_match_notify` (AFTER INSERT on `listings`: un `offer`
  con `card_id` avisa a quienes tienen un `want` activo de esa carta; un `want`
  avisa al que publica si ya hay ofertas). NO se toca `create_listing`.
  Migraciones **`20260905000000`..`000003`** (4 archivos, uno por función — el
  editor SQL del dashboard de Supabase rompe scripts con varias funciones y con
  comentarios `--` dentro de cuerpos plpgsql; correrlos en orden). UI: campana en
  el header (`NotificationBell`) + `/notificaciones` (`NotificationList`).
  `src/lib/notifications/{actions,query}.ts`, `timeAgo()` en `src/lib/utils.ts`.
- Fase 3 slice 2 (hecha — cierra Fase 3): email con Resend. `profiles.
  email_notifications` (bool, default true, grant por columna; toggle en `/perfil`)
  — migración `20260906000000_email_pref.sql`. `src/lib/email/send.ts` (POST a
  api.resend.com; no-op si falta `RESEND_API_KEY`) + `src/lib/email/notify.ts`
  (`emailUser(userId, content)`: admin client lee email + pref, arma HTML,
  best-effort, nunca lanza). Se dispara con `after()` desde las server actions:
  `startDeal`→vendedor, `confirmDeal`/`cancelDeal`→contraparte, `submitReview`→
  reseñado, `createListing`(offer con card_id)→quienes buscan esa carta. Env
  nuevas: `RESEND_API_KEY`, `EMAIL_FROM` (vacías = sin correo, in-app sigue).
  El `Content` de `notify.ts` acepta `imageUrl`/`imageAlt` opcionales (sólo
  https) y `renderHtml` mete un `<img>` de la carta; los 4 call sites pasan
  `listings.image_url` (o `resolved.image_url` en `createListing`). El `<img>`
  del correo apunta a **`/api/card-image?u=<url>`** (route handler Node,
  `src/app/api/card-image/route.ts`): baja la imagen (allowlist =
  `assets.tcgdex.net` / `images.pokemontcg.io` / Storage público de Supabase),
  la aplana sobre blanco y la reescala a un JPEG con `sharp` (viene con Next),
  caché 1 año en CDN — el catálogo sirve `.webp` y el Outlook clásico de Windows
  no lo pinta. Si algo falla, redirige (302) al original.
- Fase 4 (hecha, salvo el deploy):
  - slice 1: `robots.ts`, `sitemap.ts` (admin client, revalidate 1h), `icon.tsx`
    / `apple-icon.tsx` / `opengraph-image.tsx` (+ `/anuncio/[id]/opengraph-image`
    dinámico) con `next/og`, `manifest.ts` (PWA instalable), `viewport.themeColor`
    + `appleWebApp` + twitter card en el layout, `canonical`/`openGraph` en el
    `generateMetadata` de anuncio y perfil.
  - slice 2: `/terminos` y `/privacidad` (Habeas Data, Ley 1581), footer
    (`site-footer.tsx`), consentimiento obligatorio en el onboarding +
    `profiles.tos_accepted_at` (migración `20260907000000`). Constantes
    `CONTACT_EMAIL` (placeholder, cambiar), `LEGAL_UPDATED`, `MIN_AGE` en site.ts.
  - slice 3: `@vercel/analytics` (`<Analytics/>` en el layout; sin cookies).
  - Falta (acción del usuario): deploy a Vercel + Supabase Cloud, poner env vars
    reales (`NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`),
    dominio verificado en Resend, correr migraciones pendientes.
- Fase 5 (hecha): **decks**. Un deck es una `collections` con `kind='deck'` +
  portada (`cover_card_id` / `cover_card_name` / `cover_image_url`); guarda sus
  cartas en `collection_items` igual que una carpeta. Al borrarlo sus cartas se
  van con él (el trigger `reparent_collection_items` ignora los decks). Se
  publica como anuncio con `listings.format='deck'` + `source_collection_id`; la
  RPC `create_listing` (misma, extendida) exige ≥1 foto real y copia las cartas
  del deck a **`listing_deck_cards`** (snapshot congelado, RLS = visibilidad del
  anuncio, `revoke insert/update/delete`). Constraint `listing_deck_offer`
  (`format='single' or kind='offer'`). El anuncio del deck usa la portada como
  miniatura (`firstPhotoUrl`), badge "Deck", y `/anuncio/[id]` lista
  `listing_deck_cards`. Migraciones **`20260908000000`..`000002`** (DDL + tabla,
  trigger, `create_listing` — una función por archivo). `/explorar` gana el
  filtro `?formato=single|deck` (`EXPLORE_FORMATS` en `listings/explore.ts`).
  UI: `/coleccion` separa "Mis colecciones" / "Mis decks"; `/coleccion/nuevo-deck`
  (form con `CardPicker` de portada, no dialog); `/coleccion/[id]` detecta el
  deck (cabecera con portada, `DeckCover` para cambiarla, CTA "Vender o cambiar
  este deck" → `/publicar?deck=<id>`); `PublishForm` en modo deck oculta el
  `CardPicker`/cantidad. Acciones nuevas: `createDeck` / `setDeckCover` en
  `src/lib/collection/actions.ts`. `get_public_collections` ahora sólo devuelve
  carpetas (`kind='folder'`).
- Fase 5 · ciudades (hecha): la plataforma deja de ser sólo Barranquilla.
  `CITIES` en `@/lib/site` = lista curada de ~90 ciudades de Colombia (capitales
  + municipios/áreas metropolitanas grandes); el selector la usa tal cual en
  onboarding / `/perfil` / `/publicar` (ahora obliga a elegir, sin
  preseleccionado). Migraciones **`20260909000000`..`000002`**: se quita el
  `default 'Barranquilla'` de `profiles.city` (además pasa a NULLABLE — el
  trigger `handle_new_user` crea la fila sin ciudad) y de `listings.city` (sigue
  NOT NULL, la RPC `create_listing` exige ciudad). `complete_onboarding` y
  `create_listing` sin el fallback `'Barranquilla'`. Copy de marca: "en/de
  Colombia" en vez de Barranquilla / Caribe (`page.tsx`, `opengraph-image.tsx`,
  `site-footer.tsx`, `terminos`, `SITE_DESCRIPTION`).
