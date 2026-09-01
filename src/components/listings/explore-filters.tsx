"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { LANGUAGES, CONDITIONS } from "@/lib/listings";
import { CITIES } from "@/lib/site";
import {
  EXPLORE_FORMATS,
  EXPLORE_MODES,
  EXPLORE_SORTS,
} from "@/lib/listings/explore";
import { cn } from "@/lib/utils";

const FIELD =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ExploreFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [priceMin, setPriceMin] = useState(params.get("precio_min") ?? "");
  const [priceMax, setPriceMax] = useState(params.get("precio_max") ?? "");

  const anyActive =
    Boolean(params.get("q")) ||
    Boolean(params.get("modo")) ||
    Boolean(params.get("formato")) ||
    Boolean(params.get("ciudad")) ||
    Boolean(params.get("idioma")) ||
    Boolean(params.get("estado")) ||
    Boolean(params.get("precio_min")) ||
    Boolean(params.get("precio_max"));

  function push(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("pagina"); // cualquier cambio de filtro vuelve a la página 1
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function pushDebounced(patch: Record<string, string>) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(patch), 350);
  }

  function clearAll() {
    setQ("");
    setPriceMin("");
    setPriceMax("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        inputMode="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          pushDebounced({ q: e.target.value.trim() });
        }}
        placeholder="Buscar por nombre de carta…"
        className={cn(FIELD, "h-10 w-full")}
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={params.get("modo") ?? ""}
          onChange={(e) => push({ modo: e.target.value })}
          className={FIELD}
          aria-label="Tipo de anuncio"
        >
          <option value="">Todos</option>
          {EXPLORE_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("formato") ?? ""}
          onChange={(e) => push({ formato: e.target.value })}
          className={FIELD}
          aria-label="Formato"
        >
          <option value="">Carta o deck</option>
          {EXPLORE_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("ciudad") ?? ""}
          onChange={(e) => push({ ciudad: e.target.value })}
          className={FIELD}
          aria-label="Ciudad"
        >
          <option value="">Ciudad</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={params.get("idioma") ?? ""}
          onChange={(e) => push({ idioma: e.target.value })}
          className={FIELD}
          aria-label="Idioma"
        >
          <option value="">Idioma</option>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("estado") ?? ""}
          onChange={(e) => push({ estado: e.target.value })}
          className={FIELD}
          aria-label="Estado de la carta"
        >
          <option value="">Estado</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label.split(" —")[0]}
            </option>
          ))}
        </select>

        <select
          value={params.get("orden") ?? "recientes"}
          onChange={(e) => push({ orden: e.target.value })}
          className={FIELD}
          aria-label="Ordenar"
        >
          {EXPLORE_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={priceMin}
            onChange={(e) => {
              setPriceMin(e.target.value);
              pushDebounced({ precio_min: e.target.value });
            }}
            placeholder="Precio mín."
            className={cn(FIELD, "w-28")}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            value={priceMax}
            onChange={(e) => {
              setPriceMax(e.target.value);
              pushDebounced({ precio_max: e.target.value });
            }}
            placeholder="máx."
            className={cn(FIELD, "w-24")}
          />
        </div>

        {anyActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <X className="size-3.5" />
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}
