import { runSearch } from "@/lib/services/search-service";
import type { SearchPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let payload: SearchPayload;
  try {
    payload = (await req.json()) as SearchPayload;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload || typeof payload.query !== "string" || !payload.query.trim()) {
    return Response.json(
      { error: "Field 'query' is required (e.g. \"machine learning engineer India\")." },
      { status: 400 },
    );
  }

  try {
    const outcome = await runSearch(payload);
    return Response.json({
      analysis: outcome.analysis,
      persisted: outcome.persisted,
      persistenceError: outcome.persistenceError ?? null,
    });
  } catch (e) {
    return Response.json(
      { error: "Analysis failed unexpectedly.", detail: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? "";
  if (!query.trim()) {
    return Response.json({ error: "Provide ?q=<market query>" }, { status: 400 });
  }
  const outcome = await runSearch({
    query,
    location: url.searchParams.get("location") ?? "India",
    limit: Number(url.searchParams.get("limit") ?? 40),
    forceDemo: url.searchParams.get("demo") === "1",
  });
  return Response.json({ analysis: outcome.analysis, persisted: outcome.persisted });
}
