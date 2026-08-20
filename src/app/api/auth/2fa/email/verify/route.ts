// Sprawdza jednorazowy kod e-mail i po powodzeniu wydaje token dostępu

import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/email-2fa-store";
import { clearFailedAttempts, recordFailedAttempt, recordSuccessfulLogin } from "@/lib/security/risk-score";

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tokenId?: string; otp?: string };
    const { tokenId, otp } = body;

    if (!tokenId || !otp) {
      return NextResponse.json({ error: "Missing tokenId or otp." }, { status: 400 });
    }

    const ip = getIp(request);
    const result = verifyOtp(tokenId, otp);

    if (!result.valid) {
      if (result.email) recordFailedAttempt(ip, result.email);
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    if (result.user) {
      clearFailedAttempts(ip, result.user.email);
      recordSuccessfulLogin(result.user.id, ip, request.headers.get("user-agent") ?? "unknown");
    }

    return NextResponse.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    console.error("[2fa/email/verify]", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
