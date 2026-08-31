import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// En Next.js 16 el antiguo `middleware` se llama `proxy` y corre en Node.js.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - api (route handlers; manejan su propia auth)
     * - _next/static, _next/image (assets internos)
     * - favicon.ico
     * - archivos estáticos por extensión (imágenes, fuentes, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
