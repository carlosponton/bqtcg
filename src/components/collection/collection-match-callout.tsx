import Link from "next/link";
import { PackageCheck } from "lucide-react";

import { conditionLabel, languageLabel } from "@/lib/listings";
import type { CollectionMatch } from "@/lib/collection/query";

/**
 * Aviso en un anuncio "busco": el usuario tiene esa carta en su colección.
 * Se muestra sólo cuando `matches` no está vacío.
 */
export function CollectionMatchCallout({
  matches,
}: {
  matches: CollectionMatch[];
}) {
  const onlyByName = matches.every((m) => !m.exact);

  return (
    <div className="rounded-lg border border-gold/40 bg-gold/10 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PackageCheck className="size-4 text-gold" />
        Tienes esta carta en tu colección
      </p>

      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {matches.map((m) => (
          <li key={m.itemId} className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/coleccion/${m.collectionId}`}
              className="font-medium underline underline-offset-2"
            >
              {m.collectionName}
            </Link>
            <span className="text-muted-foreground">
              x{m.quantity} · {languageLabel(m.language)}
              {m.condition ? ` · ${conditionLabel(m.condition)}` : ""}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-muted-foreground">
        {onlyByName
          ? "Coincidencia por nombre; confirma que sea la misma carta antes de contactar."
          : "Si te interesa el cambio, contacta a quien la busca."}
      </p>
    </div>
  );
}
