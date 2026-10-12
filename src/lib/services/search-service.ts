import { analyze } from "@/lib/analytics/pipeline";
import { generateDemoSignals } from "@/lib/data/demo";
import { collectSignals, getSerpApiKey, getSerpApiStatus } from "@/lib/data/serpapi";
import { cachedSignals, saveAnalysis } from "@/lib/db/store";
import type { MarketAnalysis, SearchPayload, Signal } from "@/lib/types";

/**
 * Search orchestration with a three-tier data strategy:
 *
 *   LIVE   → SerpAPI (google_jobs + google)            source: serpapi
 *   CACHED → signals stored from a previous same query  source: cache
 *   DEMO   → deterministic synthetic dataset            source: demo
 *
 * The app never fails: whichever tier succeeds is labelled in the UI so the
 * user always knows whether they are looking at live market data or a demo.
 */

export function canonicalize(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

export interface SearchOutcome {
  analysis: MarketAnalysis;
  persisted: boolean;
  persistenceError?: string;
}

export async function runSearch(payload: SearchPayload): Promise<SearchOutcome> {
  const query = (payload.query ?? "").trim() || "AI Engineer";
  const canonical = canonicalize(query);
  const location = (payload.location ?? "India").trim() || "India";
  const limit = Math.max(10, Math.min(120, payload.limit ?? 40));
  const id = `an_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const notes: string[] = [];
  let collected: Signal[] = [];
  let source: MarketAnalysis["source"] = "demo";
  let status: MarketAnalysis["status"] = "completed";
  const apiKeyPresent = Boolean(getSerpApiKey());

  if (payload.forceDemo || !apiKeyPresent) {
    notes.push(
      apiKeyPresent
        ? "Demo mode requested explicitly — synthetic signals used instead of SerpAPI."
        : "SerpAPI key not configured (SERPAPI_API_KEY) — running in DEMO mode with synthetic signals.",
    );
    status = "completed";
  } else {
    const live = await collectSignals(query, location, limit);
    notes.push(...live.notes);
    collected = live.signals;
    source = live.source;
    status = live.status;

    if (collected.length < 5) {
      const cached = await cachedSignals(query, 200);
      if (cached.length >= 5) {
        notes.push(`Reused ${cached.length} cached signals from a previous analysis of "${query}".`);
        collected = cached;
        source = "cache";
        status = collected.length ? "partial" : "failed";
      } else if (collected.length === 0) {
        notes.push("No cached signals available — falling back to the synthetic demo dataset so the product stays usable.");
        source = "demo";
      }
    }
  }

  const isDemo = source === "demo";
  if (isDemo && !collected.length) {
    const demo = generateDemoSignals(query, location, Math.max(120, limit * 3));
    collected = demo.signals;
    notes.push(...demo.notes.filter((n) => !notes.includes(n)));
    status = "completed";
  }
  if (isDemo && collected.length && !notes.some((n) => n.includes("DEMO MODE"))) {
    notes.push("DEMO MODE: signals are synthetic and clearly labelled — they are not real market data.");
  }

  const analysis = analyze({
    id,
    query,
    canonicalQuery: canonical,
    location,
    source,
    isDemo,
    status,
    notes: dedupe(notes),
    signals: collected,
  });

  const persisted = await saveAnalysis(analysis);
  return {
    analysis,
    persisted: persisted.saved,
    persistenceError: persisted.error,
  };
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function systemStatus() {
  const serp = getSerpApiStatus();
  const llmKey = process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY ?? null;
  return {
    serpapi: serp,
    llm: {
      configured: Boolean(llmKey && llmKey.trim().length > 8),
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      provider: "openai-compatible",
    },
    mode: serp.configured ? "live-capable" : "demo",
  };
}
