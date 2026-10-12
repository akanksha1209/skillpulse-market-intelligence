import { getAnalysis, getLatestAnalysis } from "@/lib/db/store";
import { ROLE_SEEDS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const name = url.searchParams.get("role");
  const analysis = id ? await getAnalysis(id) : await getLatestAnalysis();

  let roles = analysis?.roles ?? [];
  if (name) {
    const needle = name.toLowerCase();
    roles = roles.filter((r) => r.role.toLowerCase().includes(needle));
  }

  return Response.json({
    analysisId: analysis?.id ?? null,
    source: analysis?.source ?? null,
    isDemo: analysis?.isDemo ?? null,
    roles,
    catalogue: ROLE_SEEDS.map((r) => ({ slug: r.slug, label: r.label, industries: r.industries })),
  });
}
