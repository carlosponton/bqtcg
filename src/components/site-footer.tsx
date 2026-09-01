import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { LogoMark } from "@/components/brand/logo";

const LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad y datos" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <LogoMark className="size-6 text-foreground" />
          <p className="max-w-sm">
            <span className="font-semibold text-foreground">{SITE_NAME}</span> ·
            Hecho por y para la comunidad en Colombia. No procesamos pagos:
            solo conectamos usuarios.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
