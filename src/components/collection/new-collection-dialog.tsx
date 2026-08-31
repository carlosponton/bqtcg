"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createCollection, type FormState } from "@/lib/collection/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: FormState = {};

export function NewCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCollection,
    INITIAL,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nueva colección
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva colección</DialogTitle>
          <DialogDescription>
            Una carpeta para agrupar cartas. Puedes hacerla pública o privada
            después.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej. Para cambio, Colección personal…"
              maxLength={60}
              required
              autoFocus
            />
            {state.fieldErrors?.name?.[0] ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.name[0]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visibility">Visibilidad</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue="private"
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="private">Privada (sólo tú)</option>
              <option value="unlisted">Con enlace</option>
              <option value="public">Pública (en tu perfil)</option>
            </select>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando…" : "Crear"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
