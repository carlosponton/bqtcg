import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** Reseñas recibidas por un usuario (para su perfil público). */
export async function getReviewsForUser(userId: string): Promise<ReviewItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.reviewer_id))];
  const people = new Map<
    string,
    {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }
  >();
  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    for (const p of profs ?? []) {
      people.set(p.id, {
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    reviewer: people.get(r.reviewer_id) ?? null,
  }));
}
