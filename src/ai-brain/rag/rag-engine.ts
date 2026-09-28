import { hashEmbedding, cosineSimilarity } from "../memory/embeddings";

export interface KnowledgeDoc {
  id: string;
  text: string;
  source: string;
  ref: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface RagResult {
  text: string;
  source: string;
  ref: string;
  score: number;
}

/** Retrieval pipeline: query understanding -> embedding -> vector search -> metadata filter -> rerank. */
export class RagEngine {
  private docs: KnowledgeDoc[] = [];

  ingest(text: string, source: string, ref = "", metadata: Record<string, unknown> = {}): KnowledgeDoc {
    const doc: KnowledgeDoc = {
      id: `doc-${Date.now()}-${this.docs.length}`,
      text, source, ref: ref || source,
      embedding: hashEmbedding(text),
      metadata,
    };
    this.docs.push(doc);
    return doc;
  }

  ingestMany(items: Array<{ text: string; source: string; ref?: string; metadata?: Record<string, unknown> }>): number {
    items.forEach((i) => this.ingest(i.text, i.source, i.ref, i.metadata));
    return items.length;
  }

  /** Chunk long texts so retrieval stays precise. */
  static chunk(text: string, maxChars = 1200, overlap = 150): string[] {
    if (text.length <= maxChars) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + maxChars));
      start += maxChars - overlap;
    }
    return chunks;
  }

  retrieve(query: string, opts: { limit?: number; filter?: Record<string, unknown>; minScore?: number } = {}): RagResult[] {
    const q = hashEmbedding(this.expandQuery(query));
    const limit = opts.limit ?? 5;
    const terms = new Set(query.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
    const scored = this.docs
      .filter((d) => !opts.filter || Object.entries(opts.filter).every(([k, v]) => d.metadata?.[k] === v))
      .map((d) => {
        const vectorScore = (cosineSimilarity(q, d.embedding) + 1) / 2;
        const words = d.text.toLowerCase().split(/\W+/);
        let overlap = 0;
        for (const w of words) if (terms.has(w)) overlap++;
        const keywordScore = Math.min(1, overlap / 5);
        const score = vectorScore * 0.6 + keywordScore * 0.4; // rerank blend
        return { text: d.text, source: d.source, ref: d.ref, score };
      })
      .filter((r) => (opts.minScore === undefined || r.score >= opts.minScore) && r.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  }

  count(): number {
    return this.docs.length;
  }

  clear(): void {
    this.docs = [];
  }

  private expandQuery(query: string): string {
    // Lightweight query understanding: expand synonyms for code/research intents.
    return query
      .replace(/\b(auth)\b/gi, "auth authentication login")
      .replace(/\b(db|database)\b/gi, "database db postgres sql")
      .replace(/\b(deploy)\b/gi, "deploy deployment docker ci cd");
  }
}
