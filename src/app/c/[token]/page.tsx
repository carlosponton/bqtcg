import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { conditionLabel, languageLabel } from "@/lib/listings";
import { CardThumb } from "@/components/cards/card-thumb";

type SharedCollection = {
  collection: {
    name: string;
    description: string | null;
    visibility: "unlisted" | "public";
  };
  owner: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  items: Array<{
    id: string;
    card_name: string;
    set_name: string | null;
    image_url: string | null;
    language: string;
    condition: string | null;
    quantity: number;
    note: string | null;
  }>;
};

async function load(token: string): Promise<SharedCollection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_collection_by_token", {
    p_token: token,
  });
  if (error || !data) return null;
  return data as unknown as SharedCollection;
}

export async function generateMetadata({
  params,
}: PageProps<"/c/[token]">): Promise<Metadata> {
  const { token } = await params;
  const col = await load(token);
  if (!col) return { title: "Colección no encontrada" };
  const owner = col.owner.display_name || col.owner.username || "un jugador";
  return {
    title: `${col.collection.name} — colección de ${owner}`,
    description:
      col.collection.description ??
      `${col.items.length} cartas en la colección "${col.collection.name}" de ${owner}.`,
  };
}

export default async function SharedCollectionPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = await params;
  const col = await load(token);
  if (!col) notFound();

  const owner = col.owner.display_name || col.owner.username || "Un jugador";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {col.collection.name}
        </h1>
        {col.collection.description ? (
          <p className="mt-1 text-sm text-pretty">{col.collection.description}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {owner} · {col.owner.city || "Barranquilla"} · {col.items.length}{" "}
          {col.items.length === 1 ? "carta" : "cartas"}
        </p>
      </header>

      {col.items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Esta colección está vacía por ahora.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {col.items.map((it) => (
            <li key={it.id} className="flex gap-3 rounded-lg border p-3">
              <CardThumb
                src={it.image_url}
                alt={it.card_name}
                className="w-14 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium leading-tight">{it.card_name}</p>
                {it.set_name ? (
                  <p className="text-xs text-muted-foreground">{it.set_name}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  x{it.quantity} · {languageLabel(it.language)}
                  {it.condition ? ` · ${conditionLabel(it.condition)}` : ""}
                </p>
                {it.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">{it.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
