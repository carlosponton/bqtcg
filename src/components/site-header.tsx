import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { NAV_LINKS, SITE_NAME } from "@/lib/site";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/notifications/query";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;
  let notifications: Awaited<ReturnType<typeof getNotifications>> = [];
  let unread = 0;

  if (user) {
    const [{ data }, notifs, count] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      getNotifications(user.id, 12),
      getUnreadCount(user.id),
    ]);
    profile = data;
    notifications = notifs;
    unread = count;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 sm:gap-6">
          <MobileNav />
          <Link href="/" className="font-semibold tracking-tight">
            {SITE_NAME}
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <NotificationBell items={notifications} unread={unread} />
              <UserMenu
                username={profile?.username ?? null}
                displayName={profile?.display_name ?? null}
                avatarUrl={profile?.avatar_url ?? null}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
