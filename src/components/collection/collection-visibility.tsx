"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Globe, Link2, Lock } from "lucide-react";

import { setCollectionVisibility } from "@/lib/collection/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CollectionVisibility as Visibility } from "@/types/database";

const OPTIONS: {
  value: Visibility;
  label: string;
  hint: string;
  icon: typeof Lock;
}[] = [
  {
    value: "private",
    label: "Privada",
    hint: "Sólo tú la ves.",
    icon: Lock,
  },
  {
    value: "unlisted",
    label: "Con enlace",
    hint: "Cualquiera con el enlace puede verla.",
    icon: Link2,
  },
  {
    value: "public",
    label: "Pública",
    hint: "Aparece en tu perfil.",
    icon: Globe,
  },
];

type Props = {
  collectionId: string;
  visibility: Visibility;
  shareToken: string;
};

export function CollectionVisibility({
  collectionId,
  visibility,
  shareToken,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Visibility>(visibility);
  const [copied, setCopied] = useState(false);

  function choose(next: Visibility) {
    if (next === current) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const res = await setCollectionVisibility(collectionId, next);
      if (!res.ok) setCurrent(prev);
    });
  }

  async function copyLink() {
    const url = `${window.location.origin}/c/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  }

  const hint = OPTIONS.find((o) => o.value === current)?.hint;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <span className="text-sm font-medium">Visibilidad</span>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => choose(o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
              current === o.value
                ? "border-primary bg-primary/5 text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        ))}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {current !== "private" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyLink}
          className="mt-1 self-start"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado" : "Copiar enlace"}
        </Button>
      ) : null}
    </div>
  );
}
