// Szacuje przez AI wartość rynkową nieruchomości na podstawie jej parametrów

import { NextResponse } from "next/server";
import { geminiJSON, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { detectPromptInjection } from "@/lib/security/prompt-guard";
import { auth } from "@/lib/graphql/auth";

export interface ValuationRequest {
  area?: number;
  location?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  transactionType?: string;
  condition?: string;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  rooms?: number;
  features?: string[];
}

export interface ValuationResponse {
  estimatedMin: number;
  estimatedMax: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  pricePerSqm?: number;
}

const CONDITION_PL: Record<string, string> = {
  READY_TO_MOVE: "do zamieszkania",
  GOOD: "dobry",
  AFTER_RENOVATION: "po remoncie",
  TO_RENOVATE: "do remontu",
  FOR_FINISHING: "do wykończenia",
  DEVELOPER_STATE: "stan deweloperski",
};

const TYPE_PL: Record<string, string> = {
  APARTMENT: "mieszkanie", HOUSE: "dom", STUDIO: "kawalerka",
  ROOM: "pokój", PLOT: "działka", COMMERCIAL: "lokal użytkowy",
  OFFICE: "biuro", GARAGE: "garaż",
};

const TRANSACTION_PL: Record<string, string> = {
  SALE: "sprzedaż", RENT: "wynajem",
};

const FEATURE_PL: Record<string, string> = {
  balcony: "balkon", terrace: "taras", garden: "ogród", parking: "parking",
  garage: "garaż", elevator: "winda", basement: "komórka lokatorska",
  furnished: "umeblowane", ac: "klimatyzacja", fireplace: "kominek",
};

const SYSTEM = `Jesteś ekspertem rynku nieruchomości w Polsce. Szacujesz wartości rynkowe nieruchomości.
Zwróć WYŁĄCZNIE JSON (bez markdown): {"estimatedMin":N,"estimatedMax":N,"confidence":"HIGH|MEDIUM|LOW","rationale":"...", "pricePerSqm":N}
- estimatedMin/Max: wartości w PLN, liczby całkowite
- pricePerSqm: szacowana cena za m²
- confidence: HIGH gdy dane kompletne, MEDIUM gdy częściowe, LOW gdy bardzo mało danych
- rationale: 2-3 zdania uzasadnienia PO POLSKU, konkretne (nie wymyślaj danych których nie ma)`;

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "valuation");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ValuationRequest;
  try {
    body = (await req.json()) as ValuationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  for (const value of [body.location, body.city, body.district]) {
    if (typeof value === "string" && detectPromptInjection(value).suspicious) {
      return NextResponse.json({ error: "Request rejected." }, { status: 400 });
    }
  }

  const lines: string[] = [];
  const push = (label: string, val: unknown) => {
    if (val !== null && val !== undefined && val !== "") lines.push(`- ${label}: ${val}`);
  };

  push("Typ transakcji", body.transactionType ? TRANSACTION_PL[body.transactionType] ?? body.transactionType : null);
  push("Typ nieruchomości", body.propertyType ? TYPE_PL[body.propertyType] ?? body.propertyType : null);
  push("Lokalizacja", body.location);
  push("Miasto", body.city);
  push("Dzielnica", body.district);
  push("Powierzchnia (m²)", body.area);
  push("Liczba pokoi", body.rooms);
  if (body.floor != null) push("Piętro", body.totalFloors != null ? `${body.floor} z ${body.totalFloors}` : body.floor);
  push("Rok budowy", body.yearBuilt);
  push("Stan", body.condition ? CONDITION_PL[body.condition] ?? body.condition : null);
  if (body.features?.length) push("Cechy", body.features.map((f) => FEATURE_PL[f] ?? f).join(", "));

  if (lines.length === 0) {
    return NextResponse.json({ error: "Not enough data for valuation." }, { status: 400 });
  }

  const prompt = [
    SYSTEM,
    "",
    "DANE NIERUCHOMOŚCI:",
    ...lines,
    "",
    "Podaj wycenę rynkową.",
  ].join("\n");

  try {
    const result = await geminiJSON<ValuationResponse>(prompt, { temperature: 0.3, maxOutputTokens: 400 });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 503 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Valuation failed." }, { status: 502 });
  }
}
