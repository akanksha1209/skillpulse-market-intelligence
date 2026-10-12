"use client";

import type { ReactNode } from "react";
import type { MomentumClass } from "@/lib/types";

/* ── Layout primitives ────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`sp-card ${hover ? "sp-card-hover" : ""} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  right,
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/6 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-pulse-400">{icon}</span> : null}
          <h3 className="truncate text-[13.5px] font-semibold tracking-tight text-white">{title}</h3>
        </div>
        {subtitle ? <p className="mt-0.5 text-[11.5px] leading-snug text-mist-500">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <div className="sp-label mb-1">{kicker}</div> : null}
        <h2 className="text-[19px] font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Data display ─────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  unit,
  hint,
  accent = "pulse",
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  accent?: "pulse" | "volt" | "amber" | "coral" | "violet";
  icon?: ReactNode;
}) {
  const colors: Record<string, string> = {
    pulse: "text-pulse-400",
    volt: "text-volt-400",
    amber: "text-amber-signal",
    coral: "text-coral-signal",
    violet: "text-violet-signal",
  };
  return (
    <div className="sp-card sp-card-hover px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="sp-label">{label}</span>
        {icon ? <span className={colors[accent]}>{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`sp-num text-[26px] font-semibold leading-none ${colors[accent]}`}>{value}</span>
        {unit ? <span className="text-[11.5px] text-mist-500">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-mist-500">{hint}</p> : null}
    </div>
  );
}

export const MOMENTUM_STYLE: Record<MomentumClass, { icon: string; className: string; label: string }> = {
  Exploding: { icon: "🔥", className: "border-flame-signal/40 bg-flame-signal/12 text-flame-signal", label: "Exploding" },
  Growing: { icon: "📈", className: "border-pulse-400/40 bg-pulse-400/12 text-pulse-300", label: "Growing" },
  Stable: { icon: "➡️", className: "border-volt-400/35 bg-volt-400/10 text-volt-400", label: "Stable" },
  Declining: { icon: "📉", className: "border-coral-signal/40 bg-coral-signal/12 text-coral-signal", label: "Declining" },
  Emerging: { icon: "⚠️", className: "border-amber-signal/40 bg-amber-signal/12 text-amber-signal", label: "Emerging" },
};

export function MomentumBadge({ value, small = false }: { value: MomentumClass; small?: boolean }) {
  const s = MOMENTUM_STYLE[value] ?? MOMENTUM_STYLE.Stable;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${s.className} ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "pulse" | "volt" | "amber" | "coral" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 bg-white/5 text-mist-200",
    pulse: "border-pulse-400/35 bg-pulse-400/10 text-pulse-300",
    volt: "border-volt-400/35 bg-volt-400/10 text-volt-400",
    amber: "border-amber-signal/35 bg-amber-signal/10 text-amber-signal",
    coral: "border-coral-signal/35 bg-coral-signal/10 text-coral-signal",
    violet: "border-violet-signal/35 bg-violet-signal/10 text-violet-signal",
  };
  return <span className={`sp-chip border ${tones[tone]} ${className}`}>{children}</span>;
}

export function Meter({
  value,
  max = 100,
  tone = "pulse",
  label,
}: {
  value: number;
  max?: number;
  tone?: "pulse" | "volt" | "amber" | "coral" | "violet";
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fills: Record<string, string> = {
    pulse: "linear-gradient(90deg,#16c795,#7dffd4)",
    volt: "linear-gradient(90deg,#3d7dff,#8fc0ff)",
    amber: "linear-gradient(90deg,#e0a020,#ffd88a)",
    coral: "linear-gradient(90deg,#e04a5c,#ff9aa5)",
    violet: "linear-gradient(90deg,#7d5ce0,#c9b3ff)",
  };
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] text-mist-500">
          <span>{label}</span>
          <span className="sp-num text-mist-200">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: fills[tone] }}
        />
      </div>
    </div>
  );
}

export function ScoreDial({
  value,
  size = 92,
  label,
  tone = "#34e3b0",
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: string;
}) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="sp-num text-[19px] font-semibold text-white">{Math.round(pct)}</span>
        {label ? <span className="sp-label mt-0.5 text-[9px]">{label}</span> : null}
      </div>
    </div>
  );
}

export function ProvenanceTag({ kind }: { kind: "observed" | "calculated" | "ai" }) {
  const map = {
    observed: { tone: "pulse" as const, text: "OBSERVED DATA" },
    calculated: { tone: "volt" as const, text: "CALCULATED METRIC" },
    ai: { tone: "violet" as const, text: "AI INTERPRETATION" },
  };
  const m = map[kind];
  return <Badge tone={m.tone}>{m.text}</Badge>;
}

/* ── Feedback states ──────────────────────────────────────────────────────── */

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="sp-spin inline-block rounded-full border-2 border-white/20 border-t-pulse-400"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`sp-skeleton ${className}`} />;
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="sp-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/4 text-pulse-400">
        {icon ?? <IconPulse className="h-6 w-6" />}
      </div>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-mist-500">{message}</p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="sp-card border-coral-signal/30 bg-coral-signal/6 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-coral-signal">
          <IconAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-white">Something went wrong</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">{message}</p>
        </div>
        {onRetry ? (
          <button className="sp-btn sp-btn-ghost shrink-0 !px-3 !py-1.5 text-[12px]" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function NoteList({ notes }: { notes: string[] }) {
  if (!notes?.length) return null;
  return (
    <ul className="space-y-1">
      {notes.map((n, i) => (
        <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-mist-400">
          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-amber-signal" />
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Inline SVG icon set (no external icon dependency) ────────────────────── */

type IconProps = { className?: string };
const base = "h-4 w-4";

export function IconPulse({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h4l2.5-7 4 14L15.5 12H22" />
    </svg>
  );
}
export function IconSearch({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}
export function IconGrid({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
export function IconSpark({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}
export function IconUsers({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3 2.9-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6.3M17.6 15.2c2 .5 3.3 2 3.7 4.3" />
    </svg>
  );
}
export function IconTarget({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
export function IconRoute({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <path d="M8.6 6H14a3.4 3.4 0 0 1 0 6.8h-4A3.4 3.4 0 0 0 10 18h5.4" />
    </svg>
  );
}
export function IconClock({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}
export function IconDownload({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}
export function IconAlert({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
export function IconNetwork({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M12 7.2 6.2 16M12 7.2 17.8 16M7.2 18h9.6" />
    </svg>
  );
}
export function IconLayers({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3.5 12.5 8.5 4.7 8.5-4.7" />
    </svg>
  );
}
export function IconBuilding({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="9" height="16" rx="1.4" />
      <rect x="15" y="9" width="5" height="11" rx="1.2" />
      <path d="M7 8h3M7 12h3M7 16h3" />
    </svg>
  );
}
