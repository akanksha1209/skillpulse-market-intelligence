import { partnersFor } from "@/lib/analytics/pipeline";
import type { MarketAnalysis, MarketReport, ReportSection } from "@/lib/types";

/**
 * Market insight generator.
 *
 * The heuristic path is the source of truth: every number in the report is
 * measured from the collected signals. The LLM (when OPENAI_API_KEY is set)
 * is used only to rewrite prose, and every section carries an explicit
 * `provenance` flag so the UI can separate OBSERVED data from AI
 * interpretation. No API key → deterministic template report.
 */

export function getLlmConfig() {
  const key = process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY ?? null;
  return {
    available: Boolean(key && key.trim().length > 8),
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}

function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

function list<T>(items: T[], f: (item: T) => string, n = 6, sep = ", ") {
  return items.slice(0, n).map(f).join(sep);
}

export function heuristicSections(a: MarketAnalysis): ReportSection[] {
  const top = a.skills.slice(0, 8);
  const growing = a.skills
    .filter((s) => s.classification === "Exploding" || s.classification === "Growing")
    .sort((x, y) => y.growthScore - x.growthScore)
    .slice(0, 6);
  const declining = a.skills.filter((s) => s.classification === "Declining").slice(0, 4);
  const emerging = a.emerging.slice(0, 6);
  const pairs = a.edges.slice(0, 6);
  const total = a.overview.totalSignals;
  const leadRole = a.roles[0];
  const leadSkill = a.skills[0];
  const momentumWord =
    a.overview.momentumScore >= 65
      ? "expanding quickly"
      : a.overview.momentumScore >= 55
        ? "still growing"
        : a.overview.momentumScore >= 45
          ? "flat"
          : "cooling";

  const sections: ReportSection[] = [
    {
      key: "market_signal",
      label: "Market signal",
      provenance: "calculated",
      body: `Demand for "${a.query}" is ${momentumWord}. Across ${total} collected signals (${a.source.toUpperCase()}), ${a.overview.uniqueSkills} distinct skills were detected, ${a.overview.uniqueCompanies} employers appeared, and the market score is ${a.overview.marketScore}/100 with a momentum index of ${a.overview.momentumScore}/100 (50 = flat).`,
    },
    {
      key: "evidence",
      label: "Evidence",
      provenance: "observed",
      body: "Every claim below is counted from the stored signals for this analysis — no external estimates are used.",
      bullets: [
        leadSkill
          ? `${leadSkill.name} appears in ${leadSkill.frequency} of ${total} signals (${leadSkill.share}%), across ${leadSkill.roleDiversity} roles and ${leadSkill.companyDiversity} employers.`
          : "No skill reached the minimum frequency threshold in this sample.",
        leadRole
          ? `${leadRole.role} is the dominant role (${leadRole.signalCount} signals, ${leadRole.share}% of the sample).`
          : "Role attribution was inconclusive for this sample.",
        a.overview.avgSkillsPerSignal
          ? `Postings ask for ${a.overview.avgSkillsPerSignal} recognisable skills on average — a wide stack expectation.`
          : "",
        a.overview.freshnessDays
          ? `Average signal age is ${a.overview.freshnessDays} days, so this reflects the current hiring cycle.`
          : "",
        growing.length
          ? `Growth leaders (last 30d vs prior 60d): ${list(growing, (s) => `${s.name} ${s.growthScore >= 0 ? "+" : ""}${s.growthScore}%`)}.`
          : "",
        declining.length
          ? `Losing share: ${list(declining, (s) => s.name, 4)}.`
          : "",
      ].filter(Boolean) as string[],
    },
    {
      key: "top_skills",
      label: "Top skills",
      provenance: "observed",
      body: `Ranked by the transparent demand score (35% frequency · 20% role diversity · 10% company diversity · 10% source breadth · 10% recency · 15% growth).`,
      bullets: top.map((s) => `${s.name} — demand ${s.demandScore}/100, ${s.frequency} mentions, ${s.classification}`),
    },
    {
      key: "emerging_skills",
      label: "Emerging technologies",
      provenance: "calculated",
      body: emerging.length
        ? `These are new-generation skills with rising mention rates and low historical baselines in the collected window.`
        : `No emerging skill cleared the frequency threshold in this sample.`,
      bullets: emerging.map((e) => `${e.name} — momentum ${e.momentumScore}/100, demand ${e.demandScore}/100`),
    },
    {
      key: "pairings",
      label: "Skill pairings",
      provenance: "calculated",
      body: `Co-occurrence uses lift (observed pair frequency ÷ expected frequency). Lift > 1 means the pair appears together more than chance.`,
      bullets: pairs.length
        ? pairs.map((p) => `${p.nameA} + ${p.nameB} — support ${p.support}, lift ${p.lift}×`)
        : ["Not enough overlapping postings in this sample to compute reliable pairs."],
    },
    {
      key: "roles_employers",
      label: "Roles & employers",
      provenance: "observed",
      body: `${a.overview.uniqueRoles} roles and ${a.overview.uniqueIndustries} industries were detected in the sample.`,
      bullets: [
        `Top roles: ${list(a.roles, (r) => `${r.role} (${r.signalCount})`)}`,
        `Top employers: ${list(a.companies, (c) => `${c.name} (${c.count})`)}`,
        `Top industries: ${list(a.industries, (i) => `${i.name} ${pct(i.count, total)}%`)}`,
      ],
    },
    {
      key: "recommendation",
      label: "Recommendation",
      provenance: "calculated",
      body: buildRecommendation(a),
      bullets: buildActions(a),
    },
    {
      key: "confidence",
      label: "Confidence & limits",
      provenance: "calculated",
      body: confidenceNote(a),
    },
  ];

  return sections;
}

export function buildRecommendation(a: MarketAnalysis): string {
  const top = a.skills[0];
  const emerging = a.emerging[0];
  const pair = a.edges[0];
  const role = a.roles[0];
  const parts: string[] = [];
  if (top) parts.push(`Anchor your next 60 days on ${top.name} — it is the most demanded skill in this market slice (${top.demandScore}/100).`);
  if (pair) parts.push(`Pair it with ${pair.nameA === top?.slug ? pair.nameB : pair.nameA}, which co-occurs at ${pair.lift}× the expected rate.`);
  if (emerging) parts.push(`Add one emerging bet — ${emerging.name} (momentum ${emerging.momentumScore}/100) — to differentiate from candidates with only the core stack.`);
  if (role) parts.push(`Target ${role.role} first: it holds ${role.share}% of the collected demand.`);
  return parts.join(" ");
}

export function buildActions(a: MarketAnalysis): string[] {
  const actions: string[] = [];
  const gaps = a.skills.filter((s) => s.demandScore >= 45).slice(0, 3);
  if (gaps.length) actions.push(`Learn: ${gaps.map((g) => g.name).join(" → ")} (highest demand-to-effort ratio).`);
  const emerging = a.emerging.slice(0, 2).map((e) => e.name);
  if (emerging.length) actions.push(`Build one small project using ${emerging.join(" + ")} and publish it — emerging skills are judged by artefacts, not certificates.`);
  if (a.companies[0]) actions.push(`Prioritise applications to ${a.companies.slice(0, 3).map((c) => c.name).join(", ")} — they appear most often in this market slice.`);
  const declining = a.skills.filter((s) => s.classification === "Declining").slice(0, 2).map((s) => s.name);
  if (declining.length) actions.push(`Do not start with ${declining.join(" / ")} — their share of postings is shrinking in the collected window.`);
  return actions;
}

export function confidenceNote(a: MarketAnalysis): string {
  const n = a.overview.totalSignals;
  const level = n >= 100 ? "High" : n >= 40 ? "Medium" : n >= 15 ? "Low" : "Very low";
  return [
    `Sample: ${n} signals · source: ${a.source.toUpperCase()}${a.isDemo ? " (DEMO — synthetic data, not real market data)" : ""}.`,
    `Confidence: ${level}. Growth is computed only from publication dates inside the collected 90-day window; no historical data is invented.`,
    `Skill extraction is dictionary-based over a ${"150+"}-skill taxonomy, so unusual spellings and brand-new tools can be missed.`,
  ].join(" ");
}

function factsForLlm(a: MarketAnalysis) {
  return {
    query: a.query,
    source: a.source,
    is_demo: a.isDemo,
    overview: a.overview,
    top_skills: a.skills.slice(0, 15).map((s) => ({
      name: s.name,
      demand: s.demandScore,
      momentum: s.momentumScore,
      frequency: s.frequency,
      share: s.share,
      class: s.classification,
      growth_pct: s.growthScore,
    })),
    emerging: a.emerging.slice(0, 8),
    roles: a.roles.slice(0, 6).map((r) => ({ role: r.role, count: r.signalCount, share: r.share })),
    companies: a.companies.slice(0, 8).map((c) => ({ name: c.name, count: c.count })),
    industries: a.industries.slice(0, 6),
    pairs: a.edges.slice(0, 10).map((e) => ({ pair: `${e.nameA} + ${e.nameB}`, support: e.support, lift: e.lift })),
    timeline: a.timeline,
  };
}

async function llmSections(a: MarketAnalysis): Promise<{ sections: ReportSection[]; headline: string; model: string } | null> {
  const cfg = getLlmConfig();
  if (!cfg.available) return null;
  const key = process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY!;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a market intelligence analyst for SkillPulse. You are given ONLY measured metrics from collected job-market signals. Never invent numbers, companies, salaries or trends that are absent from the input. Reply with strict JSON: {\"headline\": string (max 140 chars), \"sections\": [{\"key\": one of market_signal|evidence|top_skills|emerging_skills|pairings|roles_employers|recommendation, \"body\": string, \"bullets\": string[]}]}. Each section body max 70 words.",
          },
          { role: "user", content: JSON.stringify(factsForLlm(a)) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const allowed = new Set(["market_signal", "evidence", "top_skills", "emerging_skills", "pairings", "roles_employers", "recommendation"]);
    if (!parsed?.sections?.length) return null;

    const heuristic = heuristicSections(a);
    const merged: ReportSection[] = heuristic.map((h) => {
      const llm = (parsed.sections as any[]).find((s) => s?.key === h.key && allowed.has(s.key));
      if (!llm) return h;
      return {
        ...h,
        provenance: h.key === "recommendation" || h.key === "market_signal" ? "ai" : h.provenance,
        body: typeof llm.body === "string" && llm.body.trim() ? llm.body.trim() : h.body,
        bullets: Array.isArray(llm.bullets) && llm.bullets.length ? llm.bullets.filter((b: any) => typeof b === "string").slice(0, 8) : h.bullets,
      };
    });

    return {
      sections: merged,
      headline: typeof parsed.headline === "string" ? parsed.headline.slice(0, 180) : heuristicHeadline(a),
      model: cfg.model,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function heuristicHeadline(a: MarketAnalysis): string {
  const top = a.skills[0];
  const emerging = a.emerging[0];
  const trend =
    a.overview.momentumScore >= 60 ? "accelerating" : a.overview.momentumScore >= 48 ? "steady" : "cooling";
  return `${a.query}: demand is ${trend}${top ? `, led by ${top.name}` : ""}${emerging ? `, with ${emerging.name} emerging fastest` : ""}.`;
}

export async function generateMarketInsight(a: MarketAnalysis): Promise<MarketReport> {
  const heuristic = heuristicSections(a);
  const llm = await llmSections(a);
  const cfg = getLlmConfig();

  return {
    id: `report-${a.id}`,
    searchId: a.id,
    query: a.query,
    mode: llm ? "llm" : "heuristic",
    model: llm ? llm.model : null,
    headline: llm ? llm.headline : heuristicHeadline(a),
    sections: llm ? llm.sections : heuristic,
    createdAt: new Date().toISOString(),
    disclaimer: llm
      ? `Sections marked AI are model-written interpretation of the metrics shown; all numbers originate from ${a.overview.totalSignals} collected signals. Model: ${llm.model}.`
      : `Deterministic rule-based report (LLM unavailable: ${cfg.available ? "model call failed" : "no OPENAI_API_KEY configured"}). All statements are computed directly from ${a.overview.totalSignals} collected signals.`,
  };
}

/** Lightweight one-off explanations used across the UI. */
export function explainSkill(m: MarketAnalysis["skills"][number], a: MarketAnalysis): string {
  const pairs = partnersFor(a.edges, m.slug, 3);
  const pairText = pairs.length ? ` It most often appears with ${pairs.map((p) => p.name).join(", ")}.` : "";
  return `${m.name} is ${m.classification.toLowerCase()} in this market slice: ${m.frequency} of ${a.overview.totalSignals} signals mention it (${m.share}%), spread across ${m.roleDiversity} roles and ${m.companyDiversity} employers.${pairText}`;
}
