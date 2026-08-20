// Logowanie hasłem i wybór drugiego składnika: TOTP, kod e-mail albo weryfikacja z oceny ryzyka

import { NextResponse } from "next/server";
import { gqlLogin } from "@/lib/graphql/auth";
import {
  assessRisk,
  recordSuccessfulLogin,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/security/risk-score";
import { isEmailTwoFactorEnabled } from "@/lib/auth/email-2fa-store";

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

interface LoginUser {
  id: string;
  name: string;
  email: string;
  role: string;
  shortId: number;
  companyId: string | null;
  twoFactorEnabled: boolean;
}

async function issueEmailChallenge(
  request: Request,
  user: LoginUser,
  accessToken: string,
  ip: string,
): Promise<{ tokenId: string; delivery?: string; devOtp?: string; redirectedTo?: string } | null> {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin);

  try {
    const res = await fetch(`${base}/api/auth/2fa/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        userName: user.name,
        userRole: user.role,
        userShortId: user.shortId,
        userCompanyId: user.companyId,
        userTwoFactorEnabled: user.twoFactorEnabled,
        accessToken,
      }),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      tokenId?: string;
      delivery?: string;
      devOtp?: string;
      redirectedTo?: string;
    };
    return payload.tokenId ? { ...payload, tokenId: payload.tokenId } : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = getIp(request);
  const ua = request.headers.get("user-agent") ?? "unknown";

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await gqlLogin(email, password);

    if (result.errors?.length) {
      recordFailedAttempt(ip, email);
      return NextResponse.json(
        { error: result.errors[0]?.message ?? "Invalid credentials." },
        { status: 401 },
      );
    }

    const login = result.data?.login;
    if (!login) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const { accessToken, twoFactorRequired, pendingToken, user } = login;

    if (twoFactorRequired && pendingToken) {
      return NextResponse.json({
        twoFactorRequired: true,
        pendingToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          shortId: user.shortId,
          companyId: user.companyId,
        },
      });
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Sign-in could not be completed. Try again." },
        { status: 401 },
      );
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shortId: user.shortId,
      companyId: user.companyId,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    if (isEmailTwoFactorEnabled(user.id)) {
      const challenge = await issueEmailChallenge(request, publicUser, accessToken, ip);
      if (!challenge) {
        return NextResponse.json(
          { error: "Verification code could not be sent. Please try again in a moment." },
          { status: 503 },
        );
      }
      return NextResponse.json({
        twoFactorRequired: true,
        method: "email",
        tokenId: challenge.tokenId,
        delivery: challenge.delivery,
        devOtp: challenge.devOtp,
        redirectedTo: challenge.redirectedTo,
        user: publicUser,
      });
    }

    const risk = assessRisk({ userId: user.id, account: email, ip, userAgent: ua });

    if (risk.requiresAdditionalAuth && !user.twoFactorEnabled) {
      const challenge = await issueEmailChallenge(request, publicUser, accessToken, ip);

      if (!challenge) {
        return NextResponse.json(
          { error: "Additional verification is required but could not be started. Please try again in a moment." },
          { status: 503 },
        );
      }

      return NextResponse.json({
        riskRequired: true,
        riskLevel: risk.level,
        riskScore: risk.score,
        riskFactors: risk.factors,
        tokenId: challenge.tokenId,
        delivery: challenge.delivery,
        devOtp: challenge.devOtp,
        redirectedTo: challenge.redirectedTo,
        user: publicUser,
      });
    }

    recordSuccessfulLogin(user.id, ip, ua);
    clearFailedAttempts(ip, email);

    return NextResponse.json({
      twoFactorRequired: false,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shortId: user.shortId,
        companyId: user.companyId,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
