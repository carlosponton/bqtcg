"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/auth";

export type ProfileFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    bio: formData.get("bio") ?? "",
    city: formData.get("city") ?? "Barranquilla",
    whatsapp: formData.get("whatsapp") ?? "",
    show_whatsapp: formData.get("show_whatsapp") === "on",
    email_notifications: formData.get("email_notifications") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/perfil");

  const { display_name, bio, city, whatsapp, show_whatsapp, email_notifications } =
    parsed.data;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      display_name,
      bio: bio?.trim() ? bio.trim() : null,
      city,
      whatsapp: whatsapp || null,
      show_whatsapp,
      email_notifications,
    })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();

  if (error) {
    return { error: `No se pudo guardar: ${error.message}` };
  }

  revalidatePath("/perfil");
  if (profile?.username) revalidatePath(`/u/${profile.username}`);
  return { ok: true };
}
