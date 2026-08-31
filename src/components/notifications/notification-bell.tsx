"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/query";
import { cn, timeAgo } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  function open(n: NotificationItem) {
    if (!n.read_at) {
      start(async () => {
        await markNotificationRead(n.id);
        router.refresh();
      });
    }
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"
        }
        className="relative flex size-8 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notificaciones</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() =>
                start(async () => {
                  await markAllNotificationsRead();
                  router.refresh();
                })
              }
            >
              Marcar todo leído
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No tienes notificaciones.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/60",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <span className="flex w-full items-center gap-2">
                    {!n.read_at ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    <span className="flex-1 truncate text-sm font-medium">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {n.body ? (
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t px-3 py-2 text-center">
          <Link
            href="/notificaciones"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Ver todas
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
