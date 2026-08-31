"use client";

import { useActionState } from "react";

import { completeOnboarding, type FormState } from "@/lib/auth/actions";
import { CITIES } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL: FormState = {};

type Props = {
  defaults?: {
    display_name?: string | null;
  };
};

export function OnboardingForm({ defaults }: Props) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="ej. ash_ketchum"
          required
        />
        <p className="text-xs text-muted-foreground">
          Así te verán los demás. Sólo minúsculas, números y guión bajo.
        </p>
        <FieldError messages={state.fieldErrors?.username} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaults?.display_name ?? ""}
          placeholder="Tu nombre"
          required
        />
        <FieldError messages={state.fieldErrors?.display_name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Ciudad</Label>
        <select
          id="city"
          name="city"
          required
          defaultValue="Barranquilla"
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Por ahora la plataforma es solo para Barranquilla.
        </p>
        <FieldError messages={state.fieldErrors?.city} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          placeholder="+573001234567"
        />
        <FieldError messages={state.fieldErrors?.whatsapp} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="show_whatsapp"
          defaultChecked
          className="size-4 rounded border-input"
        />
        Mostrar mi WhatsApp a usuarios con sesión iniciada
      </label>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : "Empezar"}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
