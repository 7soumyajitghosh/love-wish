import { useMemo, useState } from "react";
import { AnimationBrain } from "../../brain/animation/api/brain";
import { graphToChain } from "../../brain/animation/animation-graph/graph";
import { formatTimeline } from "../../brain/animation/timeline-engine/timeline";
import { compareFrames } from "../../brain/animation/visual-comparator/comparator";
import { renderAdlFrames, selectTechnology } from "../../brain/animation/reconstruction/engine";
import { generateCode } from "../../brain/animation/code-generator/generator";

const SAMPLE = `<div id="heart-tree"><svg class="trunk"></svg><canvas></canvas></div>
<style>@keyframes grow { from { opacity: 0; } to { opacity: 1; } }
.seed { animation: grow 2s cubic-bezier(0.22,1,0.36,1) both; }</style>
<script>import gsap from "gsap"; requestAnimationFrame(tick);</script>
<p>love seed soil roots trunk branches leaves hearts particles</p>`;

/**
 * Animation Brain dashboard: paste code (or a URL / description) → UNDERSTAND →
 * timeline + graph + ADL → modify via NL → regenerate + compare.
 */
export function AnimationBrainDashboard() {
  const [input, setInput] = useState(SAMPLE);
  const [command, setCommand] = useState("Make the tree grow 30% slower");
  const [notice, setNotice] = useState<string | null>(null);
  const brain = useMemo(() => new AnimationBrain(), []);

  const [result, setResult] = useState(() => brain.analyze(SAMPLE));
  const [modified, setModified] = useState<typeof result.adl | null>(null);
  const active = modified ?? result.adl;

  const analyze = (): void => {
    try {
      setResult(brain.analyze(input));
      setModified(null);
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  const applyCommand = (): void => {
    try {
      const out = brain.modify(active, command);
      setModified(out.adl);
      setNotice(out.changes.join(" · "));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  const tech = selectTechnology(active);
  const plan = useMemo(() => generateCode(active, tech.target, active.scene.replace(/[^a-z0-9]+/gi, "-").toLowerCase()), [active, tech.target]);
  const comparison = useMemo(() => {
    const a = renderAdlFrames(result.adl);
    const b = renderAdlFrames(active);
    return compareFrames(a, b);
  }, [result.adl, active]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10" aria-label="Animation Brain">
      <h2 className="font-display text-3xl font-bold tracking-tight">Animation Understanding Brain</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        What exactly is happening in this animation — and how can it be recreated or modified? Paste
        HTML/CSS/JS, a URL, or a description. The Brain answers from observed evidence, with confidence
        on every inference.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="brain-input">
            Animation input (code / URL / description)
          </label>
          <textarea
            id="brain-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            className="mt-2 w-full rounded-xl border border-line bg-paper p-3 font-mono text-xs"
          />
          <button onClick={analyze} className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            Understand this animation
          </button>
          {notice && <p className="mt-3 text-xs text-muted">{notice}</p>}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Understanding</h3>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-coal p-3 font-mono text-[11px] text-paper">
            {brain.describe(result)}
          </pre>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Timeline (causal)</h3>
          <ol className="mt-2 space-y-1 font-mono text-[11px]">
            {formatTimeline(result.timeline).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Animation graph</h3>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px]">{graphToChain(result.graph)}</pre>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Comparison vs original</h3>
          <p className="mt-2 font-display text-4xl font-bold">{comparison.similarity}%</p>
          <ul className="mt-2 space-y-1 text-[11px]">
            {comparison.metrics.map((m) => (
              <li key={m.name} className="flex justify-between gap-2 font-mono">
                <span>{m.name}</span>
                <span>{m.score}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="brain-cmd">
            Modify (natural language → ADL edit)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="brain-cmd"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              placeholder="Make the branches more organic"
            />
            <button onClick={applyCommand} className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper">
              Apply
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Target: {tech.target} — {tech.reason}. Files: {plan.files.map((f) => f.path).join(", ")}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">ADL (active)</h3>
          <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-coal p-3 font-mono text-[11px] text-paper">
            {JSON.stringify(active, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
