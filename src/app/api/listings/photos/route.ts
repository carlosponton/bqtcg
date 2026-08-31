import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "listing-photos";
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_BYTES = 5 * 1024 * 1024;
const GROUP_RE = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Subida de fotos de anuncios desde el navegador.
 *
 * Va por el servidor a propósito: la subida directa navegador → Storage daba
 * 403 "new row violates row-level security policy". Aquí se autentica al usuario
 * con la cookie de sesión y la subida real la hace el cliente con secret key
 * (ignora RLS); la seguridad la da este handler, que fuerza el prefijo
 * `{uid}/` en el path.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Inicia sesión para subir fotos." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera los 5 MB." },
      { status: 413 },
    );
  }

  const type = ALLOWED_TYPES.has(file.type) ? file.type : "image/webp";
  const ext =
    type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";

  const groupRaw = String(form.get("group") ?? "");
  const group = GROUP_RE.test(groupRaw) ? groupRaw : crypto.randomUUID();
  const indexRaw = Number(form.get("index") ?? 0);
  const index =
    Number.isFinite(indexRaw) && indexRaw >= 0 && indexRaw < 1000
      ? Math.floor(indexRaw)
      : 0;

  const path = `${user.id}/${group}/${index}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: type, upsert: true });

  if (error) {
    return NextResponse.json(
      { error: `Storage: ${error.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ path });
}

/** Borra objetos del bucket (solo dentro de la carpeta del propio usuario). */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const paths = Array.isArray(body.paths)
    ? body.paths.filter(
        (p): p is string =>
          typeof p === "string" && p.startsWith(`${user.id}/`),
      )
    : [];

  if (paths.length > 0) {
    await createAdminClient().storage.from(BUCKET).remove(paths);
  }
  return NextResponse.json({ ok: true });
}
