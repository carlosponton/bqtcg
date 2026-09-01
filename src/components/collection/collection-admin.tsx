"use client";

import { useState } from "react";

import { deleteCollection, renameCollection } from "@/lib/collection/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  collectionId: string;
  name: string;
  isDefault: boolean;
  isDeck?: boolean;
};

export function CollectionAdmin({
  collectionId,
  name,
  isDefault,
  isDeck = false,
}: Props) {
  const [value, setValue] = useState(name);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <form action={renameCollection} className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre</Label>
        <input type="hidden" name="id" value={collectionId} />
        <div className="flex gap-2">
          <Input
            id="name"
            name="name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={60}
            required
          />
          <Button type="submit" variant="outline" disabled={value.trim() === name}>
            Guardar
          </Button>
        </div>
      </form>

      {!isDefault ? (
        <form
          action={deleteCollection}
          onSubmit={(e) => {
            if (
              !window.confirm(
                isDeck
                  ? "¿Borrar este deck? Se quitarán sus cartas (no afecta un anuncio ya publicado)."
                  : "¿Borrar esta colección? Sus cartas se moverán a tu colección por defecto.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={collectionId} />
          <Button type="submit" variant="destructive" size="sm">
            {isDeck ? "Borrar deck" : "Borrar colección"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
