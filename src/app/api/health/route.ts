import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSerpApiStatus } from "@/lib/data/serpapi";
import { getLlmConfig } from "@/lib/analytics/insights";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    database = false;
  }

  return Response.json({
    ok: true,
    service: "skillpulse",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    components: {
      database,
      serpapi: getSerpApiStatus().configured ? "configured" : "missing-key (demo fallback active)",
      llm: getLlmConfig().available ? "configured" : "missing-key (deterministic fallback active)",
    },
    mode: getSerpApiStatus().configured ? "live-capable" : "demo",
  });
}
