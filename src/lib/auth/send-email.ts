// Wysyła kod jednorazowy 2FA przez Resend, a bez klucza API wypisuje go na konsolę serwera

const DEV_EMAIL_OVERRIDE = "bartlomiejdejewski01@gmail.com";

export interface SendOtpOptions {
  to: string;
  userName: string;
  otp: string;
}

export type EmailDeliveryMode = "resend" | "console";

export interface SendOtpResult {
  mode: EmailDeliveryMode;
  actualTo: string;
  redirected: boolean;
}

function resolveRecipient(to: string): {
  actualTo: string;
  originalTo: string;
  redirected: boolean;
} {
  const override =
    process.env.EMAIL_OVERRIDE_TO ??
    (process.env.NODE_ENV === "development" ? DEV_EMAIL_OVERRIDE : undefined);

  if (override && override !== to) {
    return { actualTo: override, originalTo: to, redirected: true };
  }

  return { actualTo: to, originalTo: to, redirected: false };
}

export async function sendOtpEmail({
  to,
  userName,
  otp,
}: SendOtpOptions): Promise<SendOtpResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const { actualTo, originalTo, redirected } = resolveRecipient(to);

  if (!apiKey) {
    console.log(
      `\n┌─ [Email 2FA — dev mode] ───────────────────────\n` +
      `│  To:   ${actualTo}${redirected ? ` (redirected from ${originalTo})` : ""}\n` +
      `│  Name: ${userName}\n` +
      `│  Code: ${otp}\n` +
      `│  Tip:  set RESEND_API_KEY in .env.local to send real email\n` +
      `└────────────────────────────────────────────────\n`,
    );
    return { mode: "console", actualTo, redirected };
  }

  const from = process.env.EMAIL_FROM ?? "Realty Nest <noreply@realtynest.com>";
  const subjectPrefix = redirected ? `[DEV → ${originalTo}] ` : "";

  const devBanner = redirected
    ? `<p style="margin:0 0 24px;padding:12px 16px;background:#fff7ed;border-radius:8px;font-size:13px;color:#9a3412">
        <strong>Development redirect:</strong> this message was sent to ${actualTo} instead of ${originalTo}.
      </p>`
    : "";

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
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.75)">Secure sign-in verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            ${devBanner}
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Your sign-in code</p>
            <p style="margin:0 0 32px;font-size:15px;color:#64748b">Hi ${userName}, enter this code to complete your sign-in.</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1d4ed8;font-variant-numeric:tabular-nums">${otp}</span>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">
              This code expires in <strong>5 minutes</strong>. If you didn't try to sign in to Realty Nest, you can safely ignore this email — your account remains secure.
            </p>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e2e8f0;padding:24px 40px">
            <p style="margin:0;font-size:12px;color:#94a3b8">© 2026 Realty Nest · Secure workspace for real estate teams</p>
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
      to: actualTo,
      subject: `${subjectPrefix}${otp} — Your Realty Nest sign-in code`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[send-email] Resend error ${res.status}:`, body);
    throw new Error("Failed to send verification email. Try again.");
  }

  return { mode: "resend", actualTo, redirected };
}
