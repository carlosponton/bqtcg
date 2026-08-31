/**
 * Configuración global del sitio.
 */

export const SITE_NAME = "El Cambista TCG";
export const SITE_DESCRIPTION =
  "Compra, vende, cambia y marca cartas de Pokémon TCG que estás buscando en Barranquilla y su área metropolitana.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Correo del responsable del tratamiento de datos (para ejercer derechos
 * Habeas Data y contacto legal). Debe poder RECIBIR correo (el dominio está
 * verificado en Resend solo para envío; hace falta hosting de correo o un
 * redireccionamiento para la bandeja de entrada).
 */
export const CONTACT_EMAIL = "contacto@elcambistatcg.com";

/** Fecha de la última actualización de los documentos legales. */
export const LEGAL_UPDATED = "31 de agosto de 2026";

/** Edad mínima para usar la plataforma sin acompañamiento de un adulto. */
export const MIN_AGE = 14;

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
  "/notificaciones",
] as const;
