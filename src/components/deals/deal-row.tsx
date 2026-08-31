"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { cancelDeal, confirmDeal } from "@/lib/deals/actions";
import type { DealListItem } from "@/lib/deals/query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";

export function DealRow({ deal }: { deal: DealListItem }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "No se pudo completar.");
    });
  }

  const other =
    deal.counterparty?.display_name ||
    (deal.counterparty?.username ? `@${deal.counterparty.username}` : "la otra persona");
  const roleLabel = deal.role === "seller" ? "Le vendes/cambias a" : "Le compras/cambias a";

  return (
    <li className="flex gap-3 rounded-xl border p-3">
      <CardThumb
        src={deal.listing?.image ?? null}
        alt={deal.listing?.card_name ?? "Carta"}
        className="w-12 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {deal.listing ? (
            <Link
              href={`/anuncio/${deal.listing.id}`}
              className="truncate text-sm font-medium underline-offset-2 hover:underline"
            >
              {deal.listing.card_name}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">
              Anuncio eliminado
            </span>
          )}
          {deal.status === "confirmed" ? (
            <Badge>Confirmado</Badge>
          ) : deal.status === "cancelled" ? (
            <Badge variant="outline">Cancelado</Badge>
          ) : (
            <Badge variant="secondary">Pendiente</Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {roleLabel}{" "}
          {deal.counterparty?.username ? (
            <Link
              href={`/u/${deal.counterparty.username}`}
              className="underline-offset-2 hover:underline"
            >
              {other}
            </Link>
          ) : (
            other
          )}
        </p>

        {deal.status === "pending" ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {!deal.iConfirmed ? (
              <>
                <span className="text-xs font-medium text-foreground">
                  Te toca confirmar
                </span>
                <Button
                  size="xs"
                  disabled={pending}
                  onClick={() => run(() => confirmDeal(deal.id))}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Esperando que {other} confirme
              </span>
            )}
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm("¿Cancelar este trato?")) run(() => cancelDeal(deal.id));
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : deal.status === "confirmed" ? (
          <p className="text-xs text-muted-foreground">
            Trato confirmado por ambas partes. Las reseñas llegan pronto.
          </p>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}
