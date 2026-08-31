import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/** Ancho de salida: 2× el tamaño al que se muestra en el correo (pantallas retina). */
const OUT_WIDTH = 480;
const FETCH_TIMEOUT_MS = 8000;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/** Mismos hosts de imagen que `next.config.ts`. */
const IMAGE_HOSTS = new Set(["assets.tcgdex.net", "images.pokemontcg.io"]);

/** Sólo transcodificamos imágenes de fuentes conocidas (evita proxy abierto / SSRF). */
function isAllowedSource(u: URL): boolean {
  if (u.protocol !== "https:") return false;
  if (IMAGE_HOSTS.has(u.hostname)) return true;
  // Storage público de Supabase (imágenes de carta subidas "a mano").
  return (
    u.hostname.endsWith(".supabase.co") &&
    u.pathname.startsWith("/storage/v1/object/public/")
  );
}

/**
 * Transcodifica una imagen de carta a JPEG para los correos.
 *
 * El catálogo TCGdex sirve `.webp`, que el Outlook clásico de Windows (motor de
 * Word) no pinta. Este proxy la baja, la aplana sobre blanco y la reescala a un
 * JPEG que cualquier cliente de correo entiende; la respuesta se cachea un año
 * en la CDN. Si algo falla, redirige al original (sirve para el resto de
 * clientes). Uso: `/api/card-image?u=<url https absoluta y codificada>`.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "Falta el parámetro u." }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }
  if (!isAllowedSource(source)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 400 });
  }

  try {
    const res = await fetch(source, {
      headers: { accept: "image/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) {
      return NextResponse.redirect(source, 302);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_INPUT_BYTES) {
      return NextResponse.redirect(source, 302);
    }

    const jpeg = await sharp(buf)
      .flatten({ background: "#ffffff" })
      .resize({ width: OUT_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.redirect(source, 302);
  }
}
