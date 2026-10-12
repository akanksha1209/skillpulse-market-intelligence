import { aggregateSkillStats, getAnalysis, getLatestAnalysis } from "@/lib/db/store";
import { SKILLS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/**
 * GET /api/skills?id=<analysisId>&q=<text>&classification=<Exploding|...>&limit=
 * Returns skill metrics for one analysis plus cross-analysis aggregates.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const classification = url.searchParams.get("classification");
  const category = url.searchParams.get("category");
  const limit = Number(url.searchParams.get("limit") ?? 60);

  const analysis = id ? await getAnalysis(id) : await getLatestAnalysis();
  let skills = analysis?.skills ?? [];

  if (q) skills = skills.filter((s) => s.name.toLowerCase().includes(q) || s.slug.includes(q));
  if (classification) skills = skills.filter((s) => s.classification === classification);
  if (category) skills = skills.filter((s) => s.category === category);

  const historical = await aggregateSkillStats();

  return Response.json({
    analysisId: analysis?.id ?? null,
    source: analysis?.source ?? null,
    isDemo: analysis?.isDemo ?? null,
    count: skills.length,
    skills: skills.slice(0, limit),
    historical,
    taxonomySize: SKILLS.length,
    categories: Array.from(new Set(SKILLS.map((s) => s.category))),
  });
}
