"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { resolveCard } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailUser } from "@/lib/email/notify";
import type { Database, Json } from "@/types/database";

type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];

export type CreateListingInput = {
  kind: "offer" | "want";
  format?: "single" | "deck";
  for_sale: boolean;
  for_trade: boolean;
  source_collection_item_id?: string | null;
  source_collection_id?: string | null;
  card_id?: string | null;
  custom_card_name?: string | null;
  card_name: string;
  card_image?: string | null;
  language: string;
  condition?: string | null;
  quantity: number;
  price_cop?: number | null;
  price_negotiable: boolean;
  trade_for?: string | null;
  description?: string | null;
  city: string;
  photo_paths: string[];
};

export type CreateListingResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: keyof CreateListingInput };

const LANG = ["es", "en", "jp", "pt", "fr", "de", "it", "other"] as const;
const COND = ["M", "NM", "LP", "MP", "HP", "DMG", "graded"] as const;

const schema = z
  .object({
    kind: z.enum(["offer", "want"]),
    format: z.enum(["single", "deck"]).catch("single"),
    for_sale: z.boolean().catch(false),
    for_trade: z.boolean().catch(false),
    source_collection_item_id: z.uuid().nullish(),
    source_collection_id: z.uuid().nullish(),
    card_id: z.string().trim().nullish(),
    custom_card_name: z.string().trim().max(120).nullish(),
    card_name: z.string().trim().max(160).default(""),
    card_image: z.string().trim().nullish(),
    language: z.enum(LANG).catch("es"),
    condition: z.union([z.enum(COND), z.literal(""), z.null()]).optional(),
    quantity: z.coerce.number().int().min(1).max(999).catch(1),
    price_cop: z.coerce.number().int().min(0).max(99_999_999).nullish(),
    price_negotiable: z.boolean().catch(false),
    trade_for: z.string().trim().max(500).nullish(),
    description: z.string().trim().max(1000).nullish(),
    city: z.string().trim().min(1, { error: "Elige tu ciudad." }).max(60),
    photo_paths: z.array(z.string().trim().min(1)).max(6).default([]),
  })
  .refine((d) => d.kind !== "offer" || d.for_sale || d.for_trade, {
    error: "Marca si la vendes, la cambias, o ambas.",
    path: ["for_sale"],
  })
  .refine((d) => d.format === "deck" || d.card_name.length >= 1, {
    error: "Elige o escribe la carta.",
    path: ["card_name"],
  })
  .refine((d) => d.format !== "deck" || d.source_collection_id != null, {
    error: "Falta el deck de origen.",
    path: ["source_collection_id"],
  })
  .refine((d) => !d.for_sale || (d.price_cop != null && d.price_cop > 0), {
    error: "Ponle un precio a la venta.",
    path: ["price_cop"],
  })
  .refine((d) => d.kind !== "offer" || d.photo_paths.length > 0, {
    error: "Sube al menos una foto real de la carta.",
    path: ["photo_paths"],
  });

export async function createListing(
  input: CreateListingInput,
): Promise<CreateListingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Revisa los datos del anuncio.",
      field: first?.path[0] as keyof CreateListingInput | undefined,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para publicar." };

  const v = parsed.data;
  const isDeck = v.format === "deck";
  const isOffer = v.kind === "offer";
  const forSale = isOffer && v.for_sale;
  const forTrade = isOffer && v.for_trade;

  let resolved: {
    card_id: string | null;
    custom_card_name: string | null;
    card_name: string;
    set_name: string | null;
    image_url: string | null;
  };

  if (isDeck) {
    const { data: deck } = await supabase
      .from("collections")
      .select("id, name, kind, cover_image_url")
      .eq("id", v.source_collection_id!)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!deck || deck.kind !== "deck") {
      return { ok: false, error: "Ese deck ya no existe.", field: "source_collection_id" };
    }
    resolved = {
      card_id: null,
      custom_card_name: deck.name,
      card_name: deck.name,
      set_name: null,
      image_url: deck.cover_image_url,
    };
  } else {
    try {
      resolved = await resolveCard({
        cardId: v.card_id,
        customName: v.custom_card_name,
        cardNameHint: v.card_name,
        imageHint: v.card_image,
      });
    } catch {
      return { ok: false, error: "No se pudo identificar la carta." };
    }
  }

  const payload: Record<string, Json> = {
    kind: v.kind,
    format: v.format,
    for_sale: forSale,
    for_trade: forTrade,
    source_collection_item_id: v.source_collection_item_id ?? null,
    source_collection_id: isDeck ? (v.source_collection_id ?? null) : null,
    card_id: resolved.card_id,
    custom_card_name: resolved.custom_card_name,
    card_name: resolved.card_name,
    set_name: resolved.set_name,
    image_url: resolved.image_url,
    language: v.language,
    condition: v.condition || null,
    quantity: isDeck ? 1 : v.quantity,
    price_cop: forSale ? (v.price_cop ?? null) : null,
    price_negotiable: forSale ? v.price_negotiable : false,
    trade_for: forTrade ? (v.trade_for ?? null) : null,
    description: v.description || null,
    city: v.city,
    photo_paths: isOffer ? v.photo_paths : [],
  };

  const { data, error } = await supabase.rpc("create_listing", { payload });

  if (error || !data) {
    const msg = error?.message ?? "";
    return {
      ok: false,
      error: msg.includes("foto")
        ? "Este anuncio necesita al menos una foto real de la carta."
        : msg.includes("ciudad")
          ? "Elige tu ciudad."
          : "No se pudo publicar el anuncio. Intenta de nuevo.",
    };
  }

  const listingId = data as string;

  // Correo a quienes buscan esta carta (el aviso in-app lo hace el trigger).
  if (isOffer && resolved.card_id) {
    const cardId = resolved.card_id;
    const cardName = resolved.card_name;
    const cardImage = resolved.image_url;
    const meId = user.id;
    after(async () => {
      const admin = createAdminClient();
      const { data: wants } = await admin
        .from("listings")
        .select("user_id")
        .eq("kind", "want")
        .eq("status", "active")
        .eq("card_id", cardId)
        .neq("user_id", meId);
      for (const w of wants ?? []) {
        await emailUser(w.user_id, {
          subject: "Publicaron una carta que buscas",
          heading: `Publicaron "${cardName}"`,
          lines: [
            `Alguien publicó un anuncio de "${cardName}", que tienes en tu lista de "busco".`,
          ],
          ctaLabel: "Ver el anuncio",
          ctaPath: `/anuncio/${listingId}`,
          imageUrl: cardImage,
          imageAlt: cardName,
        });
      }
    });
  }

  revalidatePath("/coleccion");
  if (isDeck && v.source_collection_id) {
    revalidatePath(`/coleccion/${v.source_collection_id}`);
  }
  revalidatePath("/panel");
  return { ok: true, id: listingId };
}

// --- Gestión de anuncios propios (desde /panel) --------------------------

export type ListingActionResult = { ok: true } | { ok: false; error: string };

const MANAGE_STATUS = ["active", "reserved", "closed"] as const;

async function ownListingMutation(
  id: string,
  patch: ListingUpdate,
  extraEq?: { column: string; value: string },
): Promise<ListingActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Anuncio no válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  let q = supabase
    .from("listings")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (extraEq) q = q.eq(extraEq.column, extraEq.value);

  const { error } = await q;
  if (error) return { ok: false, error: "No se pudo actualizar el anuncio." };

  revalidatePath("/panel");
  revalidatePath("/explorar");
  revalidatePath(`/anuncio/${id}`);
  return { ok: true };
}

/** Cambia el estado del anuncio: activo / reservado / cerrado. */
export async function setListingStatus(
  id: string,
  status: (typeof MANAGE_STATUS)[number],
): Promise<ListingActionResult> {
  if (!MANAGE_STATUS.includes(status)) {
    return { ok: false, error: "Estado no válido." };
  }
  return ownListingMutation(id, { status });
}

const BUMP_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 h

/** Sube el anuncio al tope del feed (sólo si está activo y no se subió hace poco). */
export async function bumpListing(id: string): Promise<ListingActionResult> {
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Anuncio no válido." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  const { data: row } = await supabase
    .from("listings")
    .select("bumped_at, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return { ok: false, error: "Anuncio no encontrado." };
  if (row.status !== "active") {
    return { ok: false, error: "Solo puedes subir anuncios activos." };
  }
  if (Date.now() - new Date(row.bumped_at).getTime() < BUMP_COOLDOWN_MS) {
    return {
      ok: false,
      error: "Ya lo subiste hace poco. Puedes volver a subirlo en unas horas.",
    };
  }

  return ownListingMutation(id, { bumped_at: new Date().toISOString() });
}

/** Baja el anuncio (borrado suave: queda como "removed"). */
export async function removeListing(id: string): Promise<ListingActionResult> {
  return ownListingMutation(id, { status: "removed" });
}

/** Reemplaza el set de fotos de un anuncio propio (vía RPC SECURITY DEFINER). */
export async function saveListingPhotos(
  listingId: string,
  paths: string[],
): Promise<ListingActionResult> {
  if (!z.uuid().safeParse(listingId).success) {
    return { ok: false, error: "Anuncio no válido." };
  }
  const clean = paths.map((p) => p.trim()).filter(Boolean).slice(0, 6);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  const { error } = await supabase.rpc("replace_listing_photos", {
    p_listing_id: listingId,
    p_paths: clean,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("foto")
        ? "Un anuncio de venta o cambio necesita al menos una foto."
        : "No se pudieron guardar las fotos.",
    };
  }

  revalidatePath("/panel");
  revalidatePath("/explorar");
  revalidatePath(`/anuncio/${listingId}`);
  return { ok: true };
}

// --- Editar un anuncio propio -----------------------------------------------

export type EditListingState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const editSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["offer", "want"]),
    for_sale: z.boolean(),
    for_trade: z.boolean(),
    language: z.enum(LANG).catch("es"),
    condition: z.union([z.enum(COND), z.literal("")]).default(""),
    quantity: z.coerce.number().int().min(1).max(999).catch(1),
    price_cop: z.coerce.number().int().min(0).max(99_999_999).nullish(),
    price_negotiable: z.boolean(),
    trade_for: z.string().trim().max(500).nullish(),
    description: z.string().trim().max(1000).nullish(),
  })
  .refine((d) => d.kind !== "offer" || d.for_sale || d.for_trade, {
    error: "Marca si la vendes, la cambias, o ambas.",
    path: ["for_sale"],
  })
  .refine((d) => !d.for_sale || (d.price_cop != null && d.price_cop > 0), {
    error: "Ponle un precio a la venta.",
    path: ["price_cop"],
  });

export async function updateListing(
  _prev: EditListingState,
  formData: FormData,
): Promise<EditListingState> {
  const raw = {
    id: String(formData.get("id") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    for_sale: formData.get("for_sale") === "on",
    for_trade: formData.get("for_trade") === "on",
    language: String(formData.get("language") ?? "es"),
    condition: String(formData.get("condition") ?? ""),
    quantity: formData.get("quantity"),
    price_cop: formData.get("price_cop") || null,
    price_negotiable: formData.get("price_negotiable") === "on",
    trade_for: formData.get("trade_for"),
    description: formData.get("description"),
  };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Revisa los datos.", fieldErrors };
  }

  const v = parsed.data;
  const isOffer = v.kind === "offer";
  const forSale = isOffer && v.for_sale;
  const forTrade = isOffer && v.for_trade;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión." };

  const patch: ListingUpdate = {
    for_sale: forSale,
    for_trade: forTrade,
    language: v.language,
    condition: v.condition || null,
    quantity: v.quantity,
    price_cop: forSale ? (v.price_cop ?? null) : null,
    price_negotiable: forSale ? v.price_negotiable : false,
    trade_for: forTrade ? (v.trade_for?.trim() || null) : null,
    description: v.description?.trim() || null,
  };

  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", v.id)
    .eq("user_id", user.id);

  if (error) {
    return { error: "No se pudo guardar. Revisa los datos e intenta de nuevo." };
  }

  revalidatePath("/panel");
  revalidatePath("/explorar");
  revalidatePath(`/anuncio/${v.id}`);
  redirect("/panel");
}
