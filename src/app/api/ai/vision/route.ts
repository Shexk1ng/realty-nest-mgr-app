// Ocenia do czterech zdjęć oferty: pomieszczenie, jakość kadru i wybór zdjęcia na okładkę

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { geminiVision, GeminiNotConfiguredError } from "@/lib/ai/gemini";
import { aiVisionRateLimit } from "@/lib/security/rate-limit";

interface VisionResult {
  images: { room: string; quality: number; caption: string }[];
  bestCoverIndex: number;
  tags: string[];
}

const PROMPT = `Przeanalizuj zdjęcia nieruchomości. Dla KAŻDEGO zdjęcia (w tej samej kolejności) podaj:
- room: rozpoznane pomieszczenie/ujęcie po polsku (np. "salon", "kuchnia", "sypialnia", "łazienka", "elewacja", "widok");
- quality: ocena jakości/atrakcyjności 0-100 (ostrość, światło, kompozycja, czystość kadru);
- caption: krótki podpis marketingowy po polsku (max 8 słów).
Dodatkowo: bestCoverIndex = indeks (od 0) zdjęcia najlepszego na okładkę oferty;
tags = lista sugerowanych atutów widocznych na zdjęciach (np. "balkon","duże okna","jasne wnętrze").
Zwróć WYŁĄCZNIE JSON: {"images":[{"room":"","quality":0,"caption":""}],"bestCoverIndex":0,"tags":[]}.`;

export async function POST(req: Request) {
  const rl = aiVisionRateLimit(req, "vision");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { imageUrls?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const urls = (body.imageUrls ?? []).filter((u) => typeof u === "string").slice(0, 4);
  if (urls.length === 0) {
    return NextResponse.json({ error: "No images provided." }, { status: 400 });
  }

  try {
    const raw = await geminiVision(PROMPT, urls, { temperature: 0.3, maxOutputTokens: 900, json: true });
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const result = JSON.parse(cleaned) as VisionResult;
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 503 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed." }, { status: 502 });
  }
}
