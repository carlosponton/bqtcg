"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createListing, type CreateListingInput } from "@/lib/listings/actions";
import {
  removeStoragePhotos,
  uploadListingPhotos,
} from "@/lib/listings/photo-upload";
import { CITIES } from "@/lib/site";
import { CONDITIONS, LANGUAGES } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardPicker } from "@/components/cards/card-picker";
import { CardThumb } from "@/components/cards/card-thumb";
import { PhotoUploader } from "@/components/listings/photo-uploader";

type FromCollection = {
  id: string;
  card_id: string | null;
  custom_card_name: string | null;
  card_name: string;
  image_url: string | null;
  language: string;
  condition: string | null;
};

type Deck = {
  id: string;
  name: string;
  coverImage: string | null;
};

type Props = {
  userId: string;
  defaultCity: string | null;
  /** intención inicial: vender, cambiar o buscar */
  defaultMode?: "sale" | "trade" | "want";
  fromCollectionItem?: FromCollection | null;
  /** publicar un deck completo desde /coleccion/[id] */
  deck?: Deck | null;
};

export function PublishForm({
  userId,
  defaultCity,
  defaultMode,
  fromCollectionItem,
  deck,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isDeck = Boolean(deck);
  const [kind, setKind] = useState<"offer" | "want">(
    !isDeck && defaultMode === "want" ? "want" : "offer",
  );
  const [forSale, setForSale] = useState(defaultMode !== "trade");
  const [forTrade, setForTrade] = useState(defaultMode === "trade");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOffer = isDeck || kind === "offer";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);

    const cardName = isDeck
      ? (deck?.name ?? "")
      : String(fd.get("card_name") ?? "").trim();

    if (!isDeck && !cardName) {
      setError("Elige una carta del catálogo o escríbela a mano.");
      return;
    }
    if (isOffer && !forSale && !forTrade) {
      setError("Marca si lo vendes, lo aceptas en cambio, o ambas.");
      return;
    }
    if (isOffer && forSale && !(Number(fd.get("price_cop")) > 0)) {
      setError("Ponle un precio a la venta.");
      return;
    }
    if (isOffer && files.length === 0) {
      setError("Sube al menos una foto real.");
      return;
    }
    if (!String(fd.get("city") ?? "").trim()) {
      setError("Elige tu ciudad.");
      return;
    }

    setPending(true);

    let photoPaths: string[] = [];
    try {
      if (isOffer) photoPaths = await uploadListingPhotos(files, userId);
    } catch (e) {
      setPending(false);
      setError(
        e instanceof Error && e.message
          ? `No se pudieron subir las fotos. ${e.message}`
          : "No se pudieron subir las fotos. Revisa tu conexión e intenta de nuevo.",
      );
      return;
    }

    const input: CreateListingInput = {
      kind: isDeck ? "offer" : kind,
      format: isDeck ? "deck" : "single",
      for_sale: isOffer && forSale,
      for_trade: isOffer && forTrade,
      source_collection_item_id: fromCollectionItem?.id ?? null,
      source_collection_id: isDeck ? (deck?.id ?? null) : null,
      card_id: isDeck ? null : (fd.get("card_id") as string) || null,
      custom_card_name: isDeck
        ? (deck?.name ?? null)
        : (fd.get("custom_card_name") as string) || null,
      card_name: cardName,
      card_image: isDeck
        ? (deck?.coverImage ?? null)
        : (fd.get("card_image") as string) || null,
      language: (fd.get("language") as string) || "es",
      condition: (fd.get("condition") as string) || null,
      quantity: isDeck ? 1 : Number(fd.get("quantity") || 1),
      price_cop:
        isOffer && forSale ? Number(fd.get("price_cop") || 0) || null : null,
      price_negotiable: fd.get("price_negotiable") === "on",
      trade_for: (fd.get("trade_for") as string) || null,
      description: (fd.get("description") as string) || null,
      city: (fd.get("city") as string) || "",
      photo_paths: photoPaths,
    };

    const res = await createListing(input);

    if (!res.ok) {
      setPending(false);
      setError(res.error);
      if (photoPaths.length) void removeStoragePhotos(photoPaths);
      return;
    }

    router.push(`/anuncio/${res.id}`);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
      {isDeck ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <CardThumb
            src={deck?.coverImage ?? null}
            alt={deck?.name ?? "Deck"}
            className="w-12 shrink-0"
          />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Deck: {deck?.name}</p>
            <p className="text-xs text-muted-foreground">
              Se guardará una copia de las cartas del deck con el anuncio.
            </p>
          </div>
        </div>
      ) : fromCollectionItem ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Publicando desde tu colección:{" "}
          <span className="font-medium">{fromCollectionItem.card_name}</span>
        </p>
      ) : null}

      {!isDeck ? (
        <div className="flex flex-col gap-1.5">
          <Label>¿Qué quieres hacer?</Label>
          <Tabs
            value={kind}
            onValueChange={(v) => setKind(v as "offer" | "want")}
          >
            <TabsList className="w-full">
              <TabsTrigger value="offer" className="flex-1">
                Ofrezco esta carta
              </TabsTrigger>
              <TabsTrigger value="want" className="flex-1">
                La estoy buscando
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {isOffer ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-sm font-medium">
            {isDeck ? "¿Cómo lo ofreces?" : "¿Cómo la ofreces?"}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={forSale}
              onCheckedChange={(c) => setForSale(c === true)}
            />
            {isDeck ? "Lo vendo" : "La vendo"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={forTrade}
              onCheckedChange={(c) => setForTrade(c === true)}
            />
            {isDeck ? "Lo acepto en cambio" : "La acepto en cambio"}
          </label>
          <p className="text-xs text-muted-foreground">
            Puedes marcar las dos si estás abierto a vender o cambiar.
          </p>
        </div>
      ) : null}

      {!isDeck ? (
        <div className="flex flex-col gap-1.5">
          <Label>Carta</Label>
          <CardPicker
            userId={userId}
            defaultCardId={fromCollectionItem?.card_id ?? undefined}
            defaultCustomName={fromCollectionItem?.custom_card_name ?? undefined}
            defaultCardName={fromCollectionItem?.card_name ?? undefined}
            defaultImage={fromCollectionItem?.image_url ?? undefined}
            locked={Boolean(fromCollectionItem)}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="language">Idioma</Label>
          <Select
            name="language"
            defaultValue={fromCollectionItem?.language ?? "es"}
          >
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
          <Label htmlFor="condition">Estado</Label>
          <Select
            name="condition"
            defaultValue={fromCollectionItem?.condition ?? undefined}
          >
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

        {!isDeck ? (
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
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Select name="city" defaultValue={defaultCity ?? undefined}>
            <SelectTrigger id="city">
              <SelectValue placeholder="Selecciona tu ciudad" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isOffer && forSale ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price_cop">Precio (COP)</Label>
            <Input
              id="price_cop"
              name="price_cop"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              placeholder="15000"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="price_negotiable" className="size-4" />
            Precio negociable
          </label>
        </div>
      ) : null}

      {isOffer && forTrade ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trade_for">¿Qué buscas a cambio?</Label>
          <Textarea
            id="trade_for"
            name="trade_for"
            rows={2}
            maxLength={500}
            placeholder="Ej. Pikachu ex de Surging Sparks, o cartas de energía brillante"
          />
        </div>
      ) : null}

      {isOffer ? (
        <div className="flex flex-col gap-1.5">
          <Label>{isDeck ? "Fotos de tu deck real" : "Fotos de tu carta real"}</Label>
          <PhotoUploader value={files} onChange={setFiles} max={6} />
        </div>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          En los anuncios de tipo “Busco” no hace falta foto.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          placeholder={
            isDeck
              ? "Detalles: formato (Standard/Expanded), estado general, fundas, dados, etc."
              : "Detalles: centrado, bordes, si viene en funda/toploader, etc."
          }
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Publicando…"
          : isDeck
            ? "Publicar deck"
            : "Publicar anuncio"}
      </Button>
    </form>
  );
}
