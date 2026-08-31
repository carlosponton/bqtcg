import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SITE_NAME } from "@/lib/site";
import { parseExploreParams } from "@/lib/listings/explore";
import { searchListings } from "@/lib/listings/query";
import { Button } from "@/components/ui/button";
import { ExploreFilters } from "@/components/listings/explore-filters";
import { ListingCard } from "@/components/listings/listing-card";

export const metadata: Metadata = {
  title: "Explorar anuncios",
  description: `Busca cartas de Pokémon TCG en venta, en cambio o que otros jugadores buscan en ${SITE_NAME}.`,
};

function pageHref(
  sp: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) qs.set(k, v);
  }
  if (page > 1) qs.set("pagina", String(page));
  else qs.delete("pagina");
  const s = qs.toString();
  return s ? `/explorar?${s}` : "/explorar";
}

export default async function ExplorarPage({
  searchParams,
}: PageProps<"/explorar">) {
  const sp = await searchParams;
  const params = parseExploreParams(sp);
  const { items, total, page, pageCount } = await searchListings(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Explorar anuncios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cartas en venta, en cambio y en búsqueda de la comunidad.
        </p>
      </header>

      <Suspense fallback={<div className="h-10" />}>
        <ExploreFilters />
      </Suspense>

      <p className="mt-4 mb-3 text-sm text-muted-foreground">
        {total === 0
          ? "Sin resultados"
          : `${total} ${total === 1 ? "anuncio" : "anuncios"}`}
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No hay anuncios que coincidan. Prueba con otros filtros o{" "}
            <Link href="/publicar" className="underline underline-offset-2">
              publica el primero
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <ListingCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav className="mt-8 flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(sp, page - 1)}>← Anteriores</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              ← Anteriores
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(sp, page + 1)}>Siguientes →</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Siguientes →
            </Button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
