"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  value: File[];
  onChange: (files: File[]) => void;
  max?: number;
  disabled?: boolean;
};

export function PhotoUploader({ value, onChange, max = 6, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => value.map((f) => URL.createObjectURL(f)),
    [value],
  );

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    onChange([...value, ...incoming].slice(0, max));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div
            key={src}
            className="relative aspect-[5/7] w-20 overflow-hidden rounded-md border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
              aria-label={`Quitar foto ${i + 1}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < max ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "aspect-[5/7] h-auto w-20 flex-col gap-1 text-muted-foreground",
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-xs">Agregar</span>
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Hasta {max} fotos. Se comprimen en tu navegador antes de subirlas.
      </p>
    </div>
  );
}
