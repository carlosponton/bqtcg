/**
 * Configuración global del sitio.
 */

export const SITE_NAME = "El Cambista TCG";
export const SITE_DESCRIPTION =
  "Compra, vende, cambia y marca cartas de Pokémon TCG que estás buscando en Colombia.";

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
 * Ciudades de Colombia soportadas (32 capitales departamentales + municipios y
 * áreas metropolitanas grandes). Lista curada: si falta alguna, se agrega aquí.
 * El valor guardado en `profiles.city` / `listings.city` es este texto tal cual.
 */
export const CITIES = [
  "Acacías",
  "Aguachica",
  "Apartadó",
  "Arauca",
  "Armenia",
  "Barrancabermeja",
  "Barranquilla",
  "Bello",
  "Bogotá",
  "Bucaramanga",
  "Buenaventura",
  "Buga",
  "Cajicá",
  "Cali",
  "Cartagena",
  "Cartago",
  "Caucasia",
  "Cereté",
  "Chía",
  "Chinchiná",
  "Chiquinquirá",
  "Ciénaga",
  "Cúcuta",
  "Dosquebradas",
  "Duitama",
  "Envigado",
  "Espinal",
  "Facatativá",
  "Florencia",
  "Floridablanca",
  "Funza",
  "Fusagasugá",
  "Galapa",
  "Girardot",
  "Girón",
  "Granada",
  "Ibagué",
  "Inírida",
  "Ipiales",
  "Itagüí",
  "Jamundí",
  "La Dorada",
  "La Estrella",
  "Leticia",
  "Lorica",
  "Madrid",
  "Magangué",
  "Maicao",
  "Malambo",
  "Manizales",
  "Medellín",
  "Melgar",
  "Mitú",
  "Mocoa",
  "Montería",
  "Montelíbano",
  "Mosquera",
  "Neiva",
  "Ocaña",
  "Palmira",
  "Pamplona",
  "Pasto",
  "Pereira",
  "Piedecuesta",
  "Pitalito",
  "Popayán",
  "Puerto Carreño",
  "Puerto Colombia",
  "Quibdó",
  "Riohacha",
  "Rionegro",
  "Sabanalarga",
  "Sabaneta",
  "Sahagún",
  "San Andrés",
  "San José del Guaviare",
  "Santa Marta",
  "Sincelejo",
  "Soacha",
  "Sogamoso",
  "Soledad",
  "Tuluá",
  "Tumaco",
  "Tunja",
  "Turbaco",
  "Turbo",
  "Valledupar",
  "Villa del Rosario",
  "Villavicencio",
  "Yopal",
  "Yumbo",
  "Zipaquirá",
] as const;

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
