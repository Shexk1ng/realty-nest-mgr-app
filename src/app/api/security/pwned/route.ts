// Odpytuje bazę wykradzionych haseł po prefiksie skrótu, nie ujawniając całego hasła

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const prefix = new URL(req.url).searchParams.get("prefix");
  if (!prefix || !/^[0-9A-Fa-f]{5}$/.test(prefix)) {
    return NextResponse.json({ error: "Invalid prefix." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`, {
      headers: { "Add-Padding": "true" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Breach service unavailable." }, { status: 502 });
    }
    return new NextResponse(await res.text(), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the breach service." }, { status: 502 });
  }
}
