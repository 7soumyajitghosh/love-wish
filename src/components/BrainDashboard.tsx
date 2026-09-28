import { useEffect, useState } from "react";
import type { BrainEvent, TaskStats } from "../ai-brain/types";

interface Props {
  events: BrainEvent[];
  stats: TaskStats[];
}

/** Internal observability dashboard: tasks, models, fallbacks, tools, tokens, cost, errors. No secrets shown. */
export function BrainDashboard({ events, stats }: Props) {
  const [filter, setFilter] = useState("");
  const [live, setLive] = useState<BrainEvent[]>(events);
  useEffect(() => setLive(events.slice(-120)), [events]);
  const shown = live.filter((e) => !filter || e.type.includes(filter) || e.taskId.includes(filter));
  const totalCost = stats.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = stats.reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
  const fallbacks = stats.reduce((s, t) => s + t.fallbacks, 0);
  const toolCalls = stats.reduce((s, t) => s + t.toolCalls, 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/90">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">AI Brain Â· Observability</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter eventsâ€¦"
          className="rounded-lg bg-white/10 px-3 py-1 text-white placeholder-white/40 outline-none"
        />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Metric label="Tasks" value={String(stats.length)} />
        <Metric label="Tokens" value={totalTokens.toLocaleString()} />
        <Metric label="Est. cost" value={`$${totalCost.toFixed(4)}`} />
        <Metric label="Fallbacks" value={String(fallbacks)} />
        <Metric label="Tool calls" value={String(toolCalls)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="mb-1 font-medium text-white/70">Tasks</h3>
          <div className="max-h-56 space-y-1 overflow-auto">
            {stats.slice(-20).reverse().map((t) => (
              <div key={t.taskId} className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs">
                <span className="text-white/50">{t.taskId.slice(-8)}</span> Â· {t.modelUsed ?? "â€”"} Â· {t.status} Â·
                {` ${(t.inputTokens + t.outputTokens).toLocaleString()} tok`} Â· ${t.costUsd.toFixed(4)}
                {t.fallbacks > 0 && <span className="text-amber-300"> Â· {t.fallbacks} fallback(s)</span>}
              </div>
            ))}
            {stats.length === 0 && <p className="text-white/40">No tasks yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-1 font-medium text-white/70">Events</h3>
          <div className="max-h-56 space-y-1 overflow-auto">
            {shown.slice(-40).reverse().map((e, i) => (
              <div key={`${e.at}-${i}`} className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs">
                <span className={e.type === "error" ? "text-red-300" : e.type === "model_fallback" ? "text-amber-300" : "text-emerald-300"}>{e.type}</span>
                <span className="text-white/40"> Â· {e.taskId.slice(-8)}</span>
              </div>
            ))}
            {shown.length === 0 && <p className="text-white/40">No events.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="text-xs text-white/50">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
