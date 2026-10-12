"use client";

import { useState } from "react";
import Link from "next/link";
import type { SkillEdge, SkillMetric } from "@/lib/types";
import { CooccurrenceHeatmap, SkillNetwork } from "@/components/charts";
import { Badge, Card, CardHeader, IconNetwork } from "@/components/ui";

export function CooccurrencePanel({ skills, edges }: { skills: SkillMetric[]; edges: SkillEdge[] }) {
  const [view, setView] = useState<"pairs" | "network" | "heatmap">("pairs");

  const tabs = [
    { id: "pairs" as const, label: "Top pairs" },
    { id: "network" as const, label: "Network" },
    { id: "heatmap" as const, label: "Heatmap" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Skill Co-occurrence"
        subtitle="Which skills are hired together — lift > 1 means the pair beats chance."
        icon={<IconNetwork className="h-4 w-4" />}
        right={
          <div className="flex gap-1 rounded-lg border border-white/8 bg-white/3 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  view === t.id ? "bg-pulse-400/16 text-pulse-300" : "text-mist-500 hover:text-mist-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="p-4">
        {!edges.length ? (
          <p className="py-10 text-center text-[12.5px] text-mist-500">
            Not enough overlapping postings in this sample to compute reliable pairs.
          </p>
        ) : view === "pairs" ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {edges.slice(0, 12).map((e) => (
              <div
                key={`${e.skillA}-${e.skillB}`}
                className="rounded-xl border border-white/7 bg-white/[0.022] px-3 py-2.5 transition-colors hover:border-pulse-400/30"
              >
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-white">
                  <Link href={`/skills?skill=${e.skillA}`} className="hover:text-pulse-300">{e.nameA}</Link>
                  <span className="text-mist-500">+</span>
                  <Link href={`/skills?skill=${e.skillB}`} className="hover:text-pulse-300">{e.nameB}</Link>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="pulse">lift {e.lift}×</Badge>
                  <span className="sp-num text-[11px] text-mist-500">{e.support} shared signals</span>
                  <span className="sp-num ml-auto text-[11px] text-mist-500">{e.weight}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : view === "network" ? (
          <SkillNetwork edges={edges} skills={skills} />
        ) : (
          <CooccurrenceHeatmap skills={skills} edges={edges} />
        )}
      </div>
    </Card>
  );
}
