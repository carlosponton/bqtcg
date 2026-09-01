import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";
import { CollectionAdmin } from "@/components/collection/collection-admin";
import { CollectionItemCard } from "@/components/collection/collection-item-card";
import { CollectionVisibility } from "@/components/collection/collection-visibility";
import { DeckCover } from "@/components/collection/deck-cover";
import { VIS_META } from "@/components/collection/collection-card";

export async function generateMetadata({
  params,
}: PageProps<"/coleccion/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.name ?? "Colección" };
}

export default async function CollectionDetailPage({
  params,
}: PageProps<"/coleccion/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/coleccion/${id}`);

  const { data: collection } = await supabase
    .from("collections")
    .select(
      "id, name, visibility, kind, cover_card_name, cover_image_url, share_token, is_default",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!collection) notFound();

  const isDeck = collection.kind === "deck";

  const [{ data: items }, { data: allCollections }, { data: activeListings }] =
    await Promise.all([
      supabase
        .from("collection_items")
        .select("*")
        .eq("collection_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("collections")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("listings")
        .select(
          "id, status, format, for_sale, for_trade, source_collection_item_id, source_collection_id",
        )
        .eq("user_id", user.id)
        .in("status", ["active", "reserved"]),
    ]);

  const listedMap = new Map<
    string,
    { for_sale: boolean; for_trade: boolean }
  >();
  for (const l of activeListings ?? []) {
    if (!l.source_collection_item_id) continue;
    const prev = listedMap.get(l.source_collection_item_id);
    listedMap.set(l.source_collection_item_id, {
      for_sale: Boolean(prev?.for_sale) || l.for_sale,
      for_trade: Boolean(prev?.for_trade) || l.for_trade,
    });
  }

  const deckListing =
    (activeListings ?? []).find(
      (l) => l.format === "deck" && l.source_collection_id === id,
    ) ?? null;

  const otherCollections = (allCollections ?? []).filter((c) => c.id !== id);
  const Icon = VIS_META[collection.visibility].icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/coleccion"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Mis colecciones
      </Link>

      <div className="mt-2 mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {isDeck ? (
            <CardThumb
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-14 shrink-0"
            />
          ) : null}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {!isDeck ? (
                <Icon className="size-5 text-muted-foreground" />
              ) : null}
              {collection.name}
            </h1>
            {isDeck ? (
              <p className="text-sm text-muted-foreground">
                Deck · {items?.length ?? 0}{" "}
                {(items?.length ?? 0) === 1 ? "carta" : "cartas"}
              </p>
            ) : null}
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/coleccion/agregar?c=${collection.id}`}>
            Agregar carta
          </Link>
        </Button>
      </div>

      {isDeck ? (
        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          {deckListing ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                Este deck ya está publicado
                {deckListing.status === "reserved" ? " (reservado)" : ""}.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/anuncio/${deckListing.id}`}>Ver anuncio</Link>
              </Button>
            </div>
          ) : (items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Agrega cartas al deck y luego podrás venderlo o cambiarlo completo.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Publica el deck completo: se guardará una copia de estas{" "}
                {items?.length} cartas con el anuncio.
              </p>
              <Button asChild size="sm">
                <Link href={`/publicar?deck=${collection.id}`}>
                  Vender o cambiar este deck
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <CollectionVisibility
          collectionId={collection.id}
          visibility={collection.visibility}
          shareToken={collection.share_token}
        />
        <CollectionAdmin
          collectionId={collection.id}
          name={collection.name}
          isDefault={collection.is_default}
          isDeck={isDeck}
        />
        {isDeck ? (
          <DeckCover
            deckId={collection.id}
            userId={user.id}
            coverName={collection.cover_card_name}
            coverImage={collection.cover_image_url}
          />
        ) : null}
      </div>

      {items && items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <CollectionItemCard
              key={it.id}
              item={it}
              listing={listedMap.get(it.id) ?? null}
              otherCollections={otherCollections}
              hideListingActions={isDeck}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {isDeck ? "Este deck está vacío." : "Esta colección está vacía."}{" "}
          <Link
            href={`/coleccion/agregar?c=${collection.id}`}
            className="underline"
          >
            Agrega una carta
          </Link>
          .
        </p>
      )}
    </div>
  );
}
