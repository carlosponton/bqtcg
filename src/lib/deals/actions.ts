"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type DealResult =
  | { ok: true; dealId?: string }
  | { ok: false; error: string };

const uuid = z.uuid();

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** El interesado registra un trato a partir de un anuncio ajeno. */
export async function startDeal(listingId: string): Promise<DealResult> {
  if (!uuid.safeParse(listingId).success) {
    return { ok: false, error: "Anuncio no válido." };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Inicia sesión para registrar el trato." };

  const { data, error } = await supabase.rpc("create_deal", {
    p_listing_id: listingId,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Ya registraste un trato para este anuncio."
          : error.message || "No se pudo registrar el trato.",
    };
  }

  revalidatePath(`/anuncio/${listingId}`);
  revalidatePath("/panel/tratos");
  return { ok: true, dealId: data as string };
}

async function dealRpc(
  fn: "confirm_deal" | "cancel_deal",
  dealId: string,
): Promise<DealResult> {
  if (!uuid.safeParse(dealId).success) {
    return { ok: false, error: "Trato no válido." };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  const { error } = await supabase.rpc(fn, { p_deal_id: dealId });
  if (error) {
    return { ok: false, error: error.message || "No se pudo actualizar el trato." };
  }

  revalidatePath("/panel/tratos");
  revalidatePath("/panel");
  return { ok: true };
}

export async function confirmDeal(dealId: string): Promise<DealResult> {
  return dealRpc("confirm_deal", dealId);
}

export async function cancelDeal(dealId: string): Promise<DealResult> {
  return dealRpc("cancel_deal", dealId);
}
