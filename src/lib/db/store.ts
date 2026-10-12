import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reports, searches, skillEdges, skillMetrics, signals } from "@/db/schema";
import type { MarketAnalysis, MarketReport, Signal } from "@/lib/types";

/**
 * Persistence helpers.
 *
 * The full MarketAnalysis snapshot is stored as JSONB on the search row so a
 * historical analysis can be re-opened instantly, while the normalised
 * `signals` / `skill_metrics` / `skill_edges` tables make the same data
 * queryable with SQL (used by /api/skills and /api/companies).
 */

let dbHealthy: boolean | null = null;

export async function checkDb(): Promise<boolean> {
  if (dbHealthy === false && Date.now() - (checkDb.lastFail ?? 0) < 30_000) return false;
  try {
    await db.execute(sql`select 1`);
    dbHealthy = true;
    return true;
  } catch {
    dbHealthy = false;
    checkDb.lastFail = Date.now();
    return false;
  }
}
checkDb.lastFail = 0;

export async function saveAnalysis(a: MarketAnalysis): Promise<{ saved: boolean; error?: string }> {
  try {
    await db.delete(searches).where(eq(searches.id, a.id));
    await db.insert(searches).values({
      id: a.id,
      query: a.query,
      canonicalQuery: a.canonicalQuery,
      location: a.location,
      source: a.source,
      status: a.status,
      isDemo: a.isDemo,
      signalCount: a.overview.totalSignals,
      marketScore: a.overview.marketScore,
      momentumScore: a.overview.momentumScore,
      topSkill: a.skills[0]?.name ?? null,
      notes: a.notes,
      analysis: a as unknown as Record<string, unknown>,
      createdAt: new Date(a.createdAt),
    });

    if (a.signals.length) {
      await db.insert(signals).values(
        a.signals.map((s) => ({
          id: `${a.id}:${s.id}`.slice(0, 180),
          searchId: a.id,
          title: s.title.slice(0, 300),
          company: s.company?.slice(0, 160) ?? null,
          industry: s.industry?.slice(0, 80) ?? null,
          role: s.role?.slice(0, 120) ?? null,
          location: s.location?.slice(0, 120) ?? null,
          via: s.via?.slice(0, 80) ?? null,
          url: s.url?.slice(0, 400) ?? null,
          snippet: s.snippet?.slice(0, 1200) ?? null,
          publishedDaysAgo: s.publishedDaysAgo,
          experienceLevel: s.experienceLevel?.slice(0, 60) ?? null,
          employmentType: s.employmentType?.slice(0, 40) ?? null,
          salaryMin: s.salaryMin,
          salaryMax: s.salaryMax,
          skills: s.skills,
        })),
      );
    }

    if (a.skills.length) {
      await db.insert(skillMetrics).values(
        a.skills.map((m, i) => ({
          id: `${a.id}:sk:${i}`,
          searchId: a.id,
          slug: m.slug,
          name: m.name,
          category: m.category,
          frequency: m.frequency,
          uniqueSources: m.uniqueSources,
          roleDiversity: m.roleDiversity,
          companyDiversity: m.companyDiversity,
          recencyScore: m.recencyScore,
          growthScore: m.growthScore,
          demandScore: m.demandScore,
          momentumScore: m.momentumScore,
          classification: m.classification,
          emerging: m.emerging,
          recentWindow: m.recentWindow,
          priorWindow: m.priorWindow,
        })),
      );
    }

    if (a.edges.length) {
      await db.insert(skillEdges).values(
        a.edges.map((e, i) => ({
          id: `${a.id}:ed:${i}`,
          searchId: a.id,
          skillA: e.skillA,
          skillB: e.skillB,
          support: e.support,
          weight: e.weight,
          lift: e.lift,
        })),
      );
    }

    return { saved: true };
  } catch (e) {
    dbHealthy = false;
    checkDb.lastFail = Date.now();
    return { saved: false, error: (e as Error).message };
  }
}

export async function saveReport(r: MarketReport): Promise<boolean> {
  try {
    await db.insert(reports).values({
      id: r.id,
      searchId: r.searchId,
      mode: r.mode,
      model: r.model,
      sections: { headline: r.headline, sections: r.sections, disclaimer: r.disclaimer } as unknown as Record<string, unknown>,
      createdAt: new Date(r.createdAt),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getAnalysis(id: string): Promise<MarketAnalysis | null> {
  try {
    const rows = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
    const row = rows[0];
    if (!row?.analysis) return null;
    return row.analysis as unknown as MarketAnalysis;
  } catch {
    return null;
  }
}

export async function getLatestAnalysis(): Promise<MarketAnalysis | null> {
  try {
    const rows = await db.select().from(searches).orderBy(desc(searches.createdAt)).limit(1);
    const row = rows[0];
    if (!row?.analysis) return null;
    return row.analysis as unknown as MarketAnalysis;
  } catch {
    return null;
  }
}

export interface HistoryItem {
  id: string;
  query: string;
  location: string;
  source: string;
  isDemo: boolean;
  status: string;
  signalCount: number;
  marketScore: number | null;
  momentumScore: number | null;
  topSkill: string | null;
  createdAt: string;
}

export async function listHistory(limit = 40): Promise<HistoryItem[]> {
  try {
    const rows = await db
      .select({
        id: searches.id,
        query: searches.query,
        location: searches.location,
        source: searches.source,
        isDemo: searches.isDemo,
        status: searches.status,
        signalCount: searches.signalCount,
        marketScore: searches.marketScore,
        momentumScore: searches.momentumScore,
        topSkill: searches.topSkill,
        createdAt: searches.createdAt,
      })
      .from(searches)
      .orderBy(desc(searches.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, location: r.location ?? "", createdAt: r.createdAt.toISOString() }));
  } catch {
    return [];
  }
}

/** Cached collection: reuse previously stored signals for the same query. */
export async function cachedSignals(query: string, limit = 200): Promise<Signal[]> {
  const canonical = query.trim().toLowerCase();
  try {
    const rows = await db
      .select({ searchId: searches.id, createdAt: searches.createdAt })
      .from(searches)
      .where(sql`lower(${searches.canonicalQuery}) = ${canonical}`)
      .orderBy(desc(searches.createdAt))
      .limit(1);
    if (!rows.length) return [];
    const sigRows = await db.select().from(signals).where(eq(signals.searchId, rows[0].searchId)).limit(limit);
    return sigRows.map((s) => ({
      id: s.id,
      title: s.title,
      company: s.company ?? "",
      industry: s.industry ?? "",
      role: s.role ?? "",
      location: s.location ?? "",
      via: s.via ?? "",
      url: s.url ?? "",
      snippet: s.snippet ?? "",
      publishedDaysAgo: s.publishedDaysAgo ?? 30,
      experienceLevel: s.experienceLevel ?? "",
      employmentType: s.employmentType ?? "",
      salaryMin: s.salaryMin,
      salaryMax: s.salaryMax,
      skills: (s.skills ?? []) as string[],
    }));
  } catch {
    return [];
  }
}

/** Cross-analysis aggregation used by the Skills / Companies index pages. */
export async function aggregateSkillStats() {
  try {
    const rows = await db
      .select({
        slug: skillMetrics.slug,
        name: skillMetrics.name,
        category: skillMetrics.category,
        analyses: sql<number>`count(*)::int`,
        avgDemand: sql<number>`round(avg(${skillMetrics.demandScore})::numeric, 1)::float`,
        avgMomentum: sql<number>`round(avg(${skillMetrics.momentumScore})::numeric, 1)::float`,
        totalFrequency: sql<number>`sum(${skillMetrics.frequency})::int`,
        emerging: sql<boolean>`bool_or(${skillMetrics.emerging})`,
      })
      .from(skillMetrics)
      .groupBy(skillMetrics.slug, skillMetrics.name, skillMetrics.category)
      .orderBy(sql`sum(${skillMetrics.frequency}) desc`)
      .limit(200);
    return rows;
  } catch {
    return [];
  }
}

export async function aggregateCompanyStats() {
  try {
    const rows = await db
      .select({
        company: signals.company,
        industry: signals.industry,
        mentions: sql<number>`count(*)::int`,
        roles: sql<number>`count(distinct ${signals.role})::int`,
      })
      .from(signals)
      .where(sql`${signals.company} is not null`)
      .groupBy(signals.company, signals.industry)
      .orderBy(sql`count(*) desc`)
      .limit(100);
    return rows;
  } catch {
    return [];
  }
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    await db.delete(searches).where(eq(searches.id, id));
    return true;
  } catch {
    return false;
  }
}
