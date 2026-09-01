"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpToLine, Pause, Play, SquareCheck, Trash2 } from "lucide-react";

import {
  bumpListing,
  removeListing,
  setListingStatus,
  type ListingActionResult,
} from "@/lib/listings/actions";
import { DECK_LABEL, formatCOP, listingModeLabel } from "@/lib/listings";
import type { ListingListItem } from "@/lib/listings/query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Activo", variant: "default" },
  reserved: { label: "Pausado", variant: "secondary" },
  closed: { label: "Cerrado", variant: "outline" },
};

export function ListingManageRow({ item }: { item: ListingListItem }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ListingActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
    });
  }

  const status = STATUS_META[item.status] ?? STATUS_META.active;

  return (
    <li className="flex gap-3 rounded-xl border p-3">
      <CardThumb
        src={item.image}
        alt={item.card_name}
        className="w-12 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{listingModeLabel(item)}</Badge>
          {item.format === "deck" ? (
            <Badge variant="secondary">{DECK_LABEL}</Badge>
          ) : null}
          <Badge variant={status.variant}>{status.label}</Badge>
          {item.for_sale && item.price_cop != null ? (
            <span className="text-sm font-medium">
              {formatCOP(item.price_cop)}
            </span>
          ) : null}
        </div>

        <p className="truncate text-sm font-medium">{item.card_name}</p>
        {item.set_name ? (
          <p className="truncate text-xs text-muted-foreground">
            {item.set_name}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap gap-1.5">
          <Button asChild size="xs" variant="outline">
            <Link href={`/anuncio/${item.id}`}>Ver</Link>
          </Button>
          <Button asChild size="xs" variant="outline">
            <Link href={`/panel/${item.id}/editar`}>Editar</Link>
          </Button>

          {item.status === "active" ? (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => bumpListing(item.id))}
            >
              <ArrowUpToLine /> Subir
            </Button>
          ) : null}

          {item.status === "active" ? (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setListingStatus(item.id, "reserved"))}
            >
              <Pause /> Pausar
            </Button>
          ) : (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setListingStatus(item.id, "active"))}
            >
              <Play /> {item.status === "closed" ? "Reabrir" : "Reactivar"}
            </Button>
          )}

          {item.status !== "closed" ? (
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setListingStatus(item.id, "closed"))}
            >
              <SquareCheck /> Cerrar
            </Button>
          ) : null}

          <Button
            size="xs"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  "¿Eliminar este anuncio? No se puede deshacer (la carta sigue en tu colección).",
                )
              ) {
                run(() => removeListing(item.id));
              }
            }}
          >
            <Trash2 /> Eliminar
          </Button>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}
