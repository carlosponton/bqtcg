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
  status: "pending" | "confirmed" | "cancelled";
  listings: { card_name: string } | null;
};

/** Correo a la contraparte del que acaba de actuar sobre el trato. */
async function emailDealCounterparty(dealId: string, actorId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select("seller_id, buyer_id, status, listings(card_name)")
    .eq("id", dealId)
    .maybeSingle();
  const deal = data as DealForEmail | null;
  if (!deal) return;

  const to = actorId === deal.seller_id ? deal.buyer_id : deal.seller_id;
  const card = deal.listings?.card_name ?? "una carta";

  if (deal.status === "confirmed") {
    await emailUser(to, {
      subject: "Trato confirmado",
      heading: "El trato quedó confirmado",
      lines: [`Se confirmó el trato por "${card}". Ya pueden dejarse una reseña.`],
      ctaLabel: "Ver mis tratos",
      ctaPath: "/panel/tratos",
    });
  } else if (deal.status === "cancelled") {
    await emailUser(to, {
      subject: "Cancelaron un trato",
      heading: "Se canceló un trato",
      lines: [`La otra persona canceló el trato por "${card}".`],
      ctaLabel: "Ver mis tratos",
      ctaPath: "/panel/tratos",
    });
  }
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

  const dealId = data as string;

  after(async () => {
    const admin = createAdminClient();
    const { data: d } = await admin
      .from("deals")
      .select("seller_id, listings(card_name)")
      .eq("id", dealId)
      .maybeSingle();
    const deal = d as { seller_id: string; listings: { card_name: string } | null } | null;
    if (!deal) return;
    await emailUser(deal.seller_id, {
      subject: "Registraron un trato contigo",
      heading: "Alguien registró un trato contigo",
      lines: [
        `Registraron un trato por "${deal.listings?.card_name ?? "una carta"}". Confírmalo si es correcto.`,
      ],
      ctaLabel: "Ver el trato",
      ctaPath: "/panel/tratos",
    });
  });

  revalidatePath(`/anuncio/${listingId}`);
  revalidatePath("/panel/tratos");
  return { ok: true, dealId };
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

  const actorId = user.id;
  after(() => emailDealCounterparty(dealId, actorId));

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
