"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/query";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  function open(n: NotificationItem) {
    if (!n.read_at) {
      start(async () => {
        await markNotificationRead(n.id);
        router.refresh();
      });
    }
    if (n.link) router.push(n.link);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No tienes notificaciones todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unread > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await markAllNotificationsRead();
              router.refresh();
            })
          }
          className="self-end text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Marcar todo como leído
        </button>
      ) : null}

      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors hover:border-foreground/20",
                !n.read_at && "border-primary/30 bg-primary/5",
              )}
            >
              <span className="flex w-full items-center gap-2">
                {!n.read_at ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                ) : null}
                <span className="flex-1 text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(n.created_at)}
                </span>
              </span>
              {n.body ? (
                <span className="text-sm text-muted-foreground">{n.body}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
