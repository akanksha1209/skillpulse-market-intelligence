import type {
  MarketAnalysis,
  MarketReport,
  Roadmap,
  SkillGapResult,
} from "@/lib/types";

/** Thin typed fetch client shared by every page. */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const fullUrl = buildUrl(path);
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    const message = (err as Error)?.message || "Unknown network error";
    throw new Error(
      `Unable to connect to backend at ${fullUrl}. Please ensure the server is running. (${message})`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  let data: any = null;
  const isJson =
    contentType.includes("application/json") ||
    text.trim().startsWith("{") ||
    text.trim().startsWith("[");

  if (text.trim() && isJson) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} error from ${path}: ${text.slice(0, 150)}`);
      }
      throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 150)}`);
    }
  }

  if (!res.ok) {
    let errorMessage: string;
    if (data) {
      if (typeof data.error === "string") {
        errorMessage = data.error;
      } else if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail
          .map((d: any) => {
            const loc = Array.isArray(d.loc)
              ? d.loc.filter((x: any) => x !== "body").join(".")
              : "";
            return loc ? `${loc}: ${d.msg}` : d.msg || JSON.stringify(d);
          })
          .join("; ");
      } else if (typeof data.message === "string") {
        errorMessage = data.message;
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (text.trim()) {
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : `${res.status} ${res.statusText}`;
        errorMessage = `Server error (${res.status}): ${title}`;
      } else {
        errorMessage = text.slice(0, 200).trim();
      }
    } else {
      errorMessage = `${path} responded with HTTP ${res.status} (${res.statusText || "Error"})`;
    }
    throw new Error(errorMessage);
  }

  if (!data && text.trim() && !isJson) {
    throw new Error(
      `Expected JSON from ${path}, but received ${contentType || "text"}: ${text.slice(0, 100)}`
    );
  }

  return (data ?? null) as T;
}

export interface OverviewResponse {
  analysis: (Omit<MarketAnalysis, "signals"> & { signals?: MarketAnalysis["signals"] }) | null;
  empty: boolean;
  message?: string;
  sampleSignals?: MarketAnalysis["signals"];
}

export const api = {
  overview: (id?: string) =>
    request<OverviewResponse>(`/api/market/overview${id ? `?id=${encodeURIComponent(id)}` : ""}`),
  analysis: (id: string) =>
    request<{ analysis: MarketAnalysis }>(`/api/history/${encodeURIComponent(id)}`),
  search: (query: string, location = "India", limit = 40) =>
    request<{ analysis: MarketAnalysis; persisted: boolean; persistenceError?: string | null }>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, location, limit }),
    }),
  demo: (query?: string) =>
    request<{ analysis: MarketAnalysis; demo: boolean; suggestedQueries: string[] }>("/api/demo", {
      method: "POST",
      body: JSON.stringify(query ? { query } : {}),
    }),
  skills: (params: Record<string, string> = {}) =>
    request<any>(`/api/skills?${new URLSearchParams(params).toString()}`),
  skill: (slug: string) =>
    request<any>(`/api/skills/${encodeURIComponent(slug)}`),
  roles: (id?: string) =>
    request<any>(`/api/roles${id ? `?id=${encodeURIComponent(id)}` : ""}`),
  companies: (params: Record<string, string> = {}) =>
    request<any>(`/api/companies?${new URLSearchParams(params).toString()}`),
  skillGap: (skills: string[], role: string, analysisId?: string) =>
    request<{ gap: SkillGapResult; basis: { analysisId: string; source: string; isDemo: boolean } | null; availableRoles: string[] }>(
      "/api/skill-gap",
      { method: "POST", body: JSON.stringify({ skills, role, analysisId }) },
    ),
  roadmap: (skills: string[], role: string, weeks = 4, analysisId?: string) =>
    request<{ roadmap: Roadmap; gap: SkillGapResult; basis: { analysisId: string; source: string; isDemo: boolean } | null }>(
      "/api/roadmap",
      { method: "POST", body: JSON.stringify({ skills, role, weeks, analysisId }) },
    ),
  report: (searchId?: string) =>
    request<{ report: MarketReport; stored: boolean }>("/api/market-report", {
      method: "POST",
      body: JSON.stringify(searchId ? { searchId } : {}),
    }),
  history: (limit = 40) =>
    request<{ count: number; items: any[]; liveCapable: boolean }>(`/api/history?limit=${limit}`),
  deleteHistory: (id: string) =>
    request<{ deleted: boolean }>(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" }),
  status: () =>
    request<any>("/api/status"),
  exportUrl: (id: string, format: "json" | "csv", dataset?: string) =>
    buildUrl(`/api/export/${encodeURIComponent(id)}?format=${format}${dataset ? `&dataset=${dataset}` : ""}`),
};
