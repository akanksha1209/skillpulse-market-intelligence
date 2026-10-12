import { buildReportDocument, csvFor, filename, CSV_DATASETS, type CsvDataset } from "@/lib/analytics/export";
import { getAnalysis } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/{id}?format=json|csv&dataset=skills|signals|roles|companies|edges|timeline
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const dataset = (url.searchParams.get("dataset") ?? "skills") as CsvDataset;

  const analysis = await getAnalysis(decodeURIComponent(id));
  if (!analysis) return Response.json({ error: "Analysis not found." }, { status: 404 });

  if (format === "csv") {
    if (!CSV_DATASETS.includes(dataset)) {
      return Response.json({ error: `dataset must be one of ${CSV_DATASETS.join(", ")}` }, { status: 400 });
    }
    const csv = csvFor(analysis, dataset);
    if (!csv) return Response.json({ error: "No rows to export for this dataset." }, { status: 404 });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename(analysis, "csv", dataset)}"`,
      },
    });
  }

  const doc = buildReportDocument(analysis);
  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename(analysis, "json")}"`,
    },
  });
}
