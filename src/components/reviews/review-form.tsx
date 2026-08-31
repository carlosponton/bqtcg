"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { deleteReview, submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  dealId: string;
  counterpartyName: string;
  existing: { rating: number; comment: string | null } | null;
};

export function ReviewForm({ dealId, counterpartyName, existing }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo completar.");
      }
    });
  }

  if (existing && !open) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Tu reseña:</span>
        <span className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-3.5",
                n <= existing.rating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          ))}
        </span>
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          Editar
        </button>
      </div>
    );
  }

  if (!existing && !open) {
    return (
      <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
        Dejar reseña a {counterpartyName}
      </Button>
    );
  }

  const shown = hover || rating;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-xs font-medium">
        {existing ? "Editar tu reseña" : "Reseñar a"} {counterpartyName}
      </p>

      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                n <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        rows={2}
        maxLength={500}
        placeholder="¿Cómo fue el trato? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          disabled={pending || rating < 1}
          onClick={() =>
            run(() => submitReview({ dealId, rating, comment }))
          }
        >
          {pending ? "Guardando…" : existing ? "Guardar" : "Publicar reseña"}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setRating(existing?.rating ?? 0);
            setComment(existing?.comment ?? "");
            setError(null);
          }}
        >
          Cancelar
        </Button>
        {existing ? (
          <Button
            size="xs"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Borrar tu reseña?")) {
                run(() => deleteReview(dealId));
              }
            }}
          >
            Borrar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
