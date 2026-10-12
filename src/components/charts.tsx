"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useMemo, useState } from "react";
import type { MomentumClass, RoleInsight, SkillEdge, SkillMetric, TimePoint } from "@/lib/types";

const AXIS = { stroke: "rgba(255,255,255,0.16)", fontSize: 11, fontFamily: "var(--font-mono)" };
const GRID = "rgba(255,255,255,0.055)";

export const CLASS_COLOR: Record<MomentumClass, string> = {
  Exploding: "#ff8a3d",
  Growing: "#34e3b0",
  Stable: "#6aa8ff",
  Declining: "#ff6b7a",
  Emerging: "#ffc24b",
};

const PALETTE = ["#34e3b0", "#6aa8ff", "#b18cff", "#ffc24b", "#ff8a3d", "#5ee0d0", "#ff6b7a", "#8fb3ff", "#d7c26a", "#7dffd4"];

function TooltipBox({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-850/96 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined ? <div className="mb-1 text-[11.5px] font-semibold text-white">{label}</div> : null}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11.5px] text-mist-200">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color ?? p.payload?.fill ?? "#34e3b0" }} />
          <span className="text-mist-400">{p.name}</span>
          <span className="sp-num ml-auto font-semibold text-white">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Skill demand ─────────────────────────────────────────────────────────── */

export function SkillDemandChart({ skills, onSelect }: { skills: SkillMetric[]; onSelect?: (slug: string) => void }) {
  const data = skills.slice(0, 12).map((s) => ({
    name: s.name,
    slug: s.slug,
    demand: s.demandScore,
    frequency: s.frequency,
    classification: s.classification,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 27 + 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 6, bottom: 4 }} barCategoryGap={5}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tick={{ ...AXIS, fill: "#c7d0de", fontSize: 11.5, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
        <Bar dataKey="demand" name="Demand score" radius={[0, 5, 5, 0]} onClick={(d: any) => onSelect?.(d?.slug)}>
          {data.map((d) => (
            <Cell key={d.slug} fill={CLASS_COLOR[d.classification]} fillOpacity={0.86} cursor="pointer" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Demand over time ─────────────────────────────────────────────────────── */

export function DemandTimelineChart({ timeline }: { timeline: TimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={timeline} margin={{ left: -14, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34e3b0" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#34e3b0" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gEmerging" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc24b" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#ffc24b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#8b98ac" }} iconType="circle" iconSize={7} />
        <Area type="monotone" dataKey="demandIndex" name="Demand index" stroke="#34e3b0" strokeWidth={2} fill="url(#gDemand)" />
        <Area type="monotone" dataKey="emergingIndex" name="Emerging share %" stroke="#ffc24b" strokeWidth={1.8} fill="url(#gEmerging)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Growth vs demand scatter ─────────────────────────────────────────────── */

export function MomentumScatter({ skills }: { skills: SkillMetric[] }) {
  const data = skills.slice(0, 40).map((s) => ({
    x: Math.max(-100, Math.min(300, s.growthScore)),
    y: s.demandScore,
    z: s.frequency,
    name: s.name,
    slug: s.slug,
    classification: s.classification,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ left: -12, right: 14, top: 12, bottom: 4 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis
          type="number"
          dataKey="x"
          name="Growth %"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          label={{ value: "growth % (30d vs prior 60d)", position: "insideBottom", offset: -2, fill: "#6b7889", fontSize: 10.5 }}
        />
        <YAxis type="number" dataKey="y" name="Demand" tick={AXIS} axisLine={false} tickLine={false} width={42} domain={[0, 100]} />
        <ZAxis type="number" dataKey="z" range={[28, 260]} name="Mentions" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <div className="rounded-lg border border-white/10 bg-ink-850/96 px-3 py-2 text-[11.5px] shadow-xl">
                <div className="font-semibold text-white">{p.name}</div>
                <div className="mt-0.5 text-mist-400">
                  demand <span className="sp-num text-mist-50">{p.y}</span> · growth{" "}
                  <span className="sp-num text-mist-50">{p.x}%</span> · mentions{" "}
                  <span className="sp-num text-mist-50">{p.z}</span>
                </div>
                <div className="mt-1" style={{ color: CLASS_COLOR[p.classification as MomentumClass] }}>
                  {p.classification}
                </div>
              </div>
            );
          }}
        />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={CLASS_COLOR[d.classification]} fillOpacity={0.78} stroke={CLASS_COLOR[d.classification]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ── Roles & industries ───────────────────────────────────────────────────── */

export function RoleDonut({ roles }: { roles: RoleInsight[] }) {
  const data = roles.slice(0, 8).map((r) => ({ name: r.role, value: r.signalCount }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="rgba(5,7,12,0.9)" strokeWidth={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, lineHeight: "18px" }}
          formatter={(value: any) => <span style={{ color: "#c7d0de" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function IndustryBars({ industries }: { industries: { name: string; count: number; share: number }[] }) {
  const data = industries.slice(0, 9);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 26 + 24)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 26, top: 4, bottom: 4 }} barCategoryGap={5}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          tick={{ ...AXIS, fill: "#c7d0de", fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
        <Bar dataKey="count" name="Signals" radius={[0, 5, 5, 0]} fill="#6aa8ff" fillOpacity={0.82} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClassificationBars({ counts }: { counts: Record<MomentumClass, number> }) {
  const data = (Object.keys(counts) as MomentumClass[]).map((k) => ({ name: k, value: counts[k], fill: CLASS_COLOR[k] }));
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ left: -18, right: 6, top: 8, bottom: 0 }} barCategoryGap={14}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10.5 }} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
        <Bar dataKey="value" name="Skills" radius={[5, 5, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Co-occurrence heatmap (custom SVG, no chart lib needed) ──────────────── */

export function CooccurrenceHeatmap({ skills, edges }: { skills: SkillMetric[]; edges: SkillEdge[] }) {
  const nodes = skills.slice(0, 12);
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of edges) {
      m.set(`${e.skillA}|${e.skillB}`, e.support);
      m.set(`${e.skillB}|${e.skillA}`, e.support);
    }
    return m;
  }, [edges]);
  const max = Math.max(1, ...Array.from(lookup.values()));
  const cell = 34;
  const labelW = 118;
  const size = labelW + nodes.length * cell;

  return (
    <div className="overflow-x-auto">
      <svg width={size} height={size} className="min-w-[520px]">
        {nodes.map((n, i) => (
          <text
            key={`rl-${n.slug}`}
            x={labelW - 8}
            y={labelW / 2 + i * cell + cell / 2 + 4}
            textAnchor="end"
            fontSize={10.5}
            fill="#8b98ac"
          >
            {n.name.length > 18 ? `${n.name.slice(0, 17)}…` : n.name}
          </text>
        ))}
        {nodes.map((n, j) => (
          <text
            key={`cl-${n.slug}`}
            x={labelW + j * cell + cell / 2}
            y={labelW / 2 - 6}
            textAnchor="start"
            fontSize={10.5}
            fill="#8b98ac"
            transform={`rotate(-42 ${labelW + j * cell + cell / 2} ${labelW / 2 - 6})`}
          >
            {n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name}
          </text>
        ))}
        {nodes.map((row, i) =>
          nodes.map((col, j) => {
            const v = i === j ? 0 : lookup.get(`${row.slug}|${col.slug}`) ?? 0;
            const t = v / max;
            return (
              <rect
                key={`${row.slug}-${col.slug}`}
                x={labelW + j * cell}
                y={labelW / 2 + i * cell}
                width={cell - 2}
                height={cell - 2}
                rx={4}
                fill={i === j ? "rgba(255,255,255,0.045)" : `rgba(52,227,176,${0.06 + t * 0.85})`}
                stroke="rgba(255,255,255,0.04)"
              >
                <title>{i === j ? row.name : `${row.name} + ${col.name}: ${v} shared signals`}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}

/* ── Skill constellation (radial network) ─────────────────────────────────── */

export function SkillNetwork({ edges, skills }: { edges: SkillEdge[]; skills: SkillMetric[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const top = skills.slice(0, 16);
  const demand = new Map(top.map((s) => [s.slug, s]));
  const nodes = top.map((s, i) => {
    const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2;
    const radius = 128 - Math.min(40, s.demandScore * 0.35);
    return {
      slug: s.slug,
      name: s.name,
      x: 190 + Math.cos(angle) * radius,
      y: 170 + Math.sin(angle) * radius * 0.82,
      r: 5 + Math.min(13, s.demandScore / 7),
      color: CLASS_COLOR[s.classification],
    };
  });
  const pos = new Map(nodes.map((n) => [n.slug, n]));
  const links = edges
    .filter((e) => pos.has(e.skillA) && pos.has(e.skillB))
    .slice(0, 46)
    .map((e) => ({ a: pos.get(e.skillA)!, b: pos.get(e.skillB)!, e }));
  const maxLift = Math.max(1, ...links.map((l) => l.e.lift));

  return (
    <div className="relative">
      <svg viewBox="0 0 380 340" className="h-[340px] w-full">
        <defs>
          <radialGradient id="netCore">
            <stop offset="0%" stopColor="#34e3b0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34e3b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="190" cy="170" r="120" fill="url(#netCore)" />
        {links.map((l, i) => {
          const active = hover && (l.a.slug === hover || l.b.slug === hover);
          return (
            <line
              key={i}
              x1={l.a.x}
              y1={l.a.y}
              x2={l.b.x}
              y2={l.b.y}
              stroke={active ? "#7dffd4" : "rgba(140,170,220,0.28)"}
              strokeWidth={0.6 + (l.e.lift / maxLift) * 2.6}
              strokeOpacity={active ? 0.95 : 0.5}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.slug} onMouseEnter={() => setHover(n.slug)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fillOpacity={hover === n.slug ? 1 : 0.78} />
            <circle cx={n.x} cy={n.y} r={n.r + 4} fill="none" stroke={n.color} strokeOpacity={hover === n.slug ? 0.6 : 0.16} />
            <text
              x={n.x}
              y={n.y - n.r - 6}
              textAnchor="middle"
              fontSize={9.5}
              fill={hover === n.slug ? "#ffffff" : "#8b98ac"}
              style={{ pointerEvents: "none" }}
            >
              {n.name.length > 18 ? `${n.name.slice(0, 17)}…` : n.name}
            </text>
            <title>{`${n.name} — demand ${demand.get(n.slug)?.demandScore}/100`}</title>
          </g>
        ))}
      </svg>
      {hover ? (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-850/95 px-3 py-1.5 text-[11.5px] text-mist-200 shadow-xl">
          {pos.get(hover)?.name} · demand {demand.get(hover)?.demandScore}/100 ·{" "}
          {links.filter((l) => l.a.slug === hover || l.b.slug === hover).length} strong links
        </div>
      ) : null}
    </div>
  );
}

/* ── Sparkline (tiny inline trend) ────────────────────────────────────────── */

export function Sparkline({ values, color = "#34e3b0", height = 28 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${height - ((v - min) / span) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      <polyline points={`0,${height} ${pts} 100,${height}`} fill={color} fillOpacity={0.09} stroke="none" />
    </svg>
  );
}

/* ── Emerging tech bars ───────────────────────────────────────────────────── */

export function EmergingChart({ items }: { items: { name: string; demandScore: number; momentumScore: number }[] }) {
  const data = items.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }} barGap={2}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ ...AXIS, fill: "#c7d0de", fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
        <Bar dataKey="demandScore" name="Demand" radius={[0, 4, 4, 0]} fill="#6aa8ff" fillOpacity={0.85} />
        <Bar dataKey="momentumScore" name="Momentum" radius={[0, 4, 4, 0]} fill="#ffc24b" fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GrowthLineChart({ skills, timeline }: { skills: SkillMetric[]; timeline: TimePoint[] }) {
  const leaders = skills
    .filter((s) => s.classification === "Exploding" || s.classification === "Growing" || s.classification === "Emerging")
    .slice(0, 5);
  const used = leaders.length ? leaders : skills.slice(0, 5);
  void used;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={timeline} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gSignals" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6aa8ff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#6aa8ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={42} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="signals" name="Signals collected" stroke="#6aa8ff" strokeWidth={2} fill="url(#gSignals)" />
        <Line type="monotone" dataKey="demandIndex" name="Demand index" stroke="#34e3b0" strokeWidth={1.6} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
