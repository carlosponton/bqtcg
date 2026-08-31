import Link from "next/link";
import { ArrowLeftRight, Search, Tag } from "lucide-react";

import { SITE_NAME } from "@/lib/site";
import { parseExploreParams } from "@/lib/listings/explore";
import { searchListings } from "@/lib/listings/query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingCard } from "@/components/listings/listing-card";

const MODOS = [
  {
    icon: Tag,
    title: "Vendo",
    description:
      "Publica las cartas que quieres vender, con estado, idioma y precio.",
  },
  {
    icon: ArrowLeftRight,
    title: "Cambio",
    description:
      "Ofrece cartas para intercambiar y di qué te interesa recibir a cambio.",
  },
  {
    icon: Search,
    title: "Busco",
    description:
      "Marca las cartas que estás buscando y entérate cuando alguien las publique.",
  },
];

export default async function HomePage() {
  const { items } = await searchListings(parseExploreParams({}));
  const latest = items.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Compra, vende e intercambia cartas de Pokémon TCG en Barranquilla
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-pretty">
          Un solo lugar para la comunidad del Caribe: sin listas de WhatsApp
          perdidas, con perfiles y reputación para negociar con confianza.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/registro">Crear cuenta gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/explorar">Explorar anuncios</Link>
          </Button>
        </div>
      </section>

      {latest.length > 0 ? (
        <section className="pb-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Últimos anuncios
            </h2>
            <Link
              href="/explorar"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {latest.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {MODOS.map((modo) => (
          <Card key={modo.title}>
            <CardHeader>
              <modo.icon className="size-5 text-muted-foreground" />
              <CardTitle className="mt-2">{modo.title}</CardTitle>
              <CardDescription>{modo.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mb-20 rounded-xl border bg-muted/40 p-6 text-center sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          ¿Ya juegas en una tienda de la ciudad?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          {SITE_NAME} está arrancando. Crea tu cuenta, publica tus primeras
          cartas y ayúdanos a que la comunidad se mueva aquí.
        </p>
        <Button asChild className="mt-4">
          <Link href="/registro">Empezar</Link>
        </Button>
      </section>
    </div>
  );
}
