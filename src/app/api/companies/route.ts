import { aggregateCompanyStats, getAnalysis, getLatestAnalysis } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/companies?id=&industry=&role=&skill=&location=
 * Filters are applied to the stored signals of one analysis.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const industry = url.searchParams.get("industry")?.toLowerCase();
  const role = url.searchParams.get("role")?.toLowerCase();
  const skill = url.searchParams.get("skill")?.toLowerCase();
  const location = url.searchParams.get("location")?.toLowerCase();

  const analysis = id ? await getAnalysis(id) : await getLatestAnalysis();
  let signals = analysis?.signals ?? [];

  if (industry) signals = signals.filter((s) => s.industry.toLowerCase().includes(industry));
  if (role) signals = signals.filter((s) => s.role.toLowerCase().includes(role));
  if (location) signals = signals.filter((s) => s.location.toLowerCase().includes(location));
  if (skill) {
    signals = signals.filter((s) =>
      s.skills.some((slug) => slug.includes(skill) || slug.replace(/-/g, " ").includes(skill)),
    );
  }

  const counts = new Map<string, { count: number; industries: Set<string>; roles: Set<string>; locations: Set<string> }>();
  for (const s of signals) {
    const e = counts.get(s.company) ?? { count: 0, industries: new Set<string>(), roles: new Set<string>(), locations: new Set<string>() };
    e.count += 1;
    if (s.industry) e.industries.add(s.industry);
    if (s.role) e.roles.add(s.role);
    if (s.location) e.locations.add(s.location);
    counts.set(s.company, e);
  }

  const companies = Array.from(counts.entries())
    .map(([name, e]) => ({
      name,
      count: e.count,
      share: signals.length ? Math.round((e.count / signals.length) * 1000) / 10 : 0,
      industries: Array.from(e.industries),
      roles: Array.from(e.roles).slice(0, 6),
      locations: Array.from(e.locations).slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count);

  return Response.json({
    analysisId: analysis?.id ?? null,
    source: analysis?.source ?? null,
    isDemo: analysis?.isDemo ?? null,
    filters: { industry, role, skill, location },
    matchedSignals: signals.length,
    companies: companies.slice(0, 60),
    industries: analysis?.industries ?? [],
    historical: await aggregateCompanyStats(),
  });
}
