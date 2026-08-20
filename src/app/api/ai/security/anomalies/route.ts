// Przegląda dziennik audytu przez AI w poszukiwaniu podejrzanych wzorców zdarzeń

import { NextResponse } from "next/server";
import { geminiJSON, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { gqlAsUser, UnauthenticatedError } from "@/lib/graphql/server-fetch";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { detectPromptInjection } from "@/lib/security/prompt-guard";

const AUDIT_QUERY = `
  query AnomalyAuditLogs($limit: Int) {
    getAuditLogs(limit: $limit) {
      seq type category actorId actorName actorRole targetType targetId ipAddress fallbackText createdAt
    }
  }
`;

interface AuditRow {
  seq: number | null;
  type: string;
  category: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  fallbackText: string | null;
  createdAt: string | null;
}

export interface SecurityAnomaly {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  affectedActorId: string | null;
  affectedActorName: string | null;
  recommendation: string;
  relatedEventSeqs: number[];
}

const SYSTEM = `Jesteś analitykiem bezpieczeństwa (SOC) systemu CRM nieruchomości Realty Nest.
Otrzymujesz fragment dziennika audytu (od najnowszego). Twoim zadaniem jest wykrycie
PODEJRZANYCH WZORCÓW — korelacji wielu zdarzeń w czasie, a nie pojedynczych akcji.

Szukaj w szczególności:
1. Logowania poza godzinami pracy (przed 6:00 lub po 23:00).
2. Masowego eksportu danych (wiele odczytów/pobrań w krótkim czasie).
3. Nagłej eskalacji uprawnień (zmiana roli użytkownika).
4. Serii nieudanych logowań (AUTH_LOGIN_FAILED) zakończonej udanym (AUTH_LOGIN) — brute force.
5. Nietypowych sekwencji: nowe IP → masowe pobranie → zmiana roli.
6. Działań administracyjnych poza godzinami pracy.
7. Prób dostępu do danych innej firmy / odmów FORBIDDEN.
8. Prób wstrzyknięcia promptu (typ AI_PROMPT_INJECTION_ATTEMPT lub 2FA fail).

Zasady:
- Zgłaszaj TYLKO realnie podejrzane wzorce. Jeśli nic nie budzi wątpliwości → pusta lista.
- Opieraj się WYŁĄCZNIE na dostarczonych zdarzeniach, nie wymyślaj.
- W polu relatedEventSeqs podaj numery #seq zdarzeń tworzących wzorzec.

Zwróć WYŁĄCZNIE JSON (bez markdown):
{"anomalies":[{"type":"krótki typ zdarzenia","severity":"HIGH|MEDIUM|LOW","description":"co się stało (1-2 zdania)","affectedActorId":"<id lub null>","affectedActorName":"<imię lub null>","recommendation":"zalecane działanie (1 zdanie)","relatedEventSeqs":[<numery seq>]}]}`;

const OUTPUT_LANGUAGE: Record<string, string> = {
  pl: "Pola type, description i recommendation wypełnij PO POLSKU.",
  en: "Write the type, description and recommendation fields IN ENGLISH.",
};

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "security-anomalies");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let locale: "pl" | "en" = "pl";
  try {
    const body = (await req.json()) as { locale?: unknown } | null;
    if (body?.locale === "en") locale = "en";
  } catch {
  }

  try {
    const data = await gqlAsUser<{ getAuditLogs: AuditRow[] }>(AUDIT_QUERY, { limit: 200 });
    const logs = data.getAuditLogs ?? [];

    if (logs.length === 0) {
      return NextResponse.json({ anomalies: [], analysedAt: new Date().toISOString(), logCount: 0 });
    }

    const safeText = (v: string | null) =>
      v && !detectPromptInjection(v).suspicious ? v : "";

    const formatted = logs
      .map(
        (l) =>
          `#${l.seq ?? "?"} [${l.category}/${l.type}] ${l.actorName ?? "system"}(${l.actorRole ?? "?"}) ` +
          `@ ${l.createdAt ?? "?"} IP:${l.ipAddress ?? "?"} → ${safeText(l.fallbackText)}`,
      )
      .join("\n");

    const prompt = `${SYSTEM}\n${OUTPUT_LANGUAGE[locale]}\n\nDZIENNIK AUDYTU (najnowsze ${logs.length} zdarzeń):\n${formatted}`;

    const result = await geminiJSON<{ anomalies: SecurityAnomaly[] }>(prompt, {
      temperature: 0.2,
      maxOutputTokens: 1500,
    });

    return NextResponse.json({
      anomalies: Array.isArray(result.anomalies) ? result.anomalies : [],
      analysedAt: new Date().toISOString(),
      logCount: logs.length,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (err instanceof GeminiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 503 });
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    if (/forbidden/i.test(msg)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
