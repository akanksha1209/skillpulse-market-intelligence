"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useMarket } from "@/hooks/use-market";
import type { RoleInsight } from "@/lib/types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IconBuilding,
  IconUsers,
  Meter,
  MomentumBadge,
  SectionTitle,
  Skeleton,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function RolesInner() {
  const searchParams = useSearchParams();
  const { analysis } = useMarket();
  const [roles, setRoles] = useState<RoleInsight[]>([]);
  const [catalogue, setCatalogue] = useState<{ slug: string; label: string; industries: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(searchParams.get("role"));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .roles()
      .then((res) => {
        if (!alive) return;
        setRoles(res.roles ?? []);
        setCatalogue(res.catalogue ?? []);
        setError(null);
        if (!selected && res.roles?.length) setSelected(res.roles[0].role);
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id]);

  useEffect(() => {
    const role = searchParams.get("role");
    if (role) setSelected(role);
  }, [searchParams]);

  const role = useMemo(() => roles.find((r) => r.role === selected) ?? roles[0] ?? null, [roles, selected]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!roles.length) {
    return (
      <div className="space-y-4">
        <SectionTitle kicker="Role intelligence" title="Roles" />
        {error ? <ErrorState message={error} /> : null}
        <EmptyState
          title="No role signals yet"
          message="Roles are attributed from the collected signals. Run a market search (or load the demo dataset) to populate role intelligence."
          action={<Link href="/search" className="sp-btn sp-btn-primary">Open market search</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Role intelligence" title={`Roles · ${roles.length} detected`}>
        {analysis?.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : analysis ? <Badge tone="pulse">{analysis.source.toUpperCase()}</Badge> : null}
      </SectionTitle>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelected(r.role)}
            className={`sp-card sp-card-hover p-3.5 text-left ${role?.role === r.role ? "!border-pulse-400/45" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[13.5px] font-semibold text-white">{r.role}</h3>
                <p className="sp-num mt-0.5 text-[11px] text-mist-500">
                  {r.signalCount} signals · {r.share}% of sample
                </p>
              </div>
              <div className="text-right">
                <div className="sp-num text-[18px] font-semibold text-pulse-300">{r.demandScore}</div>
                <div className="sp-label text-[8.5px]">demand</div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {r.topSkills.slice(0, 6).map((s) => (
                <span key={s.slug} className="sp-chip !px-2 !py-0.5 !text-[10.5px]">{s.name}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {role ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title={role.role}
              subtitle={`${role.signalCount} collected signals · demand score ${role.demandScore}/100`}
              icon={<IconUsers className="h-4 w-4" />}
              right={
                <Link href={`/gap?role=${encodeURIComponent(role.role)}`} className="sp-btn sp-btn-primary !py-1.5 text-[11.5px]">
                  Check my gap for this role
                </Link>
              }
            />
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <div className="sp-label mb-2 text-[9.5px]">Required skills (observed)</div>
                <div className="space-y-2">
                  {role.topSkills.map((s) => (
                    <div key={s.slug}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <Link href={`/skills?skill=${s.slug}`} className="text-mist-200 hover:text-pulse-300">{s.name}</Link>
                        <span className="sp-num text-mist-500">{s.demandScore}</span>
                      </div>
                      <Meter value={s.demandScore} tone="pulse" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="sp-label mb-1.5 text-[9.5px]">Emerging in this role</div>
                  {role.emergingSkills.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {role.emergingSkills.map((s) => (
                        <span key={s.slug} className="sp-chip !border-amber-signal/30 !bg-amber-signal/8 !text-amber-signal">
                          ⚠ {s.name} <span className="sp-num opacity-70">{s.momentumScore}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-mist-500">No emerging skill cleared the threshold for this role.</p>
                  )}
                </div>

                <div>
                  <div className="sp-label mb-1.5 text-[9.5px]">Common tools</div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.tools.length ? role.tools.map((t) => <span key={t} className="sp-chip">{t}</span>) : <span className="text-[11.5px] text-mist-500">—</span>}
                  </div>
                </div>

                <div>
                  <div className="sp-label mb-1.5 text-[9.5px]">Experience expectations</div>
                  <div className="space-y-1.5">
                    {role.experience.map((e) => (
                      <div key={e.level}>
                        <div className="mb-1 flex items-center justify-between text-[11.5px] text-mist-300">
                          <span>{e.level}</span>
                          <span className="sp-num text-mist-500">{e.count}</span>
                        </div>
                        <Meter value={e.count} max={Math.max(...role.experience.map((x) => x.count), 1)} tone="volt" />
                      </div>
                    ))}
                  </div>
                </div>

                {role.salary.avg ? (
                  <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <div className="sp-label mb-1 text-[9.5px]">Indicative salary (₹ LPA, from signals that disclosed it)</div>
                    <div className="sp-num text-[15px] font-semibold text-white">
                      {role.salary.min} – {role.salary.max}
                      <span className="ml-2 text-[11.5px] font-normal text-mist-400">avg {role.salary.avg}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Industries hiring" icon={<IconBuilding className="h-4 w-4" />} />
              <div className="space-y-2 p-4">
                {role.industries.map((i) => (
                  <div key={i.name}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-mist-200">{i.name}</span>
                      <span className="sp-num text-mist-500">{i.count}</span>
                    </div>
                    <Meter value={i.count} max={Math.max(...role.industries.map((x) => x.count), 1)} tone="violet" />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Employers" />
              <div className="flex flex-wrap gap-1.5 p-4">
                {role.companies.map((c) => (
                  <span key={c.name} className="sp-chip">{c.name} <span className="sp-num opacity-60">{c.count}</span></span>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Related roles" subtitle="Skill-set overlap (Jaccard)" />
              <div className="space-y-2 p-4">
                {role.relatedRoles.map((r) => (
                  <button key={r.role} onClick={() => setSelected(r.role)} className="block w-full text-left">
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-mist-200 hover:text-pulse-300">{r.role}</span>
                      <span className="sp-num text-mist-500">{r.overlap}%</span>
                    </div>
                    <Meter value={r.overlap} tone="pulse" />
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="sp-label mb-2 text-[9.5px]">Role catalogue</div>
              <p className="text-[11.5px] leading-relaxed text-mist-500">
                {catalogue.length} role profiles ship with SkillPulse. Roles with too few observed signals fall back to
                their curated profile, which is always disclosed in the gap analysis explanation.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {catalogue.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => setSelected(c.label)}
                    className={`sp-chip ${roles.some((r) => r.role === c.label) ? "" : "!border-white/6 !text-mist-500"}`}
                  >
                    {c.label}
                    {roles.some((r) => r.role === c.label) ? null : <span className="sp-num text-[9.5px] opacity-60">no signals</span>}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {role?.topSkills?.length ? (
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-mist-400">
            <MomentumBadge value={role.topSkills[0] ? "Growing" : "Stable"} small />
            <span>
              Strongest requirement for <span className="text-white">{role.role}</span>:{" "}
              <span className="text-pulse-300">{role.topSkills[0]?.name}</span>. Build a roadmap around your gaps →
            </span>
            <Link href="/roadmap" className="sp-btn sp-btn-ghost ml-auto !py-1.5 text-[11.5px]">30-day roadmap</Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-mist-500">Loading roles…</div>}>
      <RolesInner />
    </Suspense>
  );
}
