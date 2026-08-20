// Ocenia potencjał zapytania klienta przez AI: punktacja, kategoria i prognoza domknięcia

import { NextResponse } from "next/server";
import { geminiJSON, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { aiRateLimit, sanitizeInput } from "@/lib/security/rate-limit";
import { detectPromptInjection } from "@/lib/security/prompt-guard";
import { auth } from "@/lib/graphql/auth";

interface EnquiryInput {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  budget?: number | null;
  note?: string | null;
  source?: string | null;
  priority?: string | null;
  status?: string | null;
  propertyInterest?: string | null;
  location?: string | null;
  createdAt?: string | null;
}

interface LeadScoreResult {
  score: number;
  tier: "HOT" | "WARM" | "COLD";
  factors: string[];
  nextAction: string;
  confidence: string;
  closureProbability: number;
  expectedCloseDays: number;
}

const SYSTEM_PROMPT = `Jesteś ekspertem CRM w branży nieruchomości. Analizujesz zapytania klientów i oceniasz ich potencjał jako leadów sprzedażowych.

Kryteria oceny:
- Budżet: konkretna kwota > 0 → +20 pkt; brak/zerowy → -10 pkt
- Lokalizacja: konkretna dzielnica/miasto → +15 pkt; zbyt ogólna → 0 pkt
- Pilność: słowa "pilnie", "szybko", "do końca miesiąca", "asap" → +20 pkt
- Kontakt: telefon podany → +10 pkt; brak → 0 pkt
- Notatka: szczegółowa (>50 znaków) → +15 pkt; brak → 0 pkt
- Preferencje: konkretny typ nieruchomości → +10 pkt; brak → 0 pkt
- Priorytet agenta: HIGH=+10, MEDIUM=+5, LOW=0, URGENT=+15
- Źródło: REFERRAL=+15, DIRECT=+10, PORTAL=+5, SOCIAL=+5, AGENCY=+8
- Status: LOST=-15, DISQUALIFIED=-20, NEW=+0, CONTACTED=+5, QUALIFIED=+10, NEGOTIATING=+15

Progi tier:
- HOT: score ≥ 70
- WARM: score 40–69
- COLD: score < 40

Predykcja domknięcia transakcji:
- closureProbability: szacowane prawdopodobieństwo domknięcia transakcji w procentach (0–100)
- Punkt wyjścia wg statusu: NEGOTIATING 60–85, QUALIFIED 40–60, CONTACTED 20–40, NEW 10–25, LOST/DISQUALIFIED 0–5
- Korekta wg tier: HOT +10 p.p., WARM 0, COLD −10 p.p.
- expectedCloseDays: przewidywana liczba dni do domknięcia (7–365); pilność skraca, brak budżetu wydłuża

Zwróć JSON (tylko JSON, bez markdown):
{
  "score": <0-100 liczba całkowita>,
  "tier": "HOT" | "WARM" | "COLD",
  "factors": ["czynnik 1 z uzasadnieniem", "czynnik 2 z uzasadnieniem"],
  "nextAction": "konkretna następna akcja dla agenta (1 zdanie, po polsku)",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "closureProbability": <0-100 liczba całkowita>,
  "expectedCloseDays": <7-365 liczba całkowita>
}`;

function clamp(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "lead-score");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { enquiry?: EnquiryInput };
  try {
    body = (await req.json()) as { enquiry?: EnquiryInput };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const enquiry = body.enquiry;
  if (!enquiry?.id || !enquiry?.name) {
    return NextResponse.json({ error: "enquiry with id and name is required." }, { status: 400 });
  }

  let note = sanitizeInput(enquiry.note ?? "");
  const noteGuard = detectPromptInjection(note);
  if (noteGuard.suspicious) {
    note = "[REDACTED — suspicious content detected]";
  }

  const facts = [
    `Imię/Nazwa: ${enquiry.name}`,
    `Kontakt: ${[enquiry.email, enquiry.phone].filter(Boolean).join(", ") || "brak"}`,
    `Budżet: ${enquiry.budget ? `${enquiry.budget.toLocaleString("pl-PL")} zł` : "nie podano"}`,
    `Lokalizacja: ${enquiry.location || "nie podano"}`,
    `Preferencje nieruchomości: ${enquiry.propertyInterest || "nie podano"}`,
    `Priorytet agenta: ${enquiry.priority || "brak"}`,
    `Status leada: ${enquiry.status || "brak"}`,
    `Źródło: ${enquiry.source || "brak"}`,
    `Notatka agenta: ${note || "brak"}`,
    `Data wpłynięcia: ${enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString("pl-PL") : "?"}`,
  ].join("\n");

  const prompt = `${SYSTEM_PROMPT}\n\nDANE LEADA:\n${facts}`;

  try {
    const result = await geminiJSON<LeadScoreResult>(prompt, { temperature: 0.3 });
    result.score = clamp(result.score, 0, 100);
    result.closureProbability = clamp(result.closureProbability, 0, 100);
    result.expectedCloseDays = clamp(result.expectedCloseDays, 7, 365);
    return NextResponse.json({ ...result, scoredAt: new Date().toISOString(), enquiryId: enquiry.id });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed." },
      { status: 502 },
    );
  }
}
