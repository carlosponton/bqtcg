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
import { LogoMark } from "@/components/brand/logo";
import { TradeCart } from "@/components/brand/trade-cart";
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
      <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <LogoMark className="size-4" />
            La comunidad de Pokémon TCG en Barranquilla
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Cambia, vende y encuentra tus cartas de Pokémon TCG
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            {SITE_NAME} reúne a los jugadores del Caribe en un solo lugar: con
            perfiles, reputación y avisos cuando aparece la carta que buscas. Sin
            listas de WhatsApp perdidas.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button asChild size="lg">
              <Link href="/registro">Crear cuenta gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explorar">Explorar anuncios</Link>
            </Button>
          </div>
        </div>
        <TradeCart className="mx-auto w-full max-w-md lg:max-w-none" />
      </section>

      {latest.length > 0 ? (
        <section className="pb-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="border-l-4 border-gold pl-3 text-xl font-bold tracking-tight">
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
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <modo.icon className="size-5" />
              </span>
              <CardTitle className="mt-3">{modo.title}</CardTitle>
              <CardDescription>{modo.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mb-20 rounded-xl border bg-secondary/50 p-6 text-center sm:p-10">
        <h2 className="text-2xl font-bold tracking-tight">
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
