import type { CognitiveState, PublicReasoning, ReasoningTrace, TaskContext } from "../types";

// Structured internal reasoning. Private chain-of-thought is kept in
// ReasoningTrace.privateNotes and is NEVER included in user-facing output.
export interface ReasoningOutput {
  trace: ReasoningTrace;
  public: PublicReasoning;
  taskKind: "chat" | "reasoning" | "coding" | "vision" | "longdoc" | "tools";
}

export class ReasoningEngine {
  analyze(task: TaskContext, state: CognitiveState): ReasoningOutput {
    const hypotheses = this.hypotheses(task);
    const evidence = [...state.knownFacts.slice(-6), ...state.observations.slice(-6)];
    const constraints = [...task.constraints, ...state.constraints];
    const candidateActions = this.candidateActions(task, state);
    const selectedAction = candidateActions[0] ?? "answer_directly";
    const confidence = this.confidence(task, state);
    const taskKind = this.classifyTaskKind(task);
    const trace: ReasoningTrace = {
      hypotheses, evidence, constraints, candidateActions, selectedAction, confidence,
      privateNotes: [
        `intent=${task.intent} complexity=${task.complexity} caps=${task.requiredCapabilities.join(",")}`,
        `facts=${state.knownFacts.length} obs=${state.observations.length} tools=[${state.availableTools.join(",")}]`,
      ],
    };
    const publicReasoning: PublicReasoning = {
      summary: `Goal understood as "${task.intent}" (${task.complexity}). Selected approach: ${selectedAction}.`,
      conclusions: hypotheses.slice(0, 3),
      evidence: evidence.slice(0, 4),
      decisions: [`Proceed via: ${selectedAction}`, `Model kind: ${taskKind}`],
      actions: candidateActions.slice(0, 4),
    };
    return { trace, public: publicReasoning, taskKind };
  }

  private hypotheses(task: TaskContext): string[] {
    const h = [`User wants: ${task.intent}`];
    if (task.complexity === "complex") h.push("Request needs decomposition into sequential and parallel subtasks");
    if (task.toolsRequired.length) h.push(`External tools likely needed: ${task.toolsRequired.join(", ")}`);
    if (task.requiredCapabilities.includes("coding")) h.push("Code context must be understood before modifying anything");
    if (task.requiredCapabilities.includes("longContext")) h.push("Large context must be compressed and prioritized");
    return h;
  }

  private candidateActions(task: TaskContext, state: CognitiveState): string[] {
    const actions: string[] = [];
    if (task.complexity === "complex") actions.push("execute_plan");
    if (task.toolsRequired.includes("web_search")) actions.push("tool:web_search");
    if (task.toolsRequired.includes("filesystem")) actions.push("tool:filesystem");
    if (task.toolsRequired.includes("terminal")) actions.push("tool:terminal");
    if (task.toolsRequired.includes("github")) actions.push("tool:github");
    if (task.toolsRequired.includes("database")) actions.push("tool:database");
    if (task.requiredCapabilities.includes("longContext")) actions.push("retrieve_knowledge");
    if (state.uncertainties.length > 3) actions.push("ask_user_for_missing_info");
    actions.push("answer_directly");
    return [...new Set(actions)];
  }

  private confidence(task: TaskContext, state: CognitiveState): number {
    let c = 0.55;
    if (state.knownFacts.length > 3) c += 0.1;
    if (state.observations.length > 0) c += 0.08;
    if (task.complexity === "simple") c += 0.1;
    if (task.complexity === "complex") c -= 0.12;
    if (state.uncertainties.length > 4) c -= 0.15;
    return Math.min(0.95, Math.max(0.05, c));
  }

  private classifyTaskKind(task: TaskContext): ReasoningOutput["taskKind"] {
    const caps = task.requiredCapabilities;
    if (caps.includes("vision")) return "vision";
    if (caps.includes("longContext")) return "longdoc";
    if (caps.includes("coding") || task.intent === "debug") return "coding";
    if (caps.includes("tools") || task.toolsRequired.length > 0) return "tools";
    if (task.complexity === "complex" || caps.includes("reasoning")) return "reasoning";
    return "chat";
  }
}
