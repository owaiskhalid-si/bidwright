// The LangGraph state machine, drawn. Nodes and edges match src/lib/agent/graph.ts.
const NODES = [
  { id: "analyze", x: 20, label: "Read", sub: "brief + red flags" },
  { id: "match", x: 160, label: "Match", sub: "evidence per need" },
  { id: "draft", x: 300, label: "Draft", sub: "writer model" },
  { id: "review", x: 440, label: "Critique", sub: "rubric + 8 checks" },
  { id: "you", x: 600, label: "You", sub: "approve or steer" },
] as const;

export function AgentGraph() {
  const W = 120;
  const H = 58;
  const Y = 70;
  return (
    <svg viewBox="0 0 740 200" className="h-auto w-full" role="img" aria-label="Agent graph: Read, Match, Draft, Critique, then either Revise and critique again, or wait for you. Your feedback re-enters at Revise.">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="var(--ink-2)" />
        </marker>
      </defs>

      {/* forward edges */}
      {NODES.slice(0, -1).map((n, i) => (
        <line key={n.id} x1={n.x + W} y1={Y + H / 2} x2={NODES[i + 1].x - 4} y2={Y + H / 2} stroke="var(--ink-2)" strokeWidth="1.6" markerEnd="url(#arrow)" />
      ))}

      {/* revise loop under Critique */}
      <rect x={440} y={160} width={W} height={32} rx={16} fill="var(--highlight-soft)" stroke="var(--ink)" strokeOpacity=".35" />
      <text x={500} y={180} textAnchor="middle" className="fill-ink text-[13px] font-semibold">Revise</text>
      <path d={`M ${440 + 34} ${Y + H} C ${440 + 30} ${145}, ${440 + 30} ${150}, ${440 + 34} ${160}`} fill="none" stroke="var(--pencil)" strokeWidth="1.6" markerEnd="url(#arrow)" />
      <path d={`M ${440 + 86} ${160} C ${440 + 90} ${150}, ${440 + 90} ${145}, ${440 + 86} ${Y + H + 3}`} fill="none" stroke="var(--pass)" strokeWidth="1.6" markerEnd="url(#arrow)" />
      <text x={418} y={150} textAnchor="end" className="fill-pencil text-[11px]">quality &lt; 84, max 2×</text>
      {/* your feedback re-enters at revise */}
      <path d={`M ${660} ${Y + H} C ${660} ${176}, ${620} ${176}, ${562} ${176}`} fill="none" stroke="var(--ink-2)" strokeWidth="1.6" strokeDasharray="4 4" markerEnd="url(#arrow)" />
      <text x={672} y={170} className="fill-muted text-[11px]">your feedback</text>

      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x}
            y={Y}
            width={W}
            height={H}
            rx={14}
            fill={n.id === "you" ? "var(--highlight)" : "var(--card)"}
            stroke="var(--ink)"
            strokeOpacity={n.id === "you" ? 0 : 0.28}
            strokeDasharray={n.id === "you" ? undefined : undefined}
          />
          <text x={n.x + W / 2} y={Y + 26} textAnchor="middle" className="text-[15px] font-semibold" fill={n.id === "you" ? "#14161d" : "var(--ink)"}>
            {n.label}
          </text>
          <text x={n.x + W / 2} y={Y + 44} textAnchor="middle" className="text-[11px]" fill={n.id === "you" ? "#14161d" : "var(--muted)"}>
            {n.sub}
          </text>
        </g>
      ))}
      <text x={20} y={40} className="fill-muted font-mono text-[11px] uppercase tracking-[0.14em]">LangGraph · stateless human-in-the-loop</text>
    </svg>
  );
}
