import { extractFromParts } from "@/lib/analytics/extractor";
import { COMPANY_POOL, detectRole } from "@/lib/taxonomy";
import type { AnalysisStatus, DataSource, Signal } from "@/lib/types";

/**
 * SerpAPI collector.
 *
 * SkillPulse queries SerpAPI's `google_jobs` engine (and falls back to the
 * `google` organic engine) to gather *current* hiring signals for a market
 * query. Raw results are never shown to the user — they are normalised into
 * `Signal` records and pushed through the same skill extractor / scoring
 * pipeline as everything else.
 *
 * Every failure mode degrades gracefully:
 *   missing key → caller falls back to cache/demo
 *   429         → "rate limited" note, partial status
 *   non-200     → note + empty result
 *   malformed   → note + skip record
 *   network     → note + empty result
 */

export const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
export const REQUEST_TIMEOUT_MS = 12_000;

export function getSerpApiKey(): string | null {
  const key = process.env.SERPAPI_API_KEY ?? process.env.SERPAPI_KEY ?? null;
  return key && key.trim().length > 8 ? key.trim() : null;
}

export function getSerpApiStatus() {
  return {
    configured: Boolean(getSerpApiKey()),
    endpoint: SERPAPI_ENDPOINT,
    engines: ["google_jobs", "google"],
  };
}

export interface CollectResult {
  signals: Signal[];
  notes: string[];
  source: DataSource;
  status: AnalysisStatus;
  rawCount: number;
}

interface SerpError {
  kind: "missing_key" | "rate_limited" | "http_error" | "network" | "malformed" | "empty";
  message: string;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n) && String(v.replace(/[^0-9.\-]/g, "")).length) return n;
  }
  return null;
}

function parseDaysAgo(...candidates: unknown[]): number {
  for (const c of candidates) {
    const text = asString(c).toLowerCase();
    if (!text) continue;
    const hour = text.match(/(\d+)\s*(hour|hr)/);
    if (hour) return 0;
    const day = text.match(/(\d+)\s*day/);
    if (day) return Math.min(365, Number(day[1]));
    const week = text.match(/(\d+)\s*week/);
    if (week) return Math.min(365, Number(week[1]) * 7);
    const month = text.match(/(\d+)\s*month/);
    if (month) return Math.min(365, Number(month[1]) * 30);
    if (/just now|today|active/.test(text)) return 0;
  }
  return 30; // unknown publication date → assume moderately recent, never fabricate precision
}

const INDUSTRY_BY_KEYWORD: [RegExp, string][] = [
  [/bank|financial|payment|fintech|insurance|capital|nbfc/i, "FinTech"],
  [/hospital|health|pharma|medical|clinic|life sciences/i, "Healthcare"],
  [/retail|commerce|shop|mart|fashion/i, "E-commerce"],
  [/securit|cyber|defence|defense/i, "Cybersecurity"],
  [/cloud|software|saas|platform|tech/i, "SaaS"],
  [/consult|advisory|services|solutions/i, "Consulting"],
  [/telecom|network|broadband/i, "Telecom"],
  [/auto|vehicle|mobility/i, "Automotive"],
  [/manufactur|industrial|engineering|steel|energy/i, "Manufacturing"],
  [/edu|learning|university|school/i, "EdTech"],
];

function inferIndustry(company: string, text: string): string {
  const known = COMPANY_POOL.find((c) => c.name.toLowerCase() === company.toLowerCase());
  if (known) return known.industry;
  const haystack = `${company} ${text}`;
  for (const [re, label] of INDUSTRY_BY_KEYWORD) if (re.test(haystack)) return label;
  return "IT Services";
}

async function fetchWithTimeout(url: string | URL, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

async function callSerpApi(params: Record<string, string>, apiKey: string): Promise<{ data: any; error?: SerpError }> {
  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("hl", "en");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (e) {
    return {
      data: null,
      error: { kind: "network", message: `Network error contacting SerpAPI: ${(e as Error).message}` },
    };
  }

  if (res.status === 429) {
    return { data: null, error: { kind: "rate_limited", message: "SerpAPI rate limit reached (HTTP 429)." } };
  }
  if (!res.ok) {
    return { data: null, error: { kind: "http_error", message: `SerpAPI returned HTTP ${res.status}.` } };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { data: null, error: { kind: "malformed", message: "SerpAPI returned a malformed (non-JSON) response." } };
  }
  if (!data || typeof data !== "object") {
    return { data: null, error: { kind: "malformed", message: "SerpAPI response was not an object." } };
  }
  if (data.error) {
    const msg = asString(data.error);
    return {
      data,
      error: {
        kind: /rate|limit/i.test(msg) ? "rate_limited" : "http_error",
        message: `SerpAPI error: ${msg}`,
      },
    };
  }
  return { data };
}

function jobResultToSignal(raw: any, index: number, query: string): Signal | null {
  if (!raw || typeof raw !== "object") return null;
  const title = asString(raw.title);
  if (!title) return null;

  const company = asString(raw.company_name) || asString(raw.source) || "Unknown employer";
  const description = asString(raw.description) || asString(raw.snippet) || "";
  const location = asString(raw.location) || "";
  const via = asString(raw.via) || "SerpAPI";
  const ext = raw.extensions ?? {};
  const detected = ext.detected_extensions ?? {};

  const links: any[] = Array.isArray(raw.related_links) ? raw.related_links : [];
  const url = links.find((l) => /job/i.test(asString(l.text)))?.link ?? asString(raw.link) ?? "";

  const minSalary = toNumber(detected.min_salary ?? ext.min_salary);
  const maxSalary = toNumber(detected.max_salary ?? ext.max_salary);
  const daysAgo = parseDaysAgo(ext.detected_extensions?.posted_at, raw.posted_at, asString(ext.posted_at));

  const skills = extractFromParts(title, description, company);
  if (!skills.length) return null; // a posting with no recognisable skill is not a market signal

  return {
    id: `serp-job-${index}-${Buffer.from(title + company).toString("base64url").slice(0, 16)}`,
    title,
    company,
    industry: inferIndustry(company, `${title} ${description}`),
    role: detectRole(title) === "Other" ? title.slice(0, 48) : detectRole(title),
    location: location || query,
    via,
    url,
    snippet: description.slice(0, 600),
    publishedDaysAgo: daysAgo,
    experienceLevel: /intern/i.test(title)
      ? "Internship"
      : /senior|lead|staff|principal/i.test(title)
        ? "Senior (5-8 yrs)"
        : /junior|graduate|fresher|entry/i.test(title)
          ? "Entry level (0-2 yrs)"
          : "Mid level (2-5 yrs)",
    employmentType: asString(detected.schedule_type) || "Full-time",
    salaryMin: minSalary,
    salaryMax: maxSalary,
    skills,
  };
}

function organicResultToSignal(raw: any, index: number): Signal | null {
  if (!raw || typeof raw !== "object") return null;
  const title = asString(raw.title);
  const snippet = asString(raw.snippet);
  if (!title) return null;
  const skills = extractFromParts(title, snippet);
  if (!skills.length) return null;

  const source = asString(raw.source) || (() => {
    try {
      return new URL(asString(raw.link)).hostname.replace(/^www\./, "");
    } catch {
      return "web";
    }
  })();

  return {
    id: `serp-web-${index}-${Buffer.from(title).toString("base64url").slice(0, 16)}`,
    title: title.replace(/\s*[-|–].*$/, "").slice(0, 120),
    company: source,
    industry: inferIndustry(source, `${title} ${snippet}`),
    role: detectRole(title) === "Other" ? "Signal (web mention)" : detectRole(title),
    location: "",
    via: source,
    url: asString(raw.link),
    snippet: snippet.slice(0, 500),
    publishedDaysAgo: parseDaysAgo(raw.date),
    experienceLevel: "Unknown",
    employmentType: "Unknown",
    salaryMin: null,
    salaryMax: null,
    skills,
  };
}

/** Collect live market signals for a query. Never throws. */
export async function collectSignals(
  query: string,
  location: string,
  limit = 60,
): Promise<CollectResult> {
  const apiKey = getSerpApiKey();
  if (!apiKey) {
    return {
      signals: [],
      notes: ["SerpAPI key not configured (SERPAPI_API_KEY). Falling back to cached/demo signals."],
      source: "demo",
      status: "failed",
      rawCount: 0,
    };
  }

  const notes: string[] = [];
  const signals: Signal[] = [];
  let rawCount = 0;
  let status: AnalysisStatus = "completed";
  let sawError: SerpError | null = null;

  // 1) Google Jobs engine — the primary market signal source.
  const jobs = await callSerpApi(
    {
      engine: "google_jobs",
      q: query,
      gl: location.toLowerCase().includes("india") ? "in" : "us",
      google_domain: location.toLowerCase().includes("india") ? "google.co.in" : "google.com",
      lru: String(limit),
    },
    apiKey,
  );
  if (jobs.error) {
    sawError = jobs.error;
    notes.push(jobs.error.message);
    status = "partial";
  }
  const jobResults: any[] = Array.isArray(jobs.data?.jobs_results) ? jobs.data.jobs_results : [];
  rawCount += jobResults.length;
  for (const [i, raw] of jobResults.entries()) {
    const sig = jobResultToSignal(raw, i, query);
    if (sig) signals.push(sig);
  }

  // 2) Organic web engine — enriches with articles, salary reports, hiring pages.
  const organic = await callSerpApi(
    {
      engine: "google",
      q: `${query} jobs hiring requirements ${location || "India"}`.trim(),
      num: "20",
      gl: location.toLowerCase().includes("india") ? "in" : "us",
    },
    apiKey,
  );
  if (organic.error) {
    sawError = organic.error;
    notes.push(organic.error.message);
    status = "partial";
  }
  const organicResults: any[] = Array.isArray(organic.data?.organic_results) ? organic.data.organic_results : [];
  rawCount += organicResults.length;
  for (const [i, raw] of organicResults.entries()) {
    const sig = organicResultToSignal(raw, i);
    if (sig) signals.push(sig);
  }

  if (!signals.length) {
    status = "failed";
    notes.push(
      sawError
        ? `Live collection failed (${sawError.kind}); using cached/demo signals instead.`
        : "SerpAPI returned no results containing recognisable skills for this query.",
    );
    return { signals: [], notes, source: sawError ? "cache" : "demo", status, rawCount };
  }

  notes.push(
    `SerpAPI: ${rawCount} raw results → ${signals.length} usable market signals (google_jobs + google engines).`,
  );
  if (signals.length < 10) {
    status = "partial";
    notes.push("Low signal volume — metrics are computed on a small sample and should be treated as directional.");
  }

  return { signals: signals.slice(0, limit * 3), notes, source: "serpapi", status, rawCount };
}
