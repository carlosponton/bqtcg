import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EditProfileForm } from "@/components/profile/edit-profile-form";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/perfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, display_name, bio, city, whatsapp, show_whatsapp, onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/bienvenido");

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Editar perfil</h1>
        {profile.username ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/u/${profile.username}`}>Ver perfil público</Link>
          </Button>
        ) : null}
      </div>

      <EditProfileForm
        username={profile.username}
        defaults={{
          display_name: profile.display_name,
          bio: profile.bio,
          city: profile.city,
          whatsapp: profile.whatsapp,
          show_whatsapp: profile.show_whatsapp,
        }}
      />
    </div>
  );
}
