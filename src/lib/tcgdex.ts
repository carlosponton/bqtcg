import "server-only";

import TCGdex, {
  type Card as TcgApiCard,
  type CardResume as TcgApiCardResume,
  type SetResume as TcgApiSetResume,
} from "@tcgdex/sdk";

/**
 * Cliente de TCGdex (SDK oficial), en español.
 *
 * `api.tcgdex.net` (nodo principal) no es alcanzable desde algunas redes, así
 * que por defecto se usa el mirror `api.eu1.tcgdex.net`. Cuando el nodo
 * principal vuelva, basta poner `TCGDEX_ENDPOINT=https://api.tcgdex.net/v2` en
 * `.env.local` (o dejarlo vacío para seguir en el mirror).
 *
 * Estrategia de búsqueda: se descarga UNA vez la lista completa de cartas
 * (cacheada) y se filtra en memoria — más confiable que los filtros del API.
 */

const ENDPOINT =
  process.env.TCGDEX_ENDPOINT || "https://api.eu1.tcgdex.net/v2";

const tcgdex = new TCGdex("es");
tcgdex.setEndpoint(ENDPOINT);

export type TcgCardBrief = {
  id: string;
  localId?: string;
  name: string;
  /** URL de miniatura ya resuelta (o null si la carta no tiene scan). */
  image: string | null;
};

export type TcgCardFull = {
  id: string;
  localId?: string;
  name: string;
  /** URL base sin extensión (usar `cardImages()` para resolverla). */
  image?: string | null;
  category?: string;
  rarity?: string;
  types?: string[];
  set?: {
    id: string;
    name: string;
    logo?: string | null;
    symbol?: string | null;
    cardCount?: { total?: number; official?: number };
  };
};

export type TcgSetBrief = {
  id: string;
  name: string;
  logo?: string | null;
  symbol?: string | null;
  cardCount?: { total?: number; official?: number };
};

export type CardPriceUsd = {
  /** Precio de mercado del acabado preferido, en USD. */
  market: number;
  /** Mín. y máx. del precio de mercado entre acabados (para señalar rango). */
  min: number;
  max: number;
  /** Acabado del que sale `market`: normal, holofoil, reverse-holofoil… */
  finish: string;
  /** ISO date de la última actualización de TCGplayer, si viene. */
  updatedAt: string | null;
};

function cardImage(
  base: string | null | undefined,
  quality: "low" | "high" = "high",
): string | null {
  if (!base) return null;
  return `${base}/${quality}.webp`;
}

export function assetImage(base: string | null | undefined): string | null {
  if (!base) return null;
  return `${base}.webp`;
}

/** URLs (miniatura y grande) a partir de la base de imagen de una carta. */
export function cardImages(base: string | null | undefined) {
  return { small: cardImage(base, "low"), large: cardImage(base, "high") };
}

// --- Catálogo completo en memoria -----------------------------------------

const LIST_TTL_MS = 1000 * 60 * 60 * 6; // 6 h

/**
 * Series que NO van en el marketplace. `tcgp` = Pokémon TCG Pocket: cartas de
 * un juego digital aparte, que no existen en físico y ensucian la búsqueda.
 */
const EXCLUDED_SERIE_IDS = ["tcgp"];

/**
 * Prefijos de los sets de TCG Pocket (A1, A2a, B2, P-A…). Sólo se usa como
 * reserva si no se pudieron cargar las series desde TCGdex.
 */
const POCKET_ID_RE = /^(a\d|b\d|p-a)/i;

type TcgSerieFull = { id: string; name: string; sets?: { id: string }[] };

let listCache: { at: number; cards: TcgApiCardResume[] } | null = null;
let listInflight: Promise<TcgApiCardResume[]> | null = null;

let excludedSetsCache: { at: number; ids: Set<string> } | null = null;
let excludedSetsInflight: Promise<Set<string>> | null = null;

/** Normaliza para comparar nombres: minúsculas, sin acentos, signos → espacio. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** `swsh3-136` → `swsh3`; `P-A-001` → `P-A`. */
function setIdOf(cardId: string): string {
  const i = cardId.lastIndexOf("-");
  return i === -1 ? cardId : cardId.slice(0, i);
}

async function getExcludedSetIds(): Promise<Set<string>> {
  if (excludedSetsCache && Date.now() - excludedSetsCache.at < LIST_TTL_MS) {
    return excludedSetsCache.ids;
  }
  if (!excludedSetsInflight) {
    excludedSetsInflight = Promise.all(
      EXCLUDED_SERIE_IDS.map(async (id) => {
        try {
          const serie = (await tcgdex.fetch("series", id)) as
            | TcgSerieFull
            | undefined;
          return (serie?.sets ?? []).map((s) => s.id);
        } catch {
          return [] as string[];
        }
      }),
    )
      .then((lists) => {
        const ids = new Set(lists.flat());
        if (ids.size > 0) excludedSetsCache = { at: Date.now(), ids };
        return ids;
      })
      .finally(() => {
        excludedSetsInflight = null;
      });
  }
  return excludedSetsInflight;
}

function isExcludedCard(cardId: string, excludedSets: Set<string>): boolean {
  if (excludedSets.size > 0) return excludedSets.has(setIdOf(cardId));
  return POCKET_ID_RE.test(cardId); // no cargaron las series: usa el patrón
}

async function getAllCards(): Promise<TcgApiCardResume[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) {
    return listCache.cards;
  }
  if (!listInflight) {
    listInflight = Promise.all([tcgdex.fetch("cards"), getExcludedSetIds()])
      .then(([cards, excludedSets]) => {
        const list = (cards ?? []).filter(
          (card) => !isExcludedCard(card.id, excludedSets),
        );
        listCache = { at: Date.now(), cards: list };
        return list;
      })
      .finally(() => {
        listInflight = null;
      });
  }
  return listInflight;
}

// --- API pública del módulo ---------------------------------------------

export async function searchCards(
  query: string,
  limit = 20,
): Promise<TcgCardBrief[]> {
  const q = normalize(query);
  if (q.length < 2) return [];

  const all = await getAllCards();
  const matches: { card: TcgApiCardResume; score: number }[] = [];

  for (const card of all) {
    const name = normalize(card.name);
    if (!name.includes(q)) continue;
    let score = 3;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(` ${q}`)) score = 2;
    matches.push({ card, score });
  }

  matches.sort(
    (a, b) => a.score - b.score || a.card.name.localeCompare(b.card.name, "es"),
  );

  return matches.slice(0, limit).map((m) => ({
    id: m.card.id,
    localId: m.card.localId,
    name: m.card.name,
    image: cardImage(m.card.image, "low"),
  }));
}

export async function getCard(id: string): Promise<TcgCardFull> {
  const card = (await tcgdex.fetch("cards", id)) as TcgApiCard | undefined;
  if (!card) throw new Error(`Carta ${id} no encontrada en TCGdex`);
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    image: card.image ?? null,
    category: card.category,
    rarity: card.rarity,
    types: card.types,
    set: card.set
      ? {
          id: card.set.id,
          name: card.set.name,
          logo: card.set.logo ?? null,
          symbol: card.set.symbol ?? null,
          cardCount: card.set.cardCount,
        }
      : undefined,
  };
}

// --- Precio de referencia (TCGplayer) -----------------------------------

/** Orden de preferencia del acabado cuando una carta tiene varios. */
const FINISH_PRIORITY = ["normal", "holofoil", "reverse-holofoil"];

type TcgFinishPrice = {
  marketPrice?: unknown;
  midPrice?: unknown;
  lowPrice?: unknown;
};

function priceNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Precio de referencia de TCGplayer (USD) para una carta del catálogo, o
 * `null` si TCGdex no trae precios para ella. TCGdex expone `pricing.tcgplayer`
 * (un sub-objeto por acabado) a nivel de carta y, a veces repetido, en cada
 * `variants_detailed`; se juntan todos los acabados y se elige uno.
 */
export async function getCardPriceUsd(id: string): Promise<CardPriceUsd | null> {
  const card = (await tcgdex.fetch("cards", id)) as
    | {
        pricing?: { tcgplayer?: unknown };
        variants_detailed?: Array<{ pricing?: { tcgplayer?: unknown } }>;
      }
    | undefined;

  const blocks = [
    card?.pricing?.tcgplayer,
    ...(card?.variants_detailed ?? []).map((v) => v.pricing?.tcgplayer),
  ];

  const byFinish = new Map<string, { price: number; updated: string | null }>();

  for (const tp of blocks) {
    if (!tp || typeof tp !== "object") continue;
    const block = tp as Record<string, unknown>;
    const updated = typeof block.updated === "string" ? block.updated : null;

    for (const [finish, raw] of Object.entries(block)) {
      if (finish === "unit" || finish === "updated") continue;
      if (!raw || typeof raw !== "object") continue;
      const p = raw as TcgFinishPrice;
      const price =
        priceNum(p.marketPrice) ?? priceNum(p.midPrice) ?? priceNum(p.lowPrice);
      if (price == null || byFinish.has(finish)) continue;
      byFinish.set(finish, { price, updated });
    }
  }

  if (byFinish.size === 0) return null;

  const prices = [...byFinish.values()].map((x) => x.price);
  const finish =
    FINISH_PRIORITY.find((f) => byFinish.has(f)) ?? [...byFinish.keys()][0];
  const chosen = byFinish.get(finish)!;

  return {
    market: chosen.price,
    min: Math.min(...prices),
    max: Math.max(...prices),
    finish,
    updatedAt: chosen.updated,
  };
}

export async function getSets(): Promise<TcgSetBrief[]> {
  const sets = (await tcgdex.fetch("sets")) as TcgApiSetResume[] | undefined;
  return (sets ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    logo: s.logo ?? null,
    symbol: s.symbol ?? null,
    cardCount: s.cardCount,
  }));
}
