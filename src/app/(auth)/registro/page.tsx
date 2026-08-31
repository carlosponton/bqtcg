import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Gratis. Sólo necesitas un correo para empezar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AuthForm mode="register" />
        <p className="text-xs text-muted-foreground">
          Al crear una cuenta y completar tu perfil aceptas los{" "}
          <a href="/terminos" className="underline underline-offset-2">
            Términos
          </a>{" "}
          y la{" "}
          <a href="/privacidad" className="underline underline-offset-2">
            Política de Tratamiento de Datos
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
