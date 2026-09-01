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
  const deckId = typeof sp.deck === "string" ? sp.deck : null;
  const modo =
    sp.modo === "sale" || sp.modo === "trade" || sp.modo === "want"
      ? sp.modo
      : undefined;

  let deck: { id: string; name: string; coverImage: string | null } | null =
    null;

  if (deckId) {
    const { data } = await supabase
      .from("collections")
      .select("id, name, kind, cover_image_url")
      .eq("id", deckId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data || data.kind !== "deck") redirect("/coleccion");

    const { count } = await supabase
      .from("collection_items")
      .select("id", { count: "exact", head: true })
      .eq("collection_id", deckId);
    if (!count) redirect(`/coleccion/${deckId}`);

    deck = { id: data.id, name: data.name, coverImage: data.cover_image_url };
  }

  let fromItem: {
    id: string;
    card_id: string | null;
    custom_card_name: string | null;
    card_name: string;
    image_url: string | null;
    language: string;
    condition: string | null;
  } | null = null;

  if (desde && !deck) {
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
          <CardTitle>{deck ? "Publicar deck" : "Publicar anuncio"}</CardTitle>
          <CardDescription>
            {deck
              ? "Vende o cambia el deck completo. Necesitas al menos una foto real."
              : "Vende, cambia o marca lo que buscas. Venta y cambio requieren al menos una foto real de la carta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublishForm
            userId={user.id}
            defaultCity={profile.city}
            defaultMode={modo}
            fromCollectionItem={fromItem}
            deck={deck}
          />
        </CardContent>
      </Card>
    </div>
  );
}
