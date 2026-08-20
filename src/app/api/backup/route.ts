// Pułapka pod adresem kopii zapasowej: rejestruje trafienie i udaje niedostępność usługi

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
    endpoint: "/api/backup",
    method: req.method,
    severity: "HIGH",
    extraHeaders: {
      "user-agent": req.headers.get("user-agent")?.slice(0, 200) ?? "",
      referer: req.headers.get("referer") ?? "",
    },
  });

  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1500));

  return NextResponse.json(
    { message: "Backup service is currently unavailable.", retry: false },
    { status: 503 },
  );
}

export const GET  = handle;
export const POST = handle;
export const PUT  = handle;
