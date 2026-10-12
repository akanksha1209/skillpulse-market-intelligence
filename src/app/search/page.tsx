"use client";

import { useState } from "react";
import Link from "next/link";
import { useMarket } from "@/hooks/use-market";
import { DEMO_QUERIES } from "@/lib/data/demo";
import { LOCATION_POOL } from "@/lib/taxonomy";
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  IconLayers,
  IconPulse,
  IconSearch,
  IconSpark,
  Meter,
  MomentumBadge,
  NoteList,
  SectionTitle,
  Spinner,
  Stat,
} from "@/components/ui";
import { SignalTable } from "@/components/signal-table";
import { ExportMenu } from "@/components/export-menu";

export default function SearchPage() {
  const { analysis, loading, error, runSearch, runDemo, lastAction } = useMarket();
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("India");
  const [mode, setMode] = useState<"auto" | "demo">("auto");
  const [busy, setBusy] = useState(false);

  async function go(query: string, forceDemo: boolean) {
    if (!query.trim() || busy) return;
    setBusy(true);
    try {
      if (forceDemo || mode === "demo") await runDemo(query);
      else await runSearch(query, location);
    } catch {
      /* handled by store */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Collect" title="Market Search">
        <div className="flex items-center gap-2">
          {analysis ? <ExportMenu analysisId={analysis.id} /> : null}
          <Link href="/history" className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]">Search history →</Link>
        </div>
      </SectionTitle>

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void go(q, false);
          }}
          className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a role, technology, industry or market"
              className="sp-input !py-3 !pl-10"
              aria-label="Market query"
            />
          </div>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="sp-input !py-3 text-[13px]"
            aria-label="Location"
          >
            {["India", "Bengaluru, India", "Remote – India", "United States", "United Kingdom", "Singapore", "Global"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button type="submit" disabled={busy || !q.trim()} className="sp-btn sp-btn-primary !px-5">
            {busy ? <Spinner size={13} /> : <IconPulse className="h-4 w-4" />} Collect &amp; analyze
          </button>
          <button
            type="button"
            onClick={() => go(q.trim() || DEMO_QUERIES[0], true)}
            disabled={busy}
            className="sp-btn sp-btn-ghost !px-4"
          >
            <IconSpark className="h-4 w-4 text-amber-signal" /> Run on demo data
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="sp-label">Suggested:</span>
          {DEMO_QUERIES.map((query) => (
            <button key={query} onClick={() => { setQ(query); void go(query, false); }} disabled={busy} className="sp-chip hover:border-pulse-400/40 hover:text-white">
              {query}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/6 pt-3">
          <div className="flex items-center gap-2">
            <span className="sp-label">Source strategy</span>
            <div className="flex gap-1 rounded-lg border border-white/8 bg-white/3 p-0.5">
              {(["auto", "demo"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium capitalize ${
                    mode === m ? "bg-pulse-400/16 text-pulse-300" : "text-mist-500 hover:text-mist-200"
                  }`}
                >
                  {m === "auto" ? "SerpAPI → cache → demo" : "demo only"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed text-mist-500">
            Auto mode queries SerpAPI's <span className="sp-num text-mist-300">google_jobs</span> +{" "}
            <span className="sp-num text-mist-300">google</span> engines, then falls back to previously cached signals,
            then to the labelled synthetic dataset. The app never blocks on a missing key.
          </p>
        </div>
      </Card>

      {busy ? (
        <Card className="flex items-center gap-3 px-4 py-6 text-[12.5px] text-mist-400">
          <Spinner size={15} /> {lastAction ?? "Collecting signals…"}
        </Card>
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {analysis ? (
        <>
          <Card className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-semibold text-white">"{analysis.query}"</span>
              <Badge tone="neutral">{analysis.location}</Badge>
              {analysis.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : <Badge tone="pulse">{analysis.source.toUpperCase()}</Badge>}
              {analysis.status === "partial" ? <Badge tone="amber">PARTIAL SAMPLE</Badge> : null}
              <span className="sp-num ml-auto text-[11px] text-mist-500">id {analysis.id}</span>
            </div>
            {analysis.notes.length ? (
              <div className="mt-2 border-t border-white/6 pt-2">
                <NoteList notes={analysis.notes} />
              </div>
            ) : null}
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Raw results" value={analysis.overview.totalSignals} hint="Signals that contained at least one recognisable skill" icon={<IconLayers className="h-4 w-4" />} />
            <Stat label="Skills detected" value={analysis.overview.uniqueSkills} hint={`Avg ${analysis.overview.avgSkillsPerSignal} skills per signal`} accent="volt" />
            <Stat label="Employers" value={analysis.overview.uniqueCompanies} hint={`${analysis.industries.length} industries represented`} accent="violet" />
            <Stat
              label="Freshness"
              value={analysis.overview.freshnessDays}
              unit="days avg"
              accent="amber"
              hint="Mean age of the collected signals"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top skills in this collection" subtitle="Click a row for the full score breakdown" />
              <div className="divide-y divide-white/5">
                {analysis.skills.slice(0, 10).map((s) => (
                  <Link key={s.slug} href={`/skills?skill=${s.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-white">{s.name}</div>
                      <div className="mt-1"><Meter value={s.demandScore} tone="pulse" /></div>
                    </div>
                    <span className="sp-num w-9 text-right text-[12.5px] text-pulse-300">{s.demandScore}</span>
                    <MomentumBadge value={s.classification} small />
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Roles & employers detected" subtitle="Directly from the collected signals" />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <div>
                  <div className="sp-label mb-2 text-[9.5px]">Roles</div>
                  <ul className="space-y-1.5">
                    {analysis.roles.slice(0, 8).map((r) => (
                      <li key={r.role} className="flex items-center justify-between gap-2 text-[12px]">
                        <Link href={`/roles?role=${encodeURIComponent(r.role)}`} className="truncate text-mist-200 hover:text-pulse-300">{r.role}</Link>
                        <span className="sp-num shrink-0 text-mist-500">{r.signalCount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="sp-label mb-2 text-[9.5px]">Employers</div>
                  <ul className="space-y-1.5">
                    {analysis.companies.slice(0, 8).map((c) => (
                      <li key={c.name} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="truncate text-mist-200">{c.name}</span>
                        <span className="sp-num shrink-0 text-mist-500">{c.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Signal explorer"
              subtitle="Filter the collected market signals by role, industry, company, location or skill"
              right={<Badge tone={analysis.isDemo ? "amber" : "pulse"}>{analysis.isDemo ? "DEMO" : analysis.source.toUpperCase()}</Badge>}
            />
            <div className="p-4">
              <SignalTable signals={analysis.signals ?? []} loading={loading} />
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Link href="/" className="sp-btn sp-btn-ghost">← Dashboard</Link>
            <Link href="/gap" className="sp-btn sp-btn-primary">Analyze my skill gap →</Link>
          </div>
        </>
      ) : null}

      {!analysis && !busy ? (
        <Card className="px-5 py-10 text-center">
          <h3 className="text-[15px] font-semibold text-white">Ready when you are</h3>
          <p className="mx-auto mt-2 max-w-xl text-[12.5px] leading-relaxed text-mist-500">
            Enter a market query to collect signals. Results are normalised, skills extracted, scored and stored so you
            can re-open the analysis later from History. Without a SerpAPI key the demo dataset is used automatically
            and clearly labelled.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => go("AI Engineer India", true)} className="sp-btn sp-btn-primary">
              <IconSpark className="h-4 w-4" /> Try Demo
            </button>
            <Link href="/" className="sp-btn sp-btn-ghost">Go to dashboard</Link>
          </div>
        </Card>
      ) : null}

      <div className="text-[11px] text-mist-500">
        Locations used for demo enrichment: {LOCATION_POOL.slice(0, 4).join(" · ")} …
      </div>
    </div>
  );
}
