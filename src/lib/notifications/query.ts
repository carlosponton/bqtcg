import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/database";

export type NotificationItem = Pick<
  Notification,
  "id" | "type" | "title" | "body" | "link" | "read_at" | "created_at"
>;

export async function getNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
