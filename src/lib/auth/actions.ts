"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import {
  loginSchema,
  onboardingSchema,
  registerSchema,
} from "@/lib/validation/auth";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? SITE_URL;
}

export async function signInWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const redirectTo = sanitizeRedirect(formData.get("redirect"));
  if (redirectTo) redirect(redirectTo);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(profile?.onboarding_completed ? "/" : "/bienvenido");
}

export async function signUpWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/bienvenido` },
  });

  if (error) {
    return { error: error.message };
  }

  // Si la confirmación de correo está desactivada, Supabase ya devuelve sesión.
  if (data.session) {
    redirect("/bienvenido");
  }

  return {
    ok: true,
    message:
      "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada (y la carpeta de spam).",
  };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = sanitizeRedirect(formData.get("redirect")) ?? "/bienvenido";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("No se pudo iniciar con Google.")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("accept_terms") !== "on") {
    return {
      fieldErrors: {
        accept_terms: [
          "Debes aceptar los Términos y la Política de Tratamiento de Datos.",
        ],
      },
    };
  }

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    city: formData.get("city") ?? "Barranquilla",
    whatsapp: formData.get("whatsapp") ?? "",
    show_whatsapp: formData.get("show_whatsapp") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { username, display_name, city, whatsapp, show_whatsapp } = parsed.data;

  // Vía RPC SECURITY DEFINER: crea o actualiza la fila sin depender de los
  // grants por columna ni de que el trigger haya creado el perfil.
  const { error } = await supabase.rpc("complete_onboarding", {
    payload: {
      username,
      display_name,
      city,
      whatsapp: whatsapp || null,
      show_whatsapp,
    },
  });

  if (error) {
    if (error.code === "23505") {
      return {
        fieldErrors: { username: ["Ese nombre de usuario ya está tomado."] },
      };
    }
    return {
      error: `No se pudo guardar tu perfil: ${error.message}${
        error.hint ? ` (${error.hint})` : ""
      }`,
    };
  }

  // Sella la aceptación de Términos + Política de Datos.
  await supabase
    .from("profiles")
    .update({ tos_accepted_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/");
}

/** Sólo admite rutas internas ("/algo"), nunca URLs absolutas externas. */
function sanitizeRedirect(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
