import { deleteAnalysis, getAnalysis } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const analysis = await getAnalysis(decodeURIComponent(id));
  if (!analysis) return Response.json({ error: "Analysis not found." }, { status: 404 });
  return Response.json({ analysis });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = await deleteAnalysis(decodeURIComponent(id));
  return ok
    ? Response.json({ deleted: true, id })
    : Response.json({ deleted: false, error: "Database unavailable." }, { status: 500 });
}
