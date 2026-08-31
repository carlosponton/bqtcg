"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileFormState } from "@/lib/profile/actions";
import { CITIES } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: ProfileFormState = {};

type Props = {
  username: string | null;
  defaults: {
    display_name: string | null;
    bio: string | null;
    city: string | null;
    whatsapp: string | null;
    show_whatsapp: boolean;
    email_notifications: boolean;
  };
};

export function EditProfileForm({ username, defaults }: Props) {
  const [state, formAction, isPending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {username ? (
        <div className="flex flex-col gap-1.5">
          <Label>Nombre de usuario</Label>
          <Input value={`@${username}`} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            El nombre de usuario no se puede cambiar.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaults.display_name ?? ""}
          required
        />
        <FieldError messages={state.fieldErrors?.display_name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio (opcional)</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={defaults.bio ?? ""}
          placeholder="Cuéntale a la comunidad qué juegas, qué buscas, en qué tienda sueles estar…"
        />
        <FieldError messages={state.fieldErrors?.bio} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Ciudad</Label>
        <select
          id="city"
          name="city"
          defaultValue={defaults.city ?? "Barranquilla"}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.city} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          defaultValue={defaults.whatsapp ?? ""}
          placeholder="+573001234567"
        />
        <FieldError messages={state.fieldErrors?.whatsapp} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="show_whatsapp"
          defaultChecked={defaults.show_whatsapp}
          className="size-4 rounded border-input"
        />
        Mostrar mi WhatsApp a usuarios con sesión iniciada
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="email_notifications"
          defaultChecked={defaults.email_notifications}
          className="size-4 rounded border-input"
        />
        Recibir avisos por correo (tratos, reseñas, cartas que busco)
      </label>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Perfil actualizado.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
