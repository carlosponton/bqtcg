import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Completa tu perfil" };

export default async function BienvenidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/bienvenido");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/");

  const metaName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Bienvenido 👋</CardTitle>
          <CardDescription>
            Un par de datos y ya puedes empezar a publicar y contactar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaults={{ display_name: profile?.display_name ?? metaName }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
