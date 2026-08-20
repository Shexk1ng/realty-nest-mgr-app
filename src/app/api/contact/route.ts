// Przyjmuje formularz kontaktowy i równolegle zapisuje zapytanie oraz powiadamia zespół mailem

import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/contact/send-contact-email";
import { saveContactEnquiry } from "@/lib/contact/save-contact-enquiry";
import { contactFormRateLimit } from "@/lib/security/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rl = contactFormRateLimit(request);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const phone = String(body.phone ?? "").trim() || undefined;
  const company = String(body.company ?? "").trim() || undefined;

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const submission = { name, email, phone, company, message };

  const [savedResult, emailedResult] = await Promise.allSettled([
    saveContactEnquiry(submission),
    sendContactEmail(submission),
  ]);

  if (savedResult.status === "rejected") {
    console.error("[api/contact] Failed to save enquiry:", savedResult.reason);
  }
  if (emailedResult.status === "rejected") {
    console.error("[api/contact] Failed to send notification email:", emailedResult.reason);
  }

  if (savedResult.status === "rejected" && emailedResult.status === "rejected") {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
