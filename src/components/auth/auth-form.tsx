"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInWithPassword,
  signUpWithPassword,
  type FormState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";

const INITIAL: FormState = {};

type Props = {
  mode: "login" | "register";
  redirect?: string;
};

export function AuthForm({ mode, redirect }: Props) {
  const isLogin = mode === "login";
  const action = isLogin ? signInWithPassword : signUpWithPassword;
  const [state, formAction, isPending] = useActionState(action, INITIAL);

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton redirect={redirect} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o con tu correo
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {redirect ? (
          <input type="hidden" name="redirect" value={redirect} />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            required
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "Tu contraseña" : "Mínimo 8 caracteres"}
            required
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending} className="mt-1">
          {isPending
            ? "Un momento…"
            : isLogin
              ? "Ingresar"
              : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-foreground underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Ingresa
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
