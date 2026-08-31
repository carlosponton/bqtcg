"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { REPORT_REASON_VALUES } from "@/lib/reports";

export type ReportResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  targetType: z.enum(["listing", "user"]),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASON_VALUES),
  detail: z.string().trim().max(1000).optional(),
});

export async function submitReport(input: {
  targetType: "listing" | "user";
  targetId: string;
  reason: string;
  detail?: string;
}): Promise<ReportResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Elige un motivo válido." };
  }
  const { targetType, targetId, reason, detail } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para reportar." };

  if (targetType === "user" && targetId === user.id) {
    return { ok: false, error: "No puedes reportarte a ti mismo." };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_listing_id: targetType === "listing" ? targetId : null,
    target_user_id: targetType === "user" ? targetId : null,
    reason,
    detail: detail?.trim() ? detail.trim() : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya enviaste un reporte sobre esto." };
    }
    return { ok: false, error: "No se pudo enviar el reporte." };
  }

  return { ok: true };
}
