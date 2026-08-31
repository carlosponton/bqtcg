import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/site";
import { whatsappLink } from "@/lib/listings";
import { listUserListings } from "@/lib/listings/query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";

type PublicCollection = {
  id: string;
  name: string;
  description: string | null;
  share_token: string;
  item_count: number;
};

async function loadProfile(username: string) {
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, city, whatsapp, show_whatsapp, is_verified, rating_avg, rating_count, onboarding_completed",
    )
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.onboarding_completed) return null;

  const [listings, collectionsRes] = await Promise.all([
    listUserListings(profile.id),
    supabase.rpc("get_public_collections", { p_username: username }),
  ]);

  return {
    viewer,
    profile,
    listings,
    collections: (collectionsRes.data ?? []) as unknown as PublicCollection[],
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) return { title: "Perfil no encontrado" };
  const name = data.profile.display_name || `@${data.profile.username}`;
  return {
    title: `${name} — ${SITE_NAME}`,
    description:
      data.profile.bio ??
      `Anuncios y colecciones de ${name} en ${SITE_NAME}.`,
  };
}

export default async function PublicProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const data = await loadProfile(username);
  if (!data) notFound();

  const { viewer, profile, listings, collections } = data;
  const name = profile.display_name || profile.username || "Jugador";
  const initials = name.slice(0, 2).toUpperCase();
  const isSelf = viewer?.id === profile.id;

  const offers = listings.filter((l) => l.kind === "offer");
  const wants = listings.filter((l) => l.kind === "want");

  const canContactWhatsapp =
    Boolean(viewer) &&
    !isSelf &&
    profile.show_whatsapp === true &&
    Boolean(profile.whatsapp);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-16">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={name} />
            ) : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {name}
              {profile.is_verified ? (
                <Badge variant="secondary">Verificado</Badge>
              ) : null}
            </h1>
            {profile.username ? (
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.city}
              {" · "}
              {profile.rating_count
                ? `★ ${profile.rating_avg.toFixed(1)} (${profile.rating_count})`
                : "Sin reseñas todavía"}
            </p>
            {profile.bio ? (
              <p className="mt-2 max-w-prose text-sm text-pretty">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isSelf ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/perfil">Editar perfil</Link>
            </Button>
          ) : canContactWhatsapp ? (
            <Button asChild size="sm">
              <a
                href={whatsappLink(
                  profile.whatsapp!,
                  `Hola ${name}, te escribo desde ${SITE_NAME}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </Button>
          ) : !viewer ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/login?redirect=/u/${username}`}>
                Inicia sesión para contactar
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <Section title={`En venta o cambio (${offers.length})`}>
        {offers.length === 0 ? (
          <Empty>No tiene anuncios activos.</Empty>
        ) : (
          <Grid>
            {offers.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </Grid>
        )}
      </Section>

      {wants.length > 0 ? (
        <Section title={`Está buscando (${wants.length})`}>
          <Grid>
            {wants.map((item) => (
              <li key={item.id}>
                <ListingCard item={item} />
              </li>
            ))}
          </Grid>
        </Section>
      ) : null}

      {collections.length > 0 ? (
        <Section title={`Colecciones públicas (${collections.length})`}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.share_token}`}
                  className="flex h-full flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-foreground/20"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Globe className="size-3.5 text-muted-foreground" />
                    {c.name}
                  </span>
                  {c.description ? (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  ) : null}
                  <span className="mt-auto pt-1 text-xs text-muted-foreground">
                    {c.item_count} {c.item_count === 1 ? "carta" : "cartas"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
