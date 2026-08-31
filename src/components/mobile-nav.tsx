"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { NAV_LINKS } from "@/lib/site";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menú de navegación para pantallas pequeñas (el `<nav>` del header es `sm:flex`). */
export function MobileNav() {
  return (
    <div className="sm:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menú"
          className="flex size-8 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Menu className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {NAV_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href}>{link.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
