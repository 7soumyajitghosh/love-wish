import type { ModelSpec } from "../types";

export interface ProviderHealth {
  provider: string;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  rateLimitedUntil?: number;
  healthy: boolean;
}

export class HealthTracker {
  private health = new Map<string, ProviderHealth>();

  private get(provider: string): ProviderHealth {
    let h = this.health.get(provider);
    if (!h) {
      h = { provider, consecutiveFailures: 0, consecutiveSuccesses: 0, healthy: true };
      this.health.set(provider, h);
    }
    return h;
  }

  recordSuccess(provider: string): void {
    const h = this.get(provider);
    h.consecutiveSuccesses += 1;
    h.consecutiveFailures = 0;
    h.lastSuccessAt = Date.now();
    h.healthy = true;
  }

  recordFailure(provider: string, error: unknown): void {
    const h = this.get(provider);
    h.consecutiveFailures += 1;
    h.consecutiveSuccesses = 0;
    h.lastFailureAt = Date.now();
    h.lastError = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number } | null)?.status;
    if (status === 429) h.rateLimitedUntil = Date.now() + 60_000;
    else if (status === 401 || status === 403) h.rateLimitedUntil = Date.now() + 300_000; // bad key: back off
    if (h.consecutiveFailures >= 3) h.healthy = false;
  }

  isAvailable(provider: string): boolean {
    const h = this.health.get(provider);
    if (!h) return true;
    if (h.rateLimitedUntil && h.rateLimitedUntil > Date.now()) return false;
    return h.healthy || h.consecutiveFailures < 5;
  }

  snapshot(): ProviderHealth[] {
    return [...this.health.values()];
  }
}

export function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  return /timeout|timed out|econn|network|fetch failed|rate ?limit|overloaded|temporar/.test(msg);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ordered fallback: tries each spec in order with exponential backoff on retryable errors. */
export async function executeWithFallback<T>(
  candidates: ModelSpec[],
  fn: (spec: ModelSpec, attempt: number) => Promise<T>,
  opts: { maxAttemptsPerModel?: number; baseDelayMs?: number; onFallback?: (from: string, to: string, error: unknown) => void } = {},
): Promise<{ result: T; used: ModelSpec; attempts: number }> {
  const maxAttempts = opts.maxAttemptsPerModel ?? 2;
  const base = opts.baseDelayMs ?? 400;
  let attempts = 0;
  let lastError: unknown = new Error("No model candidates");
  for (let i = 0; i < candidates.length; i++) {
    const spec = candidates[i];
    for (let a = 0; a < maxAttempts; a++) {
      attempts += 1;
      try {
        const result = await fn(spec, a);
        return { result, used: spec, attempts };
      } catch (err) {
        lastError = err;
        if (a < maxAttempts - 1 && isRetryable(err)) await sleep(base * 2 ** a);
        else break;
      }
    }
    const next = candidates[i + 1];
    if (next) opts.onFallback?.(spec.id, next.id, lastError);
  }
  throw lastError;
}
