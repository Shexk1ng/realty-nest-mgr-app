// Zamienia adres na współrzędne przez Nominatim, z ograniczeniem tempa i pamięcią podręczną

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/graphql/auth";

export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = process.env.GEOCODER_USER_AGENT ?? "RealtyNest/1.0 (real-estate CRM)";

type Hit = { lat: number; lng: number; displayName: string } | null;

const cache = new Map<string, Hit>();
let lastCall = 0;

async function throttle() {
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Query too short." }, { status: 400 });
  }

  const key = q.toLowerCase();
  if (cache.has(key)) {
    const hit = cache.get(key)!;
    return hit ? NextResponse.json(hit) : NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await throttle();
    const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pl,en" } });
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoder unavailable." }, { status: 502 });
    }
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!rows.length) {
      cache.set(key, null);
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const hit: Hit = {
      lat: Number(rows[0]!.lat),
      lng: Number(rows[0]!.lon),
      displayName: rows[0]!.display_name,
    };
    cache.set(key, hit);
    return NextResponse.json(hit);
  } catch {
    return NextResponse.json({ error: "Could not reach the geocoder." }, { status: 502 });
  }
}
