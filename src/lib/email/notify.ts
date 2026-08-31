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
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHtml(c: Content): string {
  const url = `${SITE_URL}${c.ctaPath}`;
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
      ${paras}
      <a href="${url}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">${esc(c.ctaLabel)}</a>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Puedes desactivar estos correos en tu perfil.</p>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(c: Content): string {
  return `${c.heading}\n\n${c.lines.join("\n")}\n\n${c.ctaLabel}: ${SITE_URL}${c.ctaPath}\n\n— ${SITE_NAME}\nDesactiva estos correos en tu perfil.`;
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
