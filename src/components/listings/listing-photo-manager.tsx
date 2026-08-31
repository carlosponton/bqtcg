"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { saveListingPhotos } from "@/lib/listings/actions";
import {
  removeStoragePhotos,
  uploadListingPhotos,
} from "@/lib/listings/photo-upload";
import { listingPhotoUrl } from "@/lib/listings";
import type { ListingKind } from "@/types/database";
import { Button } from "@/components/ui/button";
import { PhotoUploader } from "@/components/listings/photo-uploader";

type Props = {
  listingId: string;
  userId: string;
  kind: ListingKind;
  initialPaths: string[];
};

const MAX = 6;

export function ListingPhotoManager({
  listingId,
  userId,
  kind,
  initialPaths,
}: Props) {
  const [persistedPaths, setPersistedPaths] = useState<string[]>(initialPaths);
  const [kept, setKept] = useState<string[]>(initialPaths);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const total = kept.length + files.length;
  const dirty =
    files.length > 0 ||
    kept.length !== persistedPaths.length ||
    kept.some((p, i) => p !== persistedPaths[i]);

  async function save() {
    setError(null);
    setOk(false);

    if (kind === "offer" && total === 0) {
      setError("Un anuncio de venta o cambio necesita al menos una foto.");
      return;
    }

    setPending(true);
    let uploaded: string[] = [];
    try {
      if (files.length > 0) {
        uploaded = await uploadListingPhotos(files, userId, kept.length);
      }
    } catch {
      setPending(false);
      setError("No se pudieron subir las fotos. Revisa tu conexión.");
      return;
    }

    const finalPaths = [...kept, ...uploaded];
    const res = await saveListingPhotos(listingId, finalPaths);
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      if (uploaded.length > 0) void removeStoragePhotos(uploaded);
      return;
    }

    const removed = persistedPaths.filter((p) => !finalPaths.includes(p));
    if (removed.length > 0) void removeStoragePhotos(removed);

    setPersistedPaths(finalPaths);
    setKept(finalPaths);
    setFiles([]);
    setOk(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {kept.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {kept.map((path, i) => (
            <div
              key={path}
              className="relative aspect-[5/7] w-20 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listingPhotoUrl(path)}
                alt={`Foto ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => setKept(kept.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                aria-label={`Quitar foto ${i + 1}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este anuncio no tiene fotos.
        </p>
      )}

      {total < MAX ? (
        <PhotoUploader
          value={files}
          onChange={setFiles}
          max={MAX - kept.length}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Llegaste al máximo de {MAX}.</p>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p
          className="text-sm text-emerald-600 dark:text-emerald-400"
          role="status"
        >
          Fotos actualizadas.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={pending || !dirty}
        onClick={save}
      >
        {pending ? "Guardando…" : "Guardar fotos"}
      </Button>
    </div>
  );
}
