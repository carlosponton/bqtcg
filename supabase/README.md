# Base de datos (Supabase)

Las migraciones viven en `supabase/migrations/`, ordenadas por su prefijo de fecha.

## Aplicarlas

### Opción A — SQL Editor (rápido, sin instalar nada)

1. Entra a tu proyecto en https://supabase.com/dashboard
2. **SQL Editor → New query**
3. Pega el contenido de cada archivo de `supabase/migrations/` **en orden** y ejecútalo.

### Opción B — Supabase CLI (recomendado a medida que crece el esquema)

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <TU_PROJECT_REF>
pnpm dlx supabase db push
```

Para crear una migración nueva:

```bash
pnpm dlx supabase migration new nombre_descriptivo
```

### Opción C — stack local con Docker

```bash
pnpm dlx supabase init      # crea supabase/config.toml la primera vez
pnpm dlx supabase start     # levanta Postgres + Auth + Storage locales
pnpm dlx supabase db reset  # aplica todas las migraciones desde cero
```

## Volver a correr una migración en desarrollo

Mientras el esquema no está estable, a veces hay que rehacer una migración que ya
se aplicó. Para la de catálogo/colección/anuncios hay un teardown:

1. Ejecuta `supabase/dev/reset_catalog_collection_listings.sql` en el SQL Editor.
2. Vuelve a ejecutar `supabase/migrations/20260830130000_catalog_collection_listings.sql`.

⚠️ Borra los datos de esas tablas. Solo para desarrollo.

## Regenerar los tipos de TypeScript

Después de cambiar el esquema:

```bash
pnpm dlx supabase gen types typescript --project-id <TU_PROJECT_REF> > src/types/database.ts
```
