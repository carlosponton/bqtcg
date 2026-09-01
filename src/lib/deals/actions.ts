"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailUser } from "@/lib/email/notify";

export type DealResult =
  | { ok: true; dealId?: string }
  | { ok: false; error: string };

const uuid = z.uuid();
const dealQty = z.coerce.number().int().min(1).max(999).catch(1);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type DealForEmail = {
  seller_id: string;
  buyer_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  quantity: number;
  listings: { card_name: string; image_url: string | null } | null;
};

/** " (N cartas)" cuando el trato cubre más de una; "" si es una sola. */
function qtyNote(quantity: number): string {
  return quantity > 1 ? ` (${quantity} cartas)` : "";
}

/** Correo a la contraparte del que acaba de actuar sobre el trato. */
async function emailDealCounterparty(dealId: string, actorId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select(
      "seller_id, buyer_id, status, quantity, listings(card_name, image_url)",
    )
    .eq("id", dealId)
    .maybeSingle();
  const deal = data as DealForEmail | null;
  if (!deal) return;

  const to = actorId === deal.seller_id ? deal.buyer_id : deal.seller_id;
  const card = deal.listings?.card_name ?? "una carta";
  const imageUrl = deal.listings?.image_url ?? null;

  if (deal.status === "confirmed") {
    await emailUser(to, {
      subject: "Trato aceptado",
      heading: "La otra persona aceptó el trato",
      lines: [
        `Se aceptó el trato por "${card}"${qtyNote(deal.quantity)}. Ya pueden ver el WhatsApp del otro para coordinar la entrega. Ciérrenlo cuando lo hayan hecho.`,
      ],
      ctaLabel: "Ver mis tratos",
      ctaPath: "/panel/tratos",
      imageUrl,
      imageAlt: card,
    });
  } else if (deal.status === "completed") {
    await emailUser(to, {
      subject: "Trato cerrado",
      heading: "El trato quedó cerrado",
      lines: [
        `Se cerró el trato por "${card}"${qtyNote(deal.quantity)}. Ya pueden dejarse una reseña.`,
      ],
      ctaLabel: "Ver mis tratos",
      ctaPath: "/panel/tratos",
      imageUrl,
      imageAlt: card,
    });
  } else if (deal.status === "cancelled") {
    await emailUser(to, {
      subject: "Cancelaron un trato",
      heading: "Se canceló un trato",
      lines: [`La otra persona canceló el trato por "${card}".`],
      ctaLabel: "Ver mis tratos",
      ctaPath: "/panel/tratos",
      imageUrl,
      imageAlt: card,
    });
  }
}

/** El interesado registra un trato a partir de un anuncio ajeno. */
export async function startDeal(
  listingId: string,
  quantity = 1,
): Promise<DealResult> {
  if (!uuid.safeParse(listingId).success) {
    return { ok: false, error: "Anuncio no válido." };
  }
  const qty = dealQty.parse(quantity);
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Inicia sesión para registrar el trato." };

  const { data, error } = await supabase.rpc("create_deal", {
    p_listing_id: listingId,
    p_quantity: qty,
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

  const dealId = data as string;

  after(async () => {
    const admin = createAdminClient();
    const { data: d } = await admin
      .from("deals")
      .select("seller_id, listings(card_name, image_url)")
      .eq("id", dealId)
      .maybeSingle();
    const deal = d as
      | {
          seller_id: string;
          listings: { card_name: string; image_url: string | null } | null;
        }
      | null;
    if (!deal) return;
    const card = deal.listings?.card_name ?? "una carta";
    await emailUser(deal.seller_id, {
      subject: "Registraron un trato contigo",
      heading: "Alguien registró un trato contigo",
      lines: [
        `Registraron un trato por "${card}"${qtyNote(qty)}. Confírmalo si es correcto.`,
      ],
      ctaLabel: "Ver el trato",
      ctaPath: "/panel/tratos",
      imageUrl: deal.listings?.image_url ?? null,
      imageAlt: card,
    });
  });

  revalidatePath(`/anuncio/${listingId}`);
  revalidatePath("/panel/tratos");
  return { ok: true, dealId };
}

async function dealRpc(
  fn: "confirm_deal" | "complete_deal" | "cancel_deal",
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

  const actorId = user.id;
  after(() => emailDealCounterparty(dealId, actorId));

  revalidatePath("/panel/tratos");
  revalidatePath("/panel");

  const { data: d } = await supabase
    .from("deals")
    .select("listing_id, status")
    .eq("id", dealId)
    .maybeSingle();
  if (d?.listing_id) revalidatePath(`/anuncio/${d.listing_id}`);

  // Cerrar el trato descuenta/cierra el anuncio (trigger
  // `deals_settle_listing`): refresca los feeds públicos.
  if (fn === "complete_deal" && d?.status === "completed") {
    revalidatePath("/");
    revalidatePath("/explorar");
  }

  return { ok: true };
}

export async function confirmDeal(dealId: string): Promise<DealResult> {
  return dealRpc("confirm_deal", dealId);
}

export async function completeDeal(dealId: string): Promise<DealResult> {
  return dealRpc("complete_deal", dealId);
}

export async function cancelDeal(dealId: string): Promise<DealResult> {
  return dealRpc("cancel_deal", dealId);
}
