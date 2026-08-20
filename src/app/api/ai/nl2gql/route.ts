// Zamienia pytanie zadane po ludzku na filtry wyszukiwania ofert i zapytanie GraphQL

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { geminiJSON, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { guardOrThrow } from "@/lib/security/prompt-guard";
import { aiRateLimit } from "@/lib/security/rate-limit";

export interface NL2GQLEntity {
  type:
    | "location"
    | "price_max"
    | "price_min"
    | "rooms"
    | "propertyType"
    | "status"
    | "area_max"
    | "area_min"
    | "condition"
    | "keyword";
  value: string | number;
  label: string;
  display: string;
}

export interface NL2GQLFilters {
  location?: string;
  priceMax?: number;
  priceMin?: number;
  rooms?: number;
  propertyType?: string;
  status?: string;
  areaMax?: number;
  areaMin?: number;
  condition?: string;
  keyword?: string;
}

export interface NL2GQLResponse {
  intent: string;
  entities: NL2GQLEntity[];
  filters: NL2GQLFilters;
  gqlQuery: string;
  confidence: number;
  explanation: string;
}

const PROMPT = (query: string) => `
You are an AI query parser for a Polish real estate CRM (Realty Nest).

User's natural language query (may be in Polish or English):
"${query}"

Extract structured filters and generate a GraphQL query. Properties have these fields:
- title: String
- location: String (city, district, address)
- price: Float (in PLN, e.g. 650000)
- propertyType: Enum [APARTMENT, HOUSE, STUDIO, PLOT, COMMERCIAL, OFFICE, GARAGE, ROOM]
- status: Enum [ACTIVE, PENDING, SOLD, WITHDRAWN]
- area: Float (in m²)
- rooms: Int
- floor: Int
- condition: Enum [READY_TO_MOVE, GOOD, AFTER_RENOVATION, TO_RENOVATE, FOR_FINISHING, DEVELOPER_STATE]

Rules:
- Interpret "mieszkanie" as APARTMENT, "dom" as HOUSE, "kawalerka"/"studio" as STUDIO, "biuro" as OFFICE, "działka" as PLOT, "garaż" as GARAGE, "pokój" as ROOM, "lokal użytkowy"/"lokal" as COMMERCIAL
- Price ranges like "do 700k" → priceMax: 700000, "od 500k" → priceMin: 500000
- "3 pokoje"/"3-pokojowe" → rooms: 3
- "gotowe"/"do zamieszkania" → condition: READY_TO_MOVE; "stan deweloperski"/"nowe" → condition: DEVELOPER_STATE; "do wykończenia" → condition: FOR_FINISHING; "po remoncie" → condition: AFTER_RENOVATION; "do remontu" → condition: TO_RENOVATE
- "na sprzedaż" → status: ACTIVE; "sprzedane" → status: SOLD; "rezerwacja"/"w trakcie" → status: PENDING; "wycofane" → status: WITHDRAWN
- Return ALL detected entities, even if confidence is low
- The gqlQuery field must be a realistic-looking GraphQL query string using the detected filters as variables/arguments
- Confidence: 1.0 = all entities unambiguous, 0.5 = some guessing required

Return ONLY valid JSON (no markdown), matching this exact schema:
{
  "intent": "short English description of user intent",
  "entities": [
    { "type": "<entity_type>", "value": <value>, "label": "<Polish label>", "display": "<formatted Polish display value>" }
  ],
  "filters": {
    "location": <string or null>,
    "priceMax": <number or null>,
    "priceMin": <number or null>,
    "rooms": <number or null>,
    "propertyType": <"APARTMENT"|"HOUSE"|"STUDIO"|"PLOT"|"COMMERCIAL"|"OFFICE"|"GARAGE"|"ROOM" or null>,
    "status": <"ACTIVE"|"PENDING"|"SOLD"|"WITHDRAWN" or null>,
    "areaMax": <number or null>,
    "areaMin": <number or null>,
    "condition": <"READY_TO_MOVE"|"GOOD"|"AFTER_RENOVATION"|"TO_RENOVATE"|"FOR_FINISHING"|"DEVELOPER_STATE" or null>,
    "keyword": <string or null>
  },
  "gqlQuery": "query SearchProperties {\\n  getProperties(\\n    <filters as arguments>\\n  ) {\\n    id\\n    title\\n    location\\n    price\\n    propertyType\\n    status\\n    area\\n    rooms\\n  }\\n}",
  "confidence": <0.0 to 1.0>,
  "explanation": "<one sentence in Polish explaining what was understood>"
}
`;

export async function POST(req: Request) {
  const rl = aiRateLimit(req, "nl2gql");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim().slice(0, 500);
  if (!query || query.length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    guardOrThrow(query);
  } catch {
    return NextResponse.json({ error: "Suspicious input detected" }, { status: 400 });
  }

  try {
    const result = await geminiJSON<NL2GQLResponse>(PROMPT(query), { temperature: 0.6 });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[nl2gql]", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 502 });
  }
}
