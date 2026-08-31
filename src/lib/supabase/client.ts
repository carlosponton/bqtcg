import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para componentes de cliente ("use client").
 */
export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL(),
    SUPABASE_PUBLISHABLE_KEY(),
  );
}
