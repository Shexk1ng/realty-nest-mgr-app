// Udostępnia administratorom bieżące zdarzenia bezpieczeństwa: DLP, pułapki i ryzyko logowania

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { getDlpEvents } from "@/lib/security/dlp";
import { getHoneypotEvents } from "@/lib/security/honeypot";
import { getRiskEvents } from "@/lib/security/risk-score";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["SYSTEM_ADMIN", "COMPANY_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return NextResponse.json({
    dlp: getDlpEvents(50),
    honeypot: getHoneypotEvents(50),
    risk: getRiskEvents(50),
  });
}
