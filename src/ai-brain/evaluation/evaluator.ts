import type { EvaluationReport, TaskContext } from "../types";
import type { ModelGateway } from "../models/model-gateway";

function heuristicEvaluate(task: TaskContext, response: string, toolFailures: number): EvaluationReport {
  const reasons: string[] = [];
  const goalTerms = task.userInput.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  const resp = response.toLowerCase();
  const hits = goalTerms.filter((t) => resp.includes(t)).length;
  const requirementCoverage = goalTerms.length ? Math.min(1, hits / Math.max(1, Math.min(goalTerms.length, 10))) : 0.7;
  let correctness = 0.8;
  if (toolFailures > 0) { correctness -= 0.1 * toolFailures; reasons.push(`${toolFailures} tool failure(s) observed`); }
  if (/error|failed|unable|could not/i.test(response) && task.intent !== "debug") { correctness -= 0.08; reasons.push("response contains failure language"); }
  const completeness = Math.min(1, 0.55 + response.length / 2500 + requirementCoverage * 0.25);
  correctness = Math.max(0.05, Math.min(0.98, correctness));
  const needsRevision = completeness < 0.6 || correctness < 0.6 || requirementCoverage < 0.5;
  if (needsRevision) reasons.push("coverage below threshold; another iteration recommended");
  else reasons.push("requirements appear covered");
  return { completeness, correctness, requirementCoverage, needsRevision, reasons };
}

export class Evaluator {
  constructor(private gateway?: ModelGateway) {}

  async evaluate(task: TaskContext, response: string, toolFailures = 0): Promise<EvaluationReport> {
    // Prefer model-based judging when a gateway is available; always fall back to heuristics.
    if (this.gateway) {
      try {
        const res = await this.gateway.complete("reasoning", {
          messages: [
            { role: "system", content: "You are an evaluator. Reply ONLY with JSON: {completeness, correctness, requirementCoverage (0..1), needsRevision (bool), reasons (string[])}." },
            { role: "user", content: `Goal: ${task.userInput.slice(0, 1500)}\nResponse: ${response.slice(0, 3000)}\nTool failures: ${toolFailures}` },
          ],
          maxTokens: 400, temperature: 0, json: true,
        });
        const parsed = JSON.parse(res.text) as Partial<EvaluationReport>;
        if (typeof parsed.completeness === "number" && typeof parsed.needsRevision === "boolean") {
          return {
            completeness: clamp(parsed.completeness), correctness: clamp(parsed.correctness ?? 0.8),
            requirementCoverage: clamp(parsed.requirementCoverage ?? 0.8),
            needsRevision: parsed.needsRevision, reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 6).map(String) : [],
            suggestedNextAction: undefined,
          };
        }
      } catch {
        // fall through to heuristic
      }
    }
    return heuristicEvaluate(task, response, toolFailures);
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
