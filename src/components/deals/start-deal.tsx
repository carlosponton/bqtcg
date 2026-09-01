"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { completeDeal, confirmDeal, startDeal } from "@/lib/deals/actions";
import type { MyDealForListing } from "@/lib/deals/query";
import { Button } from "@/components/ui/button";

type Props = {
  listingId: string;
  listingStatus?: string;
  /** Cantidad del anuncio (unidades / cuántas cartas se buscan). */
  listingQuantity?: number;
  deal: MyDealForListing;
};

/** Bloque de "registrar / confirmar trato" en el detalle del anuncio. */
export function StartDeal({
  listingId,
  listingStatus,
  listingQuantity = 1,
  deal,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const maxQty = Math.max(1, listingQuantity);
  const [qty, setQty] = useState(1);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error ?? "No se pudo completar.");
    });
  }

  if (!deal) {
    if (listingStatus === "closed" || listingStatus === "reserved") {
      return (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">
            {listingStatus === "closed"
              ? "Este anuncio ya se cerró"
              : "Este anuncio está reservado"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {listingStatus === "closed"
              ? "Quien lo publicó lo dio por cerrado, normalmente porque ya concretó el trato."
              : "Quien lo publicó lo tiene en pausa por ahora."}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Concretar el trato</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Regístralo para avanzar con la compra o el cambio. Cuando la otra
          persona lo acepte, verán el WhatsApp del otro para coordinar; después
          cierran el trato y se dejan una reseña.
        </p>
        {maxQty > 1 ? (
          <label className="mt-3 flex items-center gap-2 text-xs font-medium">
            ¿Cuántas cartas cubre el trato?
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) =>
                setQty(
                  Math.min(maxQty, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                )
              }
              className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className="font-normal text-muted-foreground">de {maxQty}</span>
          </label>
        ) : null}
        <Button
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() => run(() => startDeal(listingId, qty))}
        >
          {pending ? "Registrando…" : "Registrar el trato"}
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (deal.status === "confirmed") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="text-sm font-medium">
          Trato en curso
          {deal.quantity > 1 ? ` · ${deal.quantity} cartas` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ambos aceptaron. Ya pueden ver el WhatsApp del otro (arriba) para
          coordinar la entrega. Cuando hayan hecho el intercambio, ciérrenlo.
        </p>
        <Button
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() => run(() => completeDeal(deal.id))}
        >
          {pending ? "Cerrando…" : "Cerrar el trato"}
        </Button>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (deal.status === "completed") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="text-sm font-medium">Trato cerrado ✓</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ya pueden dejarse una reseña desde{" "}
          <Link href="/panel/tratos" className="underline underline-offset-2">
            Tratos
          </Link>
          .
        </p>
      </div>
    );
  }

  // pending
  return (
    <div className="rounded-lg border p-4">
      {deal.iAmSeller && !deal.sellerConfirmed ? (
        <>
          <p className="text-sm font-medium">
            Te propusieron un trato por{" "}
            {deal.quantity > 1 ? `${deal.quantity} de estas cartas` : "esta carta"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Acéptalo si te interesa: se abrirá el WhatsApp de ambos para
            coordinar. El anuncio se descuenta sólo al cerrar el trato.
          </p>
          <Button
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() => run(() => confirmDeal(deal.id))}
          >
            {pending ? "Aceptando…" : "Aceptar el trato"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Trato registrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Esperando que la otra persona lo confirme. Puedes verlo en{" "}
            <Link href="/panel/tratos" className="underline underline-offset-2">
              Tratos
            </Link>
            .
          </p>
        </>
      )}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
