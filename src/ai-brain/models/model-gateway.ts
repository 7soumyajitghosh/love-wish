import type { BrainConfig } from "../config/index";
import type { ModelRequest, ModelResponse, ModelSpec } from "../types";
import { AnthropicProvider, MockProvider, OpenAICompatibleProvider, type ModelProvider } from "./providers";
import { HealthTracker, executeWithFallback } from "./fallback";
import { estimateMessagesTokens } from "../context/tokenizer";

export interface RouteDecision {
  ordered: ModelSpec[];
  primary: ModelSpec;
  reasons: string[];
}

export class ModelGateway {
  readonly health = new HealthTracker();
  private providers = new Map<string, ModelProvider>();

  constructor(private config: BrainConfig) {
    this.register(new MockProvider());
    for (const [name, p] of Object.entries(config.providers)) {
      if (name === "mock" || !p.enabled) continue;
      if (name === "anthropic") this.register(new AnthropicProvider(p.baseUrl, p.apiKeyEnv));
      else this.register(new OpenAICompatibleProvider(name, p.baseUrl ?? "", p.apiKeyEnv));
    }
  }

  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  allSpecs(): ModelSpec[] {
    return Object.values(this.config.providers).flatMap((p) => p.models);
  }

  /** Smart routing over capability, quality, cost, latency, context window, availability. */
  route(taskKind: ModelRequest["taskKind"], estimatedInputTokens: number, opts: { preferLowCost?: boolean } = {}): RouteDecision {
    const specs = this.allSpecs();
    const preferLowCost = opts.preferLowCost ?? this.config.routing.preferLowCost;
    const reasons: string[] = [];
    const scored = specs
      .filter((s) => s.contextWindow >= estimatedInputTokens + 1000)
      .filter((s) => {
        const provider = this.providers.get(s.provider);
        if (!provider) return false;
        if (s.provider !== "mock" && !provider.isConfigured()) return false;
        if (!this.health.isAvailable(s.provider)) return false;
        return true;
      })
      .filter((s) => {
        switch (taskKind) {
          case "vision": return s.capabilities.vision;
          case "coding": return s.capabilities.coding;
          case "longdoc": return s.capabilities.longContext;
          case "reasoning": return s.capabilities.reasoning;
          default: return true;
        }
      })
      .map((s) => {
        let score = s.quality * 100;
        if (preferLowCost) score -= (s.costPer1kInput + s.costPer1kOutput) * 2000;
        else score -= (s.costPer1kInput + s.costPer1kOutput) * 300;
        score -= s.avgLatencyMs / 200;
        if (taskKind === "chat") score += (1 - s.costPer1kInput * 500) * 8; // favor fast/cheap for simple chat
        if (taskKind === "reasoning" || taskKind === "coding") score += s.quality * 40;
        return { s, score };
      })
      .sort((a, b) => b.score - a.score);
    if (!scored.length) {
      const mock = specs.find((s) => s.provider === "mock")!;
      return { ordered: [mock], primary: mock, reasons: ["No configured providers matched; using offline mock"] };
    }
    reasons.push(`taskKind=${taskKind ?? "chat"} inputTokens~${estimatedInputTokens} preferLowCost=${preferLowCost}`);
    reasons.push(`selected ${scored[0].s.id} (quality=${scored[0].s.quality}, ctx=${scored[0].s.contextWindow})`);
    const ordered = scored.map((x) => x.s);
    return { ordered, primary: ordered[0], reasons };
  }

  async complete(
    taskKind: ModelRequest["taskKind"],
    req: ModelRequest,
    opts: { onFallback?: (from: string, to: string) => void } = {},
  ): Promise<ModelResponse & { modelId: string }> {
    const estimated = req.messages ? estimateMessagesTokens(req.messages) : 500;
    const route = this.route(taskKind, estimated);
    const timeoutMs = this.config.budgets.modelTimeoutMs;
    const { result, used } = await executeWithFallback(
      route.ordered.slice(0, 4),
      async (spec) => {
        const provider = this.providers.get(spec.provider);
        if (!provider) throw new Error(`No provider registered: ${spec.provider}`);
        try {
          const res = await provider.complete(spec, req, timeoutMs);
          this.health.recordSuccess(spec.provider);
          return res;
        } catch (err) {
          this.health.recordFailure(spec.provider, err);
          throw err;
        }
      },
      { onFallback: (from, to) => opts.onFallback?.(from, to) },
    );
    return { ...result, modelId: used.id };
  }
}
