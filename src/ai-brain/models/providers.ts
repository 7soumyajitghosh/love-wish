import type { ModelRequest, ModelResponse, ModelSpec } from "../types";
import { estimateMessagesTokens } from "../context/tokenizer";

export interface ModelProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(spec: ModelSpec, req: ModelRequest, timeoutMs: number): Promise<ModelResponse>;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise.then((v) => { clearTimeout(timer); return v; }), timeout]);
}

function readKey(envName: string): string | undefined {
  if (typeof process !== "undefined" && process.env) return process.env[envName];
  return undefined;
}

/** OpenAI-compatible chat completions (covers OpenAI, DeepSeek, Mistral, Groq, etc.) */
export class OpenAICompatibleProvider implements ModelProvider {
  constructor(readonly name: string, private baseUrl: string, private apiKeyEnv: string) {}

  isConfigured(): boolean {
    if (typeof process === "undefined" || !process.env) return false;
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async complete(spec: ModelSpec, req: ModelRequest, timeoutMs: number): Promise<ModelResponse> {
    const started = Date.now();
    const apiKey = readKey(this.apiKeyEnv);
    if (!apiKey) throw new Error(`Missing API key env ${this.apiKeyEnv} for provider ${this.name}`);
    const model = spec.id.includes("/") ? spec.id.split("/").slice(1).join("/") : spec.id;
    const res = await withTimeout(
      fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: req.messages,
          max_tokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.4,
          response_format: req.json ? { type: "json_object" } : undefined,
        }),
        signal: req.signal ?? undefined,
      }),
      timeoutMs,
      `Model ${spec.id}`,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Provider ${this.name} HTTP ${res.status}: ${body.slice(0, 400)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens ?? estimateMessagesTokens(req.messages);
    const outputTokens = data.usage?.completion_tokens ?? Math.max(1, Math.ceil(text.length / 4));
    return { text, inputTokens, outputTokens, modelId: spec.id, latencyMs: Date.now() - started, finishReason: "stop" };
  }
}

export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  constructor(private baseUrl = "https://api.anthropic.com", private apiKeyEnv = "ANTHROPIC_API_KEY") {}

  isConfigured(): boolean {
    if (typeof process === "undefined" || !process.env) return false;
    return Boolean(process.env[this.apiKeyEnv]);
  }

  async complete(spec: ModelSpec, req: ModelRequest, timeoutMs: number): Promise<ModelResponse> {
    const started = Date.now();
    const apiKey = readKey(this.apiKeyEnv);
    if (!apiKey) throw new Error(`Missing API key env ${this.apiKeyEnv}`);
    const model = spec.id.split("/").slice(1).join("/") || spec.id;
    const res = await withTimeout(
      fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 1024,
          system: req.messages.find((m) => m.role === "system")?.content,
          messages: req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content })),
        }),
      }),
      timeoutMs,
      `Model ${spec.id}`,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Provider anthropic HTTP ${res.status}: ${body.slice(0, 400)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text,
      inputTokens: data.usage?.input_tokens ?? estimateMessagesTokens(req.messages),
      outputTokens: data.usage?.output_tokens ?? Math.max(1, Math.ceil(text.length / 4)),
      modelId: spec.id, latencyMs: Date.now() - started, finishReason: "stop",
    };
  }
}

/** Offline deterministic provider: used for tests and when no API keys exist. */
export class MockProvider implements ModelProvider {
  readonly name = "mock";
  isConfigured(): boolean {
    return true;
  }
  async complete(spec: ModelSpec, req: ModelRequest, timeoutMs: number): Promise<ModelResponse> {
    void timeoutMs;
    const started = Date.now();
    const last = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    await new Promise((r) => setTimeout(r, Math.min(30, spec.avgLatencyMs)));
    const text = this.synthesize(last, req);
    return {
      text,
      inputTokens: estimateMessagesTokens(req.messages),
      outputTokens: Math.max(1, Math.ceil(text.length / 4)),
      modelId: spec.id, latencyMs: Date.now() - started, finishReason: "stop",
    };
  }

  private synthesize(lastUser: string, req: ModelRequest): string {
    const sys = req.messages.find((m) => m.role === "system")?.content ?? "";
    const ctx = (sys + "\n" + lastUser).slice(0, 2000);
    if (/evaluator/i.test(sys)) {
      return JSON.stringify({ completeness: 0.9, correctness: 0.85, requirementCoverage: 0.9, needsRevision: false, reasons: ["offline mock evaluation"], suggestedNextAction: "none" });
    }
    if (/plan/i.test(sys)) {
      return `Plan outline:\n1. Analyze: ${lastUser.slice(0, 120)}\n2. Execute with available tools\n3. Verify against requirements`;
    }
    return `Response (offline mock).\n\nContext considered:\n${ctx.slice(0, 800)}\n\nNext: connect a real provider key (e.g. OPENAI_API_KEY) to enable live model output.`;
  }
}
