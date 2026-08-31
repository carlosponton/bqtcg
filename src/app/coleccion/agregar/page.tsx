import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AddToCollectionForm } from "@/components/collection/add-to-collection-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Agregar carta" };

export default async function AgregarCartaPage({
  searchParams,
}: PageProps<"/coleccion/agregar">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/coleccion");

  const sp = await searchParams;
  const collectionId = typeof sp.c === "string" ? sp.c : null;
  if (!collectionId) redirect("/coleccion");

  const { data: collection } = await supabase
    .from("collections")
    .select("id, name")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!collection) redirect("/coleccion");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Agregar carta</CardTitle>
          <CardDescription>
            A la colección <span className="font-medium">{collection.name}</span>.
            Sin precio ni foto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddToCollectionForm collectionId={collection.id} />
        </CardContent>
      </Card>
    </div>
  );
}
