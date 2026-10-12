"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { Signal } from "@/lib/types";
import { SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import { Badge, Spinner } from "@/components/ui";

const PAGE = 12;

export function SignalTable({ signals, loading = false }: { signals: Signal[]; loading?: boolean }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("all");
  const [skill, setSkill] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const roles = useMemo(() => Array.from(new Set(signals.map((s) => s.role))).sort(), [signals]);
  const industries = useMemo(() => Array.from(new Set(signals.map((s) => s.industry).filter(Boolean))).sort(), [signals]);
  const locations = useMemo(() => Array.from(new Set(signals.map((s) => s.location).filter(Boolean))).sort(), [signals]);
  const allSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of signals) for (const slug of s.skills) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([slug]) => slug);
  }, [signals]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return signals.filter((s) => {
      if (role !== "all" && s.role !== role) return false;
      if (industry !== "all" && s.industry !== industry) return false;
      if (location !== "all" && s.location !== location) return false;
      if (skill !== "all" && !s.skills.includes(skill)) return false;
      if (needle && !`${s.title} ${s.company} ${s.snippet}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [signals, q, role, industry, location, skill]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = filtered.slice(page * PAGE, page * PAGE + PAGE);

  function reset() {
    setQ(""); setRole("all"); setIndustry("all"); setLocation("all"); setSkill("all"); setPage(0);
  }

  const selectClass =
    "rounded-lg border border-white/10 bg-ink-950/70 px-2 py-1.5 text-[11.5px] text-mist-200 outline-none focus:border-pulse-400/50";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          placeholder="Filter signals by text…"
          className="sp-input !w-56 !py-1.5 text-[12px]"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }} className={selectClass}>
          <option value="all">All roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(0); }} className={selectClass}>
          <option value="all">All industries</option>
          {industries.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={location} onChange={(e) => { setLocation(e.target.value); setPage(0); }} className={selectClass}>
          <option value="all">All locations</option>
          {locations.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={skill} onChange={(e) => { setSkill(e.target.value); setPage(0); }} className={selectClass}>
          <option value="all">All skills</option>
          {allSkills.map((s) => <option key={s} value={s}>{SKILL_NAME_BY_SLUG[s] ?? s}</option>)}
        </select>
        <button onClick={reset} className="sp-btn sp-btn-ghost !px-2.5 !py-1.5 text-[11.5px]">Reset</button>
        <span className="sp-num ml-auto text-[11.5px] text-mist-500">
          {filtered.length} / {signals.length} signals
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-mist-500">
          <Spinner size={14} /> Loading signals…
        </div>
      ) : !filtered.length ? (
        <p className="py-10 text-center text-[12.5px] text-mist-500">No signal matches these filters.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/7">
          <div className="max-h-[520px] overflow-auto">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Role / title</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Location</th>
                  <th className="text-right">Age</th>
                  <th className="text-right">Skills</th>
                </tr>
              </thead>
              <tbody>
                {current.map((s) => (
                  <Fragment key={s.id}>
                    <tr onClick={() => setOpen(open === s.id ? null : s.id)} className="cursor-pointer">
                      <td className="max-w-[280px]">
                        <div className="truncate font-medium text-white">{s.title}</div>
                        <div className="text-[11px] text-mist-500">{s.via}{s.experienceLevel ? ` · ${s.experienceLevel}` : ""}</div>
                      </td>
                      <td className="whitespace-nowrap">{s.company}</td>
                      <td><Badge tone="neutral">{s.industry}</Badge></td>
                      <td className="whitespace-nowrap text-[12px]">{s.location || "—"}</td>
                      <td className="sp-num whitespace-nowrap text-right">{s.publishedDaysAgo}d</td>
                      <td className="sp-num whitespace-nowrap text-right text-pulse-300">{s.skills.length}</td>
                    </tr>
                    {open === s.id ? (
                      <tr>
                        <td colSpan={6} className="bg-white/[0.02] !py-3">
                          <p className="text-[12px] leading-relaxed text-mist-300">{s.snippet}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {s.skills.map((slug) => (
                              <Link key={slug} href={`/skills?skill=${slug}`} className="sp-chip !border-pulse-400/25 !bg-pulse-400/8 !text-pulse-300">
                                {SKILL_NAME_BY_SLUG[slug] ?? slug}
                              </Link>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-mist-500">
                            {s.salaryMin != null && s.salaryMax != null ? (
                              <span className="sp-num">₹{s.salaryMin}–{s.salaryMax} LPA</span>
                            ) : null}
                            <span>{s.employmentType}</span>
                            {s.url?.startsWith("http") ? (
                              <a href={s.url} target="_blank" rel="noreferrer" className="text-volt-400 hover:underline">
                                source ↗
                              </a>
                            ) : (
                              <span>synthetic record · no external URL</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-end gap-2 text-[11.5px] text-mist-500">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="sp-btn sp-btn-ghost !px-2.5 !py-1 text-[11.5px]">
            Prev
          </button>
          <span className="sp-num">
            {page + 1} / {pages}
          </span>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="sp-btn sp-btn-ghost !px-2.5 !py-1 text-[11.5px]">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
