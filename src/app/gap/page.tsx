"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useMarket } from "@/hooks/use-market";
import {
  readStoredRole,
  readStoredSkills,
  SkillPicker,
  writeStoredRole,
  writeStoredSkills,
} from "@/components/skill-picker";
import type { SkillGapResult } from "@/lib/types";
import { SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  IconRoute,
  IconTarget,
  Meter,
  ProvenanceTag,
  ScoreDial,
  SectionTitle,
  Spinner,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function GapInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { analysis } = useMarket();
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [basis, setBasis] = useState<{ source: string; isDemo: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSkills((prev) => (prev.length ? prev : readStoredSkills()));
    const storedRole = readStoredRole();
    const paramRole = searchParams.get("role");
    const paramSkill = searchParams.get("skill");
    if (paramSkill) {
      setSkills((prev) => (prev.includes(paramSkill) ? prev : [...prev, paramSkill]));
    }
    if (paramRole) setRole(paramRole);
    else if (storedRole) setRole(storedRole);
  }, [searchParams]);

  useEffect(() => {
    api
      .roles()
      .then((res) => {
        const observed: string[] = (res.roles ?? []).map((r: any) => r.role);
        const catalogue: string[] = (res.catalogue ?? []).map((c: any) => c.label);
        const all = Array.from(new Set([...observed, ...catalogue]));
        setRoles(all);
        setRole((prev) => prev || observed[0] || all[0] || "");
      })
      .catch(() => setRoles([]));
  }, [analysis?.id]);

  async function analyze() {
    if (!skills.length || !role) {
      setError("Add at least one of your skills and choose a target role.");
      return;
    }
    setLoading(true);
    setError(null);
    writeStoredSkills(skills);
    writeStoredRole(role);
    try {
      const res = await api.skillGap(
        skills.map((s) => SKILL_NAME_BY_SLUG[s] ?? s),
        role,
        analysis?.id,
      );
      setResult(res.gap);
      setBasis(res.basis ? { source: res.basis.source, isDemo: res.basis.isDemo } : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toRoadmap() {
    writeStoredSkills(skills);
    writeStoredRole(role);
    router.push("/roadmap");
  }

  const suggestions = (analysis?.skills ?? []).slice(0, 18).map((s) => ({
    slug: s.slug,
    name: s.name,
    demandScore: s.demandScore,
  }));

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Decision support" title="Analyze My Skill Gap">
        <div className="flex items-center gap-2">
          {basis ? (
            <Badge tone={basis.isDemo ? "amber" : "pulse"}>
              {basis.isDemo ? "DEMO DATA" : basis.source.toUpperCase()} BASIS
            </Badge>
          ) : null}
          <ProvenanceTag kind="calculated" />
        </div>
      </SectionTitle>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            title="Your profile vs the market"
            subtitle="Market requirements come from the current analysis when the role has enough observed signals."
            icon={<IconTarget className="h-4 w-4" />}
          />
          <div className="space-y-4 p-4">
            <div>
              <label className="sp-label mb-1.5 block text-[9.5px]">Target role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="sp-input !py-2.5 text-[13px]">
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="sp-label mb-1.5 block text-[9.5px]">Your current skills</label>
              <SkillPicker value={skills} onChange={setSkills} suggestions={suggestions} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={analyze} disabled={loading || !skills.length} className="sp-btn sp-btn-primary">
                {loading ? <Spinner size={13} /> : <IconTarget className="h-4 w-4" />} Analyze my gap
              </button>
              <button
                onClick={() => { setSkills([]); setResult(null); writeStoredSkills([]); }}
                className="sp-btn sp-btn-ghost"
              >
                Reset
              </button>
              {result ? (
                <button onClick={toRoadmap} className="sp-btn sp-btn-ghost">
                  <IconRoute className="h-4 w-4 text-pulse-400" /> Build 30-day roadmap
                </button>
              ) : null}
            </div>

            {error ? <ErrorState message={error} /> : null}

            {!result && !loading ? (
              <p className="rounded-xl border border-white/7 bg-white/[0.02] px-3.5 py-3 text-[12px] leading-relaxed text-mist-500">
                Add the skills you genuinely have (they are normalised — “ML”, “k8s”, “GenAI” all resolve to their
                canonical skill), pick the role you are aiming for, and SkillPulse will compute a weighted Market
                Readiness score plus an itemised list of what the market wants that you do not have yet.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Market readiness" subtitle="Weighted by demand, not by count" />
          <div className="flex flex-col items-center gap-3 p-5">
            {loading ? (
              <div className="flex flex-col items-center gap-2 py-8 text-[12px] text-mist-500">
                <Spinner size={16} /> Comparing with market requirements…
              </div>
            ) : result ? (
              <>
                <ScoreDial
                  value={result.readiness}
                  size={132}
                  label="readiness"
                  tone={result.readiness >= 70 ? "#34e3b0" : result.readiness >= 40 ? "#ffc24b" : "#ff6b7a"}
                />
                <p className="text-center text-[12px] leading-relaxed text-mist-400">
                  You cover <span className="sp-num text-white">{result.earnedScore}</span> of{" "}
                  <span className="sp-num text-white">{result.totalScore}</span> demand-weighted requirements for{" "}
                  <span className="text-white">{result.role}</span>.
                </p>
                <div className="w-full space-y-2 pt-1">
                  <Meter value={result.matched.length} max={Math.max(1, result.requiredSkills.length)} tone="pulse" label="Skills matched" />
                  <Meter value={result.missing.length} max={Math.max(1, result.requiredSkills.length)} tone="coral" label="Gaps remaining" />
                </div>
                <Link href="/roadmap" className="sp-btn sp-btn-primary mt-2 w-full">
                  <IconRoute className="h-4 w-4" /> Generate my roadmap
                </Link>
              </>
            ) : (
              <p className="py-10 text-center text-[12px] text-mist-500">Run an analysis to see your readiness score.</p>
            )}
          </div>
        </Card>
      </div>

      {result ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="You have" subtitle="Already covered — keep these visible on your résumé" right={<Badge tone="pulse">{result.matched.length}</Badge>} />
            <div className="space-y-2 p-4">
              {result.matched.length ? (
                result.matched.map((m) => (
                  <div key={m.slug} className="rounded-lg border border-pulse-400/20 bg-pulse-400/6 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-white">✓ {m.name}</span>
                      <span className="sp-num text-[11px] text-pulse-300">weight {Math.round(m.weight * 100)}%</span>
                    </div>
                    <div className="mt-1.5"><Meter value={m.demandScore} tone="pulse" /></div>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-mist-500">None of your listed skills match the requirements for this role.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="You need" subtitle="Sorted by demand × role weight, then by learning difficulty" right={<Badge tone="coral">{result.missing.length}</Badge>} />
            <div className="space-y-2 p-4">
              {result.missing.length ? (
                result.missing.map((m) => (
                  <div key={m.slug} className="rounded-lg border border-coral-signal/20 bg-coral-signal/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/skills?skill=${m.slug}`} className="text-[12.5px] font-medium text-white hover:text-coral-signal">
                        → {m.name}
                      </Link>
                      <span className="sp-num text-[11px] text-mist-400">difficulty {m.difficulty}/5</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="flex-1"><Meter value={m.demandScore} tone="coral" /></div>
                      <span className="sp-num shrink-0 text-[11px] text-mist-500">weight {Math.round(m.weight * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-pulse-300">No material gaps detected for this role.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader title="How this score was calculated" subtitle="Full transparency — no black box" right={<ProvenanceTag kind="calculated" />} />
            <div className="p-4">
              <ol className="space-y-2">
                {result.explanation.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-mist-300">
                    <span className="sp-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/4 text-[10.5px] text-pulse-300">
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card>
            <CardHeader title="Transferable skills" subtitle="You have them; this role does not currently ask for them" />
            <div className="flex flex-wrap gap-1.5 p-4">
              {result.extras.length ? (
                result.extras.map((e) => <span key={e.slug} className="sp-chip !border-volt-400/25 !bg-volt-400/8 !text-volt-400">{e.name}</span>)
              ) : (
                <p className="text-[12px] text-mist-500">Every skill you listed is required for this role.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function GapPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-mist-500">Loading skill gap analyzer…</div>}>
      <GapInner />
    </Suspense>
  );
}
