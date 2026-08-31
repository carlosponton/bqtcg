"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { emailUser } from "@/lib/email/notify";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  dealId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export async function submitReview(input: {
  dealId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Elige una calificación de 1 a 5." };
  }
  const { dealId, rating, comment } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, seller_id, buyer_id")
    .eq("id", dealId)
    .maybeSingle();

  if (!deal) return { ok: false, error: "Trato no encontrado." };
  if (deal.status !== "confirmed") {
    return { ok: false, error: "Sólo puedes reseñar tratos confirmados." };
  }
  if (user.id !== deal.seller_id && user.id !== deal.buyer_id) {
    return { ok: false, error: "No participaste en este trato." };
  }

  const revieweeId =
    deal.seller_id === user.id ? deal.buyer_id : deal.seller_id;

  const { error } = await supabase.from("reviews").upsert(
    {
      deal_id: dealId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment?.trim() ? comment.trim() : null,
    },
    { onConflict: "deal_id,reviewer_id" },
  );

  if (error) {
    return { ok: false, error: "No se pudo guardar la reseña." };
  }

  const { data: reviewee } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", revieweeId)
    .maybeSingle();

  after(() =>
    emailUser(revieweeId, {
      subject: "Te dejaron una reseña",
      heading: "Recibiste una reseña",
      lines: [
        `Alguien con quien cerraste un trato te dejó una reseña (${rating}/5).`,
      ],
      ctaLabel: "Ver mi perfil",
      ctaPath: reviewee?.username ? `/u/${reviewee.username}` : "/panel/tratos",
    }),
  );

  revalidatePath("/panel/tratos");
  if (reviewee?.username) revalidatePath(`/u/${reviewee.username}`);
  return { ok: true };
}

export async function deleteReview(dealId: string): Promise<ReviewResult> {
  if (!z.uuid().safeParse(dealId).success) {
    return { ok: false, error: "Trato no válido." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión." };

  const { data: existing } = await supabase
    .from("reviews")
    .select("reviewee_id")
    .eq("deal_id", dealId)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("deal_id", dealId)
    .eq("reviewer_id", user.id);

  if (error) return { ok: false, error: "No se pudo borrar la reseña." };

  if (existing?.reviewee_id) {
    const { data: reviewee } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", existing.reviewee_id)
      .maybeSingle();
    if (reviewee?.username) revalidatePath(`/u/${reviewee.username}`);
  }
  revalidatePath("/panel/tratos");
  return { ok: true };
}
