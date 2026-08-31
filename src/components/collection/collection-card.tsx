import Link from "next/link";
import { Globe, Link2, Lock } from "lucide-react";

import type { CollectionVisibility } from "@/types/database";

export const VIS_META: Record<
  CollectionVisibility,
  { label: string; icon: typeof Lock }
> = {
  private: { label: "Privada", icon: Lock },
  unlisted: { label: "Con enlace", icon: Link2 },
  public: { label: "Pública", icon: Globe },
};

type Props = {
  collection: {
    id: string;
    name: string;
    visibility: CollectionVisibility;
    is_default: boolean;
  };
  itemCount: number;
};

export function CollectionCard({ collection, itemCount }: Props) {
  const meta = VIS_META[collection.visibility];
  return (
    <Link
      href={`/coleccion/${collection.id}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          {collection.name}
          {collection.is_default ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (por defecto)
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "carta" : "cartas"}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <meta.icon className="size-3.5" />
        {meta.label}
      </span>
    </Link>
  );
}
