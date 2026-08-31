"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { resolveCard } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import type { CollectionVisibility } from "@/types/database";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const LANG = ["es", "en", "jp", "pt", "fr", "de", "it", "other"] as const;
const COND = ["M", "NM", "LP", "MP", "HP", "DMG", "graded"] as const;
const VIS = ["private", "unlisted", "public"] as const;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coleccion");
  return { supabase, user };
}

// --- Colecciones ---------------------------------------------------------

const collectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Ponle un nombre." })
    .max(60, { error: "Máximo 60 caracteres." }),
  description: z.string().trim().max(280).optional(),
  visibility: z.enum(VIS).catch("private"),
});

export async function createCollection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = collectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    visibility: formData.get("visibility") ?? "private",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      visibility: parsed.data.visibility,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No se pudo crear la colección." };
  }

  revalidatePath("/coleccion");
  redirect(`/coleccion/${data.id}`);
}

export async function renameCollection(formData: FormData) {
  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  if (typeof id !== "string" || name.length < 1 || name.length > 60) return;

  const { supabase, user } = await requireUser();
  await supabase
    .from("collections")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/coleccion");
  revalidatePath(`/coleccion/${id}`);
}

export async function deleteCollection(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const { supabase, user } = await requireUser();
  // La colección por defecto no se puede borrar (RLS lo impide igual).
  await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_default", false);

  revalidatePath("/coleccion");
  redirect("/coleccion");
}

export async function setCollectionVisibility(
  collectionId: string,
  visibility: CollectionVisibility,
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("collections")
    .update({ visibility })
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const };
  revalidatePath("/coleccion");
  revalidatePath(`/coleccion/${collectionId}`);
  return { ok: true as const };
}

// --- Cartas dentro de una colección ------------------------------------

const addSchema = z.object({
  collection_id: z.uuid({ error: "Colección no válida." }),
  card_id: z.string().trim().optional(),
  custom_card_name: z.string().trim().max(120).optional(),
  card_name: z
    .string()
    .trim()
    .min(1, { error: "Elige una carta del catálogo o escríbela a mano." })
    .max(160),
  card_image: z.string().trim().optional(),
  language: z.enum(LANG).catch("es"),
  condition: z.union([z.enum(COND), z.literal("")]).optional(),
  quantity: z.coerce.number().int().min(1).max(999).catch(1),
  note: z.string().trim().max(280).optional(),
});

export async function addToCollection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const v = parsed.data;

  let resolved;
  try {
    resolved = await resolveCard({
      cardId: v.card_id,
      customName: v.custom_card_name,
      cardNameHint: v.card_name,
      imageHint: v.card_image,
    });
  } catch {
    return { error: "No se pudo identificar la carta. Intenta de nuevo." };
  }

  const { error } = await supabase.from("collection_items").insert({
    user_id: user.id,
    collection_id: v.collection_id,
    card_id: resolved.card_id,
    custom_card_name: resolved.custom_card_name,
    card_name: resolved.card_name,
    set_name: resolved.set_name,
    image_url: resolved.image_url,
    language: v.language,
    condition: v.condition || null,
    quantity: v.quantity,
    note: v.note || null,
  });

  if (error) {
    return { error: "No se pudo agregar a la colección." };
  }

  revalidatePath(`/coleccion/${v.collection_id}`);
  redirect(`/coleccion/${v.collection_id}`);
}

export async function removeCollectionItem(formData: FormData) {
  const id = formData.get("id");
  const collectionId = formData.get("collection_id");
  if (typeof id !== "string") return;

  const { supabase, user } = await requireUser();
  await supabase
    .from("collection_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (typeof collectionId === "string") {
    revalidatePath(`/coleccion/${collectionId}`);
  }
}

export async function moveCollectionItem(formData: FormData) {
  const id = formData.get("id");
  const target = formData.get("target_collection_id");
  const from = formData.get("collection_id");
  if (typeof id !== "string" || typeof target !== "string") return;

  const { supabase, user } = await requireUser();
  await supabase
    .from("collection_items")
    .update({ collection_id: target })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath(`/coleccion/${target}`);
  if (typeof from === "string") revalidatePath(`/coleccion/${from}`);
}
