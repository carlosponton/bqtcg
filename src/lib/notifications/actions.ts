"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type NotifResult = { ok: boolean };

async function user() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function markNotificationRead(id: string): Promise<NotifResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const { supabase, user: u } = await user();
  if (!u) return { ok: false };

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", u.id)
    .is("read_at", null);

  revalidatePath("/notificaciones");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotifResult> {
  const { supabase, user: u } = await user();
  if (!u) return { ok: false };

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", u.id)
    .is("read_at", null);

  revalidatePath("/notificaciones");
  return { ok: true };
}
