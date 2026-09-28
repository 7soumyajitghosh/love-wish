# AI Brain / Cognitive Core

Central intelligence layer. The UI is only the interface — all understanding,
memory, reasoning, planning, routing, tools, and evaluation live here.

## Pipeline

```
USER INPUT → PERCEPTION → CONTEXT → MEMORY → GOAL UNDERSTANDING → PLANNING
→ REASONING → MODEL ROUTING → TOOL SELECTION → EXECUTION → OBSERVATION
→ EVALUATION → REPLAN (if needed) → MEMORY UPDATE → FINAL RESPONSE
```

## Layout

| Path | Responsibility |
|---|---|
| `types.ts` | Shared contracts for every subsystem |
| `config/` | Env-driven config + multi-provider model catalog |
| `perception/` | `InputProcessor`: type/intent/entities/complexity/constraints/tools detection |
| `context/` | `ContextManager`: relevance+recency+importance ranking, token budgets, compression (never sends full history) |
| `memory/` | `MemoryManager` + swappable `MemoryProvider` (7 scopes: short-term, episodic, semantic, user, project, agent, codebase) |
| `core/` | `Brain` (public API) + `CognitiveState` |
| `planner/` | `TaskPlanner`: decomposition, dependencies, priorities, retries, completion tracking |
| `reasoning/` | `ReasoningEngine`: structured internal trace + public summary only (chain-of-thought never exposed) |
| `models/` | `ModelGateway` + smart routing (capability/quality/cost/latency/context/health) + `MockProvider`, OpenAI-compatible + Anthropic providers + ordered fallback with exponential backoff |
| `tools/` | `ToolRegistry` (permission-gated, necessity-checked) + safe built-ins (`web_search`, `filesystem` read-only, `github`; `terminal`/`code_exec`/`database` disabled by default) |
| `agents/` | Agent loop: observe → understand → plan → act → observe → evaluate → replan (bounded steps/time, no repeated failed actions) |
| `evaluation/` | `Evaluator`: completeness/correctness/coverage + one revision pass (scores are internal, never shown as truth) |
| `rag/` | `RagEngine`: query understanding → embedding → vector search → metadata filter → rerank, with citations |
| `codebase/` | `CodebaseIndexer`: file → symbol → dependency → feature → architecture + impact analysis |
| `user/` | `UserProfiler`: opt-in preferences/project context with export + erase controls |
| `security/` | `SecurityManager`: rate limiting, injection screening, secret redaction, audit log (keys never stored) |
| `tokens/` | `TokenManager`: pre-call budget checks, per-model cost accounting |
| `observability/` | `Logger` + `Tracer` event/usage store (backs `BrainDashboard`) |

## Usage

```ts
import { createBrain } from "./ai-brain/index";

const brain = createBrain(); // reads env, works offline via mock provider
const result = await brain.run({ goal: "Build authentication for my application" });
console.log(result.response, result.modelUsed, result.tokensUsed);

// Clean API
await brain.chat("...");
await brain.plan("...");
await brain.reason("...");
await brain.remember("user prefers TypeScript", "user", 0.9);
await brain.retrieve("TypeScript preferences");
await brain.evaluate(goal, response);
brain.reset();
```

## Providers

Set keys via env (see `.env.example`). Every provider is optional — anything
unconfigured is skipped by the router, and the offline `mock` provider keeps
tests and development working with zero keys. Add a model by extending
`MODEL_CATALOG` in `config/`; add a provider by implementing `ModelProvider`
and registering it on `ModelGateway`. No core changes needed.

## Swapping infrastructure

- Vector DB: implement `MemoryProvider` (4 methods) and call `memory.setProvider(...)`.
- Embeddings: pass any `EmbeddingProvider` to `MemoryManager`.
- Tools: `tools.register(def, handler)` + `tools.setPermission(name, bool)`.

## Verify

```sh
npm install
npm test        # vitest: perception, context, memory, planner, reasoning, RAG, security, tokens, end-to-end
npm run typecheck
npm run build
```
