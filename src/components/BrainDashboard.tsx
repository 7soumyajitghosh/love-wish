import { useEffect, useState } from "react";
import { getBrain } from "../../brain/api/index";

/** Observability dashboard: models, fallbacks, tools, tokens, cost, errors. No secrets shown. */
export function BrainDashboard() {
  const [snap, setSnap] = useState<Record<string, unknown>>({});
  const [goal, setGoal] = useState("Build authentication with model routing and deployment");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const brain = getBrain();
    setSnap(brain.dashboard());
    const off = brain.onEvent(() => setSnap(getBrain().dashboard()));
    const timer = setInterval(() => setSnap(getBrain().dashboard()), 2000);
    return () => { off(); clearInterval(timer); };
  }, []);

  async function run() {
    setBusy(true);
    try {
      const res = await getBrain().run({ goal });
      setAnswer(res.response);
      setSnap(getBrain().dashboard());
    } catch (e) {
      setAnswer(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  const entries = Object.entries(snap);
  return (
    <div className="p-4 rounded-xl border border-white/10 bg-black/40 text-sm">
      <h2 className="text-lg font-semibold mb-2">AI Brain — Observability</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {entries.filter(([k]) => !["errors", "recentEvents"].includes(k)).map(([k, v]) => (
          <div key={k} className="p-2 rounded bg-white/5">
            <div className="opacity-60 text-xs">{k}</div>
            <div className="font-mono">{String(v)}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <input value={goal} onChange={(e) => setGoal(e.target.value)} className="flex-1 p-2 rounded bg-white/10" placeholder="Ask the Brain…" />
        <button onClick={run} disabled={busy} className="px-4 py-2 rounded bg-violet-600 disabled:opacity-50">{busy ? "Thinking…" : "Run"}</button>
      </div>
      {answer && <pre className="whitespace-pre-wrap p-2 rounded bg-white/5 max-h-64 overflow-auto">{answer}</pre>}
    </div>
  );
}
