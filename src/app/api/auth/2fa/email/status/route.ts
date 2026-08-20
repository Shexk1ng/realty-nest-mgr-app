// Zwraca informację, czy wskazany użytkownik ma włączony kod e-mail jako drugi składnik

import { NextResponse } from "next/server";
import { isEmailTwoFactorEnabled } from "@/lib/auth/email-2fa-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }

  return NextResponse.json({ enabled: isEmailTwoFactorEnabled(userId) });
}
