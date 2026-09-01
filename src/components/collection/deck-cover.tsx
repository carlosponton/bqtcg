"use client";

import { useActionState, useState } from "react";

import { setDeckCover, type FormState } from "@/lib/collection/actions";
import { Button } from "@/components/ui/button";
import { CardThumb } from "@/components/cards/card-thumb";
import { CardPicker } from "@/components/cards/card-picker";

const INITIAL: FormState = {};

type Props = {
  deckId: string;
  userId: string;
  coverName: string | null;
  coverImage: string | null;
};

export function DeckCover({ deckId, userId, coverName, coverImage }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(setDeckCover, INITIAL);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <CardThumb
          src={coverImage}
          alt={coverName ?? "Portada"}
          className="w-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Portada</p>
          <p className="truncate text-xs text-muted-foreground">
            {coverName ?? "Sin portada"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Cerrar" : "Cambiar"}
        </Button>
      </div>

      {editing ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={deckId} />
          <CardPicker userId={userId} />
          {state.error ? (
            <p className="text-xs text-destructive">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="text-xs text-muted-foreground">
              Portada actualizada.
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar portada"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
