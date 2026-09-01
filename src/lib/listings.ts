import type { ListingKind } from "@/types/database";

export const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "jp", label: "Japonés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
  { value: "other", label: "Otro" },
] as const;

export const CONDITIONS = [
  { value: "M", label: "Mint (M) — impecable" },
  { value: "NM", label: "Near Mint (NM) — casi perfecta" },
  { value: "LP", label: "Light Play (LP) — desgaste leve" },
  { value: "MP", label: "Moderate Play (MP) — desgaste visible" },
  { value: "HP", label: "Heavy Play (HP) — muy desgastada" },
  { value: "DMG", label: "Damaged (DMG) — dañada" },
  { value: "graded", label: "Gradeada (PSA / BGS / CGC)" },
] as const;

export const KIND_LABELS: Record<ListingKind, string> = {
  offer: "Ofrezco",
  want: "Busco",
};

/** Distintivo para los anuncios de deck completo. */
export const DECK_LABEL = "Deck";

type ListingModes = {
  kind: ListingKind;
  for_sale: boolean;
  for_trade: boolean;
};

/** Etiqueta corta según los modos del anuncio: "Venta", "Cambio", "Venta o cambio", "Busco". */
export function listingModeLabel(l: ListingModes): string {
  if (l.kind === "want") return "Busco";
  if (l.for_sale && l.for_trade) return "Venta o cambio";
  if (l.for_sale) return "Venta";
  if (l.for_trade) return "Cambio";
  return "Ofrezco";
}

export function languageLabel(value: string | null): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value ?? "";
}

/** Sentinela en `listings.languages` para "cualquier idioma". */
export const ANY_LANGUAGE = "any";

/**
 * Etiqueta para el (o los) idioma(s) de un anuncio. `["any"]` o vacío =
 * "cualquier idioma"; 1–3 se listan; 4+ se resumen.
 */
export function languagesLabel(values: string[] | null | undefined): string {
  const list = (values ?? []).filter((v) => v !== ANY_LANGUAGE);
  if (list.length === 0) return "Cualquier idioma";
  const labels = list.map(languageLabel);
  return labels.length <= 3 ? labels.join(" · ") : `${labels.length} idiomas`;
}

export function conditionLabel(value: string | null): string {
  if (!value) return "";
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function formatCOP(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/listing-photos`;

export function listingPhotoUrl(storagePath: string): string {
  return `${STORAGE_BASE}/${storagePath}`;
}

/** Normaliza un teléfono colombiano a formato wa.me (E.164 sin +). */
export function normalizeWhatsapp(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `57${digits}`; // celular local sin indicativo
  return digits;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(message)}`;
}
