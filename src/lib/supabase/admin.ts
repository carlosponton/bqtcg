import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con la **secret key** (`sb_secret_...`). Ignora RLS.
 * Úsalo SÓLO en el servidor y SÓLO para tareas de sistema
 * (ej. cachear el catálogo de TCGdex). Nunca lo expongas al cliente.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY. Complétala en .env.local (Supabase → Project Settings → API Keys → secret).",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL(), secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
