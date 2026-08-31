import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para el servidor: Server Components, Server Actions y
 * Route Handlers. En Next.js 16 `cookies()` es asíncrono.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL(), SUPABASE_PUBLISHABLE_KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` se llamó desde un Server Component. Se puede ignorar si
          // el proxy (`src/proxy.ts`) está refrescando la sesión.
        }
      },
    },
  });
}
