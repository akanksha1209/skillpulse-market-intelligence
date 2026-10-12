import { DEMAND_WEIGHTS, RECENT_WINDOW_DAYS, PRIOR_WINDOW_DAYS } from "@/lib/analytics/scoring";
import type { MarketAnalysis, MarketReport, SkillGapResult } from "@/lib/types";

/** Report export: JSON document + CSV datasets. */

export type CsvDataset = "skills" | "signals" | "roles" | "companies" | "edges" | "timeline";

export const CSV_DATASETS: CsvDataset[] = ["skills", "signals", "roles", "companies", "edges", "timeline"];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\r\n");
}

export function csvFor(analysis: MarketAnalysis, dataset: CsvDataset): string {
  switch (dataset) {
    case "skills":
      return toCsv(
        analysis.skills.map((s) => ({
          skill: s.name,
          slug: s.slug,
          category: s.category,
          demand_score: s.demandScore,
          momentum_score: s.momentumScore,
          classification: s.classification,
          frequency: s.frequency,
          share_pct: s.share,
          unique_sources: s.uniqueSources,
          role_diversity: s.roleDiversity,
          company_diversity: s.companyDiversity,
          recency_score: s.recencyScore,
          growth_pct: s.growthScore,
          recent_window: s.recentWindow,
          prior_window: s.priorWindow,
          emerging: s.emerging,
          pts_frequency: s.breakdown.frequency,
          pts_role_diversity: s.breakdown.roleDiversity,
          pts_company_diversity: s.breakdown.companyDiversity,
          pts_source_breadth: s.breakdown.sourceBreadth,
          pts_recency: s.breakdown.recency,
          pts_growth: s.breakdown.growth,
        })),
      );
    case "signals":
      return toCsv(
        analysis.signals.map((s) => ({
          id: s.id,
          title: s.title,
          role: s.role,
          company: s.company,
          industry: s.industry,
          location: s.location,
          channel: s.via,
          published_days_ago: s.publishedDaysAgo,
          experience_level: s.experienceLevel,
          employment_type: s.employmentType,
          salary_min: s.salaryMin,
          salary_max: s.salaryMax,
          skills: s.skills.join("; "),
          url: s.url,
        })),
      );
    case "roles":
      return toCsv(
        analysis.roles.map((r) => ({
          role: r.role,
          signals: r.signalCount,
          share_pct: r.share,
          demand_score: r.demandScore,
          top_skills: r.topSkills.map((s) => s.name).join("; "),
          emerging_skills: r.emergingSkills.map((s) => s.name).join("; "),
          industries: r.industries.map((i) => i.name).join("; "),
          companies: r.companies.map((c) => c.name).join("; "),
          salary_avg: r.salary.avg,
        })),
      );
    case "companies":
      return toCsv(
        analysis.companies.map((c) => ({
          company: c.name,
          signals: c.count,
          share_pct: c.share,
          industries: c.industries.join("; "),
        })),
      );
    case "edges":
      return toCsv(
        analysis.edges.map((e) => ({
          skill_a: e.nameA,
          skill_b: e.nameB,
          support: e.support,
          weight_pct: e.weight,
          lift: e.lift,
        })),
      );
    case "timeline":
      return toCsv(
        analysis.timeline.map((t) => ({
          bucket: t.label,
          week_index: t.weekIndex,
          signals: t.signals,
          demand_index: t.demandIndex,
          emerging_share_pct: t.emergingIndex,
        })),
      );
  }
}

export interface ReportDocument {
  report: {
    product: string;
    version: string;
    generatedAt: string;
    query: string;
    canonicalQuery: string;
    location: string;
    dataSource: string;
    demoMode: boolean;
    status: string;
    notes: string[];
    methodology: {
      demandScoreWeights: typeof DEMAND_WEIGHTS;
      momentumWindows: { recentDays: number; priorDays: number };
      momentumScale: string;
      cooccurrence: string;
      classification: Record<string, string>;
    };
  };
  marketOverview: MarketAnalysis["overview"];
  topSkills: MarketAnalysis["skills"];
  emergingTechnologies: MarketAnalysis["emerging"];
  skillCooccurrence: MarketAnalysis["edges"];
  roles: MarketAnalysis["roles"];
  companies: MarketAnalysis["companies"];
  industries: MarketAnalysis["industries"];
  demandOverTime: MarketAnalysis["timeline"];
  insight?: MarketReport;
  skillGap?: SkillGapResult;
}

export function buildReportDocument(
  analysis: MarketAnalysis,
  extras?: { insight?: MarketReport; gap?: SkillGapResult },
): ReportDocument {
  return {
    report: {
      product: "SkillPulse – Market Signal Intelligence",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      query: analysis.query,
      canonicalQuery: analysis.canonicalQuery,
      location: analysis.location,
      dataSource: analysis.source,
      demoMode: analysis.isDemo,
      status: analysis.status,
      notes: analysis.notes,
      methodology: {
        demandScoreWeights: DEMAND_WEIGHTS,
        momentumWindows: { recentDays: RECENT_WINDOW_DAYS, priorDays: PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS },
        momentumScale: "0-100, where 50 = flat mention rate between windows",
        cooccurrence: "support = signals containing both skills; lift = observed / expected",
        classification: {
          Exploding: "growth ≥ +70% and ≥3 recent mentions",
          Growing: "growth ≥ +18%",
          Stable: "growth between -18% and +18%",
          Declining: "growth ≤ -18%",
          Emerging: "taxonomy-emerging skill with ≤2 prior-window mentions and ≥2 recent",
        },
      },
    },
    marketOverview: analysis.overview,
    topSkills: analysis.skills,
    emergingTechnologies: analysis.emerging,
    skillCooccurrence: analysis.edges,
    roles: analysis.roles,
    companies: analysis.companies,
    industries: analysis.industries,
    demandOverTime: analysis.timeline,
    insight: extras?.insight,
    skillGap: extras?.gap,
  };
}

export function filename(analysis: MarketAnalysis, ext: string, dataset?: CsvDataset) {
  const slug = analysis.query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const date = new Date(analysis.createdAt).toISOString().slice(0, 10);
  return `skillpulse-${slug || "market"}-${date}${dataset ? `-${dataset}` : ""}.${ext}`;
}
