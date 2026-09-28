// Central type definitions for the AI Brain / Cognitive Core.
// All subsystems share these contracts so each layer is independently replaceable.

export type Complexity = "simple" | "medium" | "complex";
export type RiskLevel = "low" | "medium" | "high";
export type MemoryScope = "short-term" | "episodic" | "semantic" | "user" | "project" | "agent" | "codebase";
export type InputType = "text" | "image" | "document" | "code" | "url" | "structured" | "tool-result" | "history";

export interface ContextItem {
  id: string;
  role: "system" | "user" | "assistant" | "tool" | "memory" | "knowledge";
  content: string;
  tokens?: number;
  importance: number; // 0..1
  recency: number; // epoch ms
  relevance?: number; // 0..1, filled by retrieval/rerank
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskContext {
  id: string;
  userInput: string;
  inputType: InputType;
  intent: string;
  complexity: Complexity;
  constraints: string[];
  requiredCapabilities: string[];
  context: ContextItem[];
  toolsRequired: string[];
  entities: string[];
  language?: string;
  createdAt: number;
}

export interface Action {
  id: string;
  kind: "model_call" | "tool_call" | "memory_op" | "answer" | "ask_user" | "replan";
  name: string;
  input: unknown;
  output?: unknown;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  startedAt?: number;
  endedAt?: number;
  error?: string;
  latencyMs?: number;
}

export interface CognitiveState {
  goal: string;
  currentStep: string;
  knownFacts: string[];
  assumptions: string[];
  uncertainties: string[];
  constraints: string[];
  availableTools: string[];
  observations: string[];
  previousActions: Action[];
  nextActions: Action[];
  confidence: number;
  updatedAt: number;
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "ready" | "running" | "done" | "failed" | "skipped" | "needs_input";
  priority: number;
  dependencies: string[];
  parallelizable: boolean;
  attempts: number;
  maxAttempts: number;
  result?: unknown;
  error?: string;
}

export interface TaskPlan {
  id: string;
  goal: string;
  tasks: SubTask[];
  createdAt: number;
  updatedAt: number;
}

export interface ReasoningTrace {
  hypotheses: string[];
  evidence: string[];
  constraints: string[];
  candidateActions: string[];
  selectedAction: string | null;
  confidence: number;
  // Private chain-of-thought lives here and is NEVER sent to the user.
  privateNotes?: string[];
}

export interface PublicReasoning {
  summary: string;
  conclusions: string[];
  evidence: string[];
  decisions: string[];
  actions: string[];
}

export interface ModelCapability {
  chat: boolean;
  reasoning: boolean;
  coding: boolean;
  vision: boolean;
  longContext: boolean;
  tools: boolean;
  json: boolean;
}

export interface ModelSpec {
  id: string; // e.g. "openai/gpt-4o-mini"
  provider: string; // e.g. "openai"
  label: string;
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number; // USD
  costPer1kOutput: number; // USD
  avgLatencyMs: number;
  quality: number; // 0..1
  capabilities: ModelCapability;
}

export interface ModelRequest {
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  signal?: AbortSignal;
  taskKind?: "chat" | "reasoning" | "coding" | "vision" | "longdoc" | "tools";
}

export interface ModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  latencyMs: number;
  finishReason: "stop" | "length" | "tool_call" | "aborted" | "error";
}

export interface ToolDefinition {
  name: string;
  description: string;
  capabilities: string[];
  inputSchema: unknown;
  outputSchema: unknown;
  riskLevel: RiskLevel;
}

export interface ToolResult {
  ok: boolean;
  output: unknown;
  error?: string;
  latencyMs: number;
}

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  text: string;
  embedding: number[];
  importance: number; // 0..1
  createdAt: number;
  lastAccessedAt: number;
  metadata: Record<string, unknown>;
  tags: string[];
}

export interface RetrievalOptions {
  scopes?: MemoryScope[];
  limit?: number;
  minRelevance?: number;
  filter?: Record<string, unknown>;
}

export interface ScoredMemory extends MemoryRecord {
  score: number;
  relevance: number;
}

export interface EvaluationReport {
  completeness: number;
  correctness: number;
  requirementCoverage: number;
  needsRevision: boolean;
  reasons: string[];
  suggestedNextAction?: string;
}

export interface BrainRunInput {
  goal: string;
  inputType?: InputType;
  attachments?: Array<{ type: InputType; content: string; name?: string }>;
  constraints?: string[];
  budget?: { maxSteps?: number; maxTokens?: number; maxCostUsd?: number; timeoutMs?: number };
  userId?: string;
}

export interface BrainResult {
  response: string;
  taskId: string;
  plan: TaskPlan | null;
  modelUsed: string | null;
  tokensUsed: { input: number; output: number };
  costUsd: number;
  steps: number;
  toolCalls: Action[];
  evaluation: EvaluationReport | null;
  citations: Array<{ source: string; ref: string }>;
  durationMs: number;
  stoppedBecause: string;
}

export interface BrainEvent {
  type:
    | "task_started"
    | "task_planned"
    | "model_selected"
    | "model_fallback"
    | "tool_called"
    | "tool_result"
    | "memory_retrieved"
    | "evaluation"
    | "memory_updated"
    | "task_finished"
    | "error";
  at: number;
  taskId: string;
  data?: Record<string, unknown>;
}

export type BrainEventListener = (event: BrainEvent) => void;
