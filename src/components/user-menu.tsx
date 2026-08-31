"use client";

import Link from "next/link";

import { signOut } from "@/lib/auth/actions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export function UserMenu({ username, displayName, avatarUrl }: Props) {
  const label = displayName || username || "Mi cuenta";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={label} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/publicar">Publicar anuncio</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/coleccion">Mis colecciones</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/panel">Mis anuncios</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/panel/tratos">Tratos</Link>
        </DropdownMenuItem>
        {username ? (
          <DropdownMenuItem asChild>
            <Link href={`/u/${username}`}>Mi perfil público</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/perfil">Editar perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
