import type { ToolDefinition, ToolResult } from "../types";

export type ToolHandler = (input: unknown) => Promise<unknown> | unknown;

interface RegisteredTool extends ToolDefinition {
  handler: ToolHandler;
}

const lastCall = new Map<string, number>();

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private permissions = new Map<string, boolean>();

  register(def: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(def.name, { ...def, handler });
    if (!this.permissions.has(def.name)) this.permissions.set(def.name, def.riskLevel !== "high");
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map(({ handler: _h, ...def }) => def);
  }

  setPermission(name: string, allowed: boolean): void {
    this.permissions.set(name, allowed);
  }

  isAllowed(name: string): boolean {
    return this.permissions.get(name) ?? false;
  }

  get(name: string): ToolDefinition | undefined {
    const t = this.tools.get(name);
    if (!t) return undefined;
    const { handler: _h, ...def } = t;
    return def;
  }

  /** Decide necessity: only call when the task explicitly needs a capability. */
  isNecessary(toolName: string, toolsRequired: string[], intent: string): boolean {
    if (toolsRequired.includes(toolName)) return true;
    if (toolName === "web_search" && (intent === "research" || toolsRequired.includes("web_search"))) return true;
    return false;
  }

  async execute(name: string, input: unknown, opts: { rateLimitMs?: number } = {}): Promise<ToolResult> {
    const started = Date.now();
    const tool = this.tools.get(name);
    if (!tool) return { ok: false, output: null, error: `Unknown tool: ${name}`, latencyMs: 0 };
    if (!this.isAllowed(name)) return { ok: false, output: null, error: `Tool not permitted: ${name}`, latencyMs: 0 };
    const gap = opts.rateLimitMs ?? 250;
    const prev = lastCall.get(name) ?? 0;
    if (Date.now() - prev < gap) await new Promise((r) => setTimeout(r, gap - (Date.now() - prev)));
    try {
      const output = await tool.handler(input);
      lastCall.set(name, Date.now());
      return { ok: true, output, latencyMs: Date.now() - started };
    } catch (err) {
      lastCall.set(name, Date.now());
      return { ok: false, output: null, error: err instanceof Error ? err.message : String(err), latencyMs: Date.now() - started };
    }
  }
}
