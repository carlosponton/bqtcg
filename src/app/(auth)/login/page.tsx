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

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const redirectTo = typeof sp.redirect === "string" ? sp.redirect : undefined;
  const errorMsg = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresar</CardTitle>
        <CardDescription>
          Entra para publicar cartas y contactar a otros jugadores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        ) : null}
        <AuthForm mode="login" redirect={redirectTo} />
      </CardContent>
    </Card>
  );
}
