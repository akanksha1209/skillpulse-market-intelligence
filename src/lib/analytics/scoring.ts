import type { MomentumClass, ScoreBreakdown, Signal, SkillMetric } from "@/lib/types";
import { SKILL_BY_SLUG } from "@/lib/taxonomy";

/**
 * Transparent scoring model.
 *
 * SKILL DEMAND SCORE (0-100) — weighted blend of observable evidence:
 *   35% frequency        share of collected signals that mention the skill
 *   20% role diversity   distinct roles asking for it / distinct roles observed
 *   10% company diversity distinct employers / distinct employers observed
 *   10% source breadth   distinct job boards/channels it appeared on
 *   10% recency          share of its mentions inside the last 30 days
 *   15% growth           momentum of the last 30d vs the previous 60d
 *
 * MARKET MOMENTUM SCORE (0-100) — 50 is "flat". Each +25 means roughly one
 * "tanh step" of rate-of-change between the recent and prior windows.
 *
 * Nothing here fabricates history: growth is computed only from the
 * publication dates of the signals actually collected for this analysis.
 */

export const RECENT_WINDOW_DAYS = 30;
export const PRIOR_WINDOW_DAYS = 90;

export const DEMAND_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  frequency: 0.35,
  roleDiversity: 0.2,
  companyDiversity: 0.1,
  sourceBreadth: 0.1,
  recency: 0.1,
  growth: 0.15,
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
/** Round to one decimal without binary float artefacts (62.18, not 62.179999). */
export const round1 = (v: number) => Number(v.toFixed(1));

function tanh(x: number) {
  return Math.tanh(x);
}

export interface GrowthStats {
  recent: number;
  prior: number;
  recentRate: number;
  priorRate: number;
  growthPct: number;
  momentumScore: number;
  classification: MomentumClass;
}

export function computeGrowth(recent: number, prior: number, emerging: boolean): GrowthStats {
  const recentRate = recent / RECENT_WINDOW_DAYS;
  const priorRate = prior / (PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS);
  let growthPct = 0;
  if (priorRate > 0) growthPct = (recentRate - priorRate) / priorRate;
  else if (recentRate > 0) growthPct = Math.min(3, recentRate * 60); // no prior baseline

  const base = 50 + tanh(growthPct / 1.2) * 45;
  const noveltyBoost = emerging && prior === 0 && recent > 0 ? 6 : 0;
  const momentumScore = clamp(round1(base + noveltyBoost));

  let classification: MomentumClass;
  if (emerging && prior <= 2 && recent >= 2) classification = "Emerging";
  else if (growthPct >= 0.7 && recent >= 3) classification = "Exploding";
  else if (growthPct >= 0.18) classification = "Growing";
  else if (growthPct <= -0.18 && (prior >= 3 || recent >= 1)) classification = "Declining";
  else classification = "Stable";

  return { recent, prior, recentRate, priorRate, growthPct, momentumScore, classification };
}

export interface SkillAggregate {
  slug: string;
  frequency: number;
  sources: Set<string>;
  roles: Map<string, number>;
  companies: Map<string, number>;
  recent: number;
  prior: number;
  recencyHits: number;
}

export function aggregateSkills(signals: Signal[]): Map<string, SkillAggregate> {
  const agg = new Map<string, SkillAggregate>();
  for (const s of signals) {
    for (const slug of s.skills) {
      let a = agg.get(slug);
      if (!a) {
        a = {
          slug,
          frequency: 0,
          sources: new Set(),
          roles: new Map(),
          companies: new Map(),
          recent: 0,
          prior: 0,
          recencyHits: 0,
        };
        agg.set(slug, a);
      }
      a.frequency += 1;
      if (s.via) a.sources.add(s.via);
      if (s.role) a.roles.set(s.role, (a.roles.get(s.role) ?? 0) + 1);
      if (s.company) a.companies.set(s.company, (a.companies.get(s.company) ?? 0) + 1);
      if (s.publishedDaysAgo <= RECENT_WINDOW_DAYS) a.recent += 1;
      else if (s.publishedDaysAgo <= PRIOR_WINDOW_DAYS) a.prior += 1;
      if (s.publishedDaysAgo <= 14) a.recencyHits += 1;
    }
  }
  return agg;
}

export interface CorpusStats {
  totalSignals: number;
  distinctSources: number;
  distinctRoles: number;
  distinctCompanies: number;
}

export function corpusStats(signals: Signal[]): CorpusStats {
  const sources = new Set<string>();
  const roles = new Set<string>();
  const companies = new Set<string>();
  for (const s of signals) {
    if (s.via) sources.add(s.via);
    if (s.role) roles.add(s.role);
    if (s.company) companies.add(s.company);
  }
  return {
    totalSignals: signals.length,
    distinctSources: Math.max(1, sources.size),
    distinctRoles: Math.max(1, roles.size),
    distinctCompanies: Math.max(1, companies.size),
  };
}

export function buildSkillMetrics(signals: Signal[], minFrequency = 2): SkillMetric[] {
  const agg = aggregateSkills(signals);
  const stats = corpusStats(signals);
  // Frequency is scored relative to the most-mentioned skill in this
  // collection, which keeps the component discriminative instead of saturating
  // at 100 for every common skill.
  const maxFrequency = Math.max(1, ...Array.from(agg.values(), (a) => a.frequency));
  const metrics: SkillMetric[] = [];

  for (const a of agg.values()) {
    if (a.frequency < minFrequency) continue;
    const def = SKILL_BY_SLUG[a.slug];
    const growth = computeGrowth(a.recent, a.prior, Boolean(def?.emerging));

    const frequencyShare = a.frequency / Math.max(1, stats.totalSignals);
    const frequencyNorm = a.frequency / maxFrequency;
    const roleDiv = a.roles.size / stats.distinctRoles;
    const companyDiv = a.companies.size / Math.min(stats.distinctCompanies, 40);
    const sourceBreadth = a.sources.size / stats.distinctSources;
    const recency = a.frequency ? a.recencyHits / a.frequency : 0;
    const growthNorm = clamp(50 + tanh(growth.growthPct / 1.2) * 50) / 100;

    const pts = (component: number, weight: number) => Math.round(component * weight * 10) / 10;
    const breakdown: ScoreBreakdown = {
      frequency: pts(clamp(frequencyNorm * 100), DEMAND_WEIGHTS.frequency),
      roleDiversity: pts(clamp(roleDiv * 100), DEMAND_WEIGHTS.roleDiversity),
      companyDiversity: pts(clamp(companyDiv * 100), DEMAND_WEIGHTS.companyDiversity),
      sourceBreadth: pts(clamp(sourceBreadth * 100), DEMAND_WEIGHTS.sourceBreadth),
      recency: pts(clamp(recency * 100), DEMAND_WEIGHTS.recency),
      growth: pts(clamp(growthNorm * 100), DEMAND_WEIGHTS.growth),
    };

    const demandScore = clamp(
      round1(
        clamp(frequencyNorm * 100) * DEMAND_WEIGHTS.frequency +
          clamp(roleDiv * 100) * DEMAND_WEIGHTS.roleDiversity +
          clamp(companyDiv * 100) * DEMAND_WEIGHTS.companyDiversity +
          clamp(sourceBreadth * 100) * DEMAND_WEIGHTS.sourceBreadth +
          clamp(recency * 100) * DEMAND_WEIGHTS.recency +
          clamp(growthNorm * 100) * DEMAND_WEIGHTS.growth,
      ),
    );

    metrics.push({
      slug: a.slug,
      name: def?.name ?? a.slug,
      category: def?.category ?? "Other",
      frequency: a.frequency,
      uniqueSources: a.sources.size,
      roleDiversity: a.roles.size,
      companyDiversity: a.companies.size,
      share: round1(frequencyShare * 100),
      recencyScore: round1(clamp(recency * 100)),
      growthScore: round1(growth.growthPct * 100),
      demandScore,
      momentumScore: growth.momentumScore,
      classification: growth.classification,
      emerging: Boolean(def?.emerging),
      recentWindow: a.recent,
      priorWindow: a.prior,
      breakdown,
      roles: Array.from(a.roles.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 8),
      companies: Array.from(a.companies.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 8),
    });
  }

  metrics.sort((a, b) => b.demandScore - a.demandScore || b.frequency - a.frequency);
  return metrics;
}

/** Market score: how hot is this query's market overall (0-100). */
export function computeMarketScore(metrics: SkillMetric[], signals: Signal[]): number {
  if (!metrics.length) return 0;
  const top = metrics.slice(0, 10);
  const demandAvg = top.reduce((s, m) => s + m.demandScore, 0) / top.length;
  const momentumAvg = top.reduce((s, m) => s + m.momentumScore, 0) / top.length;

  const volume = clamp(Math.log2(1 + signals.length) / Math.log2(1 + 200), 0, 1) * 100;
  const freshness = signals.length
    ? clamp(100 - (signals.reduce((s, x) => s + x.publishedDaysAgo, 0) / signals.length) * 1.4)
    : 0;
  const diversity = clamp((new Set(signals.map((s) => s.company)).size / Math.max(1, signals.length)) * 140);

  return clamp(
    round1(demandAvg * 0.4 + momentumAvg * 0.15 + volume * 0.2 + freshness * 0.15 + diversity * 0.1),
  );
}

/** Momentum score for the whole market slice. */
export function computeMomentumScore(metrics: SkillMetric[]): number {
  if (!metrics.length) return 50;
  const top = metrics.slice(0, 15);
  const weighted = top.reduce((s, m) => s + m.momentumScore * (0.5 + m.demandScore / 100), 0);
  const weights = top.reduce((s, m) => s + 0.5 + m.demandScore / 100, 0);
  return clamp(round1(weighted / Math.max(0.0001, weights)));
}

export function explainDemandScore(m: SkillMetric): string[] {
  return [
    `Frequency: mentioned in ${m.frequency} of the collected signals (${m.share}% share), scored against the most-mentioned skill in this collection → ${m.breakdown.frequency} pts of 35`,
    `Role diversity: asked for by ${m.roleDiversity} distinct roles → ${m.breakdown.roleDiversity} pts of 20`,
    `Company diversity: ${m.companyDiversity} distinct employers → ${m.breakdown.companyDiversity} pts of 10`,
    `Source breadth: appeared on ${m.uniqueSources} channel(s) → ${m.breakdown.sourceBreadth} pts of 10`,
    `Recency: ${m.recencyScore}% of its mentions are from the last 14 days → ${m.breakdown.recency} pts of 10`,
    `Growth: ${m.recentWindow} mentions in the last 30d vs ${m.priorWindow} in the prior 60d (${m.growthScore >= 0 ? "+" : ""}${m.growthScore}%) → ${m.breakdown.growth} pts of 15`,
  ];
}

export function explainMomentum(m: SkillMetric): string {
  const direction =
    m.classification === "Declining"
      ? "fewer recent mentions than the prior window"
      : m.classification === "Stable"
        ? "roughly the same mention rate as the prior window"
        : "more recent mentions than the prior window";
  return `${m.recentWindow} mentions in the last ${RECENT_WINDOW_DAYS} days vs ${m.priorWindow} in the previous ${
    PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS
  } days — ${direction}. Momentum index ${m.momentumScore}/100 (50 = flat).`;
}
