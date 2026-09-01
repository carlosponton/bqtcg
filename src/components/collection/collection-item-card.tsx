import Link from "next/link";
import { Trash2 } from "lucide-react";

import {
  moveCollectionItem,
  removeCollectionItem,
} from "@/lib/collection/actions";
import { conditionLabel, languageLabel } from "@/lib/listings";
import { CardThumb } from "@/components/cards/card-thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CollectionItem } from "@/types/database";

type Props = {
  item: CollectionItem;
  /** anuncio activo que salió de este ítem, si existe */
  listing: { for_sale: boolean; for_trade: boolean } | null;
  /** otras colecciones del usuario, para mover la carta */
  otherCollections: { id: string; name: string }[];
  /** oculta vender/cambiar por carta (los decks se venden completos) */
  hideListingActions?: boolean;
};

function listedLabel(l: { for_sale: boolean; for_trade: boolean }): string {
  if (l.for_sale && l.for_trade) return "En venta y cambio";
  if (l.for_sale) return "En venta";
  if (l.for_trade) return "En cambio";
  return "Publicada";
}

export function CollectionItemCard({
  item,
  listing,
  otherCollections,
  hideListingActions = false,
}: Props) {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <CardThumb src={item.image_url} alt={item.card_name} className="w-16 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{item.card_name}</p>
        {item.set_name ? (
          <p className="text-xs text-muted-foreground">{item.set_name}</p>
        ) : null}

        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
          <span>x{item.quantity}</span>
          <span>· {languageLabel(item.language)}</span>
          {item.condition ? <span>· {conditionLabel(item.condition)}</span> : null}
        </div>

        {item.note ? (
          <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {hideListingActions ? null : listing ? (
            <Badge variant="secondary">{listedLabel(listing)}</Badge>
          ) : (
            <>
              <Button asChild size="xs" variant="outline">
                <Link href={`/publicar?desde=${item.id}&modo=sale`}>Vender</Link>
              </Button>
              <Button asChild size="xs" variant="outline">
                <Link href={`/publicar?desde=${item.id}&modo=trade`}>
                  Cambiar
                </Link>
              </Button>
            </>
          )}

          {otherCollections.length > 0 ? (
            <form action={moveCollectionItem} className="flex items-center gap-1">
              <input type="hidden" name="id" value={item.id} />
              <input
                type="hidden"
                name="collection_id"
                value={item.collection_id}
              />
              <select
                name="target_collection_id"
                defaultValue=""
                className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none"
              >
                <option value="" disabled>
                  Mover a…
                </option>
                {otherCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="xs" variant="ghost">
                Mover
              </Button>
            </form>
          ) : null}

          <form action={removeCollectionItem} className="ml-auto">
            <input type="hidden" name="id" value={item.id} />
            <input
              type="hidden"
              name="collection_id"
              value={item.collection_id}
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label="Quitar de la colección"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
