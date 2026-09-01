import Link from "next/link";

import {
  conditionLabel,
  DECK_LABEL,
  formatCOP,
  languageLabel,
  listingModeLabel,
} from "@/lib/listings";
import type { ListingListItem } from "@/lib/listings/query";
import { Badge } from "@/components/ui/badge";
import { CardThumb } from "@/components/cards/card-thumb";

/** Tarjeta de anuncio para la cuadrícula de `/explorar` y del perfil. */
export function ListingCard({ item }: { item: ListingListItem }) {
  const mode = listingModeLabel(item);
  const ownerName = item.owner?.display_name || item.owner?.username || null;

  return (
    <Link
      href={`/anuncio/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="relative bg-muted/40">
        <CardThumb
          src={item.image}
          alt={item.card_name}
          className="w-full transition-transform group-hover:scale-[1.02]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge>{mode}</Badge>
          {item.format === "deck" ? (
            <Badge variant="secondary">{DECK_LABEL}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-sm leading-tight font-medium">
          {item.card_name}
        </p>
        {item.set_name ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.set_name}
          </p>
        ) : null}

        <div className="mt-auto pt-1.5">
          {item.for_sale && item.price_cop != null ? (
            <p className="text-sm font-semibold">
              {formatCOP(item.price_cop)}
              {item.price_negotiable ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  neg.
                </span>
              ) : null}
            </p>
          ) : item.kind === "want" ? (
            <p className="text-xs text-muted-foreground">Lo está buscando</p>
          ) : (
            <p className="text-xs text-muted-foreground">Solo cambio</p>
          )}

          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {languageLabel(item.language)}
            {item.condition ? ` · ${conditionLabel(item.condition).split(" ")[0]}` : ""}
            {" · "}
            {item.city}
            {ownerName ? ` · ${ownerName}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
