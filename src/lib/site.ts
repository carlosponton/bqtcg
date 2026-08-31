/**
 * Configuración global del sitio.
 */

export const SITE_NAME = "TCG Barranquilla";
export const SITE_DESCRIPTION =
  "Compra, vende, cambia y marca cartas de Pokémon TCG que estás buscando en Barranquilla y su área metropolitana.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Enlaces de navegación principales del header. */
export const NAV_LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/publicar", label: "Publicar" },
] as const;

/**
 * Ciudades soportadas. Por ahora solo Barranquilla; se agregan más aquí sin
 * tocar código (ej. "Soledad", "Puerto Colombia", "Galapa", "Malambo",
 * "Cartagena", "Santa Marta", …).
 */
export const CITIES = ["Barranquilla"] as const;

export const DEFAULT_CITY = CITIES[0];

export type City = (typeof CITIES)[number];

/** Rutas que exigen sesión iniciada (protegidas en `src/proxy.ts`). */
export const PROTECTED_PREFIXES = [
  "/bienvenido",
  "/panel",
  "/perfil",
  "/publicar",
  "/coleccion",
] as const;
