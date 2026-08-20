// Pamięciowy magazyn wektorów per firma, wykorzystywany do dopasowywania ofert do zapytań

import { geminiEmbed, cosineSimilarity } from "./gemini";

export interface VectorEntry {
  id: string;
  text: string;
  vector: number[];
  meta: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  meta: Record<string, unknown>;
}

class VectorStore {
  private store = new Map<string, VectorEntry>();

  async upsert(id: string, text: string, meta: Record<string, unknown> = {}): Promise<void> {
    const vector = await geminiEmbed(text);
    this.store.set(id, { id, text, vector, meta });
  }

  async upsertMany(
    items: { id: string; text: string; meta?: Record<string, unknown> }[],
    concurrency = 4,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      await Promise.all(batch.map((it) => this.upsert(it.id, it.text, it.meta ?? {})));
    }
  }

  async search(query: string, topK = 5): Promise<SearchResult[]> {
    if (this.store.size === 0) return [];

    const qVec = await geminiEmbed(query);
    const scored = Array.from(this.store.values()).map((entry) => ({
      id: entry.id,
      score: cosineSimilarity(qVec, entry.vector),
      text: entry.text,
      meta: entry.meta,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

const MAX_TENANT_STORES = 200;
const registry = new Map<string, VectorStore>();

function getTenantStore(companyId: string): VectorStore {
  const existing = registry.get(companyId);
  if (existing) {
    registry.delete(companyId);
    registry.set(companyId, existing);
    return existing;
  }
  const store = new VectorStore();
  registry.set(companyId, store);
  if (registry.size > MAX_TENANT_STORES) {
    const oldest = registry.keys().next().value;
    if (oldest !== undefined) registry.delete(oldest);
  }
  return store;
}

export function getPropertyStore(companyId: string): VectorStore {
  return getTenantStore(`property:${companyId}`);
}
