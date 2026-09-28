import type { Complexity, InputType, TaskContext } from "../types";

export interface NormalizedInput {
  type: InputType;
  text: string;
  name?: string;
}

const CODE_HINTS = [/\bfunction\b/, /\bconst\b.*=>/, /\bclass\b/, /\bimport\b.*\bfrom\b/, /```/, /\bdef\b.*:/, /<\w+>.*<\/\w+>/, /\{\s*"\w+"\s*:/];
const URL_RE = /https?:\/\/[^\s)]+/g;

function detectType(raw: string, hint?: InputType): InputType {
  if (hint && hint !== "text") return hint;
  const t = raw.trim();
  if (!t) return "text";
  if (URL_RE.test(t) && t.length < 2000 && t.split(/\s+/).length < 15) return "url";
  if (/^```|^<\?php|^import\s|^export\s|function\s+\w+\s*\(|class\s+\w+/.test(t) || (CODE_HINTS.filter((r) => r.test(t)).length >= 2 && t.includes("\n"))) return "code";
  if (/^\s*\{[\s\S]*\}\s*$/.test(t) || /^\s*\[[\s\S]*\]\s*$/.test(t)) {
    try { JSON.parse(t); return "structured"; } catch { /* fallthrough */ }
  }
  if (t.length > 3000 || /^#\s/m.test(t) || /abstract|table of contents|chapter/i.test(t.slice(0, 500))) return "document";
  return "text";
}

function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  const quoted = text.match(/"([^"]{2,60})"|`([^`]{2,60})`/g) ?? [];
  quoted.forEach((q) => entities.add(q.replace(/["`]/g, "").trim()));
  const camelFiles = text.match(/[\w-]+\.(ts|tsx|js|jsx|py|go|rs|md|json|yaml|sql|html|css)/g) ?? [];
  camelFiles.forEach((f) => entities.add(f));
  const capitals = text.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2}\b/g) ?? [];
  capitals.slice(0, 12).forEach((c) => entities.add(c));
  return [...entities].slice(0, 20);
}

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (/build|create|implement|scaffold|generate/.test(t)) return "build";
  if (/fix|debug|error|broken|stack ?trace|failing/.test(t)) return "debug";
  if (/explain|what is|why|how does|describe|summar/i.test(t)) return "explain";
  if (/refactor|improve|optimize|clean ?up/.test(t)) return "refactor";
  if (/test|spec|coverage/.test(t)) return "test";
  if (/deploy|release|publish|ci\/?cd|docker|kubernetes/.test(t)) return "deploy";
  if (/search|find|lookup|retrieve|docs|documentation/.test(t)) return "research";
  if (/plan|design|architect|roadmap|break ?down/.test(t)) return "plan";
  if (/review|audit|check/.test(t)) return "review";
  return "general";
}

function detectCapabilities(text: string, intent: string): string[] {
  const caps = new Set<string>(["chat"]);
  const t = text.toLowerCase();
  if (/code|function|class|api|bug|typescript|python|sql/.test(t) || ["build", "debug", "refactor", "test"].includes(intent)) caps.add("coding");
  if (/reason|compare|trade-?off|decide|plan|architect|analy/.test(t) || intent === "plan") caps.add("reasoning");
  if (/image|photo|screenshot|diagram|vision|picture/.test(t)) caps.add("vision");
  if (/long|document|pdf|large|entire (repo|codebase)/.test(t) || text.length > 8000) caps.add("longContext");
  if (/search|browse|fetch|url|http|latest|current|news/.test(t) || intent === "research") caps.add("web");
  if (/file|repo|directory|terminal|run|execute|git/.test(t)) caps.add("tools");
  return [...caps];
}

function detectToolsRequired(text: string, capabilities: string[]): string[] {
  const tools: string[] = [];
  const t = text.toLowerCase();
  if (capabilities.includes("web") || /https?:\/\//.test(t)) tools.push("web_search");
  if (/file|read|write|directory|folder|path/.test(t)) tools.push("filesystem");
  if (/run|execute|command|terminal|npm|test|build\b/.test(t)) tools.push("terminal");
  if (/github|repo|pull request|issue|commit/.test(t)) tools.push("github");
  if (/database|sql|query|postgres|mongo/.test(t)) tools.push("database");
  if (/image|generate.*(picture|art|logo)/.test(t)) tools.push("image_gen");
  return [...new Set(tools)];
}

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];
  const t = text.toLowerCase();
  if (/must not|never|don't|do not/.test(t)) constraints.push("explicit negative constraint stated by user");
  if (/production|secure|safe/.test(t)) constraints.push("production-safety required");
  if (/fast|quick|low.?latency|cheap/.test(t)) constraints.push("prefer low latency/cost");
  const m = t.match(/typescript|python|react|node(?:\.js)?|postgres|docker/g);
  if (m) constraints.push(`stack: ${[...new Set(m)].join(", ")}`);
  return constraints;
}

function detectComplexity(text: string, toolsRequired: string[], capabilities: string[]): Complexity {
  const steps = text.split(/(?:\band\b|\bthen\b|;|\n[-*]\s|\d+\.\s)/).filter((s) => s.trim().length > 3).length;
  if (text.length > 1500 || steps >= 5 || toolsRequired.length >= 3 || capabilities.includes("longContext")) return "complex";
  if (text.length > 400 || steps >= 2 || toolsRequired.length >= 1) return "medium";
  return "simple";
}

let taskSeq = 0;

export class InputProcessor {
  process(raw: string, opts: { hint?: InputType; name?: string } = {}): TaskContext {
    const type = detectType(raw, opts.hint);
    const intent = detectIntent(raw);
    const entities = extractEntities(raw);
    const requiredCapabilities = detectCapabilities(raw, intent);
    const toolsRequired = detectToolsRequired(raw, requiredCapabilities);
    const constraints = detectConstraints(raw);
    const complexity = detectComplexity(raw, toolsRequired, requiredCapabilities);
    taskSeq += 1;
    return {
      id: `task-${Date.now()}-${taskSeq}`,
      userInput: raw,
      inputType: type,
      intent,
      complexity,
      constraints,
      requiredCapabilities,
      context: [],
      toolsRequired,
      entities,
      createdAt: Date.now(),
    };
  }

  normalizeMany(inputs: NormalizedInput[]): string {
    return inputs.map((i) => `[${i.type}${i.name ? `:${i.name}` : ""}]\n${i.text}`).join("\n\n");
  }
}
