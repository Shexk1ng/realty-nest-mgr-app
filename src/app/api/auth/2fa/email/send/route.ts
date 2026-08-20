// Wysyła lub odnawia jednorazowy kod e-mail dla rozpoczętego logowania dwuskładnikowego

import { NextResponse } from "next/server";
import {
  generateOtp,
  refreshOtpForToken,
  storeOtp,
} from "@/lib/auth/email-2fa-store";
import { sendOtpEmail } from "@/lib/auth/send-email";
import { otpSendRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const rl = otpSendRateLimit(request, "2fa-email-send");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many code requests. Please wait a moment before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      email?: string;
      userName?: string;
      userRole?: string;
      userShortId?: number;
      userCompanyId?: string | null;
      userTwoFactorEnabled?: boolean;
      accessToken?: string;
      tokenId?: string;
    };

    const {
      userId,
      email,
      userName,
      userRole,
      userShortId,
      userCompanyId,
      userTwoFactorEnabled,
      accessToken,
      tokenId,
    } = body;

    let otp: string;
    let resolvedTokenId: string;
    let resolvedEmail: string;
    let resolvedName: string;

    if (tokenId && !accessToken) {
      const refreshed = refreshOtpForToken(tokenId);
      if (!refreshed) {
        return NextResponse.json(
          { error: "Session expired. Sign in again to get a new code." },
          { status: 400 },
        );
      }
      otp = refreshed.otp;
      resolvedTokenId = tokenId;
      resolvedEmail = refreshed.email;
      resolvedName = refreshed.userName;
    } else {
      if (!userId || !email || !userName || !accessToken) {
        return NextResponse.json(
          { error: "Missing required fields." },
          { status: 400 },
        );
      }

      otp = generateOtp();
      resolvedTokenId = storeOtp(
        userId,
        email,
        userName,
        userRole ?? "AGENT",
        userShortId ?? 0,
        userCompanyId ?? null,
        userTwoFactorEnabled ?? false,
        accessToken,
        otp,
      );
      resolvedEmail = email;
      resolvedName = userName;
    }

    const delivery = await sendOtpEmail({
      to: resolvedEmail,
      userName: resolvedName,
      otp,
    });

    const isDev = process.env.NODE_ENV === "development";
    const showDevOtp = isDev && delivery.mode === "console";

    return NextResponse.json({
      tokenId: resolvedTokenId,
      delivery: delivery.mode,
      redirectedTo: delivery.redirected ? delivery.actualTo : undefined,
      ...(showDevOtp ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error("[2fa/email/send]", err);
    const message =
      err instanceof Error ? err.message : "Failed to send code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
