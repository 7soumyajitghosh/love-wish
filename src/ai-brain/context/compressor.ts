import type { ContextItem } from "../types";
import { estimateTokens } from "./tokenizer";

export interface CompressionResult {
  items: ContextItem[];
  dropped: number;
  summarized: boolean;
  summary?: string;
  tokensBefore: number;
  tokensAfter: number;
}

/** Deterministic extractive summarizer: keeps highest-importance sentences. */
export function summarizeTexts(texts: string[], maxChars = 1200): string {
  const sentences = texts
    .flatMap((t) => t.split(/(?<=[.!?\n])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  const scored = sentences.map((s) => ({
    s,
    score: s.length * (/(error|fail|require|must|important|decision|result|conclusion)/i.test(s) ? 1.6 : 1),
  }));
  scored.sort((a, b) => b.score - a.score);
  let out = "";
  for (const { s } of scored) {
    if ((out + " " + s).trim().length > maxChars) break;
    out = (out + " " + s).trim();
  }
  return out || texts.join("\n").slice(0, maxChars);
}

export function compressContext(items: ContextItem[], maxTokens: number): CompressionResult {
  const tokensBefore = items.reduce((n, i) => n + (i.tokens ?? estimateTokens(i.content)), 0);
  if (tokensBefore <= maxTokens) {
    return { items, dropped: 0, summarized: false, tokensBefore, tokensAfter: tokensBefore };
  }
  const sorted = [...items].sort((a, b) => {
    const sa = a.importance * 0.6 + (a.relevance ?? 0.3) * 0.4;
    const sb = b.importance * 0.6 + (b.relevance ?? 0.3) * 0.4;
    return sb - sa;
  });
  const kept: ContextItem[] = [];
  let budget = maxTokens;
  const droppedLow: ContextItem[] = [];
  for (const item of sorted) {
    const t = item.tokens ?? estimateTokens(item.content);
    if (t <= budget) {
      kept.push(item);
      budget -= t;
    } else {
      droppedLow.push(item);
    }
  }
  let summary: string | undefined;
  let summarized = false;
  if (droppedLow.length > 1) {
    summary = summarizeTexts(droppedLow.map((d) => d.content));
    const summaryTokens = estimateTokens(summary);
    if (summaryTokens < maxTokens * 0.2) {
      kept.push({
        id: `summary-${Date.now()}`,
        role: "memory",
        content: `[Summarized context: ${summary}]`,
        importance: 0.5,
        recency: Date.now(),
        tokens: summaryTokens,
        source: "compressor",
      });
      summarized = true;
    }
  }
  kept.sort((a, b) => a.recency - b.recency);
  const tokensAfter = kept.reduce((n, i) => n + (i.tokens ?? estimateTokens(i.content)), 0);
  return { items: kept, dropped: droppedLow.length, summarized, summary, tokensBefore, tokensAfter };
}
