import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CollectionCard } from "@/components/collection/collection-card";
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

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, visibility, is_default")
    .eq("user_id", user.id)
    .order("sort_order")
    .order("created_at");

  const { data: itemRows } = await supabase
    .from("collection_items")
    .select("collection_id")
    .eq("user_id", user.id);

  const counts = new Map<string, number>();
  for (const r of itemRows ?? []) {
    counts.set(r.collection_id, (counts.get(r.collection_id) ?? 0) + 1);
  }

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
        {(collections ?? []).map((c) => (
          <CollectionCard
            key={c.id}
            collection={c}
            itemCount={counts.get(c.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
