import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

const LINKS = [
  { href: "/explorar", label: "Explorar" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad y datos" },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SITE_NAME} · Hecho por y para la comunidad de Barranquilla. No
          procesamos pagos: solo conectamos usuarios.
        </p>
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
