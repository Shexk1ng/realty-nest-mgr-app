// Włącza drugi składnik logowania w postaci kodu e-mail dla zalogowanego użytkownika

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { enableEmailTwoFactor } from "@/lib/auth/email-2fa-store";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  enableEmailTwoFactor(session.user.id);
  return NextResponse.json({ ok: true });
}
