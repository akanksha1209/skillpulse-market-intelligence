import { analyzeSkillGap } from "@/lib/analytics/gap";
import { getAnalysis, getLatestAnalysis } from "@/lib/db/store";
import { ROLE_LABELS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { skills?: unknown; role?: unknown; analysisId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const rawSkills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string")
    : typeof body.skills === "string"
      ? body.skills.split(",").map((s) => s.trim())
      : [];

  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : ROLE_LABELS[0];

  if (!rawSkills.length) {
    return Response.json(
      { error: "Provide at least one skill in 'skills' (array of strings or comma separated)." },
      { status: 400 },
    );
  }

  const analysis = body.analysisId ? await getAnalysis(body.analysisId) : await getLatestAnalysis();
  const gap = analyzeSkillGap(rawSkills, role, analysis);

  return Response.json({
    gap,
    basis: analysis ? { analysisId: analysis.id, source: analysis.source, isDemo: analysis.isDemo } : null,
    availableRoles: ROLE_LABELS,
  });
}

export async function GET() {
  return Response.json({ roles: ROLE_LABELS, usage: "POST { skills: string[], role: string, analysisId?: string }" });
}
