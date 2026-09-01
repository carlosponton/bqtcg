import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { listMyDeals, type DealListItem } from "@/lib/deals/query";
import { Button } from "@/components/ui/button";
import { DealRow } from "@/components/deals/deal-row";

export const metadata: Metadata = { title: "Tratos" };

export default async function TratosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/panel/tratos");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/bienvenido");

  const deals = await listMyDeals(user.id);
  const toConfirm = deals.filter(
    (d) => d.status === "pending" && !d.iConfirmed,
  );
  const waiting = deals.filter((d) => d.status === "pending" && d.iConfirmed);
  const inProgress = deals.filter((d) => d.status === "confirmed");
  const completed = deals.filter((d) => d.status === "completed");
  const cancelled = deals.filter((d) => d.status === "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tratos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compras, ventas y cambios que registraste con otras personas.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/panel">Mis anuncios</Link>
        </Button>
      </header>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no tienes tratos. Cuando cierres una compra o un cambio,
            regístralo desde el anuncio para poder reseñar a la otra persona.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Group title="Por aceptar" items={toConfirm} />
          <Group title="Esperando a la otra persona" items={waiting} />
          <Group title="En curso — coordinen y ciérrenlo" items={inProgress} />
          <Group title="Cerrados — dejen su reseña" items={completed} />
          <Group title="Cancelados" items={cancelled} />
        </div>
      )}
    </div>
  );
}

function Group({ title, items }: { title: string; items: DealListItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        {title} ({items.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((d) => (
          <DealRow key={d.id} deal={d} />
        ))}
      </ul>
    </section>
  );
}
