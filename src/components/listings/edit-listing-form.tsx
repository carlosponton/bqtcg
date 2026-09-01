"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { updateListing, type EditListingState } from "@/lib/listings/actions";
import { CONDITIONS } from "@/lib/listings";
import type { Listing } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardThumb } from "@/components/cards/card-thumb";
import { LanguageMultiPicker } from "@/components/listings/language-multi-picker";

const SELECT =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = {
  listing: Pick<
    Listing,
    | "id"
    | "kind"
    | "format"
    | "for_sale"
    | "for_trade"
    | "card_name"
    | "set_name"
    | "image_url"
    | "languages"
    | "condition"
    | "quantity"
    | "price_cop"
    | "price_negotiable"
    | "trade_for"
    | "description"
  >;
};

export function EditListingForm({ listing }: Props) {
  const isOffer = listing.kind === "offer";
  const isDeck = listing.format === "deck";
  const [forSale, setForSale] = useState(listing.for_sale);
  const [forTrade, setForTrade] = useState(listing.for_trade);
  const [negotiable, setNegotiable] = useState(listing.price_negotiable);
  const [state, action, pending] = useActionState<EditListingState, FormData>(
    updateListing,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={listing.id} />
      <input type="hidden" name="kind" value={listing.kind} />
      <input type="hidden" name="for_sale" value={forSale ? "on" : ""} />
      <input type="hidden" name="for_trade" value={forTrade ? "on" : ""} />
      <input
        type="hidden"
        name="price_negotiable"
        value={negotiable ? "on" : ""}
      />

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <CardThumb
          src={listing.image_url}
          alt={listing.card_name}
          className="w-12 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{listing.card_name}</p>
          {listing.set_name ? (
            <p className="truncate text-xs text-muted-foreground">
              {listing.set_name}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {isDeck
              ? "El deck y su lista de cartas no se editan aquí. Cierra el anuncio y publícalo de nuevo para refrescarlo."
              : "La carta no se puede cambiar. Crea otro anuncio si es otra."}
          </p>
        </div>
      </div>

      {isOffer ? (
        <div className="flex flex-col gap-2">
          <Label>¿Qué quieres hacer?</Label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={forSale}
              onCheckedChange={(v) => setForSale(v === true)}
            />
            La vendo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={forTrade}
              onCheckedChange={(v) => setForTrade(v === true)}
            />
            La acepto en cambio
          </label>
          {state.fieldErrors?.for_sale ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.for_sale}
            </p>
          ) : null}
        </div>
      ) : null}

      {isOffer && forSale ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="price_cop">Precio (COP)</Label>
          <Input
            id="price_cop"
            name="price_cop"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={listing.price_cop ?? ""}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={negotiable}
              onCheckedChange={(v) => setNegotiable(v === true)}
            />
            Precio negociable
          </label>
          {state.fieldErrors?.price_cop ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.price_cop}
            </p>
          ) : null}
        </div>
      ) : null}

      {isOffer && forTrade ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="trade_for">¿Qué buscas a cambio?</Label>
          <Textarea
            id="trade_for"
            name="trade_for"
            rows={3}
            maxLength={500}
            defaultValue={listing.trade_for ?? ""}
            placeholder="Ej. Cartas de Charizard, energías básicas holo, etc."
          />
        </div>
      ) : null}

      <LanguageMultiPicker defaultLanguages={listing.languages} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Estado</Label>
          <select
            id="condition"
            name="condition"
            defaultValue={listing.condition ?? ""}
            className={SELECT}
          >
            <option value="">Sin especificar</option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {isDeck ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={999}
              defaultValue={listing.quantity}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          defaultValue={listing.description ?? ""}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/panel">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
