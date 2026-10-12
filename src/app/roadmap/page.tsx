"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useMarket } from "@/hooks/use-market";
import {
  readStoredRole,
  readStoredSkills,
  SkillPicker,
  writeStoredRole,
  writeStoredSkills,
} from "@/components/skill-picker";
import { SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import type { Roadmap, SkillGapResult } from "@/lib/types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IconClock,
  IconRoute,
  IconSpark,
  Meter,
  ProvenanceTag,
  ScoreDial,
  SectionTitle,
  Spinner,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function RoadmapPage() {
  const { analysis } = useMarket();
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [gap, setGap] = useState<SkillGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredSkills();
    if (stored.length) setSkills(stored);
    const storedRole = readStoredRole();
    api
      .roles()
      .then((res) => {
        const observed: string[] = (res.roles ?? []).map((r: any) => r.role);
        const catalogue: string[] = (res.catalogue ?? []).map((c: any) => c.label);
        const all = Array.from(new Set([...observed, ...catalogue]));
        setRoles(all);
        setRole(storedRole || observed[0] || all[0] || "");
      })
      .catch(() => setRoles([]));
  }, [analysis?.id]);

  async function generate() {
    if (!skills.length || !role) {
      setError("Add your current skills and choose a target role first.");
      return;
    }
    setLoading(true);
    setError(null);
    writeStoredSkills(skills);
    writeStoredRole(role);
    try {
      const res = await api.roadmap(
        skills.map((s) => SKILL_NAME_BY_SLUG[s] ?? s),
        role,
        weeks,
        analysis?.id,
      );
      setRoadmap(res.roadmap);
      setGap(res.gap);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = (analysis?.skills ?? []).slice(0, 16).map((s) => ({ slug: s.slug, name: s.name, demandScore: s.demandScore }));

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Action" title="AI Learning Roadmap">
        <div className="flex items-center gap-2">
          <ProvenanceTag kind="calculated" />
          {analysis?.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : null}
        </div>
      </SectionTitle>

      <Card>
        <CardHeader
          title="Plan inputs"
          subtitle="Priority = market demand × gap weight ÷ learning cost, with prerequisites scheduled first."
          icon={<IconRoute className="h-4 w-4" />}
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <label className="sp-label mb-1.5 block text-[9.5px]">Target role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="sp-input !py-2.5 text-[13px]">
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="sp-label mb-1.5 block text-[9.5px]">Plan length</label>
              <div className="flex gap-1 rounded-lg border border-white/8 bg-white/3 p-0.5">
                {[3, 4, 6, 8].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium ${
                      weeks === w ? "bg-pulse-400/16 text-pulse-300" : "text-mist-500 hover:text-mist-200"
                    }`}
                  >
                    {w === 4 ? "30 days" : `${w} wks`}
                  </button>
                ))}
              </div>
            </div>
            <Link href="/gap" className="sp-btn sp-btn-ghost w-full text-[12px]">
              ← Back to gap analysis
            </Link>
          </div>

          <div>
            <label className="sp-label mb-1.5 block text-[9.5px]">Skills you already have</label>
            <SkillPicker value={skills} onChange={setSkills} suggestions={suggestions} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={generate} disabled={loading || !skills.length} className="sp-btn sp-btn-primary">
                {loading ? <Spinner size={13} /> : <IconSpark className="h-4 w-4" />} Generate roadmap
              </button>
              <span className="text-[11.5px] text-mist-500">
                {gap ? `${gap.missing.length} gaps addressed · ${roadmap?.totalHours ?? 0} estimated hours` : "Deterministic engine — works without an LLM key."}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Card className="flex items-center gap-3 px-4 py-8 text-[12.5px] text-mist-400">
          <Spinner size={15} /> Prioritising gaps against observed market demand…
        </Card>
      ) : null}

      {!roadmap && !loading ? (
        <EmptyState
          title="No roadmap yet"
          message="Pick a target role, add the skills you already have, and SkillPulse will turn your market gap into a week-by-week plan with deliverables, effort estimates and learning resources."
          icon={<IconRoute className="h-6 w-6" />}
          action={<Link href="/gap" className="sp-btn sp-btn-primary">Start with a skill-gap analysis</Link>}
        />
      ) : null}

      {roadmap ? (
        <>
          {!roadmap.weeks.length ? (
            <Card className="px-5 py-8 text-center">
              <p className="text-[13px] text-mist-300">{roadmap.notes[0]}</p>
              <Link href="/gap" className="sp-btn sp-btn-ghost mt-4">Adjust my skills</Link>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className="space-y-4">
                <div className="relative space-y-3 pl-6">
                  <span className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-pulse-400/60 via-volt-400/35 to-transparent" />
                  {roadmap.weeks.map((w) => (
                    <Card key={w.week} className="relative p-4">
                      <span className="absolute -left-[22px] top-5 flex h-4 w-4 items-center justify-center rounded-full border border-pulse-400/50 bg-ink-950">
                        <span className="h-1.5 w-1.5 rounded-full bg-pulse-400" />
                      </span>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="sp-label text-[9.5px]">Week {w.week}</div>
                          <h3 className="mt-0.5 text-[14.5px] font-semibold text-white">{w.theme}</h3>
                        </div>
                        <Badge tone="volt">
                          <IconClock className="h-3 w-3" /> ~{w.estimatedHours}h
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2">
                        {w.focus.map((f) => (
                          <div key={f.slug} className="rounded-lg border border-white/7 bg-white/[0.022] px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <Link href={`/skills?skill=${f.slug}`} className="text-[12.5px] font-medium text-white hover:text-pulse-300">
                                {f.name}
                              </Link>
                              <span className="sp-num shrink-0 text-[11px] text-mist-500">{f.hours}h</span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist-500">{f.reason}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-lg border border-pulse-400/20 bg-pulse-400/5 px-3 py-2">
                        <div className="sp-label mb-1 text-[9px] text-pulse-300">Deliverable</div>
                        <p className="text-[12px] leading-relaxed text-mist-200">{w.deliverable}</p>
                      </div>

                      {w.resources.length ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {w.resources.map((r) => (
                            <span key={r} className="sp-chip !text-[10.5px]">📚 {r}</span>
                          ))}
                        </div>
                      ) : null}
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader title="Readiness today → after plan" />
                  <div className="flex items-center justify-around p-4">
                    <ScoreDial value={gap?.readiness ?? 0} size={96} label="now" tone="#ffc24b" />
                    <span className="text-mist-500">→</span>
                    <ScoreDial
                      value={Math.min(100, (gap?.readiness ?? 0) + Math.min(38, roadmap.totalHours / 2.4))}
                      size={96}
                      label="projected"
                      tone="#34e3b0"
                    />
                  </div>
                  <p className="border-t border-white/6 px-4 py-2.5 text-[11px] leading-relaxed text-mist-500">
                    Projection = current readiness + demand-weighted coverage of the scheduled skills. It is an
                    estimate, not a guarantee — it assumes you complete each week's deliverable.
                  </p>
                </Card>

                <Card>
                  <CardHeader title="Prioritisation" subtitle="Why each skill is in this order" />
                  <div className="divide-y divide-white/5">
                    {roadmap.prioritisation.slice(0, 10).map((p, i) => (
                      <div key={p.slug} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12.5px] font-medium text-white">
                            <span className="sp-num mr-1.5 text-mist-500">{i + 1}.</span>
                            {p.name}
                          </span>
                          <span className="sp-num shrink-0 text-[11.5px] text-pulse-300">{p.priority}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-mist-500">{p.reason}</p>
                        <div className="mt-1.5"><Meter value={p.priority} max={Math.max(...roadmap.prioritisation.map((x) => x.priority), 1)} tone="pulse" /></div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="sp-label mb-2 text-[9.5px]">Assumptions</div>
                  <ul className="space-y-1.5">
                    {roadmap.notes.map((n, i) => (
                      <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-mist-400">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
