import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CollectionMatch = {
  itemId: string;
  collectionId: string;
  collectionName: string;
  cardName: string;
  imageUrl: string | null;
  quantity: number;
  condition: string | null;
  language: string;
  /** true si coincidió por `card_id` del catálogo; false si sólo por nombre. */
  exact: boolean;
};

/** minúsculas, sin acentos, signos → espacio (mismo criterio que `tcgdex.normalize`). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Cartas en la colección del usuario que coinciden con lo que pide un anuncio
 * "busco": por `card_id` del catálogo si ambos lo tienen, si no por nombre
 * normalizado. Devuelve una fila por ítem (una carta puede estar en varias
 * colecciones). RLS restringe la lectura a la propia colección del usuario.
 */
export async function findCollectionMatches(
  userId: string,
  want: { card_id: string | null; card_name: string },
): Promise<CollectionMatch[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("collection_items")
    .select(
      "id, collection_id, card_id, card_name, image_url, quantity, condition, language",
    )
    .eq("user_id", userId);

  if (!items || items.length === 0) return [];

  const target = normalize(want.card_name);
  const matched = items.filter((it) =>
    want.card_id && it.card_id
      ? it.card_id === want.card_id
      : normalize(it.card_name) === target,
  );
  if (matched.length === 0) return [];

  const collectionIds = [...new Set(matched.map((m) => m.collection_id))];
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name")
    .in("id", collectionIds);
  const names = new Map((collections ?? []).map((c) => [c.id, c.name]));

  return matched.map((m) => ({
    itemId: m.id,
    collectionId: m.collection_id,
    collectionName: names.get(m.collection_id) ?? "Mi colección",
    cardName: m.card_name,
    imageUrl: m.image_url,
    quantity: m.quantity,
    condition: m.condition,
    language: m.language,
    exact: Boolean(want.card_id && m.card_id && m.card_id === want.card_id),
  }));
}
