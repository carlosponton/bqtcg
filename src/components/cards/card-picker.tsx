"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, ImagePlus, Search, X, ZoomIn } from "lucide-react";

import { useDebouncedValue } from "@/lib/use-debounced-value";
import { listingPhotoUrl } from "@/lib/listings";
import { uploadListingPhotos } from "@/lib/listings/photo-upload";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CardThumb } from "@/components/cards/card-thumb";

type Result = {
  id: string;
  localId?: string;
  name: string;
  image: string | null;
};

/** La búsqueda entrega la miniatura (`/low.webp`); para ampliar pedimos la grande. */
function largeImage(src: string | null): string | null {
  if (!src) return null;
  return src.replace(/\/low\.webp$/, "/high.webp");
}

export type CardPickerProps = {
  defaultCardId?: string | null;
  defaultCustomName?: string | null;
  defaultCardName?: string | null;
  defaultImage?: string | null;
  /** Con sesión: habilita subir una imagen al escribir la carta a mano. */
  userId?: string;
  /** Bloquea el cambio de carta (ej. al publicar desde la colección). */
  locked?: boolean;
  /** Se llama con la carta del catálogo elegida (o `null` en modo a mano). */
  onSelect?: (card: { id: string; name: string } | null) => void;
};

/**
 * Selector de carta con dos modos: catálogo (autocompletar TCGdex) o texto libre.
 * Publica su estado al `<form>` padre mediante inputs ocultos:
 * `card_id`, `custom_card_name`, `card_name`, `card_image`.
 *
 * Los resultados se muestran en cuadrícula (legible en móvil) y cada carta se
 * puede ampliar con el botón de lupa antes de elegirla.
 */
export function CardPicker({
  defaultCardId,
  defaultCustomName,
  defaultCardName,
  defaultImage,
  userId,
  locked = false,
  onSelect,
}: CardPickerProps) {
  const [mode, setMode] = useState<"catalog" | "custom">(
    defaultCustomName ? "custom" : "catalog",
  );
  const [selected, setSelected] = useState<Result | null>(
    defaultCardId && defaultCardName
      ? { id: defaultCardId, name: defaultCardName, image: defaultImage ?? null }
      : null,
  );
  const [customName, setCustomName] = useState(defaultCustomName ?? "");
  const [customImage, setCustomImage] = useState<string | null>(
    defaultCustomName ? (defaultImage ?? null) : null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Carta que se está viendo ampliada dentro del popover (aún sin elegir).
  const [preview, setPreview] = useState<Result | null>(null);
  const debounced = useDebouncedValue(query, 300);

  const active = mode === "catalog" && debounced.trim().length >= 2;

  useEffect(() => {
    if (!active) return;
    const q = debounced.trim();
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón de búsqueda con debounce
    setLoading(true);
    setFetchError(null);
    fetch(`/api/cards/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d: { results?: Result[]; error?: string; detail?: string } =
          await r.json();
        if (!r.ok || d.error) {
          setResults([]);
          setFetchError(d.detail ?? d.error ?? "No se pudo consultar el catálogo.");
          return;
        }
        setResults(d.results ?? []);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setFetchError("Sin conexión con el catálogo.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [active, debounced]);

  // Avisa al padre de la carta del catálogo elegida (o null en modo a mano).
  useEffect(() => {
    onSelect?.(
      mode === "catalog" && selected
        ? { id: selected.id, name: selected.name }
        : null,
    );
  }, [mode, selected, onSelect]);

  // No mostramos resultados obsoletos cuando la búsqueda no está activa.
  const shownResults = active ? results : [];

  const cardId = mode === "catalog" ? (selected?.id ?? "") : "";
  const customCardName = mode === "custom" ? customName.trim() : "";
  const cardName =
    mode === "catalog" ? (selected?.name ?? "") : customName.trim();
  const image =
    mode === "catalog" ? (selected?.image ?? "") : (customImage ?? "");

  function choose(r: Result) {
    setSelected(r);
    setOpen(false);
    setPreview(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="custom_card_name" value={customCardName} />
      <input type="hidden" name="card_name" value={cardName} />
      <input type="hidden" name="card_image" value={image} />

      {mode === "catalog" ? (
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setPreview(null);
          }}
        >
          <PopoverTrigger asChild>
            {selected ? (
              <button
                type="button"
                disabled={locked}
                className="flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-70"
              >
                <CardThumb
                  src={selected.image}
                  alt={selected.name}
                  className="w-14 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {selected.name}
                  </span>
                  {selected.localId ? (
                    <span className="block text-xs text-muted-foreground">
                      N.º {selected.localId}
                    </span>
                  ) : null}
                  {!locked ? (
                    <span className="block text-xs text-muted-foreground">
                      Toca para ampliar o cambiar
                    </span>
                  ) : null}
                </span>
                {!locked ? (
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                ) : null}
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                className="justify-between font-normal text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <Search className="size-4" />
                  Buscar carta en el catálogo…
                </span>
                <ChevronsUpDown className="size-4 opacity-50" />
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(92vw,32rem)] p-0">
            {preview ? (
              <div className="flex flex-col gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="self-start text-sm text-muted-foreground underline"
                >
                  ← Volver a los resultados
                </button>
                <div className="flex justify-center">
                  <CardThumb
                    src={largeImage(preview.image)}
                    alt={preview.name}
                    className="w-52 max-w-full"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{preview.name}</p>
                  {preview.localId ? (
                    <p className="text-xs text-muted-foreground">
                      N.º {preview.localId}
                    </p>
                  ) : null}
                </div>
                {!locked ? (
                  <Button type="button" onClick={() => choose(preview)}>
                    Elegir esta carta
                  </Button>
                ) : null}
              </div>
            ) : (
              <Command shouldFilter={false}>
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Ej. Charizard ex…"
                />
                <CommandList className="max-h-[min(60vh,26rem)]">
                  {loading ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Buscando…
                    </div>
                  ) : null}
                  {!loading && fetchError ? (
                    <div className="p-3 text-sm text-destructive">
                      {fetchError}
                    </div>
                  ) : null}
                  {!loading && !fetchError && !active ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Escribe al menos 2 letras para buscar en el catálogo.
                    </div>
                  ) : null}
                  {!loading && !fetchError && active && shownResults.length === 0 ? (
                    <CommandEmpty>
                      Nada en el catálogo para “{debounced.trim()}”. Puedes
                      escribirla a mano abajo.
                    </CommandEmpty>
                  ) : null}
                  {shownResults.length > 0 ? (
                    <CommandGroup className="p-2">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {shownResults.map((r) => (
                          <CommandItem
                            key={r.id}
                            value={r.id}
                            onSelect={() => choose(r)}
                            className="relative flex-col items-stretch gap-1 p-1.5 [&>svg]:hidden"
                          >
                            <CardThumb
                              src={r.image}
                              alt={r.name}
                              className="w-full"
                            />
                            <span className="line-clamp-2 text-xs leading-tight font-medium">
                              {r.name}
                            </span>
                            {r.localId ? (
                              <span className="text-[11px] text-muted-foreground">
                                N.º {r.localId}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-label={`Ampliar ${r.name}`}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreview(r);
                              }}
                              className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-background/85 text-muted-foreground ring-1 ring-border backdrop-blur-xs transition-colors hover:text-foreground"
                            >
                              <ZoomIn className="size-3.5" />
                            </button>
                          </CommandItem>
                        ))}
                      </div>
                    </CommandGroup>
                  ) : null}
                </CommandList>
              </Command>
            )}
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nombre de la carta (ej. Pikachu promo error)"
            disabled={locked}
            maxLength={120}
          />
          {userId && !locked ? (
            <>
              <div className="flex items-start gap-3">
                {customImage ? (
                  <div className="relative shrink-0">
                    <CardThumb
                      src={customImage}
                      alt="Imagen de la carta"
                      className="w-20"
                    />
                    <button
                      type="button"
                      aria-label="Quitar imagen"
                      onClick={() => setCustomImage(null)}
                      className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center gap-1.5 self-center rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
                  <ImagePlus className="size-4" />
                  {uploadingImage
                    ? "Subiendo…"
                    : customImage
                      ? "Cambiar imagen"
                      : "Añadir una imagen (opcional)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setImageError(null);
                      setUploadingImage(true);
                      try {
                        const [path] = await uploadListingPhotos(
                          [file],
                          userId,
                        );
                        setCustomImage(listingPhotoUrl(path));
                      } catch (err) {
                        setImageError(
                          err instanceof Error && err.message
                            ? `No se pudo subir la imagen. ${err.message}`
                            : "No se pudo subir la imagen. Intenta de nuevo.",
                        );
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                </label>
              </div>
              {imageError ? (
                <p className="text-xs text-destructive">{imageError}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Si la carta no está en el catálogo, sube una foto para que el
                anuncio no quede sin imagen.
              </p>
            </>
          ) : null}
        </div>
      )}

      {!locked ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline"
          onClick={() =>
            setMode((m) => (m === "catalog" ? "custom" : "catalog"))
          }
        >
          {mode === "catalog"
            ? "No encuentro mi carta — escribirla a mano"
            : "Buscar en el catálogo"}
        </button>
      ) : null}
    </div>
  );
}
