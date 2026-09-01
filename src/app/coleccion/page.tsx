import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/collection/collection-card";
import { DeckCard } from "@/components/collection/deck-card";
import { NewCollectionDialog } from "@/components/collection/new-collection-dialog";

export const metadata: Metadata = { title: "Mis colecciones" };

export default async function ColeccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coleccion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/bienvenido");

  const [{ data: collections }, { data: itemRows }, { data: deckListings }] =
    await Promise.all([
      supabase
        .from("collections")
        .select("id, name, visibility, kind, cover_image_url, is_default")
        .eq("user_id", user.id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("collection_items")
        .select("collection_id")
        .eq("user_id", user.id),
      supabase
        .from("listings")
        .select("source_collection_id")
        .eq("user_id", user.id)
        .eq("format", "deck")
        .in("status", ["active", "reserved"])
        .not("source_collection_id", "is", null),
    ]);

  const counts = new Map<string, number>();
  for (const r of itemRows ?? []) {
    counts.set(r.collection_id, (counts.get(r.collection_id) ?? 0) + 1);
  }
  const publishedDecks = new Set(
    (deckListings ?? [])
      .map((l) => l.source_collection_id)
      .filter((v): v is string => Boolean(v)),
  );

  const folders = (collections ?? []).filter((c) => c.kind !== "deck");
  const decks = (collections ?? []).filter((c) => c.kind === "deck");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mis colecciones</h1>
        <NewCollectionDialog />
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Agrupa tus cartas en carpetas. Cada una puede ser privada, compartible
        por enlace, o pública en tu perfil.
      </p>

      <div className="flex flex-col gap-3">
        {folders.map((c) => (
          <CollectionCard
            key={c.id}
            collection={c}
            itemCount={counts.get(c.id) ?? 0}
          />
        ))}
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mis decks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un deck completo con nombre y portada, listo para vender o cambiar.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/coleccion/nuevo-deck">Nuevo deck</Link>
        </Button>
      </div>

      {decks.length > 0 ? (
        <div className="flex flex-col gap-3">
          {decks.map((d) => (
            <DeckCard
              key={d.id}
              deck={d}
              itemCount={counts.get(d.id) ?? 0}
              published={publishedDecks.has(d.id)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no tienes decks. Crea uno con “Nuevo deck”.
        </p>
      )}
    </div>
  );
}
