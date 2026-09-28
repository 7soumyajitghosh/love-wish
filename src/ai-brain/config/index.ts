import type { ModelSpec } from "../types";

export interface BrainConfig {
  defaultProvider: string;
  routing: {
    preferLowCost: boolean;
    maxLatencyMs: number;
    qualityFloor: number;
  };
  budgets: {
    maxSteps: number;
    maxTokensPerTask: number;
    maxCostUsdPerTask: number;
    taskTimeoutMs: number;
    modelTimeoutMs: number;
  };
  memory: {
    retrievalLimit: number;
    shortTermMaxItems: number;
  };
  context: {
    maxTokens: number;
    reserveOutputTokens: number;
  };
  providers: Record<string, { apiKeyEnv: string; baseUrl?: string; enabled: boolean; models: ModelSpec[] }>;
}

export const MODEL_CATALOG: ModelSpec[] = [
  {
    id: "mock/fast", provider: "mock", label: "Mock Fast (offline)",
    contextWindow: 8192, maxOutput: 2048, costPer1kInput: 0, costPer1kOutput: 0,
    avgLatencyMs: 50, quality: 0.5,
    capabilities: { chat: true, reasoning: false, coding: true, vision: false, longContext: false, tools: true, json: true },
  },
  {
    id: "openai/gpt-4o-mini", provider: "openai", label: "GPT-4o mini",
    contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0.00015, costPer1kOutput: 0.0006,
    avgLatencyMs: 900, quality: 0.78,
    capabilities: { chat: true, reasoning: true, coding: true, vision: true, longContext: true, tools: true, json: true },
  },
  {
    id: "openai/gpt-4o", provider: "openai", label: "GPT-4o",
    contextWindow: 128000, maxOutput: 16384, costPer1kInput: 0.0025, costPer1kOutput: 0.01,
    avgLatencyMs: 1800, quality: 0.92,
    capabilities: { chat: true, reasoning: true, coding: true, vision: true, longContext: true, tools: true, json: true },
  },
  {
    id: "anthropic/claude-3-5-sonnet", provider: "anthropic", label: "Claude 3.5 Sonnet",
    contextWindow: 200000, maxOutput: 8192, costPer1kInput: 0.003, costPer1kOutput: 0.015,
    avgLatencyMs: 2000, quality: 0.93,
    capabilities: { chat: true, reasoning: true, coding: true, vision: true, longContext: true, tools: true, json: true },
  },
  {
    id: "gemini/gemini-2.0-flash", provider: "gemini", label: "Gemini 2.0 Flash",
    contextWindow: 1000000, maxOutput: 8192, costPer1kInput: 0.00035, costPer1kOutput: 0.00105,
    avgLatencyMs: 1100, quality: 0.82,
    capabilities: { chat: true, reasoning: true, coding: true, vision: true, longContext: true, tools: true, json: true },
  },
  {
    id: "deepseek/deepseek-chat", provider: "deepseek", label: "DeepSeek Chat",
    contextWindow: 128000, maxOutput: 8192, costPer1kInput: 0.00027, costPer1kOutput: 0.0011,
    avgLatencyMs: 1500, quality: 0.85,
    capabilities: { chat: true, reasoning: true, coding: true, vision: false, longContext: true, tools: true, json: true },
  },
  {
    id: "mistral/mistral-large", provider: "mistral", label: "Mistral Large",
    contextWindow: 128000, maxOutput: 8192, costPer1kInput: 0.002, costPer1kOutput: 0.006,
    avgLatencyMs: 1400, quality: 0.84,
    capabilities: { chat: true, reasoning: true, coding: true, vision: false, longContext: true, tools: true, json: true },
  },
  {
    id: "groq/llama-3.3-70b", provider: "groq", label: "Llama 3.3 70B (Groq)",
    contextWindow: 131072, maxOutput: 8192, costPer1kInput: 0.00059, costPer1kOutput: 0.00079,
    avgLatencyMs: 700, quality: 0.83,
    capabilities: { chat: true, reasoning: true, coding: true, vision: false, longContext: true, tools: true, json: true },
  },
];

function readEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  if (env[key] !== undefined) return env[key];
  if (typeof process !== "undefined" && process.env) return process.env[key];
  return undefined;
}

export function loadConfig(env: Record<string, string | undefined> = {}): BrainConfig {
  const get = (key: string, fallback: string): string => readEnv(env, key) ?? fallback;
  const enabled = (name: string) => get(`${name.toUpperCase()}_ENABLED`, "true") !== "false";
  const providers: BrainConfig["providers"] = {
    mock: { apiKeyEnv: "", baseUrl: "", enabled: true, models: MODEL_CATALOG.filter((m) => m.provider === "mock") },
    openai: { apiKeyEnv: "OPENAI_API_KEY", baseUrl: get("OPENAI_BASE_URL", "https://api.openai.com/v1"), enabled: enabled("openai"), models: MODEL_CATALOG.filter((m) => m.provider === "openai") },
    anthropic: { apiKeyEnv: "ANTHROPIC_API_KEY", baseUrl: get("ANTHROPIC_BASE_URL", "https://api.anthropic.com"), enabled: enabled("anthropic"), models: MODEL_CATALOG.filter((m) => m.provider === "anthropic") },
    gemini: { apiKeyEnv: "GEMINI_API_KEY", baseUrl: get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com"), enabled: enabled("gemini"), models: MODEL_CATALOG.filter((m) => m.provider === "gemini") },
    deepseek: { apiKeyEnv: "DEEPSEEK_API_KEY", baseUrl: get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"), enabled: enabled("deepseek"), models: MODEL_CATALOG.filter((m) => m.provider === "deepseek") },
    mistral: { apiKeyEnv: "MISTRAL_API_KEY", baseUrl: get("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"), enabled: enabled("mistral"), models: MODEL_CATALOG.filter((m) => m.provider === "mistral") },
    groq: { apiKeyEnv: "GROQ_API_KEY", baseUrl: get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"), enabled: enabled("groq"), models: MODEL_CATALOG.filter((m) => m.provider === "groq") },
  };
  return {
    defaultProvider: get("BRAIN_DEFAULT_PROVIDER", "mock"),
    routing: {
      preferLowCost: get("BRAIN_PREFER_LOW_COST", "true") === "true",
      maxLatencyMs: Number(get("BRAIN_MAX_LATENCY_MS", "8000")),
      qualityFloor: Number(get("BRAIN_QUALITY_FLOOR", "0.5")),
    },
    budgets: {
      maxSteps: Number(get("BRAIN_MAX_STEPS", "12")),
      maxTokensPerTask: Number(get("BRAIN_MAX_TOKENS", "60000")),
      maxCostUsdPerTask: Number(get("BRAIN_MAX_COST_USD", "0.5")),
      taskTimeoutMs: Number(get("BRAIN_TASK_TIMEOUT_MS", "120000")),
      modelTimeoutMs: Number(get("BRAIN_MODEL_TIMEOUT_MS", "30000")),
    },
    memory: {
      retrievalLimit: Number(get("BRAIN_MEMORY_LIMIT", "8")),
      shortTermMaxItems: Number(get("BRAIN_SHORT_TERM_MAX", "40")),
    },
    context: { maxTokens: Number(get("BRAIN_CONTEXT_MAX", "16000")), reserveOutputTokens: Number(get("BRAIN_RESERVE_OUTPUT", "2000")) },
    providers,
  };
}
