"use client";

import { useEffect, useState } from "react";

import { formatCOP } from "@/lib/listings";

type PriceData = {
  available: boolean;
  finish?: string;
  updatedAt?: string | null;
  cop?: { market: number; min: number; max: number };
};

const FINISH_LABEL: Record<string, string> = {
  normal: "normal",
  holofoil: "holo",
  "reverse-holofoil": "reverse holo",
  "1st-edition-holofoil": "holo 1.ª ed.",
};

/**
 * Precio de referencia de TCGplayer (convertido a COP) para la carta elegida
 * del catálogo, con un botón para copiarlo al campo de precio. Es orientativo:
 * mercado internacional, no un precio sugerido para Colombia.
 */
export function PriceHint({ cardId }: { cardId: string }) {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch tras elegir carta
    setLoading(true);
    setData(null);
    fetch(`/api/cards/price?id=${encodeURIComponent(cardId)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<PriceData>)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [cardId]);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">
        Buscando precio de referencia…
      </p>
    );
  }
  if (!data?.available || !data.cop) return null;

  const { market, min, max } = data.cop;
  const hasRange = max - min > market * 0.15;
  const finishLabel = FINISH_LABEL[data.finish ?? ""] ?? data.finish;

  function useAsPrice() {
    const input = document.getElementById(
      "price_cop",
    ) as HTMLInputElement | null;
    if (!input) return;
    input.value = String(market);
    input.focus();
  }

  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-2.5 text-xs">
      <p className="flex flex-wrap items-center gap-x-1.5">
        <span className="font-medium">Referencia TCGplayer:</span>
        <span>≈ {formatCOP(market)}</span>
        <button
          type="button"
          onClick={useAsPrice}
          className="text-primary underline underline-offset-2"
        >
          usar
        </button>
      </p>
      {hasRange ? (
        <p className="mt-0.5 text-muted-foreground">
          Varía según el acabado: {formatCOP(min)} – {formatCOP(max)}.
        </p>
      ) : null}
      <p className="mt-0.5 text-muted-foreground">
        Precio de mercado de TCGplayer{finishLabel ? ` (${finishLabel})` : ""}{" "}
        convertido a COP. Es una referencia internacional, no un precio sugerido.
      </p>
    </div>
  );
}
