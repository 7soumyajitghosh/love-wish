import type { ContextItem, TaskContext } from "../types";
import { estimateTokens } from "./tokenizer";
import { compressContext, summarizeTexts } from "./compressor";

export interface TokenBudget {
  maxTokens: number;
  reserveOutput: number;
  availableForContext: number;
  estimatedContext: number;
  fits: boolean;
}

export class ContextManager {
  private history: ContextItem[] = [];
  constructor(private opts: { maxTokens: number; reserveOutput: number; shortTermMax: number }) {}

  add(item: Omit<ContextItem, "id" | "recency"> & { id?: string; recency?: number }): ContextItem {
    const full: ContextItem = {
      id: item.id ?? `ctx-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      recency: item.recency ?? Date.now(),
      tokens: item.tokens ?? estimateTokens(item.content),
      ...item,
    } as ContextItem;
    this.history.push(full);
    if (this.history.length > this.opts.shortTermMax * 2) {
      this.history = this.history.slice(-this.opts.shortTermMax * 2);
    }
    return full;
  }

  /** Score = 0.45*relevance + 0.30*importance + 0.25*recencyDecay */
  prioritizeContext(items: ContextItem[], queryTerms: string[]): ContextItem[] {
    const now = Date.now();
    const q = queryTerms.map((t) => t.toLowerCase());
    return items
      .map((item) => {
        const text = item.content.toLowerCase();
        let hits = 0;
        for (const term of q) if (term.length > 2 && text.includes(term)) hits++;
        const relevance = q.length ? Math.min(1, hits / Math.max(1, Math.min(q.length, 4))) : 0.3;
        const ageHrs = Math.max(0, (now - item.recency) / 3_600_000);
        const recencyScore = Math.exp(-ageHrs / 24);
        const score = relevance * 0.45 + item.importance * 0.3 + recencyScore * 0.25;
        return { item, relevance, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ item, relevance }) => ({ ...item, relevance, tokens: item.tokens ?? estimateTokens(item.content) }));
  }

  estimateTokens(items: ContextItem[]): number {
    return items.reduce((n, i) => n + (i.tokens ?? estimateTokens(i.content)), 0);
  }

  allocateTokenBudget(items: ContextItem[]): TokenBudget {
    const availableForContext = Math.max(1, this.opts.maxTokens - this.opts.reserveOutput);
    const estimatedContext = this.estimateTokens(items);
    return { maxTokens: this.opts.maxTokens, reserveOutput: this.opts.reserveOutput, availableForContext, estimatedContext, fits: estimatedContext <= availableForContext };
  }

  summarizeHistory(maxChars = 1500): string {
    const texts = this.history.filter((h) => h.role === "user" || h.role === "assistant").map((h) => `${h.role}: ${h.content}`);
    return summarizeTexts(texts, maxChars);
  }

  buildContext(task: TaskContext, extra: ContextItem[] = []): ContextItem[] {
    const pool = [...this.history, ...task.context, ...extra];
    const queryTerms = `${task.userInput} ${task.intent} ${task.entities.join(" ")}`.split(/\W+/);
    const ranked = this.prioritizeContext(pool, queryTerms);
    const budget = this.allocateTokenBudget(ranked);
    if (!budget.fits) {
      return compressContext(ranked, budget.availableForContext).items;
    }
    // Even when it fits, cap to the most relevant slice to avoid blindly sending everything.
    const cap = Math.min(ranked.length, this.opts.shortTermMax);
    return ranked.slice(0, cap).sort((a, b) => a.recency - b.recency);
  }

  getHistory(): ContextItem[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}
