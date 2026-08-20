// Tworzy przez AI materiały promocyjne oferty: post, mail, nagłówek ulotki i hashtagi

import { NextResponse } from "next/server";
import { geminiJSON, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { gqlAsUser, UnauthenticatedError } from "@/lib/graphql/server-fetch";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { detectPromptInjection } from "@/lib/security/prompt-guard";

const QUERY = `
  query MarketingContext($propertyId: ID!) {
    me { name profile { fullName jobTitle phoneMobile } company { name } }
    property: getPropertyById(id: $propertyId) {
      title price location area rooms bedrooms bathrooms transactionType propertyType
      market yearBuilt features description
    }
  }
`;

interface Ctx {
  me: { name: string; profile: { fullName: string; jobTitle: string | null; phoneMobile: string | null }; company: { name: string } | null } | null;
  property: {
    title: string; price: number | null; location: string | null; area: number | null;
    rooms: number | null; bedrooms: number | null; bathrooms: number | null;
    transactionType: string | null; propertyType: string | null; market: string | null;
    yearBuilt: number | null; features: string[] | null; description: string | null;
  } | null;
}

interface MarketingCopy {
  socialPost: string;
  emailSubject: string;
  emailBody: string;
  flyerHeadline: string;
  hashtags: string[];
}

const SYSTEM = `Jesteś specjalistą marketingu nieruchomości. Tworzysz materiały promocyjne PO POLSKU
na podstawie danych oferty. Zasady: nie wymyślaj faktów (cena, metraż, lokalizacja tylko z danych);
język atrakcyjny, ale wiarygodny; bez pustych ogólników. Dołącz dane kontaktowe agenta w mailu.`;

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "marketing");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body: { propertyId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.propertyId) {
    return NextResponse.json({ error: "Missing propertyId." }, { status: 400 });
  }

  try {
    const ctx = await gqlAsUser<Ctx>(QUERY, { propertyId: body.propertyId });
    if (!ctx.property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    const p = ctx.property;
    const agent = ctx.me;
    const money = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("pl-PL")} zł`);

    const safeDescription =
      p.description && !detectPromptInjection(p.description).suspicious ? p.description : null;

    const prompt = [
      SYSTEM,
      "",
      "DANE OFERTY:",
      `- ${p.title} | ${p.transactionType ?? "?"}/${p.propertyType ?? "?"} | ${p.market ?? "?"}`,
      `- Cena: ${money(p.price)} | ${p.area ?? "?"} m² | ${p.rooms ?? "?"} pok. | ${p.bedrooms ?? "?"} syp. | ${p.bathrooms ?? "?"} łaz.`,
      `- Lokalizacja: ${p.location ?? "—"} | Rok: ${p.yearBuilt ?? "—"}`,
      p.features?.length ? `- Atuty: ${p.features.join(", ")}` : "",
      safeDescription ? `- Opis: ${safeDescription.slice(0, 600)}` : "",
      "",
      "DANE AGENTA:",
      `- ${agent?.profile.fullName || agent?.name || "Agent"}${agent?.profile.jobTitle ? `, ${agent.profile.jobTitle}` : ""}${agent?.company?.name ? `, ${agent.company.name}` : ""}`,
      agent?.profile.phoneMobile ? `- tel. ${agent.profile.phoneMobile}` : "",
      "",
      "ZADANIE: Zwróć WYŁĄCZNIE JSON (bez markdown) w formacie:",
      '{"socialPost":"post na social media (z emoji, 3-5 zdań)","emailSubject":"temat maila","emailBody":"treść maila do bazy klientów z podpisem agenta","flyerHeadline":"chwytliwy nagłówek na ulotkę","hashtags":["#tag1","#tag2"]}',
    ]
      .filter(Boolean)
      .join("\n");

    const copy = await geminiJSON<MarketingCopy>(prompt, { temperature: 0.85, maxOutputTokens: 1200 });
    return NextResponse.json(copy);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (err instanceof GeminiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 503 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed." }, { status: 502 });
  }
}
