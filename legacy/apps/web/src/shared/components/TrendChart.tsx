import type { TermResult } from "@brillanda/shared-types";

// Average by term: used by the parent portal and the admin's student page.

export const termLabel = (t: Pick<TermResult, "term">) => `${t.term.name}, ${t.term.sessionName}`;

/** Average by term: one line that draws itself, each point labelled on hover. */
export function TrendChart({ terms }: { terms: TermResult[] }) {
  const W = 420, H = 180, pl = 30, pr = 16, pt = 22, pb = 28;
  const values = terms.map((t) => t.average);
  const lo = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 10) / 10) * 10);
  const x = (i: number) => (terms.length === 1 ? W / 2 : pl + (i * (W - pl - pr)) / (terms.length - 1));
  const y = (v: number) => pt + ((hi - v) / Math.max(1, hi - lo)) * (H - pt - pb);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Average by term: ${terms.map((t) => `${termLabel(t)}, ${t.average.toFixed(1)}`).join("; ")}`}>
      <defs>
        <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-chart)", stopOpacity: 0.25 }} />
          <stop offset="1" style={{ stopColor: "var(--color-chart)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} style={{ stroke: "var(--color-divider)" }} />
          <text x={pl - 8} y={y(t) + 4} textAnchor="end" className="fill-text-muted text-[11.5px]">{t}</text>
        </g>
      ))}
      {terms.length > 1 && <path d={`${line} L${x(last)} ${H - pb} L${x(0)} ${H - pb} Z`} fill="url(#trend-fill)" />}
      <path d={line} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="[stroke-dasharray:1] [stroke-dashoffset:1] animate-[draw-line_1.5s_cubic-bezier(0.2,0.8,0.2,1)_200ms_forwards]" style={{ stroke: "var(--color-chart)" }} />
      {terms.map((t, i) => (
        <g key={t.term.id + t.term.sessionName}>
          <title>{`${termLabel(t)}: average ${t.average.toFixed(1)}${t.position ? `, ${t.position} of ${t.of}` : ""}`}</title>
          <circle cx={x(i)} cy={y(t.average)} r={i === last ? 5.5 : 4} strokeWidth={2.5} style={{ fill: "var(--color-chart)", stroke: "var(--color-surface)" }} />
          <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-text-muted text-[11px]">{t.term.name.replace(" Term", "")}{i === last && t.term.sessionName !== terms[0]!.term.sessionName ? " ’" + t.term.sessionName.slice(-2) : ""}</text>
        </g>
      ))}
      <text x={x(last) - 9} y={y(values[last]!) - 12} textAnchor="end" className="fill-text-primary text-[12.5px] font-semibold">{values[last]!.toFixed(1)}</text>
    </svg>
  );
}

