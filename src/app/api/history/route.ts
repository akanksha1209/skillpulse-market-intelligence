import { listHistory } from "@/lib/db/store";
import { getSerpApiStatus } from "@/lib/data/serpapi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 40)));
  const items = await listHistory(limit);
  return Response.json({
    count: items.length,
    items,
    liveCapable: getSerpApiStatus().configured,
  });
}
