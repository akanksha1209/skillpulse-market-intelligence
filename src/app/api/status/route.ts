import { systemStatus } from "@/lib/services/search-service";
import { checkDb } from "@/lib/db/store";
import { SKILLS, ROLE_SEEDS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/** Runtime capability probe used by the UI to label live vs demo mode. */
export async function GET() {
  const database = await checkDb();
  return Response.json({
    ...systemStatus(),
    database,
    taxonomy: { skills: SKILLS.length, roles: ROLE_SEEDS.length },
  });
}
