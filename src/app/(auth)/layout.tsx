import type { ReactNode } from "react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="self-center" aria-label="El Cambista TCG — inicio">
        <Logo withWordmark markClassName="size-8" />
      </Link>
      {children}
    </div>
  );
}
