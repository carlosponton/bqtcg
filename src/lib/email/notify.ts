import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { sendEmail } from "@/lib/email/send";

type Content = {
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel: string;
  ctaPath: string;
  /** Imagen de la carta (URL https del catálogo TCGdex o de Storage). */
  imageUrl?: string | null;
  imageAlt?: string | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escapa un valor para meterlo en un atributo HTML entre comillas dobles. */
function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

/** Sólo dejamos imágenes remotas por https (catálogo o Storage). */
function httpsImage(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && /^https:\/\//i.test(v) ? v : null;
}

/**
 * Pasa la imagen por `/api/card-image`, que la transcodifica a JPEG. El catálogo
 * TCGdex sirve `.webp` y el Outlook clásico de Windows no lo pinta.
 */
function proxiedImage(url: string): string {
  return `${SITE_URL}/api/card-image?u=${encodeURIComponent(url)}`;
}

function renderHtml(c: Content): string {
  const url = `${SITE_URL}${c.ctaPath}`;
  const img = httpsImage(c.imageUrl);
  const imgBlock = img
    ? `<div style="text-align:center;margin:0 0 16px"><img src="${escAttr(proxiedImage(img))}" alt="${escAttr(c.imageAlt ?? c.heading)}" width="220" style="width:100%;max-width:220px;height:auto;border-radius:12px;border:1px solid #e7e5e4" /></div>`
    : "";
  const paras = c.lines
    .map(
      (l) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#1f2937">${esc(l)}</p>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e7e5e4">
    <tr><td style="padding:24px">
      <p style="margin:0 0 16px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#6b7280;text-transform:uppercase">${esc(SITE_NAME)}</p>
      <h1 style="margin:0 0 12px;font-size:19px;color:#111827">${esc(c.heading)}</h1>
      ${imgBlock}
      ${paras}
      <a href="${url}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">${esc(c.ctaLabel)}</a>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Puedes desactivar estos correos en tu perfil.</p>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(c: Content): string {
  const parts = [c.heading, "", c.lines.join("\n")];
  const img = httpsImage(c.imageUrl);
  if (img) parts.push("", `Imagen de la carta: ${img}`);
  parts.push(
    "",
    `${c.ctaLabel}: ${SITE_URL}${c.ctaPath}`,
    "",
    `— ${SITE_NAME}`,
    "Desactiva estos correos en tu perfil.",
  );
  return parts.join("\n");
}

/**
 * Envía un correo a un usuario si tiene los correos activados. Best-effort:
 * nunca lanza. Pensado para llamarse dentro de `after(() => ...)`.
 */
export async function emailUser(userId: string, c: Content): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: prof } = await admin
      .from("profiles")
      .select("email_notifications")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.email_notifications === false) return;

    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return;

    await sendEmail({
      to,
      subject: c.subject,
      html: renderHtml(c),
      text: renderText(c),
    });
  } catch {
    // best-effort; el aviso in-app ya quedó por trigger
  }
}
