import { generateMarketInsight } from "@/lib/analytics/insights";
import { getAnalysis, getLatestAnalysis, saveReport } from "@/lib/db/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/market-report — AI-assisted (with deterministic fallback) report. */
export async function POST(req: Request) {
  let body: { searchId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const analysis = body.searchId ? await getAnalysis(body.searchId) : await getLatestAnalysis();
  if (!analysis) {
    return Response.json(
      { error: "No analysis available. Run POST /api/search (or Try Demo) first." },
      { status: 404 },
    );
  }

  const report = await generateMarketInsight(analysis);
  const stored = await saveReport(report);
  return Response.json({ report, stored });
}
