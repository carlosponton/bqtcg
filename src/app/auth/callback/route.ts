import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Punto de retorno del login con Google (OAuth / PKCE).
 * Supabase redirige aquí con `?code=...`; lo canjeamos por una sesión.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base =
        !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("No se pudo completar el inicio de sesión.")}`,
  );
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/bienvenido";
  }
  return value;
}
