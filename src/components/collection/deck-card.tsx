import Link from "next/link";

import type { CollectionVisibility } from "@/types/database";
import { CardThumb } from "@/components/cards/card-thumb";
import { VIS_META } from "@/components/collection/collection-card";

type Props = {
  deck: {
    id: string;
    name: string;
    visibility: CollectionVisibility;
    cover_image_url: string | null;
  };
  itemCount: number;
  /** true si tiene un anuncio activo publicado */
  published?: boolean;
};

export function DeckCard({ deck, itemCount, published }: Props) {
  const meta = VIS_META[deck.visibility];
  return (
    <Link
      href={`/coleccion/${deck.id}`}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <CardThumb
        src={deck.cover_image_url}
        alt={deck.name}
        className="w-12 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{deck.name}</p>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "carta" : "cartas"}
          {published ? " · publicado" : ""}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <meta.icon className="size-3.5" />
        {meta.label}
      </span>
    </Link>
  );
}
