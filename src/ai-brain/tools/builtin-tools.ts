import { ToolRegistry } from "./registry";

/** Safe built-in tools. Network/filesystem access is sandboxed and permission-gated. */
export function registerBuiltinTools(registry: ToolRegistry, opts: { allowNetwork?: boolean; workingDir?: string } = {}): void {
  const allowNetwork = opts.allowNetwork ?? true;

  registry.register(
    {
      name: "web_search",
      description: "Search the web for current/external information. Use only when the task needs fresh or external facts.",
      capabilities: ["web", "research"],
      inputSchema: { query: "string", limit: "number?" },
      outputSchema: { results: "array" },
      riskLevel: "low",
    },
    async (input: unknown) => {
      if (!allowNetwork) throw new Error("Network disabled by policy");
      const { query, limit } = (input ?? {}) as { query?: string; limit?: number };
      if (!query || typeof query !== "string") throw new Error("web_search requires { query: string }");
      // DuckDuckGo instant answers (no key required). Failures are returned as errors, never fabricated.
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { headers: { "User-Agent": "ai-brain/1.0" } });
      if (!res.ok) throw new Error(`web_search HTTP ${res.status}`);
      const data = (await res.json()) as { AbstractText?: string; AbstractURL?: string; RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> };
      const results = (data.RelatedTopics ?? []).slice(0, limit ?? 5).map((t) => ({ text: t.Text ?? "", url: t.FirstURL ?? "" }));
      return { abstract: data.AbstractText ?? "", abstractUrl: data.AbstractURL ?? "", results, query };
    },
  );

  registry.register(
    {
      name: "filesystem",
      description: "Read-only file inspection within the working directory. Writes require explicit permission.",
      capabilities: ["tools", "code"],
      inputSchema: { op: "read", path: "string" },
      outputSchema: { content: "string" },
      riskLevel: "medium",
    },
    async (input: unknown) => {
      const { op, path } = (input ?? {}) as { op?: string; path?: string };
      if (op !== "read" || !path) throw new Error("filesystem supports { op: 'read', path } only in safe mode");
      if (path.includes("..") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) throw new Error("Path escapes working directory");
      const fs = await import("node:fs/promises");
      const fp = `${opts.workingDir ?? process.cwd()}/${path}`.replace(/\/+/g, "/");
      const content = await fs.readFile(fp, "utf-8").catch((e: Error) => { throw new Error(`filesystem read failed: ${e.message}`); });
      return { path, content: content.slice(0, 20000) };
    },
  );

  registry.register(
    {
      name: "code_exec",
      description: "Execute sandboxed read-only analysis (no shell). Only pure computation callbacks are allowed by the brain.",
      capabilities: ["tools", "code"],
      inputSchema: { note: "string" },
      outputSchema: { note: "string" },
      riskLevel: "high",
    },
    async () => {
      throw new Error("code_exec is disabled by default; enable explicitly via setPermission after review");
    },
  );

  registry.register(
    {
      name: "terminal",
      description: "Run allow-listed diagnostic commands (e.g. `npm test`, `tsc --noEmit`). Disabled by default.",
      capabilities: ["tools"],
      inputSchema: { command: "string" },
      outputSchema: { output: "string" },
      riskLevel: "high",
    },
    async () => {
      throw new Error("terminal is disabled by default; enable explicitly via setPermission after review");
    },
  );

  registry.register(
    {
      name: "github",
      description: "Query public GitHub API (repos, issues) when the task references GitHub.",
      capabilities: ["tools", "code"],
      inputSchema: { repo: "string" },
      outputSchema: { data: "unknown" },
      riskLevel: "low",
    },
    async (input: unknown) => {
      if (!allowNetwork) throw new Error("Network disabled by policy");
      const { repo } = (input ?? {}) as { repo?: string };
      if (!repo || !/^[\w-]+\/[\w.-]+$/.test(repo)) throw new Error("github requires { repo: 'owner/name' }");
      const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { "User-Agent": "ai-brain/1.0" } });
      if (!res.ok) throw new Error(`github HTTP ${res.status}`);
      const data = (await res.json()) as { stargazers_count?: number; description?: string };
      return { repo, stars: data.stargazers_count, description: data.description };
    },
  );

  registry.register(
    {
      name: "database",
      description: "Placeholder for parameterized database queries. No connection configured by default.",
      capabilities: ["tools", "data"],
      inputSchema: { query: "string" },
      outputSchema: { rows: "array" },
      riskLevel: "high",
    },
    async () => {
      throw new Error("database is not configured; provide a DatabaseProvider to enable");
    },
  );
}
