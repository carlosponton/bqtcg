# TCG Barranquilla

Marketplace comunitario de cartas de **Pokémon TCG** para Barranquilla y su área
metropolitana: vender, cambiar y marcar cartas que estás **buscando**.
Inspirado en lo que phptcg.com hace en Medellín.

La plataforma **conecta usuarios** (contacto por WhatsApp o en persona en tienda);
no procesa pagos.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4** + **shadcn/ui**
- **Supabase** — Postgres, Auth, Storage, RLS
- Deploy previsto: **Vercel** + Supabase Cloud

## Puesta en marcha

### 1. Requisitos

- Node.js 20.9+ (probado con 26.x)
- pnpm 11+
- Una cuenta en [Supabase](https://supabase.com)

### 2. Crear el proyecto Supabase

1. Crea un proyecto nuevo en el dashboard de Supabase.
2. Aplica la migración de la base de datos: ver [`supabase/README.md`](./supabase/README.md)
   (la vía más rápida es pegar el SQL de `supabase/migrations/` en el **SQL Editor**).

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con los valores de **Project Settings → API Keys**:

| Variable | Dónde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → `publishable` (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | API Keys → `secret` (`sb_secret_…`, aún sin uso) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local |
| `TCGDEX_ENDPOINT` | Vacío = mirror `https://api.eu1.tcgdex.net/v2` (el nodo principal `api.tcgdex.net` no es alcanzable desde algunas redes). Cuando vuelva: `https://api.tcgdex.net/v2` |

> Las llaves nuevas (**publishable** / **secret**) reemplazan a las legacy
> `anon` / `service_role`. El código acepta también `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> como respaldo si aún usas la legacy.

### 4. Autenticación en Supabase

En **Authentication → Sign In / Providers**:

- **Email**: activado. **En desarrollo, desactiva *"Confirm email"*** para entrar
  sin correo de confirmación (el registro devuelve sesión al instante).
- **Google**: activa el proveedor y pega tu Client ID / Secret de Google Cloud.

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (y la de producción cuando despliegues).
- **Redirect URLs**: agrega `http://localhost:3000/**` (y `https://TU-DOMINIO/**`).

**Antes de lanzar con confirmación de correo activada**, cambia la plantilla en
**Authentication → Emails → Confirm signup** para que el enlace apunte a nuestra
ruta con el token de un solo uso:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/bienvenido">
  Confirmar mi correo
</a>
```

La plantilla por defecto (`{{ .ConfirmationURL }}`) también funciona —
`/auth/confirm` acepta ambos formatos— pero es más propensa a que un
escáner de correo "gaste" el enlace antes de que lo abras.

### 5. Correr en local

```bash
pnpm install
pnpm dev
```

Abre http://localhost:3000

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Estructura

```
src/
  app/
    (auth)/login, (auth)/registro   Autenticación (email + Google)
    auth/callback, auth/confirm     Route handlers de OAuth y confirmación
    bienvenido/                     Onboarding (usuario, ciudad, WhatsApp)
    coleccion/                      Mi colección + agregar carta
    c/[token]/                      Colección compartida por enlace (pública)
    publicar/                       Formulario de anuncio (venta/cambio/busco)
    anuncio/[id]/                   Detalle de anuncio + contacto WhatsApp
    api/cards/search/              Autocompletar contra TCGdex (proxy servidor)
    explorar/, panel/               Placeholders (siguiente slice)
  components/
    ui/                             shadcn/ui
    auth/  cards/  collection/  listings/
    site-header.tsx, user-menu.tsx
  lib/
    supabase/{client,server,proxy,admin}   Clientes de Supabase por contexto
    auth/  collection/  listings/          Server Actions + Zod
    catalog.ts   tcgdex.ts                 Catálogo TCGdex (@tcgdex/sdk, mirror eu1)
    site.ts  listings.ts                   Config, ciudades, idiomas, estados
  proxy.ts                          Refresco de sesión (antes "middleware")
supabase/migrations/               SQL versionado
```

## Estado

**Fase 0 — completa:** scaffold, auth (email + Google), `profiles` + RLS,
onboarding, shell.

**Fase 1 · slice 1 — completa:** tablas `sets` / `cards` / `collection_items` /
`listings` / `listing_photos` con RLS; colección compartible (privada + enlace);
publicar anuncio — "Ofrezco" (la vendo y/o la cambio, en el mismo anuncio) o
"Busco" — con buscador de cartas TCGdex y fotos comprimidas; detalle de anuncio
con contacto por WhatsApp.

Siguiente slice: **feed + búsqueda con filtros + perfil público con anuncios**.

## Notas legales

- La plataforma sólo pone en contacto a las partes; no interviene en pagos ni
  envíos.
- Datos personales: se seguirá la Ley 1581 de 2012 (Habeas Data) — pendiente
  redactar términos y política de privacidad antes del lanzamiento.
- Las imágenes de cartas provienen de catálogos comunitarios (TCGdex); el sitio
  no está afiliado a The Pokémon Company.
