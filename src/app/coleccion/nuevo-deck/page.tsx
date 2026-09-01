import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewDeckForm } from "@/components/collection/new-deck-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Nuevo deck" };

export default async function NuevoDeckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coleccion/nuevo-deck");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/bienvenido");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo deck</CardTitle>
          <CardDescription>
            Una lista de cartas con nombre y portada que luego puedes vender o
            cambiar completa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewDeckForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
