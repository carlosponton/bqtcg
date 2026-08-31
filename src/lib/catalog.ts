import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { assetImage, cardImages, getCard } from "@/lib/tcgdex";

export type ResolvedCard = {
  card_id: string | null;
  custom_card_name: string | null;
  card_name: string;
  set_name: string | null;
  image_url: string | null;
};

/** Sólo admite URLs https (catálogo TCGdex o Storage de Supabase). */
function safeImageUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && /^https:\/\//i.test(v) ? v : null;
}

/**
 * A partir de lo que envió el formulario (`card_id` del catálogo o
 * `custom_card_name` a mano), devuelve los campos "snapshot" que guardamos en
 * `collection_items` / `listings`. Si es del catálogo, cachea la carta y su set
 * en nuestras tablas (necesario para la FK `card_id`).
 */
export async function resolveCard(input: {
  cardId?: string | null;
  customName?: string | null;
  cardNameHint?: string | null;
  imageHint?: string | null;
}): Promise<ResolvedCard> {
  const cardId = input.cardId?.trim() || null;
  const customName = input.customName?.trim() || null;
  const hint = input.cardNameHint?.trim() || null;

  if (!cardId) {
    const name = customName ?? hint;
    if (!name) throw new Error("Falta la carta.");
    return {
      card_id: null,
      custom_card_name: name,
      card_name: name,
      set_name: null,
      image_url: safeImageUrl(input.imageHint),
    };
  }

  try {
    const full = await getCard(cardId);
    const { small, large } = cardImages(full.image);
    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (full.set?.id) {
      await admin.from("sets").upsert({
        id: full.set.id,
        name: full.set.name,
        logo_url: assetImage(full.set.logo),
        symbol_url: assetImage(full.set.symbol),
        card_count_official: full.set.cardCount?.official ?? null,
        card_count_total: full.set.cardCount?.total ?? null,
        synced_at: now,
      });
    }

    await admin.from("cards").upsert({
      id: full.id,
      name: full.name,
      set_id: full.set?.id ?? null,
      local_id: full.localId ?? null,
      rarity: full.rarity ?? null,
      category: full.category ?? null,
      types: full.types ?? null,
      image_small: small,
      image_large: large,
      synced_at: now,
    });

    return {
      card_id: full.id,
      custom_card_name: null,
      card_name: full.name,
      set_name: full.set?.name ?? null,
      image_url: large ?? small,
    };
  } catch {
    // TCGdex no respondió: degradamos a texto libre (no podemos usar la FK).
    const name = hint ?? cardId;
    return {
      card_id: null,
      custom_card_name: name,
      card_name: name,
      set_name: null,
      image_url: safeImageUrl(input.imageHint),
    };
  }
}
