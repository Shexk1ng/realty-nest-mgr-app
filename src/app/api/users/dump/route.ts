// Pułapka pod adresem zrzutu użytkowników: rejestruje trafienie i zwraca fałszywe 404

import { NextResponse } from "next/server";
import { logHoneypotHit } from "@/lib/security/honeypot";

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function handle(req: Request) {
  logHoneypotHit({
    ip: getIp(req),
    userAgent: req.headers.get("user-agent") ?? "unknown",
    endpoint: "/api/users/dump",
    method: req.method,
    severity: "CRITICAL",
    extraHeaders: {
      "user-agent": req.headers.get("user-agent")?.slice(0, 200) ?? "",
      referer: req.headers.get("referer") ?? "",
      authorization: req.headers.get("authorization") ? "[PRESENT]" : "[ABSENT]",
    },
  });

  await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));

  return NextResponse.json(
    { error: "Not Found", status: 404 },
    { status: 404 },
  );
}

export const GET  = handle;
export const POST = handle;
