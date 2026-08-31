import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PublishForm } from "@/components/listings/publish-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Publicar" };

export default async function PublicarPage({
  searchParams,
}: PageProps<"/publicar">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/publicar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("city, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/bienvenido");

  const sp = await searchParams;
  const desde = typeof sp.desde === "string" ? sp.desde : null;
  const modo =
    sp.modo === "sale" || sp.modo === "trade" || sp.modo === "want"
      ? sp.modo
      : undefined;

  let fromItem: {
    id: string;
    card_id: string | null;
    custom_card_name: string | null;
    card_name: string;
    image_url: string | null;
    language: string;
    condition: string | null;
  } | null = null;

  if (desde) {
    const { data } = await supabase
      .from("collection_items")
      .select(
        "id, card_id, custom_card_name, card_name, image_url, language, condition",
      )
      .eq("id", desde)
      .eq("user_id", user.id)
      .maybeSingle();
    fromItem = data;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Publicar anuncio</CardTitle>
          <CardDescription>
            Vende, cambia o marca lo que buscas. Venta y cambio requieren al
            menos una foto real de la carta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublishForm
            userId={user.id}
            defaultCity={profile.city}
            defaultMode={modo}
            fromCollectionItem={fromItem}
          />
        </CardContent>
      </Card>
    </div>
  );
}
