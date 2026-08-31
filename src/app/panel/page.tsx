import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { listManageListings } from "@/lib/listings/query";
import { Button } from "@/components/ui/button";
import { ListingManageRow } from "@/components/listings/listing-manage-row";

export const metadata: Metadata = { title: "Mi panel" };

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/panel");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/bienvenido");

  const listings = await listManageListings(user.id);
  const active = listings.filter((l) => l.status === "active");
  const paused = listings.filter((l) => l.status === "reserved");
  const closed = listings.filter((l) => l.status === "closed");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis anuncios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} activos · {paused.length} pausados · {closed.length}{" "}
            cerrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/panel/tratos">Tratos</Link>
          </Button>
          {profile.username ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/u/${profile.username}`}>Ver mi perfil</Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href="/publicar">Publicar anuncio</Link>
          </Button>
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no has publicado nada.{" "}
            <Link href="/publicar" className="underline underline-offset-2">
              Publica tu primera carta
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Group title="Activos" items={active} />
          <Group title="Pausados" items={paused} />
          <Group title="Cerrados" items={closed} />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listManageListings>>;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        {title} ({items.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <ListingManageRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
