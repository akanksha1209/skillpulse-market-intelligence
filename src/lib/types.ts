/**
 * SkillPulse – shared domain types.
 * These types are mirrored by the FastAPI backend (`backend/app/schemas`).
 */

export type DataSource = "serpapi" | "demo" | "cache";
export type AnalysisStatus = "completed" | "partial" | "failed";

export type MomentumClass =
  | "Exploding"
  | "Growing"
  | "Stable"
  | "Declining"
  | "Emerging";

export interface Signal {
  id: string;
  title: string;
  company: string;
  industry: string;
  role: string;
  location: string;
  via: string;
  url: string;
  snippet: string;
  publishedDaysAgo: number;
  experienceLevel: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  /** canonical skill slugs detected in this signal */
  skills: string[];
}

export interface ScoreBreakdown {
  frequency: number;
  sourceBreadth: number;
  roleDiversity: number;
  companyDiversity: number;
  recency: number;
  growth: number;
}

export interface SkillMetric {
  slug: string;
  name: string;
  category: string;
  frequency: number;
  uniqueSources: number;
  roleDiversity: number;
  companyDiversity: number;
  share: number;
  recencyScore: number;
  growthScore: number;
  demandScore: number;
  momentumScore: number;
  classification: MomentumClass;
  emerging: boolean;
  recentWindow: number;
  priorWindow: number;
  breakdown: ScoreBreakdown;
  roles: { name: string; count: number }[];
  companies: { name: string; count: number }[];
}

export interface SkillEdge {
  skillA: string;
  skillB: string;
  nameA: string;
  nameB: string;
  support: number;
  weight: number;
  lift: number;
}

export interface RoleInsight {
  role: string;
  signalCount: number;
  share: number;
  demandScore: number;
  topSkills: { slug: string; name: string; demandScore: number }[];
  emergingSkills: { slug: string; name: string; momentumScore: number }[];
  tools: string[];
  industries: { name: string; count: number }[];
  companies: { name: string; count: number }[];
  experience: { level: string; count: number }[];
  relatedRoles: { role: string; overlap: number }[];
  salary: { min: number | null; max: number | null; avg: number | null };
}

export interface TimePoint {
  label: string;
  weekIndex: number;
  signals: number;
  demandIndex: number;
  emergingIndex: number;
}

export interface MarketOverview {
  totalSignals: number;
  uniqueSkills: number;
  uniqueCompanies: number;
  uniqueRoles: number;
  uniqueIndustries: number;
  avgSkillsPerSignal: number;
  marketScore: number;
  momentumScore: number;
  freshnessDays: number;
  salaryAvg: number | null;
}

export interface MarketAnalysis {
  id: string;
  query: string;
  canonicalQuery: string;
  location: string;
  source: DataSource;
  isDemo: boolean;
  status: AnalysisStatus;
  notes: string[];
  createdAt: string;
  overview: MarketOverview;
  skills: SkillMetric[];
  edges: SkillEdge[];
  roles: RoleInsight[];
  companies: { name: string; count: number; share: number; industries: string[] }[];
  industries: { name: string; count: number; share: number }[];
  emerging: { slug: string; name: string; demandScore: number; momentumScore: number }[];
  timeline: TimePoint[];
  classificationCounts: Record<MomentumClass, number>;
  signals: Signal[];
}

export interface SkillGapResult {
  role: string;
  readiness: number;
  matched: { slug: string; name: string; demandScore: number; weight: number }[];
  missing: { slug: string; name: string; demandScore: number; weight: number; difficulty: number }[];
  extras: { slug: string; name: string }[];
  requiredSkills: { slug: string; name: string; demandScore: number; weight: number }[];
  explanation: string[];
  earnedScore: number;
  totalScore: number;
}

export interface RoadmapWeek {
  week: number;
  theme: string;
  focus: { slug: string; name: string; reason: string; hours: number }[];
  deliverable: string;
  resources: string[];
  estimatedHours: number;
}

export interface Roadmap {
  role: string;
  totalHours: number;
  weeks: RoadmapWeek[];
  prioritisation: { slug: string; name: string; priority: number; reason: string }[];
  notes: string[];
}

export interface ReportSection {
  key: string;
  label: string;
  /** observed = measured from collected signals, calculated = derived metric, ai = model interpretation */
  provenance: "observed" | "calculated" | "ai";
  body: string;
  bullets?: string[];
}

export interface MarketReport {
  id: string;
  searchId: string;
  query: string;
  mode: "llm" | "heuristic";
  model: string | null;
  headline: string;
  sections: ReportSection[];
  createdAt: string;
  disclaimer: string;
}

export interface SearchPayload {
  query: string;
  location?: string;
  limit?: number;
  forceDemo?: boolean;
}
