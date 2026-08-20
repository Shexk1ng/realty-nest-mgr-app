// Sekcje kreatora opisu oferty, ich podpowiedzi oraz wywołanie generowania treści przez API

export type DescSection = "intro" | "layout" | "location" | "additional";

export interface DescSectionMeta {
  id: DescSection;
  title: string;
  help: string;
  placeholder: string;
}

export const DESC_SECTIONS: DescSectionMeta[] = [
  {
    id: "intro",
    title: "Wprowadzenie",
    help: "Najważniejsze dane: metraż, liczba pokoi, lokalizacja, typ nieruchomości.",
    placeholder: "np. Na sprzedaż, idealne pod inwestycję, dostępne od zaraz…",
  },
  {
    id: "layout",
    title: "Układ i wnętrze",
    help: "Rozkład pomieszczeń, nasłonecznienie, balkon/ogród, stan wykończenia.",
    placeholder: "np. salon z aneksem, 2 sypialnie, jasne, po remoncie…",
  },
  {
    id: "location",
    title: "Atuty lokalizacji",
    help: "Szkoły, komunikacja, sklepy, tereny zielone — konkretnie.",
    placeholder: "np. 5 min do metra, park za rogiem, szkoła 300 m…",
  },
  {
    id: "additional",
    title: "Informacje dodatkowe",
    help: "Parking, komórka, stan prawny, forma własności, czynsz, CTA.",
    placeholder: "np. miejsce w garażu, pełna własność, czynsz 650 zł…",
  },
];

export interface DescFacts {
  title?: string | null;
  transactionType?: string | null;
  propertyType?: string | null;
  market?: string | null;
  area?: number | null;
  plotArea?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  location?: string | null;
  district?: string | null;
  city?: string | null;
  price?: number | null;
  monthlyRent?: number | null;
  deposit?: number | null;
  ownership?: string | null;
  condition?: string | null;
  heating?: string | null;
  energyClass?: string | null;
  features?: string[] | null;
}

export type GenerateTone = "professional" | "warm" | "premium" | "concise";

export interface GenerateRequest {
  mode: "section" | "full";
  section?: DescSection;
  facts: DescFacts;
  notes?: string;
  tone?: GenerateTone;
}

export interface GenerateResponse {
  text?: string;
  sections?: Record<DescSection, string>;
  error?: string;
}

export async function generateDescription(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch("/api/ai/description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = (await res.json()) as GenerateResponse;
  if (!res.ok) throw new Error(data.error || "Generation failed.");
  return data;
}
