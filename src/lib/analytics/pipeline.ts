import {
  buildSkillMetrics,
  computeMarketScore,
  computeMomentumScore,
  corpusStats,
} from "@/lib/analytics/scoring";
import { detectRole, SKILL_BY_SLUG, SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import type {
  AnalysisStatus,
  DataSource,
  MarketAnalysis,
  MomentumClass,
  RoleInsight,
  Signal,
  SkillEdge,
  TimePoint,
} from "@/lib/types";

/* ── Co-occurrence ─────────────────────────────────────────────────────────── */

export function buildCooccurrence(signals: Signal[], maxEdges = 80): SkillEdge[] {
  const pairs = new Map<string, number>();
  const freq = new Map<string, number>();

  for (const s of signals) {
    const unique = Array.from(new Set(s.skills)).sort();
    for (const slug of unique) freq.set(slug, (freq.get(slug) ?? 0) + 1);
    // Cap pairwise explosion on very dense postings.
    const capped = unique.slice(0, 18);
    for (let i = 0; i < capped.length; i++) {
      for (let j = i + 1; j < capped.length; j++) {
        const key = `${capped[i]}::${capped[j]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }

  const total = Math.max(1, signals.length);
  const edges: SkillEdge[] = [];
  for (const [key, support] of pairs.entries()) {
    if (support < 3) continue;
    const [a, b] = key.split("::");
    const fa = freq.get(a) ?? 0;
    const fb = freq.get(b) ?? 0;
    const expected = (fa / total) * (fb / total) * total;
    const lift = expected > 0 ? support / expected : 0;
    if (lift < 1.05) continue;
    edges.push({
      skillA: a,
      skillB: b,
      nameA: SKILL_NAME_BY_SLUG[a] ?? a,
      nameB: SKILL_NAME_BY_SLUG[b] ?? b,
      support,
      weight: Number(((support / total) * 100).toFixed(1)),
      lift: Number(lift.toFixed(2)),
    });
  }
  edges.sort((x, y) => y.lift * Math.log(1 + y.support) - x.lift * Math.log(1 + x.support));
  return edges.slice(0, maxEdges);
}

/** Neighbour list for one skill — powers "what should I learn together". */
export function partnersFor(edges: SkillEdge[], slug: string, limit = 8) {
  return edges
    .filter((e) => e.skillA === slug || e.skillB === slug)
    .map((e) => ({
      slug: e.skillA === slug ? e.skillB : e.skillA,
      name: e.skillA === slug ? e.nameB : e.nameA,
      support: e.support,
      lift: e.lift,
    }))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, limit);
}

/* ── Role intelligence ─────────────────────────────────────────────────────── */

export function buildRoles(signals: Signal[], limit = 12): RoleInsight[] {
  const byRole = new Map<string, Signal[]>();
  for (const s of signals) {
    const key = s.role || detectRole(s.title);
    if (!byRole.has(key)) byRole.set(key, []);
    byRole.get(key)!.push(s);
  }

  const total = Math.max(1, signals.length);
  const roles: RoleInsight[] = [];

  for (const [role, items] of byRole.entries()) {
    if (role === "Other" && items.length < 3) continue;
    const freq = new Map<string, number>();
    const industries = new Map<string, number>();
    const companies = new Map<string, number>();
    const experience = new Map<string, number>();
    let salarySum = 0;
    let salaryCount = 0;
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;

    for (const s of items) {
      for (const slug of s.skills) freq.set(slug, (freq.get(slug) ?? 0) + 1);
      if (s.industry) industries.set(s.industry, (industries.get(s.industry) ?? 0) + 1);
      if (s.company) companies.set(s.company, (companies.get(s.company) ?? 0) + 1);
      if (s.experienceLevel) experience.set(s.experienceLevel, (experience.get(s.experienceLevel) ?? 0) + 1);
      if (s.salaryMin != null && s.salaryMax != null) {
        salarySum += (s.salaryMin + s.salaryMax) / 2;
        salaryCount += 1;
        salaryMin = salaryMin == null ? s.salaryMin : Math.min(salaryMin, s.salaryMin);
        salaryMax = salaryMax == null ? s.salaryMax : Math.max(salaryMax, s.salaryMax);
      }
    }

    const n = items.length;
    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    const topSkills = sorted.slice(0, 12).map(([slug, count]) => ({
      slug,
      name: SKILL_NAME_BY_SLUG[slug] ?? slug,
      demandScore: Math.round(Math.min(100, (count / n) * 130)),
    }));
    const emergingSkills = sorted
      .filter(([slug]) => SKILL_BY_SLUG[slug]?.emerging)
      .slice(0, 6)
      .map(([slug, count]) => ({
        slug,
        name: SKILL_NAME_BY_SLUG[slug] ?? slug,
        momentumScore: Math.round(Math.min(100, 55 + (count / n) * 90)),
      }));

    roles.push({
      role,
      signalCount: n,
      share: Number(((n / total) * 100).toFixed(1)),
      demandScore: Math.round(
        Math.min(
          100,
          (n / total) * 120 +
            Math.min(25, new Set(items.map((i) => i.company)).size * 1.6) +
            Math.min(15, topSkills.length),
        ),
      ),
      topSkills,
      emergingSkills,
      tools: sorted
        .filter(([slug]) => ["Tooling", "Cloud", "DevOps", "Database"].includes(SKILL_BY_SLUG[slug]?.category ?? ""))
        .slice(0, 8)
        .map(([slug]) => SKILL_NAME_BY_SLUG[slug] ?? slug),
      industries: Array.from(industries.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      companies: Array.from(companies.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      experience: Array.from(experience.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count),
      relatedRoles: [],
      salary: {
        min: salaryMin,
        max: salaryMax,
        avg: salaryCount ? Math.round(salarySum / salaryCount) : null,
      },
    });
  }

  roles.sort((a, b) => b.signalCount - a.signalCount);

  // Related roles = highest skill-set Jaccard overlap.
  const sets = new Map<string, Set<string>>(
    roles.map((r) => [r.role, new Set(signals.filter((s) => s.role === r.role).flatMap((s) => s.skills))]),
  );
  for (const r of roles) {
    const mine = sets.get(r.role) ?? new Set<string>();
    r.relatedRoles = roles
      .filter((o) => o.role !== r.role)
      .map((o) => {
        const theirs = sets.get(o.role) ?? new Set<string>();
        const inter = Array.from(mine).filter((x) => theirs.has(x)).length;
        const union = new Set([...mine, ...theirs]).size || 1;
        return { role: o.role, overlap: Math.round((inter / union) * 100) };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);
  }

  return roles.slice(0, limit);
}

/* ── Companies / industries ────────────────────────────────────────────────── */

export function buildCompanies(signals: Signal[], limit = 15) {
  const map = new Map<string, { count: number; industries: Set<string> }>();
  for (const s of signals) {
    if (!s.company) continue;
    const e = map.get(s.company) ?? { count: 0, industries: new Set<string>() };
    e.count += 1;
    if (s.industry) e.industries.add(s.industry);
    map.set(s.company, e);
  }
  const total = Math.max(1, signals.length);
  return Array.from(map.entries())
    .map(([name, e]) => ({
      name,
      count: e.count,
      share: Number(((e.count / total) * 100).toFixed(1)),
      industries: Array.from(e.industries),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildIndustries(signals: Signal[], limit = 12) {
  const map = new Map<string, number>();
  for (const s of signals) if (s.industry) map.set(s.industry, (map.get(s.industry) ?? 0) + 1);
  const total = Math.max(1, signals.length);
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, share: Number(((count / total) * 100).toFixed(1)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ── Timeline (observed publication dates only) ────────────────────────────── */

export function buildTimeline(signals: Signal[], weeks = 13): TimePoint[] {
  const buckets: TimePoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    buckets.push({ label: `-${w * 7}d`, weekIndex: weeks - 1 - w, signals: 0, demandIndex: 0, emergingIndex: 0 });
  }
  for (const s of signals) {
    const w = Math.floor(s.publishedDaysAgo / 7);
    if (w < 0 || w >= weeks) continue;
    const idx = weeks - 1 - w;
    buckets[idx].signals += 1;
    const hasEmerging = s.skills.some((slug) => SKILL_BY_SLUG[slug]?.emerging);
    if (hasEmerging) buckets[idx].emergingIndex += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.signals));
  for (const b of buckets) {
    b.demandIndex = Math.round((b.signals / max) * 100);
    b.emergingIndex = b.signals ? Math.round((b.emergingIndex / b.signals) * 100) : 0;
  }
  return buckets;
}

/* ── Assembly ──────────────────────────────────────────────────────────────── */

export interface PipelineInput {
  id: string;
  query: string;
  canonicalQuery: string;
  location: string;
  source: DataSource;
  isDemo: boolean;
  status: AnalysisStatus;
  notes: string[];
  signals: Signal[];
  createdAt?: string;
}

export function analyze(input: PipelineInput): MarketAnalysis {
  const signals = input.signals;
  const metrics = buildSkillMetrics(signals, signals.length > 40 ? 2 : 1);
  const stats = corpusStats(signals);
  const edges = buildCooccurrence(signals);
  const roles = buildRoles(signals);
  const companies = buildCompanies(signals);
  const industries = buildIndustries(signals);
  const timeline = buildTimeline(signals);

  const classificationCounts: Record<MomentumClass, number> = {
    Exploding: 0,
    Growing: 0,
    Stable: 0,
    Declining: 0,
    Emerging: 0,
  };
  for (const m of metrics) classificationCounts[m.classification] += 1;

  const emerging = metrics
    .filter((m) => m.emerging || m.classification === "Emerging" || m.classification === "Exploding")
    .sort(
      (a, b) =>
        Number(b.emerging) - Number(a.emerging) ||
        b.momentumScore - a.momentumScore ||
        b.demandScore - a.demandScore,
    )
    .slice(0, 12)
    .map((m) => ({ slug: m.slug, name: m.name, demandScore: m.demandScore, momentumScore: m.momentumScore }));

  const salaries = signals.filter((s) => s.salaryMin != null && s.salaryMax != null);

  const analysis: MarketAnalysis = {
    id: input.id,
    query: input.query,
    canonicalQuery: input.canonicalQuery,
    location: input.location,
    source: input.source,
    isDemo: input.isDemo,
    status: input.status,
    notes: input.notes,
    createdAt: input.createdAt ?? new Date().toISOString(),
    overview: {
      totalSignals: stats.totalSignals,
      uniqueSkills: metrics.length,
      uniqueCompanies: new Set(signals.map((s) => s.company).filter(Boolean)).size,
      uniqueRoles: roles.length,
      uniqueIndustries: industries.length,
      avgSkillsPerSignal: signals.length
        ? Number((signals.reduce((s, x) => s + x.skills.length, 0) / signals.length).toFixed(1))
        : 0,
      marketScore: computeMarketScore(metrics, signals),
      momentumScore: computeMomentumScore(metrics),
      freshnessDays: signals.length
        ? Math.round(signals.reduce((s, x) => s + x.publishedDaysAgo, 0) / signals.length)
        : 0,
      salaryAvg: salaries.length
        ? Math.round(salaries.reduce((s, x) => s + ((x.salaryMin! + x.salaryMax!) / 2), 0) / salaries.length)
        : null,
    },
    skills: metrics,
    edges,
    roles,
    companies,
    industries,
    emerging,
    timeline,
    classificationCounts,
    signals: signals.slice(0, 60),
  };

  return analysis;
}
