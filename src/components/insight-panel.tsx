"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { MarketAnalysis, MarketReport } from "@/lib/types";
import { Badge, Card, CardHeader, ErrorState, ProvenanceTag, Spinner, IconSpark } from "@/components/ui";

export function InsightPanel({ analysis }: { analysis: MarketAnalysis }) {
  const [report, setReport] = useState<MarketReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.report(analysis.id);
      setReport(res.report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Market Intelligence Report"
        subtitle="Deterministic engine first; the LLM only rewrites prose when a key is configured."
        icon={<IconSpark className="h-4 w-4" />}
        right={
          <button onClick={generate} disabled={loading} className="sp-btn sp-btn-primary !py-2 text-[12.5px]">
            {loading ? <Spinner size={12} /> : <IconSpark className="h-3.5 w-3.5" />}
            {report ? "Regenerate" : "Generate Market Intelligence"}
          </button>
        }
      />
      <div className="p-4">
        {error ? <ErrorState message={error} onRetry={generate} /> : null}

        {!report && !loading && !error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-[13px] text-mist-400">
              Produce a written market-signal report for <span className="text-white">"{analysis.query}"</span>.
            </p>
            <p className="max-w-lg text-[11.5px] leading-relaxed text-mist-500">
              Sections are tagged <span className="text-pulse-300">OBSERVED DATA</span>,{" "}
              <span className="text-volt-400">CALCULATED METRIC</span> or{" "}
              <span className="text-violet-signal">AI INTERPRETATION</span> so a model opinion is never mistaken for
              measured market fact.
            </p>
          </div>
        ) : null}

        {loading && !report ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="sp-skeleton h-3 w-32" />
                <div className="sp-skeleton h-3 w-full" />
                <div className="sp-skeleton h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : null}

        {report ? (
          <div className="sp-rise space-y-4">
            <div className="rounded-xl border border-pulse-400/25 bg-pulse-400/6 px-4 py-3">
              <div className="sp-label mb-1 text-[9.5px] text-pulse-300">Headline</div>
              <p className="text-[14.5px] font-medium leading-snug text-white">{report.headline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={report.mode === "llm" ? "violet" : "volt"}>
                  {report.mode === "llm" ? `LLM ASSISTED · ${report.model}` : "DETERMINISTIC ENGINE"}
                </Badge>
                {analysis.isDemo ? <Badge tone="amber">DEMO DATA</Badge> : <Badge tone="pulse">{analysis.source.toUpperCase()}</Badge>}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {report.sections.map((s) => (
                <div key={s.key} className="rounded-xl border border-white/7 bg-white/[0.022] px-3.5 py-3">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-[12.5px] font-semibold uppercase tracking-wide text-white">{s.label}</h4>
                    <ProvenanceTag kind={s.provenance} />
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-mist-200">{s.body}</p>
                  {s.bullets?.length ? (
                    <ul className="mt-2 space-y-1">
                      {s.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-mist-400">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-pulse-400" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="rounded-lg border border-white/7 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-mist-500">
              {report.disclaimer}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
