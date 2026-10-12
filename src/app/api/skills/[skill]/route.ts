import { partnersFor } from "@/lib/analytics/pipeline";
import { explainDemandScore, explainMomentum } from "@/lib/analytics/scoring";
import { aliasesFor } from "@/lib/analytics/extractor";
import { getAnalysis, getLatestAnalysis } from "@/lib/db/store";
import { SKILL_BY_SLUG, SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/** GET /api/skills/{slug} — deep dive for one skill. */
export async function GET(_req: Request, ctx: { params: Promise<{ skill: string }> }) {
  const { skill } = await ctx.params;
  const slug = decodeURIComponent(skill).toLowerCase();
  const def = SKILL_BY_SLUG[slug];
  const analysis = await getLatestAnalysis();
  const metric = analysis?.skills.find((s) => s.slug === slug);

  const demandingRoles = analysis?.roles
    .filter((r) => r.topSkills.some((s) => s.slug === slug))
    .map((r) => ({
      role: r.role,
      demandScore: r.topSkills.find((s) => s.slug === slug)?.demandScore ?? 0,
      signals: r.signalCount,
    }))
    .sort((a, b) => b.demandScore - a.demandScore) ?? [];

  return Response.json({
    slug,
    name: def?.name ?? SKILL_NAME_BY_SLUG[slug] ?? slug,
    category: def?.category ?? "Other",
    difficulty: def?.difficulty ?? null,
    emerging: def?.emerging ?? false,
    aliases: aliasesFor(slug),
    prerequisites: (def?.prerequisites ?? []).map((p) => ({ slug: p, name: SKILL_NAME_BY_SLUG[p] ?? p })),
    found: Boolean(metric),
    metric: metric ?? null,
    explanation: metric ? explainDemandScore(metric) : null,
    momentumExplanation: metric ? explainMomentum(metric) : null,
    partners: metric && analysis ? partnersFor(analysis.edges, slug, 10) : [],
    roles: demandingRoles,
    analysisId: analysis?.id ?? null,
    source: analysis?.source ?? null,
  });
}
