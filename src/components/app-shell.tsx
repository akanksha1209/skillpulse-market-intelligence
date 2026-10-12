"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMarket, useSystemStatus } from "@/hooks/use-market";
import { Badge, IconClock, IconGrid, IconPulse, IconRoute, IconSearch, IconSpark, IconTarget, IconUsers, Spinner } from "@/components/ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: IconGrid, hint: "Market overview" },
  { href: "/search", label: "Market Search", icon: IconSearch, hint: "Collect signals" },
  { href: "/skills", label: "Skills", icon: IconSpark, hint: "Demand & momentum" },
  { href: "/roles", label: "Roles", icon: IconUsers, hint: "Role intelligence" },
  { href: "/gap", label: "Skill Gap", icon: IconTarget, hint: "Your readiness" },
  { href: "/roadmap", label: "Roadmap", icon: IconRoute, hint: "30-day plan" },
  { href: "/history", label: "History", icon: IconClock, hint: "Stored analyses" },
];

function BrandMark() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-pulse-400/30 bg-gradient-to-br from-pulse-400/25 to-volt-500/15">
      <IconPulse className="h-4.5 w-4.5 text-pulse-300" />
    </span>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
              active ? "bg-white/7 text-white" : "text-mist-400 hover:bg-white/4 hover:text-mist-50"
            }`}
          >
            {active ? <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r bg-pulse-400" /> : null}
            <Icon className={`h-4 w-4 ${active ? "text-pulse-400" : "text-mist-500 group-hover:text-mist-200"}`} />
            <span className="flex-1 font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SourcePill() {
  const { analysis, loading } = useMarket();
  const status = useSystemStatus();

  if (!analysis) {
    return <Badge tone={status?.serpapi?.configured ? "pulse" : "amber"}>{status?.serpapi?.configured ? "LIVE READY" : "DEMO MODE"}</Badge>;
  }
  if (analysis.isDemo || analysis.source === "demo") return <Badge tone="amber">DEMO DATA</Badge>;
  if (analysis.source === "cache") return <Badge tone="volt">CACHED</Badge>;
  return (
    <Badge tone="pulse">
      <span className="relative mr-0.5 inline-flex h-1.5 w-1.5 text-pulse-300">
        <span className="sp-pulse-dot absolute inset-0 rounded-full" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-pulse-300" />
      </span>
      LIVE · SERPAPI
      {loading ? <Spinner size={10} /> : null}
    </Badge>
  );
}

function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { runSearch, analysis } = useMarket();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (analysis?.query) setQ(analysis.query);
  }, [analysis?.id, analysis?.query]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    try {
      await runSearch(query, "India");
      onNavigate?.();
      router.push("/");
      router.refresh();
    } catch {
      /* error surfaces through the store */
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
        <IconSearch className="h-4 w-4" />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a role, technology, industry or market…"
        className="sp-input !pl-9 !py-2 text-[13px]"
        aria-label="Market search"
      />
      <button
        type="submit"
        disabled={busy || !q.trim()}
        className="sp-btn sp-btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 !px-3 !py-1.5 text-[12px]"
      >
        {busy ? <Spinner size={12} /> : "Analyze"}
      </button>
    </form>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { runDemo, loading } = useMarket();
  const router = useRouter();
  const status = useSystemStatus();

  async function tryDemo() {
    await runDemo("Generative AI Engineer India");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* Sidebar – desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-white/6 bg-ink-950/85 px-3.5 py-4 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-1.5">
          <BrandMark />
          <span className="leading-tight">
            <span className="block text-[14.5px] font-semibold tracking-tight text-white">SkillPulse</span>
            <span className="sp-label block text-[9px]">Market Signal Intelligence</span>
          </span>
        </Link>

        <NavList />

        <div className="mt-auto space-y-2.5">
          <button onClick={tryDemo} disabled={loading} className="sp-btn sp-btn-ghost w-full text-[12.5px]">
            {loading ? <Spinner size={12} /> : <IconSpark className="h-3.5 w-3.5 text-pulse-400" />}
            Try Demo
          </button>
          <div className="sp-card px-3 py-2.5">
            <div className="sp-label mb-1.5 text-[9px]">Runtime</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-mist-500">SerpAPI</span>
                <span className={status?.serpapi?.configured ? "text-pulse-300" : "text-amber-signal"}>
                  {status?.serpapi?.configured ? "key set" : "no key"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">LLM</span>
                <span className={status?.llm?.configured ? "text-pulse-300" : "text-amber-signal"}>
                  {status?.llm?.configured ? status.llm.model : "heuristic"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist-500">Database</span>
                <span className={status?.database ? "text-pulse-300" : "text-coral-signal"}>{status?.database ? "online" : "offline"}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/6 bg-ink-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="sp-btn sp-btn-ghost !px-2.5 !py-2"
          aria-label="Open navigation"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="text-[14px] font-semibold tracking-tight text-white">SkillPulse</span>
        </Link>
        <div className="ml-auto">
          <SourcePill />
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-white/8 bg-ink-900 px-3.5 py-4 sp-rise">
            <div className="mb-5 flex items-center justify-between px-1.5">
              <span className="flex items-center gap-2">
                <BrandMark />
                <span className="text-[14px] font-semibold text-white">SkillPulse</span>
              </span>
              <button onClick={() => setOpen(false)} className="sp-btn sp-btn-ghost !px-2 !py-1" aria-label="Close">
                ✕
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <button onClick={() => { setOpen(false); void tryDemo(); }} className="sp-btn sp-btn-ghost mt-5 w-full text-[12.5px]">
              <IconSpark className="h-3.5 w-3.5 text-pulse-400" /> Try Demo
            </button>
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="lg:pl-[228px]">
        <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-white/6 bg-ink-950/80 px-5 py-2.5 backdrop-blur-xl lg:flex">
          <div className="flex min-w-0 max-w-2xl flex-1 items-center gap-3">
            <GlobalSearch />
          </div>
          <SourcePill />
        </div>
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-5 lg:px-6">{children}</main>
        <footer className="border-t border-white/6 px-5 py-5 text-[11.5px] text-mist-500">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>
              SkillPulse · market signals are extracted from SerpAPI results when a key is present, otherwise from a
              clearly-labelled synthetic dataset.
            </span>
            <span className="sp-num">v1.0.0 · FastAPI-equivalent REST layer on Next.js</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
