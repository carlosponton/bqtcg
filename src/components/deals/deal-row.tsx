"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { cancelDeal, completeDeal, confirmDeal } from "@/lib/deals/actions";
import type { DealListItem } from "@/lib/deals/query";
import { whatsappLink } from "@/lib/listings";
import { SITE_NAME } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";
import { ReviewForm } from "@/components/reviews/review-form";

const STATUS_BADGE: Record<
  DealListItem["status"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "Propuesto", variant: "secondary" },
  confirmed: { label: "En curso", variant: "default" },
  completed: { label: "Cerrado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

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
    (deal.counterparty?.username
      ? `@${deal.counterparty.username}`
      : "la otra persona");
  const roleLabel =
    deal.role === "seller" ? "Le vendes/cambias a" : "Le compras/cambias a";

  const card = deal.listing?.card_name ?? "una carta";
  const waMessage = `Hola, te escribo por el trato de "${card}" en ${SITE_NAME}.`;
  const badge = STATUS_BADGE[deal.status];

  const inProgress = deal.status === "confirmed";
  const done = deal.status === "completed";

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
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {deal.quantity > 1 ? (
            <Badge variant="outline">×{deal.quantity}</Badge>
          ) : null}
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

        {/* Contacto: visible en curso y cerrado */}
        {(inProgress || done) &&
          (deal.counterparty?.whatsapp ? (
            <Button asChild size="xs" className="mt-1 w-fit">
              <a
                href={whatsappLink(deal.counterparty.whatsapp, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp de {other}
              </a>
            </Button>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {other} no compartió WhatsApp
              {deal.counterparty?.username ? (
                <>
                  {" — "}
                  <Link
                    href={`/u/${deal.counterparty.username}`}
                    className="underline underline-offset-2"
                  >
                    ver su perfil
                  </Link>
                </>
              ) : null}
              .
            </p>
          ))}

        {deal.status === "pending" ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {!deal.iConfirmed ? (
              <>
                <span className="text-xs font-medium text-foreground">
                  Te toca aceptar
                </span>
                <Button
                  size="xs"
                  disabled={pending}
                  onClick={() => run(() => confirmDeal(deal.id))}
                >
                  Aceptar
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Esperando que {other} acepte
              </span>
            )}
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm("¿Cancelar este trato?")) {
                  run(() => cancelDeal(deal.id));
                }
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : inProgress ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Coordinen la entrega y, cuando la hagan, ciérrenlo.
            </span>
            <Button
              size="xs"
              disabled={pending}
              onClick={() => run(() => completeDeal(deal.id))}
            >
              Cerrar el trato
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm("¿Cancelar este trato?")) {
                  run(() => cancelDeal(deal.id));
                }
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : done ? (
          <div className="mt-1">
            <ReviewForm
              dealId={deal.id}
              counterpartyName={other}
              existing={deal.myReview}
            />
          </div>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}
