import "server-only";

import TCGdex, {
  type Card as TcgApiCard,
  type CardResume as TcgApiCardResume,
  type SetResume as TcgApiSetResume,
  type SupportedLanguages,
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

/**
 * Idiomas en los que se puede buscar el nombre de una carta.
 * clave = valor de `LANGUAGES` (`@/lib/listings`); valor = código de TCGdex.
 * Muchos nombres cambian según el idioma, así que quien no sepa el nombre en
 * español puede buscar en inglés, japonés, etc.
 */
export const SEARCH_LANGS: Record<string, SupportedLanguages> = {
  es: "es",
  en: "en",
  pt: "pt",
  fr: "fr",
  de: "de",
  it: "it",
};

/** Un cliente TCGdex por idioma (baratos; el SDK cachea por URL, que lleva el idioma). */
const clients = new Map<string, TCGdex>();
function client(tcgLang: SupportedLanguages): TCGdex {
  let c = clients.get(tcgLang);
  if (!c) {
    c = new TCGdex(tcgLang);
    c.setEndpoint(ENDPOINT);
    clients.set(tcgLang, c);
  }
  return c;
}

/** Cliente por defecto (español) para todo lo que no depende del idioma de búsqueda. */
const tcgdex = client("es");

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

// Lista completa de cartas por código de idioma de TCGdex (cache 6 h c/u).
const listCache = new Map<
  string,
  { at: number; cards: TcgApiCardResume[] }
>();
const listInflight = new Map<string, Promise<TcgApiCardResume[]>>();

let excludedSetsCache: { at: number; ids: Set<string> } | null = null;
let excludedSetsInflight: Promise<Set<string>> | null = null;

type SetInfo = { name: string; official: number | null; total: number | null };
let setsMapCache: { at: number; map: Map<string, SetInfo> } | null = null;
let setsMapInflight: Promise<Map<string, SetInfo>> | null = null;

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

async function getAllCards(uiLang = "es"): Promise<TcgApiCardResume[]> {
  const tcgLang = SEARCH_LANGS[uiLang] ?? "es";

  const cached = listCache.get(tcgLang);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.cards;

  let inflight = listInflight.get(tcgLang);
  if (!inflight) {
    inflight = Promise.all([client(tcgLang).fetch("cards"), getExcludedSetIds()])
      .then(([cards, excludedSets]) => {
        const list = ((cards ?? []) as TcgApiCardResume[]).filter(
          (card) => !isExcludedCard(card.id, excludedSets),
        );
        listCache.set(tcgLang, { at: Date.now(), cards: list });
        return list;
      })
      .finally(() => {
        listInflight.delete(tcgLang);
      });
    listInflight.set(tcgLang, inflight);
  }
  return inflight;
}

// --- Búsqueda de cartas (multi-idioma) ---------------------------------

/** Índice `{id, nombre normalizado}` por idioma, para no normalizar en cada búsqueda. */
const searchIdxCache = new Map<
  string,
  { at: number; entries: { id: string; norm: string }[] }
>();

async function getSearchIndex(
  uiLang: string,
): Promise<{ id: string; norm: string }[]> {
  const tcgLang = SEARCH_LANGS[uiLang] ?? "es";
  const cached = searchIdxCache.get(tcgLang);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.entries;

  const cards = await getAllCards(uiLang);
  const entries = cards.map((c) => ({ id: c.id, norm: normalize(c.name) }));
  searchIdxCache.set(tcgLang, { at: Date.now(), entries });
  return entries;
}

function nameScore(norm: string, q: string): number {
  if (!norm.includes(q)) return -1;
  if (norm === q) return 0;
  if (norm.startsWith(q)) return 1;
  if (norm.includes(` ${q}`)) return 2;
  return 3;
}

/**
 * Busca una carta por su nombre en CUALQUIERA de los idiomas de `SEARCH_LANGS`
 * (así "Wally" y "Blasco" encuentran la misma carta) y devuelve el resultado
 * con el nombre canónico en español. `resolveCard` luego lo confirma por
 * `card_id`, que es independiente del idioma.
 */
export async function searchCards(
  query: string,
  limit = 20,
): Promise<TcgCardBrief[]> {
  const q = normalize(query);
  if (q.length < 2) return [];

  const uiLangs = Object.keys(SEARCH_LANGS);
  const [esCards, indices] = await Promise.all([
    getAllCards("es").catch(() => [] as TcgApiCardResume[]),
    Promise.all(
      uiLangs.map((l) =>
        getSearchIndex(l).catch(() => [] as { id: string; norm: string }[]),
      ),
    ),
  ]);

  const displayById = new Map(esCards.map((c) => [c.id, c]));

  // Mejor score por card_id, mirando el nombre en todos los idiomas. Se
  // descartan las cartas que no están en el catálogo ES (sets viejos nunca
  // traducidos): sin nombre canónico en español no sirven en este marketplace.
  const best = new Map<string, number>();
  for (const entries of indices) {
    for (const { id, norm } of entries) {
      if (!displayById.has(id)) continue;
      const score = nameScore(norm, q);
      if (score < 0) continue;
      const prev = best.get(id);
      if (prev === undefined || score < prev) best.set(id, score);
    }
  }

  return [...best.entries()]
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      const na = displayById.get(a[0])?.name ?? a[0];
      const nb = displayById.get(b[0])?.name ?? b[0];
      return na.localeCompare(nb, "es");
    })
    .slice(0, limit)
    .map(([id]) => {
      const card = displayById.get(id);
      return {
        id,
        localId: card?.localId,
        name: card?.name ?? id,
        image: cardImage(card?.image, "low"),
      };
    });
}

// --- Escaneo de carta con la cámara -----------------------------------

/** `setId → {nombre, total impreso, total con secretas}` (cache 6 h). */
async function getSetsMap(): Promise<Map<string, SetInfo>> {
  if (setsMapCache && Date.now() - setsMapCache.at < LIST_TTL_MS) {
    return setsMapCache.map;
  }
  if (!setsMapInflight) {
    setsMapInflight = getSets()
      .then((sets) => {
        const map = new Map<string, SetInfo>();
        for (const s of sets) {
          map.set(s.id, {
            name: s.name,
            official: s.cardCount?.official ?? null,
            total: s.cardCount?.total ?? null,
          });
        }
        if (map.size > 0) setsMapCache = { at: Date.now(), map };
        return map;
      })
      .finally(() => {
        setsMapInflight = null;
      });
  }
  return setsMapInflight;
}

export type ScanQuery = {
  name?: string | null;
  /** Número impreso en la carta (`localId`), ej. "136" o "TG12". */
  number?: string | null;
  /** Denominador impreso, ej. 189 (suele ser el conteo "oficial" del set). */
  setTotal?: number | null;
  /** Sigla del set en cartas Escarlata y Púrpura, ej. "OBF". */
  setCode?: string | null;
};

export type ScanCandidate = TcgCardBrief & {
  setName: string | null;
  setTotal: number | null;
};

/**
 * Sigla oficial impresa en las cartas Escarlata y Púrpura → id de set en
 * TCGdex (que usa `svNN`, no la sigla). Sólo es una pista extra; ampliar
 * cuando salgan sets nuevos. (`abbreviation.official` existe en TCGdex pero
 * sólo en el detalle de cada set, no en el listado.)
 */
const SV_SET_CODES: Record<string, string> = {
  SVI: "sv01", PAL: "sv02", OBF: "sv03", MEW: "sv03.5", PAR: "sv04",
  PAF: "sv04.5", TEF: "sv05", TWM: "sv06", SFA: "sv06.5", SCR: "sv07",
  SSP: "sv08", PRE: "sv08.5", JTG: "sv09", DRI: "sv10", "": "",
};

/** Normaliza un número de carta: sin espacios, sin ceros a la izquierda. */
function normNumber(value: string): string {
  return value
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/^([A-Z]*)0+(\d)/, "$1$2");
}

/** ¿Dos cadenas de dígitos difieren en 1 sustitución o 1 transposición? (típico error de OCR). */
function digitsClose(a: string, b: string): boolean {
  if (!a || !b || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    if (diff === 1) return true;
    // transposición de dos adyacentes
    for (let i = 0; i < a.length - 1; i++) {
      if (
        a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(0, i) === b.slice(0, i) &&
        a.slice(i + 2) === b.slice(i + 2)
      ) {
        return true;
      }
    }
    return false;
  }
  // una inserción/eliminación
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i <= short.length; i++) {
    if (short.slice(0, i) + long[i] + short.slice(i) === long) return true;
  }
  return false;
}

/** Similitud de Dice sobre trigramas de caracteres (0–1). */
function trigramSim(a: string, b: string): number {
  const grams = (s: string) => {
    const p = `  ${s} `;
    const out = new Set<string>();
    for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return (2 * inter) / (ga.size + gb.size);
}

/**
 * Empareja lo leído por OCR con el catálogo (ya cacheado en memoria). Nombre,
 * número y total del set son **señales ponderadas**, ninguna excluye: si el OCR
 * leyó mal el número, un buen nombre + total todavía saca la carta al tope.
 * Devuelve hasta `limit` candidatas ordenadas por confianza.
 */
export async function matchScannedCard(
  q: ScanQuery,
  limit = 8,
): Promise<ScanCandidate[]> {
  const [all, sets] = await Promise.all([getAllCards(), getSetsMap()]);

  const nameNorm = q.name ? normalize(q.name) : "";
  const nameTokens = nameNorm.split(" ").filter((t) => t.length > 1);
  const numNorm = q.number ? normNumber(q.number) : "";
  const numDigits = numNorm.replace(/\D/g, "");
  const codeSetId = q.setCode
    ? SV_SET_CODES[q.setCode.trim().toUpperCase()]
    : undefined;

  if (!nameNorm && !numNorm && !q.setTotal) return [];

  const scored: { card: TcgApiCardResume; score: number }[] = [];
  for (const card of all) {
    const setId = setIdOf(card.id);
    const set = sets.get(setId);
    let score = 0;

    // --- número impreso (fuerte, tolerante a 1 error de OCR) ---
    if (numNorm) {
      const cn = normNumber(card.localId);
      const cd = cn.replace(/\D/g, "");
      if (cn === numNorm) score += 55;
      else if (cd && cd === numDigits) score += 34; // mismos dígitos, prefijo distinto
      else if (digitsClose(cd, numDigits)) score += 14;
    }

    // --- total del set (el denominador impreso, ej. 189) ---
    if (q.setTotal && set) {
      if (set.official === q.setTotal) score += 42;
      else if (set.total === q.setTotal) score += 24;
      else if (set.official != null && Math.abs(set.official - q.setTotal) <= 2) {
        score += 10;
      }
    }

    // --- sigla Escarlata y Púrpura ---
    if (codeSetId && setId === codeSetId) score += 26;

    // --- nombre ---
    if (nameNorm) {
      const cn = normalize(card.name);
      if (cn === nameNorm) score += 55;
      else if (cn.startsWith(nameNorm) || nameNorm.startsWith(cn)) score += 40;
      else if (cn.includes(nameNorm) || nameNorm.includes(cn)) score += 30;
      else {
        const ctoks = new Set(cn.split(" "));
        const shared = nameTokens.filter((t) => ctoks.has(t)).length;
        if (shared > 0) score += shared * 12;
        else if (
          nameNorm.length >= 4 &&
          Math.abs(cn.length - nameNorm.length) <= Math.max(cn.length, nameNorm.length)
        ) {
          const sim = trigramSim(cn, nameNorm);
          if (sim >= 0.42) score += Math.round(sim * 32);
        }
      }
    }

    if (score > 0) scored.push({ card, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name, "es"),
  );

  return scored.slice(0, limit).map(({ card }) => {
    const set = sets.get(setIdOf(card.id));
    return {
      id: card.id,
      localId: card.localId,
      name: card.name,
      image: cardImage(card.image, "low"),
      setName: set?.name ?? null,
      setTotal: set?.official ?? set?.total ?? null,
    };
  });
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
