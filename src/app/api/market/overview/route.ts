import { getAnalysis, getLatestAnalysis } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  const analysis = id ? await getAnalysis(id) : await getLatestAnalysis();
  if (!analysis) {
    return Response.json({
      analysis: null,
      empty: true,
      message: "No market analysis has been run yet. Use POST /api/search or the Try Demo button.",
    });
  }

  const { signals: _signals, ...rest } = analysis;
  return Response.json({
    analysis: rest,
    empty: false,
    sampleSignals: _signals.slice(0, 12),
  });
}
