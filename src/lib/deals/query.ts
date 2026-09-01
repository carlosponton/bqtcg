import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listingPhotoUrl } from "@/lib/listings";
import type { DealStatus } from "@/types/database";

type Counterparty = {
  username: string | null;
  display_name: string | null;
  /** Sólo se rellena si el trato está `confirmed` o `completed`. */
  whatsapp: string | null;
};

export type DealListItem = {
  id: string;
  status: DealStatus;
  quantity: number;
  role: "seller" | "buyer";
  iConfirmed: boolean;
  otherConfirmed: boolean;
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  listing: { id: string; card_name: string; image: string | null } | null;
  counterparty: Counterparty | null;
  myReview: { rating: number; comment: string | null } | null;
};

type DealRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  status: DealStatus;
  quantity: number;
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
  listings: {
    id: string;
    card_name: string;
    image_url: string | null;
    listing_photos: { storage_path: string; sort_order: number }[] | null;
  } | null;
};

/** Estados en los que ambas partes ya pueden ver el WhatsApp del otro. */
const CONTACT_STATUSES: DealStatus[] = ["confirmed", "completed"];

function listingThumb(l: DealRow["listings"]): string | null {
  if (!l) return null;
  const photo = [...(l.listing_photos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0];
  return photo ? listingPhotoUrl(photo.storage_path) : (l.image_url ?? null);
}

export async function listMyDeals(userId: string): Promise<DealListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      "id, listing_id, seller_id, buyer_id, status, quantity, seller_confirmed, buyer_confirmed, confirmed_at, completed_at, created_at, listings(id, card_name, image_url, listing_photos(storage_path, sort_order))",
    )
    .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as DealRow[];

  // Mis reseñas ya dejadas para estos tratos cerrados (para prellenar / mostrar).
  const reviews = new Map<string, { rating: number; comment: string | null }>();
  const completedIds = rows
    .filter((r) => r.status === "completed")
    .map((r) => r.id);
  if (completedIds.length > 0) {
    const { data: myReviews } = await supabase
      .from("reviews")
      .select("deal_id, rating, comment")
      .eq("reviewer_id", userId)
      .in("deal_id", completedIds);
    for (const rv of myReviews ?? []) {
      reviews.set(rv.deal_id, { rating: rv.rating, comment: rv.comment });
    }
  }

  const otherIds = [
    ...new Set(
      rows.map((r) => (r.seller_id === userId ? r.buyer_id : r.seller_id)),
    ),
  ];
  const people = new Map<
    string,
    { username: string | null; display_name: string | null; whatsapp: string | null; show_whatsapp: boolean }
  >();
  if (otherIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, whatsapp, show_whatsapp")
      .in("id", otherIds);
    for (const p of profs ?? []) {
      people.set(p.id, {
        username: p.username,
        display_name: p.display_name,
        whatsapp: p.whatsapp,
        show_whatsapp: p.show_whatsapp === true,
      });
    }
  }

  return rows.map((r) => {
    const role: "seller" | "buyer" =
      r.seller_id === userId ? "seller" : "buyer";
    const otherId = role === "seller" ? r.buyer_id : r.seller_id;
    const p = people.get(otherId);
    const showContact = CONTACT_STATUSES.includes(r.status);
    return {
      id: r.id,
      status: r.status,
      quantity: r.quantity ?? 1,
      role,
      iConfirmed: role === "seller" ? r.seller_confirmed : r.buyer_confirmed,
      otherConfirmed:
        role === "seller" ? r.buyer_confirmed : r.seller_confirmed,
      createdAt: r.created_at,
      confirmedAt: r.confirmed_at,
      completedAt: r.completed_at,
      listing: r.listings
        ? {
            id: r.listings.id,
            card_name: r.listings.card_name,
            image: listingThumb(r.listings),
          }
        : null,
      counterparty: p
        ? {
            username: p.username,
            display_name: p.display_name,
            whatsapp:
              showContact && p.show_whatsapp && p.whatsapp ? p.whatsapp : null,
          }
        : null,
      myReview: reviews.get(r.id) ?? null,
    };
  });
}

/**
 * ¿Existe un trato entre `userId` y `otherId` (en cualquier rol) en un estado
 * donde ya pueden verse el WhatsApp (`confirmed` o `completed`)?
 */
export async function hasActiveDealWith(
  userId: string,
  otherId: string,
): Promise<boolean> {
  if (!userId || !otherId || userId === otherId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("id")
    .in("status", CONTACT_STATUSES)
    .or(
      `and(seller_id.eq.${userId},buyer_id.eq.${otherId}),` +
        `and(seller_id.eq.${otherId},buyer_id.eq.${userId})`,
    )
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type MyDealForListing = {
  id: string;
  status: DealStatus;
  quantity: number;
  iAmSeller: boolean;
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
} | null;

/** El trato (no cancelado) entre el usuario y un anuncio, si existe. */
export async function getMyDealForListing(
  userId: string,
  listingId: string,
): Promise<MyDealForListing> {
  const supabase = await createClient();
  // El llamador nunca es el vendedor (se comprueba antes), así que basta con
  // buscar por `buyer_id`; el índice garantiza <= 1 trato no cancelado.
  const { data } = await supabase
    .from("deals")
    .select("id, status, quantity, seller_id, seller_confirmed, buyer_confirmed")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .neq("status", "cancelled")
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    quantity: data.quantity ?? 1,
    iAmSeller: data.seller_id === userId,
    sellerConfirmed: data.seller_confirmed,
    buyerConfirmed: data.buyer_confirmed,
  };
}
