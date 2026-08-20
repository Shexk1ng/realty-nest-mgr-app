// Generuje opis oferty przez AI, w całości albo pojedynczą sekcją, na podstawie danych oferty

import { NextResponse } from "next/server";
import {
  type DescFacts,
  type DescSection,
  type GenerateRequest,
  type GenerateResponse,
} from "@/lib/ai/description";
import { aiRateLimit, sanitizeInput } from "@/lib/security/rate-limit";
import { detectPromptInjection } from "@/lib/security/prompt-guard";
import { geminiText, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { auth } from "@/lib/graphql/auth";

const TONE_HINT: Record<string, string> = {
  professional: "Ton: profesjonalny, rzeczowy, budujący zaufanie.",
  warm: "Ton: ciepły, przyjazny, ale konkretny.",
  premium: "Ton: ekskluzywny, prestiżowy, elegancki.",
  concise: "Ton: zwięzły i konkretny, bez lania wody.",
};

const SECTION_BRIEF: Record<DescSection, string> = {
  intro:
    "Napisz krótkie WPROWADZENIE (2–3 zdania). Zawrzyj najważniejsze dane: typ nieruchomości, metraż, liczbę pokoi i lokalizację. Wzór: \"Na sprzedaż 3-pokojowe mieszkanie o powierzchni 62 m², zlokalizowane na warszawskim Mokotowie.\"",
  layout:
    "Opisz UKŁAD I WNĘTRZE: rozmieszczenie pomieszczeń, nasłonecznienie, balkon/ogród/taras, stan wykończenia. Konkretnie i w uporządkowany sposób (3–5 zdań).",
  location:
    "Opisz ATUTY LOKALIZACJI: bliskość szkół, komunikacji miejskiej, sklepów, terenów zielonych — konkretnie, bez ogólników typu \"świetna lokalizacja\". (2–4 zdania).",
  additional:
    "Wypisz INFORMACJE DODATKOWE: miejsce parkingowe, komórka lokatorska, stan prawny, forma własności, koszty czynszu. Zakończ jasnym CTA, np. \"Zapraszam do kontaktu w celu umówienia prezentacji.\" (2–4 zdania).",
};

const LABELS: Record<string, Record<string, string>> = {
  transactionType: { SALE: "na sprzedaż", RENT: "do wynajęcia" },
  propertyType: {
    APARTMENT: "mieszkanie", HOUSE: "dom", STUDIO: "kawalerka", ROOM: "pokój",
    PLOT: "działka", COMMERCIAL: "lokal użytkowy", OFFICE: "biuro", GARAGE: "garaż",
  },
  market: { PRIMARY: "rynek pierwotny", SECONDARY: "rynek wtórny" },
  ownership: {
    FULL_OWNERSHIP: "pełna własność", COOPERATIVE: "spółdzielcze własnościowe",
    COOPERATIVE_LAND: "spółdzielcze z KW", SHARE: "udział",
  },
  condition: {
    READY_TO_MOVE: "do zamieszkania", GOOD: "dobry", AFTER_RENOVATION: "po remoncie",
    TO_RENOVATE: "do remontu", FOR_FINISHING: "do wykończenia", DEVELOPER_STATE: "stan deweloperski",
  },
};

const FEATURE_PL: Record<string, string> = {
  balcony: "balkon", terrace: "taras", garden: "ogród", parking: "miejsce parkingowe",
  garage: "garaż", elevator: "winda", basement: "komórka lokatorska", furnished: "umeblowane",
  ac: "klimatyzacja", fireplace: "kominek", alarm: "alarm", concierge: "konsjerż",
  reception: "recepcja", fiber: "światłowód", two_level: "dwupoziomowe", separate_kitchen: "oddzielna kuchnia",
};

function factsToText(f: DescFacts): string {
  const lines: string[] = [];
  const push = (label: string, val: unknown) => {
    if (val !== null && val !== undefined && val !== "") lines.push(`- ${label}: ${val}`);
  };
  const map = (group: string, v?: string | null) => (v ? LABELS[group]?.[v] ?? v : null);

  push("Tytuł", f.title);
  push("Transakcja", map("transactionType", f.transactionType));
  push("Typ", map("propertyType", f.propertyType));
  push("Rynek", map("market", f.market));
  push("Powierzchnia (m²)", f.area);
  push("Powierzchnia działki (m²)", f.plotArea);
  push("Liczba pokoi", f.rooms);
  push("Sypialnie", f.bedrooms);
  push("Łazienki", f.bathrooms);
  if (f.floor != null) push("Piętro", f.totalFloors != null ? `${f.floor} z ${f.totalFloors}` : f.floor);
  push("Rok budowy", f.yearBuilt);
  push("Lokalizacja", f.location);
  push("Dzielnica", f.district);
  push("Miasto", f.city);
  if (f.price != null) push("Cena (zł)", f.price.toLocaleString("pl-PL"));
  push("Czynsz administracyjny (zł)", f.monthlyRent);
  push("Kaucja (zł)", f.deposit);
  push("Forma własności", map("ownership", f.ownership));
  push("Stan", map("condition", f.condition));
  push("Ogrzewanie", f.heating);
  push("Klasa energetyczna", f.energyClass);
  if (f.features?.length) push("Udogodnienia", f.features.map((x) => FEATURE_PL[x] ?? x).join(", "));

  return lines.join("\n");
}

const SYSTEM = `Jesteś ekspertem od pisania ogłoszeń nieruchomości na portale (Otodom, OLX).
Zasady:
- Pisz po polsku, rzetelnie i konkretnie; używaj WYŁĄCZNIE podanych danych — nie wymyślaj faktów.
- Unikaj pustych ogólników ("świetna lokalizacja", "wyjątkowa okazja") bez konkretów.
- Język budujący zaufanie, poprawny gramatycznie, gotowy do publikacji.
- Nie używaj nagłówków, list ani markdownu w treści sekcji — zwykły tekst akapitowy.`;

function buildSectionPrompt(section: DescSection, facts: DescFacts, notes?: string, tone?: string): string {
  return [
    SYSTEM,
    TONE_HINT[tone ?? "professional"] ?? TONE_HINT.professional,
    "",
    "DANE NIERUCHOMOŚCI:",
    factsToText(facts) || "(brak danych — napisz ostrożnie, ogólnie)",
    notes?.trim() ? `\nWSKAZÓWKI AGENTA: ${notes.trim()}` : "",
    "",
    "ZADANIE:",
    SECTION_BRIEF[section],
    "",
    "Zwróć wyłącznie treść tej jednej sekcji, bez tytułu i bez cudzysłowów.",
  ].join("\n");
}

function buildFullPrompt(facts: DescFacts, tone?: string): string {
  return [
    SYSTEM,
    TONE_HINT[tone ?? "professional"] ?? TONE_HINT.professional,
    "",
    "DANE NIERUCHOMOŚCI:",
    factsToText(facts) || "(brak danych)",
    "",
    "ZADANIE: Napisz kompletny opis podzielony na cztery sekcje:",
    `1. intro — ${SECTION_BRIEF.intro}`,
    `2. layout — ${SECTION_BRIEF.layout}`,
    `3. location — ${SECTION_BRIEF.location}`,
    `4. additional — ${SECTION_BRIEF.additional}`,
    "",
    'Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez ```), w formacie:',
    '{"intro":"...","layout":"...","location":"...","additional":"..."}',
  ].join("\n");
}

function stripJsonFences(s: string): string {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

const GEN_OPTS = { temperature: 0.8, maxOutputTokens: 1024 } as const;

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  const rl = aiRateLimit(request, "description");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const facts = body.facts ?? {};
  if (facts.title) facts.title = sanitizeInput(facts.title as string);
  const tone = body.tone;

  if (body.notes) {
    const guard = detectPromptInjection(sanitizeInput(body.notes));
    if (guard.suspicious) {
      return NextResponse.json(
        { error: "Suspicious content detected in notes field.", label: guard.label },
        { status: 400 },
      );
    }
  }

  try {
    if (body.mode === "full") {
      const raw = await geminiText(buildFullPrompt(facts, tone), { ...GEN_OPTS, json: true });
      let parsed: Record<DescSection, string>;
      try {
        parsed = JSON.parse(stripJsonFences(raw));
      } catch {
        return NextResponse.json({
          sections: { intro: raw, layout: "", location: "", additional: "" },
        });
      }
      return NextResponse.json({ sections: parsed });
    }

    const section = body.section ?? "intro";
    const text = await geminiText(buildSectionPrompt(section, facts, body.notes, tone), GEN_OPTS);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 502 },
    );
  }
}
