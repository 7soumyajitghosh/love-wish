import type { BrainEvent, BrainEventListener } from "../types";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private listeners: BrainEventListener[] = [];
  constructor(private level: LogLevel = "info") {}

  onEvent(listener: BrainEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: BrainEvent): void {
    for (const l of this.listeners) {
      try { l(event); } catch { /* listener errors must not break the brain */ }
    }
  }

  log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    if (order[level] < order[this.level]) return;
    const line = `[brain:${level}] ${message}${data ? ` ${JSON.stringify(data).slice(0, 800)}` : ""}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}

export interface TaskStats {
  taskId: string;
  modelUsed: string | null;
  fallbacks: number;
  toolCalls: number;
  toolFailures: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  memoriesRetrieved: number;
  status: string;
}

/** In-memory observability store backing the dashboard. No sensitive data stored. */
export class Tracer {
  private events: BrainEvent[] = [];
  private stats = new Map<string, TaskStats>();

  record(event: BrainEvent): void {
    this.events.push(event);
    if (this.events.length > 2000) this.events = this.events.slice(-2000);
    let s = this.stats.get(event.taskId);
    if (!s) {
      s = { taskId: event.taskId, modelUsed: null, fallbacks: 0, toolCalls: 0, toolFailures: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, memoriesRetrieved: 0, status: "running" };
      this.stats.set(event.taskId, s);
    }
    const d = event.data ?? {};
    switch (event.type) {
      case "model_selected": s.modelUsed = String(d.model ?? s.modelUsed); break;
      case "model_fallback": s.fallbacks += 1; s.modelUsed = String(d.to ?? s.modelUsed); break;
      case "tool_called": s.toolCalls += 1; break;
      case "tool_result": if (d.ok === false) s.toolFailures += 1; break;
      case "memory_retrieved": s.memoriesRetrieved += Number(d.count ?? 0); break;
      case "task_finished": s.status = String(d.stoppedBecause ?? "done"); s.latencyMs = Number(d.durationMs ?? 0); break;
      default: break;
    }
  }

  addUsage(taskId: string, input: number, output: number, cost: number): void {
    const s = this.stats.get(taskId);
    if (!s) return;
    s.inputTokens += input;
    s.outputTokens += output;
    s.costUsd += cost;
  }

  recentEvents(limit = 100): BrainEvent[] {
    return this.events.slice(-limit);
  }

  taskStats(taskId: string): TaskStats | undefined {
    return this.stats.get(taskId);
  }

  allStats(): TaskStats[] {
    return [...this.stats.values()].slice(-50);
  }
}
