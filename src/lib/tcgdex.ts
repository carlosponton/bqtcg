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
let listCache: { at: number; cards: TcgApiCardResume[] } | null = null;
let listInflight: Promise<TcgApiCardResume[]> | null = null;

async function getAllCards(): Promise<TcgApiCardResume[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) {
    return listCache.cards;
  }
  if (!listInflight) {
    listInflight = tcgdex
      .fetch("cards")
      .then((cards) => {
        const list = cards ?? [];
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
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const all = await getAllCards();
  const matches: { card: TcgApiCardResume; score: number }[] = [];

  for (const card of all) {
    const name = card.name.toLowerCase();
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
