// Codebase understanding: File -> Symbol -> Dependency -> Feature -> Architecture.
export interface CodeSymbol {
  name: string;
  kind: "file" | "function" | "class" | "interface" | "import" | "config" | "test";
  file: string;
  line?: number;
  details?: string;
}

export interface ImpactReport {
  files: string[];
  symbols: string[];
  risks: string[];
}

const SYMBOL_RES = [
  { re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm, kind: "function" as const },
  { re: /^(?:export\s+)?(?:default\s+)?class\s+(\w+)/gm, kind: "class" as const },
  { re: /^(?:export\s+)?interface\s+(\w+)/gm, kind: "interface" as const },
  { re: /^(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/gm, kind: "import" as const },
  { re: /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/gm, kind: "function" as const },
];

export class CodebaseIndexer {
  private files = new Map<string, string>();
  private symbols: CodeSymbol[] = [];

  indexFile(path: string, content: string): CodeSymbol[] {
    this.files.set(path, content);
    this.symbols = this.symbols.filter((s) => s.file !== path);
    const found: CodeSymbol[] = [{ name: path, kind: "file", file: path, details: `${content.length} chars` }];
    for (const { re, kind } of SYMBOL_RES) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        found.push({ name: m[1].slice(0, 120), kind, file: path, line });
      }
    }
    if (/\.test\.|\.spec\.|__tests__/.test(path)) found.push({ name: `${path} (test)`, kind: "test", file: path });
    if (/config|package\.json|tsconfig|\.env/.test(path)) found.push({ name: `${path} (config)`, kind: "config", file: path });
    this.symbols.push(...found);
    return found;
  }

  searchSymbols(query: string, limit = 20): CodeSymbol[] {
    const q = query.toLowerCase();
    return this.symbols
      .map((s) => ({ s, score: s.name.toLowerCase().includes(q) ? 2 : s.file.toLowerCase().includes(q) ? 1 : 0 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.s);
  }

  dependenciesOf(file: string): string[] {
    return this.symbols.filter((s) => s.file === file && s.kind === "import").map((s) => s.name);
  }

  impactOf(files: string[]): ImpactReport {
    const symbols = this.symbols.filter((s) => files.includes(s.file)).map((s) => `${s.kind}:${s.name}`);
    const risks: string[] = [];
    if (files.some((f) => /auth|security|payment|db|migration/i.test(f))) risks.push("touches auth/data path â€” require tests + review");
    if (files.length > 5) risks.push("wide blast radius â€” split change into smaller steps");
    return { files, symbols: symbols.slice(0, 40), risks };
  }

  architectureSummary(): string {
    const files = [...this.files.keys()];
    const dirs = [...new Set(files.map((f) => f.split("/").slice(0, -1).join("/") || "."))];
    return `Files: ${files.length}. Directories: ${dirs.join(", ") || "(none)"}. Symbols: ${this.symbols.length} (functions/classes/interfaces/imports).`;
  }

  fileCount(): number {
    return this.files.size;
  }
}
