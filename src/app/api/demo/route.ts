import { runSearch } from "@/lib/services/search-service";
import { DEMO_QUERIES } from "@/lib/data/demo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { query?: string; location?: string } = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    body = {};
  }

  const query = body.query?.trim() || "AI Engineer India";
  const location = body.location?.trim() || "India";

  const outcome = await runSearch({
    query,
    location,
    limit: 40,
    forceDemo: true,
  });

  return Response.json({
    demo: true,
    analysis: outcome.analysis,
    persisted: outcome.persisted,
    suggestedQueries: DEMO_QUERIES,
  });
}
