// Powiadamia zespół wiadomością e-mail o nowym zgłoszeniu z formularza kontaktowego

import { CONTACT_EMAIL } from "@/constants/contact";

export interface ContactSubmission {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendContactEmail(submission: ContactSubmission): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const { name, email, phone, company, message } = submission;

  if (!apiKey) {
    console.log(
      `\n┌─ [Contact form — dev mode] ────────────────────\n` +
      `│  From:    ${name} <${email}>\n` +
      `│  Phone:   ${phone || "—"}\n` +
      `│  Company: ${company || "—"}\n` +
      `│  Message: ${message}\n` +
      `│  Tip:     set RESEND_API_KEY in .env.local to send real email\n` +
      `└────────────────────────────────────────────────\n`,
    );
    return;
  }

  const from = process.env.EMAIL_FROM ?? "Realty Nest <noreply@realtynest.com>";
  const to = process.env.EMAIL_OVERRIDE_TO || CONTACT_EMAIL;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#e7edfb;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#2563eb);padding:32px 40px">
            <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px">🏠 Realty Nest</p>
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.75)">New contact form submission</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 24px;font-size:15px;color:#64748b">
              <strong style="color:#0f172a">${escapeHtml(name)}</strong> (${escapeHtml(email)}) sent a message from the landing page.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr><td style="padding:6px 0;font-size:13px;color:#94a3b8;width:100px">Phone</td><td style="padding:6px 0;font-size:13px;color:#0f172a">${escapeHtml(phone || "—")}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#94a3b8">Company</td><td style="padding:6px 0;font-size:13px;color:#0f172a">${escapeHtml(company || "—")}</td></tr>
            </table>
            <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#0f172a">${escapeHtml(message)}</div>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e2e8f0;padding:24px 40px">
            <p style="margin:0;font-size:12px;color:#94a3b8">© 2026 Realty Nest · Landing page contact form</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `New contact — ${company || name}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[send-contact-email] Resend error ${res.status}:`, body);
    throw new Error("Failed to send the notification email.");
  }
}
