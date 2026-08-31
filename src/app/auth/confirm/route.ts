import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Confirmación de correo (registro con email, cambio de correo, recuperación).
 *
 * Acepta los dos formatos posibles según cómo esté la plantilla del correo:
 *  - `?token_hash=...&type=...`  → plantilla con `{{ .TokenHash }}` (recomendado)
 *  - `?code=...`                 → plantilla con `{{ .ConfirmationURL }}` (PKCE)
 *
 * Si Supabase ya redirige con un error (`?error=...&error_code=...`), lo
 * reenviamos a /login con un mensaje legible.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Supabase devolvió un error antes de llegar aquí.
  const errParam = searchParams.get("error") ?? searchParams.get("error_code");
  if (errParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(describeError(errParam))}`,
    );
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "El enlace de confirmación no es válido o ya fue usado. Pide uno nuevo iniciando sesión.",
    )}`,
  );
}

function describeError(code: string): string {
  if (code.includes("expired")) {
    return "El enlace de confirmación expiró. Inicia sesión para recibir uno nuevo.";
  }
  if (code === "access_denied") {
    return "El enlace de confirmación no es válido o ya fue usado.";
  }
  return "No se pudo confirmar el correo. Intenta iniciar sesión de nuevo.";
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/bienvenido";
  }
  return value;
}
