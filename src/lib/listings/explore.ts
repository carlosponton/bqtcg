/**
 * Parámetros de filtro de `/explorar` (compartidos entre el server component
 * de la página y el componente cliente de filtros). Sin acceso a base de datos.
 */

import { LANGUAGES } from "@/lib/listings";

export const PAGE_SIZE = 24;

export const EXPLORE_MODES = [
  { value: "venta", label: "En venta" },
  { value: "cambio", label: "En cambio" },
  { value: "busco", label: "Se busca" },
] as const;

export type ExploreMode = (typeof EXPLORE_MODES)[number]["value"];

export const EXPLORE_SORTS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor primero" },
  { value: "precio_desc", label: "Precio: mayor primero" },
] as const;

export type ExploreSort = (typeof EXPLORE_SORTS)[number]["value"];

export const EXPLORE_FORMATS = [
  { value: "single", label: "Cartas sueltas" },
  { value: "deck", label: "Decks" },
] as const;

export type ExploreFormat = (typeof EXPLORE_FORMATS)[number]["value"];

export type ExploreParams = {
  q: string;
  mode: ExploreMode | null;
  format: ExploreFormat | null;
  city: string | null;
  language: string | null;
  condition: string | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: ExploreSort;
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function toPositiveInt(v: string): number | null {
  const n = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseExploreParams(sp: RawSearchParams): ExploreParams {
  const modeRaw = one(sp.modo);
  const formatRaw = one(sp.formato);
  const sortRaw = one(sp.orden);
  const pageRaw = toPositiveInt(one(sp.pagina));

  return {
    q: one(sp.q).slice(0, 80),
    mode: EXPLORE_MODES.some((m) => m.value === modeRaw)
      ? (modeRaw as ExploreMode)
      : null,
    format: EXPLORE_FORMATS.some((f) => f.value === formatRaw)
      ? (formatRaw as ExploreFormat)
      : null,
    city: one(sp.ciudad).slice(0, 60) || null,
    language: LANGUAGES.some((l) => l.value === one(sp.idioma))
      ? one(sp.idioma)
      : null,
    condition: one(sp.estado) || null,
    priceMin: toPositiveInt(one(sp.precio_min)),
    priceMax: toPositiveInt(one(sp.precio_max)),
    sort: EXPLORE_SORTS.some((s) => s.value === sortRaw)
      ? (sortRaw as ExploreSort)
      : "recientes",
    page: pageRaw && pageRaw > 0 ? pageRaw : 1,
  };
}

/** ¿Hay algún filtro activo (más allá del orden y la página)? */
export function hasActiveFilters(p: ExploreParams): boolean {
  return Boolean(
    p.q ||
      p.mode ||
      p.format ||
      p.city ||
      p.language ||
      p.condition ||
      p.priceMin != null ||
      p.priceMax != null,
  );
}

/** Construye el querystring canónico a partir de los parámetros. */
export function exploreParamsToQuery(
  p: Partial<ExploreParams>,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.mode) qs.set("modo", p.mode);
  if (p.format) qs.set("formato", p.format);
  if (p.city) qs.set("ciudad", p.city);
  if (p.language) qs.set("idioma", p.language);
  if (p.condition) qs.set("estado", p.condition);
  if (p.priceMin != null) qs.set("precio_min", String(p.priceMin));
  if (p.priceMax != null) qs.set("precio_max", String(p.priceMax));
  if (p.sort && p.sort !== "recientes") qs.set("orden", p.sort);
  if (p.page && p.page > 1) qs.set("pagina", String(p.page));
  return qs;
}
