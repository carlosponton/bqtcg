"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { confirmDeal, startDeal } from "@/lib/deals/actions";
import type { MyDealForListing } from "@/lib/deals/query";
import { Button } from "@/components/ui/button";

type Props = {
  listingId: string;
  listingStatus?: string;
  deal: MyDealForListing;
};

/** Bloque de "registrar / confirmar trato" en el detalle del anuncio. */
export function StartDeal({ listingId, listingStatus, deal }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          Regístralo cuando quieran cerrar la compra o el cambio. Al confirmarlo
          ambos, verán el WhatsApp del otro para coordinar y podrán dejarse una
          reseña.
        </p>
        <Button
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() => run(() => startDeal(listingId))}
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
        <p className="text-sm font-medium">Trato confirmado ✓</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ambos confirmaron. Ya pueden ver el WhatsApp del otro (arriba) para
          coordinar, y dejar una reseña desde{" "}
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
            La otra persona registró un trato por esta carta
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Confírmalo si es correcto.
          </p>
          <Button
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() => run(() => confirmDeal(deal.id))}
          >
            {pending ? "Confirmando…" : "Confirmar trato"}
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
