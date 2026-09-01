import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getMyDealForListing } from "@/lib/deals/query";
import { findCollectionMatches } from "@/lib/collection/query";
import { SITE_NAME } from "@/lib/site";
import {
  conditionLabel,
  formatCOP,
  languageLabel,
  listingModeLabel,
  listingPhotoUrl,
  whatsappLink,
} from "@/lib/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";
import { CollectionMatchCallout } from "@/components/collection/collection-match-callout";
import { StartDeal } from "@/components/deals/start-deal";
import { ReportDialog } from "@/components/reports/report-dialog";
import type { Listing } from "@/types/database";

async function loadListing(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!listing || listing.status === "removed") return null;

  const isViewerAudience = Boolean(user) && user!.id !== listing.user_id;

  const [myDeal, collectionMatches] = await Promise.all([
    isViewerAudience ? getMyDealForListing(user!.id, id) : null,
    isViewerAudience && listing.kind === "want"
      ? findCollectionMatches(user!.id, {
          card_id: listing.card_id,
          card_name: listing.card_name,
        })
      : [],
  ]);

  const [{ data: photos }, { data: owner }, { data: deckCards }] =
    await Promise.all([
      supabase
        .from("listing_photos")
        .select("storage_path, sort_order")
        .eq("listing_id", id)
        .order("sort_order"),
      supabase
        .from("profiles")
        .select(
          "username, display_name, avatar_url, city, whatsapp, show_whatsapp, rating_avg, rating_count, is_verified",
        )
        .eq("id", listing.user_id)
        .maybeSingle(),
      listing.format === "deck"
        ? supabase
            .from("listing_deck_cards")
            .select("id, card_name, set_name, image_url, quantity, sort_order")
            .eq("listing_id", id)
            .order("sort_order")
        : Promise.resolve({ data: [] as never[] }),
    ]);

  return {
    listing: listing as Listing,
    photos: photos ?? [],
    owner,
    viewer: user,
    myDeal,
    collectionMatches,
    deckCards: deckCards ?? [],
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/anuncio/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await loadListing(id);
  if (!data) return { title: "Anuncio no encontrado" };
  const { listing } = data;
  const mode = listingModeLabel(listing);
  const price =
    listing.for_sale && listing.price_cop
      ? ` — ${formatCOP(listing.price_cop)}`
      : "";
  const noun =
    listing.format === "deck"
      ? `Deck · ${listing.card_name}`
      : listing.card_name;
  const title = `${mode}: ${noun}${price}`;
  const description =
    listing.description ?? `${mode} · ${listing.card_name} en ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/anuncio/${id}` },
    openGraph: { title, description, type: "article" },
  };
}

const STATUS_LABEL: Record<string, string> = {
  reserved: "Reservado",
  closed: "Cerrado",
};

export default async function AnuncioPage({
  params,
}: PageProps<"/anuncio/[id]">) {
  const { id } = await params;
  const data = await loadListing(id);
  if (!data) notFound();

  const { listing, photos, owner, viewer, myDeal, collectionMatches, deckCards } =
    data;
  const isDeck = listing.format === "deck";
  const deckTotal = deckCards.reduce((n, c) => n + (c.quantity ?? 1), 0);
  const isOwner = viewer?.id === listing.user_id;
  const ownerName =
    owner?.display_name || owner?.username || "Usuario";
  const canContactWhatsapp =
    Boolean(viewer) &&
    !isOwner &&
    owner?.show_whatsapp === true &&
    Boolean(owner?.whatsapp);

  const modeLabel = listingModeLabel(listing);
  const waMessage = `Hola, te escribo por tu anuncio en ${SITE_NAME}: "${listing.card_name}" (${modeLabel}).`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,320px)_1fr]">
        {/* Fotos */}
        <div className="flex flex-col gap-2">
          {photos.length > 0 ? (
            photos.map((p) => (
              <Image
                key={p.storage_path}
                src={listingPhotoUrl(p.storage_path)}
                alt={listing.card_name}
                width={640}
                height={640}
                className="h-auto w-full rounded-lg border object-contain"
              />
            ))
          ) : listing.image_url ? (
            <CardThumb
              src={listing.image_url}
              alt={listing.card_name}
              className="w-full"
            />
          ) : (
            <div className="flex aspect-[5/7] items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              Sin foto
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{modeLabel}</Badge>
              {isDeck ? <Badge variant="secondary">Deck</Badge> : null}
              {STATUS_LABEL[listing.status] ? (
                <Badge variant="secondary">
                  {STATUS_LABEL[listing.status]}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {listing.card_name}
            </h1>
            {listing.set_name ? (
              <p className="text-sm text-muted-foreground">{listing.set_name}</p>
            ) : null}
          </div>

          {collectionMatches.length > 0 ? (
            <CollectionMatchCallout matches={collectionMatches} />
          ) : null}

          {listing.for_sale && listing.price_cop ? (
            <p className="text-xl font-semibold">
              {formatCOP(listing.price_cop)}
              {listing.price_negotiable ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  negociable
                </span>
              ) : null}
            </p>
          ) : null}

          {listing.for_trade ? (
            <div>
              <p className="text-sm font-medium">
                {listing.for_sale ? "También acepta cambio" : "Busca a cambio"}
              </p>
              {listing.trade_for ? (
                <p className="text-sm text-muted-foreground">
                  {listing.trade_for}
                </p>
              ) : null}
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Idioma</dt>
            <dd>{languageLabel(listing.language)}</dd>
            {listing.condition ? (
              <>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>{conditionLabel(listing.condition)}</dd>
              </>
            ) : null}
            {isDeck ? null : (
              <>
                <dt className="text-muted-foreground">Cantidad</dt>
                <dd>{listing.quantity}</dd>
              </>
            )}
            {listing.city ? (
              <>
                <dt className="text-muted-foreground">Ciudad</dt>
                <dd>{listing.city}</dd>
              </>
            ) : null}
          </dl>

          {listing.description ? (
            <p className="whitespace-pre-line text-sm">{listing.description}</p>
          ) : null}

          {isDeck && deckCards.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                Cartas del deck ({deckTotal})
              </p>
              <ul className="flex flex-col divide-y rounded-lg border">
                {deckCards.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-2">
                    <CardThumb
                      src={c.image_url}
                      alt={c.card_name}
                      className="w-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{c.card_name}</p>
                      {c.set_name ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {c.set_name}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      x{c.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Copia guardada al publicar el anuncio.
              </p>
            </div>
          ) : null}

          {/* Vendedor / contacto */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{ownerName}</p>
                <p className="text-xs text-muted-foreground">
                  {owner?.rating_count
                    ? `★ ${owner.rating_avg.toFixed(1)} (${owner.rating_count})`
                    : "Sin reseñas todavía"}
                  {owner?.is_verified ? " · Verificado" : ""}
                </p>
              </div>
              {owner?.username ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/u/${owner.username}`}>Ver perfil</Link>
                </Button>
              ) : null}
            </div>

            {isOwner ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Este es tu anuncio.
              </p>
            ) : canContactWhatsapp ? (
              <Button asChild className="mt-3 w-full">
                <a
                  href={whatsappLink(owner!.whatsapp!, waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contactar por WhatsApp
                </a>
              </Button>
            ) : !viewer ? (
              <Button asChild className="mt-3 w-full" variant="outline">
                <Link href={`/login?redirect=/anuncio/${listing.id}`}>
                  Inicia sesión para ver el contacto
                </Link>
              </Button>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Este usuario no compartió WhatsApp. Mira su perfil.
              </p>
            )}
          </div>

          {viewer && !isOwner ? (
            <>
              <StartDeal
                listingId={listing.id}
                listingStatus={listing.status}
                deal={myDeal}
              />
              <div className="-ml-2">
                <ReportDialog
                  targetType="listing"
                  targetId={listing.id}
                  label="Reportar anuncio"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
