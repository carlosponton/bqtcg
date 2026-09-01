"use client";

import { useState } from "react";

import { LANGUAGES } from "@/lib/listings";
import { Label } from "@/components/ui/label";

/**
 * Selector de idiomas del anuncio: varios idiomas a la vez, o "cualquier
 * idioma". Usa `<input type="checkbox">` nativos (no el `Checkbox` de shadcn,
 * que no envía valor al form) con `name="languages"` + `name="any_language"`,
 * así lo leen tanto `PublishForm` (FormData en su `onSubmit`) como
 * `updateListing` (server action). Array vacío = cualquier idioma.
 */
export function LanguageMultiPicker({
  defaultLanguages = [],
}: {
  defaultLanguages?: string[];
}) {
  // Descarta el sentinela "any" y cualquier valor desconocido.
  const initial = defaultLanguages.filter((l) =>
    LANGUAGES.some((x) => x.value === l),
  );
  const [anyLang, setAnyLang] = useState(initial.length === 0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));

  function toggle(value: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Idioma(s)</Label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="any_language"
          className="size-4"
          checked={anyLang}
          onChange={(e) => setAnyLang(e.target.checked)}
        />
        Cualquier idioma
      </label>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {LANGUAGES.map((l) => (
          <label
            key={l.value}
            className="flex items-center gap-2 text-sm"
            data-off={anyLang}
          >
            <input
              type="checkbox"
              name="languages"
              value={l.value}
              className="size-4"
              disabled={anyLang}
              checked={!anyLang && selected.has(l.value)}
              onChange={(e) => toggle(l.value, e.target.checked)}
            />
            <span className={anyLang ? "text-muted-foreground/50" : undefined}>
              {l.label}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Marca todos los idiomas en los que tienes la carta, o «Cualquier
        idioma» si da igual. Así no hace falta publicar el mismo anuncio varias
        veces.
      </p>
    </div>
  );
}
