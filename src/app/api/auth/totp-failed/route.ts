// Odnotowuje nieudaną próbę kodu TOTP na potrzeby oceny ryzyka logowania

import { NextResponse } from "next/server";
import { recordFailedAttempt } from "@/lib/security/risk-score";

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  recordFailedAttempt(getIp(request), email);
  return NextResponse.json({ ok: true });
}
