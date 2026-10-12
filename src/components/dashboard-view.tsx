"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarket } from "@/hooks/use-market";
import { DEMO_QUERIES } from "@/lib/data/demo";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IconBuilding,
  IconLayers,
  IconNetwork,
  IconPulse,
  IconSearch,
  IconSpark,
  IconTarget,
  IconUsers,
  Meter,
  MomentumBadge,
  NoteList,
  ScoreDial,
  Skeleton,
  Spinner,
  Stat,
} from "@/components/ui";
import {
  ClassificationBars,
  DemandTimelineChart,
  EmergingChart,
  IndustryBars,
  MomentumScatter,
  RoleDonut,
  SkillDemandChart,
  Sparkline,
} from "@/components/charts";
import { CooccurrencePanel } from "@/components/cooccurrence-panel";
import { InsightPanel } from "@/components/insight-panel";
import { SignalTable } from "@/components/signal-table";
import { ExportMenu } from "@/components/export-menu";

export function DashboardView() {
  const { analysis, loading, error, lastAction, runSearch, runDemo, refresh } = useMarket();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      await runSearch(q.trim(), "India");
    } catch {
      /* store holds the error */
    } finally {
      setBusy(false);
    }
  }

  async function demo(query?: string) {
    setBusy(true);
    try {
      await runDemo(query);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="sp-card relative overflow-hidden px-5 py-7 sm:px-7 sm:py-9">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-pulse-400/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-volt-500/10 blur-3xl" />
        <div className="relative">
          <div className="sp-label mb-3 flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5 text-pulse-400">
              <span className="sp-pulse-dot absolute inset-0 rounded-full" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-pulse-400" />
            </span>
            Market Signal Intelligence
          </div>
          <h1 className="max-w-3xl text-[26px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[34px]">
            Understand what the market wants{" "}
            <span className="bg-gradient-to-r from-pulse-300 via-pulse-400 to-volt-400 bg-clip-text text-transparent">
              before you decide what to learn.
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-mist-400">
            SkillPulse converts live market signals into actionable career intelligence — skill demand scores,
            momentum classification, co-occurrence pairs, role analytics, gap analysis and a 30-day roadmap.
          </p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a role, technology, industry or market — e.g. Generative AI, Cybersecurity, Data Analyst"
                className="sp-input !py-3 !pl-10 text-[13.5px]"
                aria-label="Search a role, technology, industry or market"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !q.trim()} className="sp-btn sp-btn-primary !px-5">
                {busy ? <Spinner size={13} /> : <IconPulse className="h-4 w-4" />}
                Analyze market
              </button>
              <button type="button" onClick={() => demo()} disabled={busy} className="sp-btn sp-btn-ghost !px-4">
                <IconSpark className="h-4 w-4 text-amber-signal" /> Try Demo
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="sp-label mr-1">Try:</span>
            {DEMO_QUERIES.slice(0, 6).map((query) => (
              <button key={query} onClick={() => demo(query)} disabled={busy} className="sp-chip transition-colors hover:border-pulse-400/40 hover:text-white">
                {query}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && !analysis ? <ErrorState message={error} onRetry={() => refresh(true)} /> : null}
      {error && analysis ? (
        <div className="text-[12px] text-amber-signal">{error}</div>
      ) : null}

      {loading && !analysis ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[86px]" />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-[320px] lg:col-span-2" />
            <Skeleton className="h-[320px]" />
          </div>
          <p className="text-center text-[12px] text-mist-500">{lastAction ?? "Collecting and analysing market signals…"}</p>
        </div>
      ) : null}

      {!loading && !analysis ? (
        <EmptyState
          title="No market analysis yet"
          message="Run a search above to collect live signals through SerpAPI, or load the synthetic demo dataset to explore every feature immediately — no API keys required."
          action={
            <>
              <button onClick={() => demo("Generative AI Engineer India")} className="sp-btn sp-btn-primary">
                <IconSpark className="h-4 w-4" /> Load demo dataset
              </button>
              <Link href="/search" className="sp-btn sp-btn-ghost">
                Open market search
              </Link>
            </>
          }
        />
      ) : null}

      {analysis ? <AnalysisBody key={analysis.id} /> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

function AnalysisBody() {
  const { analysis } = useMarket();
  if (!analysis) return null;
  const a = analysis;
  const topRole = a.roles[0];

  return (
    <div className="space-y-5 sp-rise">
      {/* Provenance strip */}
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="sp-label text-[9.5px]">Current analysis</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-white">"{a.query}"</span>
              <Badge tone="neutral">{a.location}</Badge>
              {a.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : <Badge tone="pulse">{a.source.toUpperCase()}</Badge>}
              {a.status === "partial" ? <Badge tone="amber">PARTIAL</Badge> : null}
              <span className="sp-num text-[11px] text-mist-500">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ExportMenu analysisId={a.id} />
            <Link href="/gap" className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]">
              <IconTarget className="h-3.5 w-3.5" /> My skill gap
            </Link>
          </div>
        </div>
        {a.notes.length ? (
          <div className="mt-2.5 border-t border-white/6 pt-2.5">
            <NoteList notes={a.notes} />
          </div>
        ) : null}
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Signals analyzed"
          value={a.overview.totalSignals}
          hint={`${a.overview.uniqueSkills} distinct skills · ${a.overview.avgSkillsPerSignal} skills/posting`}
          icon={<IconLayers className="h-4 w-4" />}
        />
        <Stat
          label="Market score"
          value={a.overview.marketScore}
          unit="/100"
          accent={a.overview.marketScore >= 60 ? "pulse" : a.overview.marketScore >= 40 ? "volt" : "amber"}
          hint="Blend of top-skill demand, volume, freshness and employer diversity"
          icon={<IconPulse className="h-4 w-4" />}
        />
        <Stat
          label="Momentum"
          value={a.overview.momentumScore}
          unit="/100"
          accent={a.overview.momentumScore >= 55 ? "pulse" : a.overview.momentumScore >= 45 ? "volt" : "coral"}
          hint="50 = flat. Computed from 30d vs prior-60d mention rates"
          icon={<IconSpark className="h-4 w-4" />}
        />
        <Stat
          label="Employers"
          value={a.overview.uniqueCompanies}
          hint={`${a.overview.uniqueIndustries} industries · ${a.overview.uniqueRoles} roles detected`}
          accent="violet"
          icon={<IconBuilding className="h-4 w-4" />}
        />
      </div>

      {/* Demand + classification */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Most demanded skills"
            subtitle="Demand score: 35% frequency · 20% role diversity · 10% company diversity · 10% source breadth · 10% recency · 15% growth"
            right={<Link href="/skills" className="sp-btn sp-btn-ghost !py-1 text-[11px]">All skills →</Link>}
          />
          <div className="p-3">
            <SkillDemandChart skills={a.skills} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Market pulse" subtitle="Two composite indices for this slice" />
            <div className="flex items-center justify-around px-4 py-5">
              <ScoreDial value={a.overview.marketScore} label="Demand" tone="#34e3b0" />
              <ScoreDial
                value={a.overview.momentumScore}
                label="Momentum"
                tone={a.overview.momentumScore >= 50 ? "#6aa8ff" : "#ff6b7a"}
              />
            </div>
            <div className="border-t border-white/6 px-4 py-3">
              <div className="sp-label mb-2 text-[9.5px]">Signal volume · last 13 weeks</div>
              <Sparkline values={a.timeline.map((t) => t.signals)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Momentum mix" subtitle="How the detected skills classify" />
            <div className="p-3">
              <ClassificationBars counts={a.classificationCounts} />
            </div>
          </Card>
        </div>
      </div>

      {/* Timeline + scatter */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Demand over time"
            subtitle="Observed publication dates of the collected signals — no synthetic history"
            right={<Badge tone="pulse">OBSERVED</Badge>}
          />
          <div className="p-3">
            <DemandTimelineChart timeline={a.timeline} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Growth vs demand"
            subtitle="Top-right = high demand and still accelerating. Bubble size = mention count."
            right={<Badge tone="volt">CALCULATED</Badge>}
          />
          <div className="p-3">
            <MomentumScatter skills={a.skills} />
          </div>
        </Card>
      </div>

      {/* Emerging + roles + industries */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Emerging technologies" subtitle="New-generation skills with rising mention rates" right={<Badge tone="amber">⚠ EMERGING</Badge>} />
          <div className="p-3">
            {a.emerging.length ? <EmergingChart items={a.emerging} /> : <p className="py-10 text-center text-[12.5px] text-mist-500">No emerging skill cleared the frequency threshold.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Role distribution" subtitle="Which roles are hiring in this market slice" right={<Link href="/roles" className="sp-btn sp-btn-ghost !py-1 text-[11px]">Role intel →</Link>} />
          <div className="p-3">
            {a.roles.length ? <RoleDonut roles={a.roles} /> : <p className="py-10 text-center text-[12.5px] text-mist-500">No roles detected.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Industries hiring" subtitle="Share of collected signals by industry" />
          <div className="p-3">
            <IndustryBars industries={a.industries} />
          </div>
        </Card>
      </div>

      {/* Co-occurrence */}
      <CooccurrencePanel skills={a.skills} edges={a.edges} />

      {/* Roles cards */}
      <Card>
        <CardHeader
          title="Role intelligence"
          subtitle="Required skills, emerging skills, industries and employers per role"
          icon={<IconUsers className="h-4 w-4" />}
          right={<Link href="/roles" className="sp-btn sp-btn-ghost !py-1 text-[11px]">Open all roles →</Link>}
        />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {a.roles.slice(0, 6).map((r) => (
            <Link
              key={r.role}
              href={`/roles?role=${encodeURIComponent(r.role)}`}
              className="sp-card sp-card-hover p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-[13.5px] font-semibold text-white">{r.role}</h4>
                  <p className="sp-num mt-0.5 text-[11px] text-mist-500">
                    {r.signalCount} signals · {r.share}% of sample
                  </p>
                </div>
                <div className="text-right">
                  <div className="sp-num text-[17px] font-semibold text-pulse-300">{r.demandScore}</div>
                  <div className="sp-label text-[8.5px]">demand</div>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {r.topSkills.slice(0, 5).map((s) => (
                  <span key={s.slug} className="sp-chip !px-2 !py-0.5 !text-[10.5px]">{s.name}</span>
                ))}
              </div>
              {r.emergingSkills.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.emergingSkills.slice(0, 3).map((s) => (
                    <span key={s.slug} className="sp-chip !border-amber-signal/30 !bg-amber-signal/8 !px-2 !py-0.5 !text-[10.5px] !text-amber-signal">
                      ⚠ {s.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {r.salary.avg ? (
                <div className="sp-num mt-2.5 text-[11px] text-mist-400">
                  ₹{r.salary.min}–{r.salary.max} LPA · avg ₹{r.salary.avg}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </Card>

      {/* Companies */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Top employers" subtitle="Companies appearing most often in the collected signals" icon={<IconBuilding className="h-4 w-4" />} />
          <div className="max-h-[320px] overflow-auto p-0">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Industry</th>
                  <th className="text-right">Signals</th>
                  <th className="w-[34%]">Share</th>
                </tr>
              </thead>
              <tbody>
                {a.companies.map((c) => (
                  <tr key={c.name}>
                    <td className="font-medium text-white">{c.name}</td>
                    <td className="text-[12px]">{c.industries[0] ?? "—"}</td>
                    <td className="sp-num text-right">{c.count}</td>
                    <td><Meter value={c.share} max={Math.max(...a.companies.map((x) => x.share), 1)} tone="volt" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Fastest movers" subtitle="Highest growth in the last 30 days vs prior 60" icon={<IconSpark className="h-4 w-4" />} />
          <div className="divide-y divide-white/5">
            {a.skills
              .slice()
              .sort((x, y) => y.growthScore - x.growthScore)
              .slice(0, 8)
              .map((s) => (
                <Link key={s.slug} href={`/skills?skill=${s.slug}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-white">{s.name}</div>
                    <div className="sp-num text-[10.5px] text-mist-500">
                      {s.recentWindow} recent · {s.priorWindow} prior
                    </div>
                  </div>
                  <span className={`sp-num text-[12.5px] font-semibold ${s.growthScore >= 0 ? "text-pulse-300" : "text-coral-signal"}`}>
                    {s.growthScore >= 0 ? "+" : ""}
                    {s.growthScore}%
                  </span>
                  <MomentumBadge value={s.classification} small />
                </Link>
              ))}
          </div>
        </Card>
      </div>

      {/* AI report */}
      <InsightPanel analysis={a} />

      {/* Raw signals */}
      <Card>
        <CardHeader
          title="Collected signals"
          subtitle={
            a.isDemo
              ? "Synthetic demo records — each one is generated text that the real skill extractor parses."
              : "Normalised SerpAPI results. Raw search output is never shown; every row is a structured market signal."
          }
          icon={<IconNetwork className="h-4 w-4" />}
          right={<Badge tone={a.isDemo ? "amber" : "pulse"}>{a.isDemo ? "DEMO" : a.source.toUpperCase()}</Badge>}
        />
        <div className="p-4">
          <SignalTable signals={a.signals ?? []} />
        </div>
      </Card>

      {/* Methodology */}
      <Card className="px-4 py-4">
        <div className="sp-label mb-2">How the numbers are produced</div>
        <div className="grid gap-4 text-[12px] leading-relaxed text-mist-400 md:grid-cols-3">
          <div>
            <p className="mb-1 font-semibold text-white">Skill demand score</p>
            <p>
              Weighted blend of observed evidence: frequency (35), role diversity (20), company diversity (10), source
              breadth (10), recency (10), growth (15). Each skill's point breakdown is shown on the Skills page.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-white">Market momentum</p>
            <p>
              Mention rate in the last 30 days vs the prior 60 days, squashed through tanh onto a 0–100 index where 50
              is flat. Classification thresholds are published in the export document.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-white">Honest labelling</p>
            <p>
              Live SerpAPI data, cached data and synthetic demo data are always labelled. Report sections carry an
              OBSERVED / CALCULATED / AI provenance tag so interpretation is never mistaken for measurement.
            </p>
          </div>
        </div>
        {topRole ? (
          <p className="mt-3 border-t border-white/6 pt-3 text-[11.5px] text-mist-500">
            Strongest role in this slice: <span className="text-white">{topRole.role}</span> ({topRole.share}% of
            signals) — top skills {topRole.topSkills.slice(0, 4).map((s) => s.name).join(", ")}.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
