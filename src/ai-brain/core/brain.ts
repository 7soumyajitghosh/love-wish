import type {
  BrainEvent, BrainEventListener, BrainResult, BrainRunInput, CognitiveState,
  EvaluationReport, TaskContext, TaskPlan,
} from "../types";
import { loadConfig, type BrainConfig } from "../config/index";
import { InputProcessor } from "../perception/input-processor";
import { ContextManager } from "../context/context-manager";
import { MemoryManager } from "../memory/memory-manager";
import { createInitialState } from "./cognitive-state";
import { TaskPlanner } from "../planner/task-planner";
import { ReasoningEngine } from "../reasoning/reasoning-engine";
import { ModelGateway } from "../models/model-gateway";
import { ToolRegistry } from "../tools/registry";
import { registerBuiltinTools } from "../tools/builtin-tools";
import { Evaluator } from "../evaluation/evaluator";
import { RagEngine } from "../rag/rag-engine";
import { CodebaseIndexer } from "../codebase/codebase-indexer";
import { UserProfiler } from "../user/user-profiler";
import { SecurityManager } from "../security/security-manager";
import { TokenManager } from "../tokens/token-manager";
import { Logger, Tracer } from "../observability/tracer";
import { runAgentLoop } from "../agents/runtime";

export interface BrainOptions {
  config?: BrainConfig;
  env?: Record<string, string | undefined>;
}

export class Brain {
  readonly config: BrainConfig;
  readonly input: InputProcessor;
  readonly context: ContextManager;
  readonly memory: MemoryManager;
  readonly planner: TaskPlanner;
  readonly reasoning: ReasoningEngine;
  readonly gateway: ModelGateway;
  readonly tools: ToolRegistry;
  readonly evaluator: Evaluator;
  readonly rag: RagEngine;
  readonly codebase: CodebaseIndexer;
  readonly users: UserProfiler;
  readonly security: SecurityManager;
  tokens: TokenManager;
  readonly logger: Logger;
  readonly tracer: Tracer;

  private state: CognitiveState | null = null;
  private lastPlan: TaskPlan | null = null;

  constructor(opts: BrainOptions = {}) {
    this.config = opts.config ?? loadConfig(opts.env);
    this.logger = new Logger("info");
    this.tracer = new Tracer();
    this.logger.onEvent((e) => this.tracer.record(e));
    this.input = new InputProcessor();
    this.context = new ContextManager({
      maxTokens: this.config.context.maxTokens,
      reserveOutput: this.config.context.reserveOutputTokens,
      shortTermMax: this.config.memory.shortTermMaxItems,
    });
    this.memory = new MemoryManager();
    this.planner = new TaskPlanner();
    this.reasoning = new ReasoningEngine();
    this.gateway = new ModelGateway(this.config);
    this.tools = new ToolRegistry();
    registerBuiltinTools(this.tools);
    this.evaluator = new Evaluator(this.gateway);
    this.rag = new RagEngine();
    this.codebase = new CodebaseIndexer();
    this.users = new UserProfiler();
    this.security = new SecurityManager();
    this.tokens = new TokenManager({ maxTokens: this.config.budgets.maxTokensPerTask, maxCostUsd: this.config.budgets.maxCostUsdPerTask });
    // Register credential presence (never values).
    for (const [name, p] of Object.entries(this.config.providers)) {
      if (!p.apiKeyEnv) continue;
      const present = typeof process !== "undefined" && !!process.env?.[p.apiKeyEnv];
      this.security.registerCredential(p.apiKeyEnv, present);
      void name;
    }
  }

  onEvent(listener: BrainEventListener): () => void {
    return this.logger.onEvent(listener);
  }

  // ---- Clean public API ----

  async run(input: BrainRunInput): Promise<BrainResult> {
    const started = Date.now();
    const maxSteps = input.budget?.maxSteps ?? this.config.budgets.maxSteps;
    if (input.budget?.maxTokens) this.tokens = new TokenManager({ maxTokens: input.budget.maxTokens, maxCostUsd: input.budget.maxCostUsd ?? this.config.budgets.maxCostUsdPerTask });
    else this.tokens.reset();

    if (!this.security.checkRateLimit()) {
      return this.failResult("rate_limited", "Rate limit exceeded. Please wait a moment and retry.", started);
    }
    const sanitized = this.security.sanitizeInput(input.goal);
    const injection = this.security.detectInjection(sanitized.clean);
    if (injection.suspicious) {
      this.security.auditLog(input.userId ?? "anon", "injection_blocked", injection.signals.join(","));
    }

    // PERCEPTION
    const task: TaskContext = this.input.process(sanitized.clean);
    if (input.constraints) task.constraints.push(...input.constraints);
    if (input.attachments?.length) {
      task.context.push(...input.attachments.map((a, i) => ({
        id: `att-${i}`, role: "user" as const, content: `[${a.type}${a.name ? `:${a.name}` : ""}]\n${a.content.slice(0, 6000)}`,
        importance: 0.8, recency: Date.now(),
      })));
      if (input.attachments.some((a) => a.type === "code")) task.requiredCapabilities.push("coding");
    }
    this.logger.emit({ type: "task_started", at: Date.now(), taskId: task.id, data: { intent: task.intent, complexity: task.complexity } });

    // CONTEXT (short-term history)
    this.context.add({ role: "user", content: task.userInput, importance: 0.9 });

    // COGNITIVE STATE
    this.state = createInitialState(task.userInput, this.tools.list().map((t) => t.name), task.constraints);

    // AGENT LOOP (memory -> planning -> reasoning -> routing -> tools -> eval)
    const loop = await runAgentLoop(task, {
      planner: this.planner, reasoning: this.reasoning, gateway: this.gateway, tools: this.tools,
      memory: this.memory, context: this.context, evaluator: this.evaluator, rag: this.rag,
      tokens: this.tokens, security: this.security, logger: this.logger, tracer: this.tracer, maxSteps,
      timeoutMs: input.budget?.timeoutMs ?? this.config.budgets.taskTimeoutMs,
    }, this.state);
    this.state = loop.state;
    this.lastPlan = loop.plan;

    // MEMORY UPDATE (episodic: what happened; semantic: durable facts only)
    const summary = `Goal: ${task.userInput.slice(0, 300)} | Outcome: ${loop.stoppedBecause} | Model: ${loop.modelId ?? "none"}`;
    await this.memory.remember(summary, { scope: "episodic", importance: 0.6, tags: [task.intent, task.complexity] });
    const facts = loop.state.knownFacts.slice(-3);
    for (const f of facts) await this.memory.remember(f, { scope: "semantic", importance: 0.7, tags: [task.intent] });

    this.context.add({ role: "assistant", content: loop.response, importance: 0.85 });
    this.security.auditLog(input.userId ?? "anon", "task_run", `${task.id} ${loop.stoppedBecause}`);

    const budget = this.tokens.state();
    const evaluation = await this.evaluator.evaluate(task, loop.response, loop.toolFailures).catch(
      (): EvaluationReport => ({ completeness: 0.7, correctness: 0.7, requirementCoverage: 0.7, needsRevision: false, reasons: ["evaluator unavailable"] }),
    );
    const durationMs = Date.now() - started;
    this.logger.emit({ type: "task_finished", at: Date.now(), taskId: task.id, data: { stoppedBecause: loop.stoppedBecause, durationMs } });
    this.logger.emit({ type: "memory_updated", at: Date.now(), taskId: task.id, data: { episodic: true } });

    return {
      response: loop.response || "(no response produced)",
      taskId: task.id,
      plan: loop.plan,
      modelUsed: loop.modelId,
      tokensUsed: { input: budget.inputTokens, output: budget.outputTokens },
      costUsd: budget.costUsd,
      steps: loop.state.previousActions.length,
      toolCalls: loop.state.previousActions.filter((a) => a.kind === "tool_call"),
      evaluation,
      citations: loop.citations,
      durationMs,
      stoppedBecause: loop.stoppedBecause,
    };
  }

  async chat(message: string): Promise<BrainResult> {
    return this.run({ goal: message });
  }

  async plan(goal: string): Promise<TaskPlan> {
    const task = this.input.process(goal);
    return this.planner.plan(task);
  }

  async reason(goal: string): Promise<{ public: { summary: string; conclusions: string[]; decisions: string[] }; taskKind: string; confidence: number }> {
    const task = this.input.process(goal);
    const state = this.state ?? createInitialState(goal, [], []);
    const out = this.reasoning.analyze(task, state);
    return { public: { summary: out.public.summary, conclusions: out.public.conclusions, decisions: out.public.decisions }, taskKind: out.taskKind, confidence: out.trace.confidence };
  }

  async execute(plan: TaskPlan): Promise<{ completion: number; done: boolean }> {
    return { completion: this.planner.completion(plan), done: this.planner.isComplete(plan) };
  }

  async remember(text: string, scope: "episodic" | "semantic" | "user" | "project" | "agent" | "codebase" = "episodic", importance = 0.5): Promise<string> {
    const rec = await this.memory.remember(text, { scope, importance });
    return rec.id;
  }

  async retrieve(query: string, limit = 8): Promise<Array<{ text: string; scope: string; score: number }>> {
    const hits = await this.memory.retrieve(query, { limit });
    return hits.map((h) => ({ text: h.text, scope: h.scope, score: h.score }));
  }

  async evaluate(taskGoal: string, response: string): Promise<EvaluationReport> {
    const task = this.input.process(taskGoal);
    return this.evaluator.evaluate(task, response, 0);
  }

  reset(): void {
    this.context.clear();
    this.tokens.reset();
    this.state = null;
    this.lastPlan = null;
  }

  getState(): CognitiveState | null {
    return this.state;
  }

  getPlan(): TaskPlan | null {
    return this.lastPlan;
  }

  private failResult(taskId: string, response: string, started: number): BrainResult {
    return {
      response, taskId, plan: null, modelUsed: null,
      tokensUsed: { input: 0, output: 0 }, costUsd: 0, steps: 0, toolCalls: [],
      evaluation: null, citations: [], durationMs: Date.now() - started, stoppedBecause: "rejected",
    };
  }
}

export function createBrain(opts: BrainOptions = {}): Brain {
  return new Brain(opts);
}
