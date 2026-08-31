"use client";

import { useActionState } from "react";

import { addToCollection, type FormState } from "@/lib/collection/actions";
import { CONDITIONS, LANGUAGES } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardPicker } from "@/components/cards/card-picker";

const INITIAL: FormState = {};

export function AddToCollectionForm({ collectionId }: { collectionId: string }) {
  const [state, formAction, isPending] = useActionState(
    addToCollection,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="collection_id" value={collectionId} />

      <div className="flex flex-col gap-1.5">
        <Label>Carta</Label>
        <CardPicker />
        <FieldError messages={state.fieldErrors?.card_name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="language">Idioma</Label>
          <Select name="language" defaultValue="es">
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condition">Estado (opcional)</Label>
          <Select name="condition">
            <SelectTrigger id="condition">
              <SelectValue placeholder="Sin especificar" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={999}
            defaultValue={1}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Nota (opcional)</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={280}
          placeholder="Ej. tengo 2, una en inglés y una en español"
        />
        <FieldError messages={state.fieldErrors?.note} />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Agregando…" : "Agregar a mi colección"}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
