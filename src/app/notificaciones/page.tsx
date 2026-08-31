import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/query";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/notificaciones");

  const items = await getNotifications(user.id, 60);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">
        Notificaciones
      </h1>
      <NotificationList items={items} />
    </div>
  );
}
