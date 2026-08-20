// Klient API Gemini: generowanie tekstu, odpowiedzi JSON, embeddingi i analiza zdjęć

const TEXT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-2";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured. Set GEMINI_API_KEY in your environment.");
    this.name = "GeminiNotConfiguredError";
  }
}

function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiNotConfiguredError();
  return key;
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiTurn {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GenOptions {
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
}

function handleError(status: number, body: string): never {
  if (status === 429) {
    throw new Error(
      "Gemini rate limit (429). On the free tier you may need to enable billing in Google AI " +
        "Studio (no charge at low usage) or switch GEMINI_MODEL to gemini-3.1-flash-lite.",
    );
  }
  throw new Error(`Gemini API error (${status}): ${body.slice(0, 300)}`);
}

export async function geminiGenerate(turns: GeminiTurn[], opts: GenOptions = {}): Promise<string> {
  const key = requireKey();
  const res = await fetch(`${BASE}/${TEXT_MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: turns,
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.6,
        topP: 0.95,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) handleError(res.status, await res.text());

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export function geminiText(prompt: string, opts: GenOptions = {}): Promise<string> {
  return geminiGenerate([{ role: "user", parts: [{ text: prompt }] }], opts);
}

export async function geminiJSON<T>(prompt: string, opts: GenOptions = {}): Promise<T> {
  const raw = await geminiText(prompt, { ...opts, json: true });
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function geminiVision(prompt: string, imageUrls: string[], opts: GenOptions = {}): Promise<string> {
  const images = await Promise.all(
    imageUrls.slice(0, 4).map(async (url): Promise<GeminiPart> => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Could not fetch image (${r.status}).`);
      const mimeType = r.headers.get("content-type") ?? "image/jpeg";
      const buf = Buffer.from(await r.arrayBuffer());
      return { inlineData: { mimeType, data: buf.toString("base64") } };
    }),
  );
  return geminiGenerate([{ role: "user", parts: [{ text: prompt }, ...images] }], opts);
}

export const EMBED_DIMENSIONS = 768;

export async function geminiEmbed(text: string): Promise<number[]> {
  const key = requireKey();
  const res = await fetch(`${BASE}/${EMBED_MODEL}:embedContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBED_DIMENSIONS,
    }),
  });
  if (!res.ok) handleError(res.status, await res.text());
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values?.length) throw new Error("Gemini returned an empty embedding.");
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
