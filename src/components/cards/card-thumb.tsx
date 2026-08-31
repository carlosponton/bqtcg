"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Miniatura de carta del catálogo (imagen externa, puede faltar). */
export function CardThumb({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex aspect-[5/7] items-center justify-center rounded bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("aspect-[5/7] rounded object-cover", className)}
    />
  );
}
