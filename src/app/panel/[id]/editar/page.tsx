import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EditListingForm } from "@/components/listings/edit-listing-form";
import { ListingPhotoManager } from "@/components/listings/listing-photo-manager";

export const metadata: Metadata = { title: "Editar anuncio" };

export default async function EditListingPage({
  params,
}: PageProps<"/panel/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/panel/${id}/editar`);

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, kind, format, for_sale, for_trade, card_name, set_name, image_url, languages, condition, quantity, price_cop, price_negotiable, trade_for, description, status, user_id",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!listing || listing.status === "removed") notFound();

  const { data: photos } = await supabase
    .from("listing_photos")
    .select("storage_path, sort_order")
    .eq("listing_id", id)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Editar anuncio
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Cambia precio, estado, cantidad o descripción. La carta no se puede
        cambiar.
      </p>

      <EditListingForm listing={listing} />

      {listing.kind === "offer" ? (
        <section className="mt-10 border-t pt-6">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Fotos</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Quita las que no quieras, agrega nuevas y guarda. Un anuncio de venta
            o cambio debe quedar con al menos una foto.
          </p>
          <ListingPhotoManager
            listingId={listing.id}
            userId={user.id}
            kind={listing.kind}
            initialPaths={(photos ?? []).map((p) => p.storage_path)}
          />
        </section>
      ) : null}
    </div>
  );
}
