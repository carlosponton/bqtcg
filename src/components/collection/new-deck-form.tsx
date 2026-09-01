"use client";

import { useActionState } from "react";

import { createDeck, type FormState } from "@/lib/collection/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardPicker } from "@/components/cards/card-picker";

const INITIAL: FormState = {};

export function NewDeckForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(createDeck, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deck-name">Nombre del deck</Label>
        <Input
          id="deck-name"
          name="name"
          placeholder="Ej. Charizard ex — Obsidian Flames"
          maxLength={60}
          required
          autoFocus
        />
        {state.fieldErrors?.name?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Carta de portada</Label>
        <CardPicker userId={userId} />
        {state.fieldErrors?.card_name?.[0] ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.card_name[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deck-visibility">Visibilidad</Label>
        <select
          id="deck-visibility"
          name="visibility"
          defaultValue="private"
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="private">Privado (sólo tú)</option>
          <option value="unlisted">Con enlace</option>
          <option value="public">Público (en tu perfil)</option>
        </select>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear deck"}
      </Button>
    </form>
  );
}
