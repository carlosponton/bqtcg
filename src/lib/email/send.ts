import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM =
  process.env.EMAIL_FROM || "TCG Barranquilla <onboarding@resend.dev>";

export type SendResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

/**
 * Envía un correo por Resend. Best-effort: nunca lanza.
 * Si no hay `RESEND_API_KEY` (p. ej. en local), no hace nada.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  if (!RESEND_API_KEY) return { sent: false, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { sent: false, error: `resend HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "error" };
  }
}
