// Pułapka pod adresem eksportu administracyjnego: rejestruje trafienie i zwleka z odmową

import { NextResponse } from "next/server";
import { logHoneypotHit } from "@/lib/security/honeypot";

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function getRelevantHeaders(req: Request): Record<string, string> {
  const keys = ["user-agent", "referer", "origin", "accept", "authorization", "cookie"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = req.headers.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}

async function handle(req: Request) {
  logHoneypotHit({
    ip: getIp(req),
    userAgent: req.headers.get("user-agent") ?? "unknown",
    endpoint: "/api/admin/export",
    method: req.method,
    severity: "CRITICAL",
    extraHeaders: getRelevantHeaders(req),
  });

  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  return NextResponse.json(
    {
      error: "Forbidden",
      code: "ACCESS_DENIED",
      message: "This endpoint requires elevated privileges.",
      requestId: Math.random().toString(36).slice(2),
    },
    { status: 403 },
  );
}

export const GET  = handle;
export const POST = handle;
