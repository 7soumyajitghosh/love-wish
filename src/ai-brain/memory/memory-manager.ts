import type { MemoryRecord, MemoryScope, RetrievalOptions, ScoredMemory } from "../types";
import { cosineSimilarity, hashEmbedding, type EmbeddingProvider } from "./embeddings";

export interface MemoryProvider {
  save(record: MemoryRecord): Promise<void> | void;
  delete(id: string): Promise<void> | void;
  all(): Promise<MemoryRecord[]> | MemoryRecord[];
  clear(scope?: MemoryScope): Promise<void> | void;
}

export class InMemoryVectorProvider implements MemoryProvider {
  private store = new Map<string, MemoryRecord>();
  save(record: MemoryRecord): void {
    this.store.set(record.id, record);
  }
  delete(id: string): void {
    this.store.delete(id);
  }
  all(): MemoryRecord[] {
    return [...this.store.values()];
  }
  clear(scope?: MemoryScope): void {
    if (!scope) this.store.clear();
    else for (const [k, v] of this.store) if (v.scope === scope) this.store.delete(k);
  }
}

function matchesFilter(rec: MemoryRecord, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => {
    if (k === "tags" && Array.isArray(v)) return (v as unknown[]).every((t) => rec.tags.includes(String(t)));
    return rec.metadata[k] === v;
  });
}

let memSeq = 0;

export class MemoryManager {
  constructor(
    private provider: MemoryProvider = new InMemoryVectorProvider(),
    private embed: EmbeddingProvider = hashEmbedding,
  ) {}

  getProvider(): MemoryProvider {
    return this.provider;
  }

  setProvider(provider: MemoryProvider): void {
    this.provider = provider;
  }

  async remember(
    text: string,
    opts: { scope?: MemoryScope; importance?: number; tags?: string[]; metadata?: Record<string, unknown> } = {},
  ): Promise<MemoryRecord> {
    const embedding = await this.embed(text);
    memSeq += 1;
    const record: MemoryRecord = {
      id: `mem-${Date.now()}-${memSeq}`,
      scope: opts.scope ?? "episodic",
      text,
      embedding,
      importance: opts.importance ?? 0.5,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      metadata: opts.metadata ?? {},
      tags: opts.tags ?? [],
    };
    await this.provider.save(record);
    return record;
  }

  async retrieve(query: string, opts: RetrievalOptions = {}): Promise<ScoredMemory[]> {
    const all = await this.provider.all();
    const q = await this.embed(query);
    const now = Date.now();
    const limit = opts.limit ?? 8;
    const scored: ScoredMemory[] = [];
    for (const rec of all) {
      if (opts.scopes && !opts.scopes.includes(rec.scope)) continue;
      if (!matchesFilter(rec, opts.filter)) continue;
      const relevance = (cosineSimilarity(q, rec.embedding) + 1) / 2;
      if (opts.minRelevance !== undefined && relevance < opts.minRelevance) continue;
      const ageHrs = Math.max(0, (now - rec.createdAt) / 3_600_000);
      const recency = Math.exp(-ageHrs / 72);
      // Ranking: relevance + recency + importance + task relationship (term overlap).
      const queryTerms = new Set(query.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
      const textTerms = rec.text.toLowerCase().split(/\W+/);
      let overlap = 0;
      for (const t of textTerms) if (queryTerms.has(t)) overlap++;
      const taskRel = Math.min(1, overlap / 4);
      const score = relevance * 0.45 + recency * 0.2 + rec.importance * 0.2 + taskRel * 0.15;
      scored.push({ ...rec, score, relevance });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    for (const r of top) {
      r.lastAccessedAt = now;
      await this.provider.save(r);
    }
    return top;
  }

  async search(query: string, opts: RetrievalOptions = {}): Promise<ScoredMemory[]> {
    return this.retrieve(query, opts);
  }

  async forget(id: string): Promise<void> {
    await this.provider.delete(id);
  }

  async update(id: string, patch: Partial<Pick<MemoryRecord, "text" | "importance" | "tags" | "metadata">>): Promise<MemoryRecord | null> {
    const all = await this.provider.all();
    const rec = all.find((r) => r.id === id);
    if (!rec) return null;
    const updated: MemoryRecord = {
      ...rec,
      ...patch,
      embedding: patch.text ? await this.embed(patch.text) : rec.embedding,
      lastAccessedAt: Date.now(),
    };
    await this.provider.save(updated);
    return updated;
  }

  async summarize(scope?: MemoryScope, maxChars = 1000): Promise<string> {
    const all = await this.provider.all();
    const items = (scope ? all.filter((r) => r.scope === scope) : all)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
    const text = items.map((r) => `- [${r.scope}] ${r.text}`).join("\n").slice(0, maxChars);
    return text || "(no memories)";
  }
}
