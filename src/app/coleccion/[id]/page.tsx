import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CollectionAdmin } from "@/components/collection/collection-admin";
import { CollectionItemCard } from "@/components/collection/collection-item-card";
import { CollectionVisibility } from "@/components/collection/collection-visibility";
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
    .select("id, name, visibility, share_token, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!collection) notFound();

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
        .select("source_collection_item_id, for_sale, for_trade")
        .eq("user_id", user.id)
        .in("status", ["active", "reserved"])
        .not("source_collection_item_id", "is", null),
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

      <div className="mt-2 mb-4 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Icon className="size-5 text-muted-foreground" />
          {collection.name}
        </h1>
        <Button asChild size="sm">
          <Link href={`/coleccion/agregar?c=${collection.id}`}>
            Agregar carta
          </Link>
        </Button>
      </div>

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
        />
      </div>

      {items && items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <CollectionItemCard
              key={it.id}
              item={it}
              listing={listedMap.get(it.id) ?? null}
              otherCollections={otherCollections}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Esta colección está vacía.{" "}
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
