import type { ModelSpec } from "../types";
import { estimateMessagesTokens } from "../context/tokenizer";

export interface BudgetState {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  maxTokens: number;
  maxCostUsd: number;
}

export function costOf(spec: ModelSpec, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * spec.costPer1kInput + (outputTokens / 1000) * spec.costPer1kOutput;
}

export class TokenManager {
  private inputTokens = 0;
  private outputTokens = 0;
  private costUsd = 0;

  constructor(private opts: { maxTokens: number; maxCostUsd: number }) {}

  estimateCall(messages: Array<{ content: string }>, expectedOutput = 800): { input: number; total: number } {
    const input = estimateMessagesTokens(messages);
    return { input, total: input + expectedOutput };
  }

  /** Check budget BEFORE calling a model. Returns false when the call must not proceed. */
  checkBudget(additionalTokens: number, additionalCost: number): boolean {
    return this.inputTokens + this.outputTokens + additionalTokens <= this.opts.maxTokens && this.costUsd + additionalCost <= this.opts.maxCostUsd;
  }

  record(spec: ModelSpec, inputTokens: number, outputTokens: number): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.costUsd += costOf(spec, inputTokens, outputTokens);
  }

  state(): BudgetState {
    return { inputTokens: this.inputTokens, outputTokens: this.outputTokens, costUsd: this.costUsd, maxTokens: this.opts.maxTokens, maxCostUsd: this.opts.maxCostUsd };
  }

  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.costUsd = 0;
  }
}
