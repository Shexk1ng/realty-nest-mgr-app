// Dopasowuje zapytania klientów do oferty przez podobieństwo wektorowe ich opisów

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { geminiEmbed, cosineSimilarity, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { aiRateLimit } from "@/lib/security/rate-limit";

interface SmartMatchProperty {
  title: string;
  location: string | null;
  propertyType: string | null;
  price: number | null;
  area: number | null;
  rooms: number | null;
  features: string[];
  address?: { city: string | null; district: string | null } | null;
}

interface SmartMatchEnquiry {
  id: string;
  budget: number | null;
  location: string | null;
  propertyInterest: string | null;
  note?: string | null;
}

function propertyText(p: SmartMatchProperty): string {
  return [
    p.title,
    p.propertyType,
    p.location,
    p.address?.city,
    p.address?.district,
    p.area ? `${p.area} m²` : null,
    p.rooms ? `${p.rooms} pokoi` : null,
    p.features?.length ? p.features.join(", ") : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function enquiryText(e: SmartMatchEnquiry): string {
  return [
    e.propertyInterest,
    e.location,
    e.budget ? `budżet do ${Math.round(e.budget)} zł` : null,
    e.note,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "smart-match");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { property?: SmartMatchProperty; enquiries?: SmartMatchEnquiry[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const property = body.property;
  const enquiries = (body.enquiries ?? []).slice(0, 30);
  if (!property || enquiries.length === 0) {
    return NextResponse.json({ scores: {} });
  }

  try {
    const propVec = await geminiEmbed(propertyText(property));
    const scores: Record<string, number> = {};

    const concurrency = 4;
    for (let i = 0; i < enquiries.length; i += concurrency) {
      const batch = enquiries.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (e) => {
          const text = enquiryText(e);
          if (!text.trim()) {
            scores[e.id] = 0;
            return;
          }
          const eVec = await geminiEmbed(text);
          const similarity = cosineSimilarity(propVec, eVec);
          let score = Math.round(Math.max(0, similarity) * 100);
          if (e.budget && e.budget > 0 && property.price != null && property.price > e.budget) {
            score = Math.min(score, 25);
          }
          scores[e.id] = score;
        }),
      );
    }

    return NextResponse.json({ scores });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[smart-match]", err);
    return NextResponse.json({ error: "Matching failed." }, { status: 502 });
  }
}
