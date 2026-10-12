"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useMarket } from "@/hooks/use-market";
import type { SkillMetric } from "@/lib/types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IconSpark,
  Meter,
  MomentumBadge,
  SectionTitle,
  Skeleton,
  Spinner,
} from "@/components/ui";
import { CLASS_COLOR, MomentumScatter } from "@/components/charts";

export const dynamic = "force-dynamic";

function SkillsInner() {
  const searchParams = useSearchParams();
  const { analysis } = useMarket();
  const [skills, setSkills] = useState<SkillMetric[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [classification, setClassification] = useState("all");
  const [selected, setSelected] = useState<string | null>(searchParams.get("skill"));
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.skills({ limit: "200" });
        if (!alive) return;
        setSkills(res.skills ?? []);
        setCategories(res.categories ?? []);
        setError(null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [analysis?.id]);

  useEffect(() => {
    const slug = searchParams.get("skill");
    if (slug) setSelected(slug);
  }, [searchParams]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    api
      .skill(selected)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetail(null))
      .finally(() => alive && setDetailLoading(false));
    return () => {
      alive = false;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return skills.filter((s) => {
      if (needle && !`${s.name} ${s.slug}`.toLowerCase().includes(needle)) return false;
      if (category !== "all" && s.category !== category) return false;
      if (classification !== "all" && s.classification !== classification) return false;
      return true;
    });
  }, [skills, q, category, classification]);

  const selectClass =
    "rounded-lg border border-white/10 bg-ink-950/70 px-2.5 py-1.5 text-[12px] text-mist-200 outline-none focus:border-pulse-400/50";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-[420px] lg:col-span-2" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  if (!skills.length) {
    return (
      <div className="space-y-4">
        <SectionTitle kicker="Demand engine" title="Skills" />
        {error ? <ErrorState message={error} /> : null}
        <EmptyState
          title="No skills to rank yet"
          message="Run a market search or load the demo dataset — skills are extracted from the collected signals and scored here."
          action={<Link href="/search" className="sp-btn sp-btn-primary">Open market search</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Demand engine" title={`Skills · ${skills.length} ranked`}>
        <div className="flex items-center gap-2">
          {analysis?.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : analysis ? <Badge tone="pulse">{analysis.source.toUpperCase()}</Badge> : null}
          <Link href="/gap" className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]">Check my gap →</Link>
        </div>
      </SectionTitle>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Skill demand & momentum"
            subtitle="Scores are computed from the collected signals of the current analysis"
            right={
              <span className="sp-num text-[11px] text-mist-500">
                {filtered.length} shown
              </span>
            }
          />
          <div className="flex flex-wrap items-center gap-2 border-b border-white/6 px-4 py-2.5">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter skills…" className="sp-input !w-52 !py-1.5 text-[12px]" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="all">All categories</option>
              {Array.from(new Set(skills.map((s) => s.category))).sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={classification} onChange={(e) => setClassification(e.target.value)} className={selectClass}>
              <option value="all">All momentum classes</option>
              {["Exploding", "Growing", "Stable", "Declining", "Emerging"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-mist-500">
              {Object.entries(CLASS_COLOR).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: v }} />
                  {k}
                </span>
              ))}
            </span>
          </div>
          <div className="max-h-[620px] overflow-auto">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Category</th>
                  <th className="w-[18%]">Demand</th>
                  <th className="text-right">Freq</th>
                  <th className="text-right">Growth</th>
                  <th>Momentum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.slug}
                    onClick={() => setSelected(s.slug)}
                    className={`cursor-pointer ${selected === s.slug ? "bg-pulse-400/8" : ""}`}
                  >
                    <td>
                      <div className="font-medium text-white">{s.name}</div>
                      <div className="sp-num text-[10.5px] text-mist-500">
                        {s.roleDiversity} roles · {s.companyDiversity} employers · {s.uniqueSources} channels
                      </div>
                    </td>
                    <td><Badge tone="neutral">{s.category}</Badge></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Meter value={s.demandScore} tone="pulse" />
                        <span className="sp-num w-7 text-right text-[11.5px] text-mist-200">{s.demandScore}</span>
                      </div>
                    </td>
                    <td className="sp-num text-right">{s.frequency}</td>
                    <td className={`sp-num text-right ${s.growthScore >= 0 ? "text-pulse-300" : "text-coral-signal"}`}>
                      {s.growthScore >= 0 ? "+" : ""}{s.growthScore}%
                    </td>
                    <td><MomentumBadge value={s.classification} small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={detail?.name ?? "Skill detail"}
              subtitle={detail?.found ? `${detail.category} · difficulty ${detail.difficulty}/5` : "Select a skill to inspect its score"}
              icon={<IconSpark className="h-4 w-4" />}
              right={detail ? <button onClick={() => setSelected(null)} className="sp-btn sp-btn-ghost !px-2 !py-1 text-[11px]">✕</button> : null}
            />
            <div className="p-4">
              {detailLoading ? (
                <div className="flex items-center gap-2 py-8 text-[12px] text-mist-500"><Spinner size={13} /> Loading breakdown…</div>
              ) : !detail || !detail.found ? (
                <p className="py-6 text-center text-[12px] leading-relaxed text-mist-500">
                  Click any row to see exactly how the demand and momentum scores were built, which aliases were
                  normalised into this skill, and which skills it co-occurs with.
                </p>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="sp-num rounded-xl border border-pulse-400/25 bg-pulse-400/8 px-3 py-2 text-center">
                      <div className="text-[20px] font-semibold text-pulse-300">{detail.metric.demandScore}</div>
                      <div className="sp-label text-[8.5px]">demand</div>
                    </div>
                    <div className="sp-num rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center">
                      <div className="text-[20px] font-semibold text-white">{detail.metric.momentumScore}</div>
                      <div className="sp-label text-[8.5px]">momentum</div>
                    </div>
                    <MomentumBadge value={detail.metric.classification} />
                  </div>

                  <div>
                    <div className="sp-label mb-1.5 text-[9.5px]">How the demand score was built</div>
                    <ul className="space-y-1">
                      {detail.explanation.map((line: string, i: number) => (
                        <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-mist-300">
                          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-pulse-400" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="sp-label mb-1 text-[9.5px]">Momentum basis</div>
                    <p className="text-[11.5px] leading-relaxed text-mist-400">{detail.momentumExplanation}</p>
                  </div>

                  <div>
                    <div className="sp-label mb-1.5 text-[9.5px]">Normalised from these mentions</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.aliases.map((a: string) => (
                        <span key={a} className="sp-chip !text-[10.5px]">{a}</span>
                      ))}
                    </div>
                  </div>

                  {detail.partners?.length ? (
                    <div>
                      <div className="sp-label mb-1.5 text-[9.5px]">Learn it together with</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.partners.map((p: any) => (
                          <button key={p.slug} onClick={() => setSelected(p.slug)} className="sp-chip !border-volt-400/30 !bg-volt-400/8 !text-volt-400">
                            {p.name} <span className="sp-num opacity-70">{p.lift}×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {detail.prerequisites?.length ? (
                    <div>
                      <div className="sp-label mb-1.5 text-[9.5px]">Prerequisites</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.prerequisites.map((p: any) => (
                          <button key={p.slug} onClick={() => setSelected(p.slug)} className="sp-chip">{p.name}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {detail.roles?.length ? (
                    <div>
                      <div className="sp-label mb-1.5 text-[9.5px]">Roles demanding it</div>
                      <ul className="space-y-1">
                        {detail.roles.slice(0, 6).map((r: any) => (
                          <li key={r.role} className="flex items-center justify-between gap-2 text-[11.5px]">
                            <Link href={`/roles?role=${encodeURIComponent(r.role)}`} className="truncate text-mist-200 hover:text-pulse-300">{r.role}</Link>
                            <span className="sp-num text-mist-500">{r.demandScore}/100</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <Link href={`/gap?skill=${detail.slug}`} className="sp-btn sp-btn-ghost w-full text-[12px]">
                    Use this skill in my gap analysis →
                  </Link>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Demand vs growth map" subtitle="Bubble size = mentions" />
            <div className="p-3">
              <MomentumScatter skills={skills} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-mist-500">Loading skills…</div>}>
      <SkillsInner />
    </Suspense>
  );
}
