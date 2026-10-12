"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { loadAnalysis, useMarket } from "@/hooks/use-market";
import type { HistoryItem } from "@/lib/db/store";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  IconClock,
  IconDownload,
  Meter,
  SectionTitle,
  Skeleton,
  Spinner,
  Stat,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const router = useRouter();
  const { analysis } = useMarket();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [liveCapable, setLiveCapable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.history(80);
      setItems(res.items as HistoryItem[]);
      setLiveCapable(res.liveCapable);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, analysis?.id]);

  async function open(id: string) {
    setBusyId(id);
    try {
      await loadAnalysis(id);
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not re-open this analysis.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api.deleteHistory(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Delete failed — the database may be unavailable.");
    } finally {
      setBusyId(null);
    }
  }

  const demoCount = items.filter((i) => i.isDemo).length;
  const liveCount = items.filter((i) => !i.isDemo).length;

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Persistence" title="Search History">
        <div className="flex items-center gap-2">
          <button onClick={load} className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]">Refresh</button>
          <Link href="/search" className="sp-btn sp-btn-primary !py-1.5 text-[11.5px]">New analysis</Link>
        </div>
      </SectionTitle>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Stored analyses" value={items.length} hint="Every search is persisted in PostgreSQL" icon={<IconClock className="h-4 w-4" />} />
          <Stat label="Live (SerpAPI)" value={liveCount} accent="pulse" hint={liveCapable ? "Key configured — new searches go live" : "No SerpAPI key configured"} />
          <Stat label="Demo / cached" value={demoCount} accent="amber" hint="Clearly-labelled synthetic datasets" />
          <Stat
            label="Avg market score"
            value={items.length ? Math.round(items.reduce((s, i) => s + (i.marketScore ?? 0), 0) / items.length) : 0}
            unit="/100"
            accent="volt"
            hint="Across all stored analyses"
          />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[320px]" />
      ) : !items.length ? (
        <EmptyState
          title="No analyses stored yet"
          message="Every market search is written to PostgreSQL with its full snapshot, so you can re-open, compare and export it later."
          icon={<IconClock className="h-6 w-6" />}
          action={<Link href="/search" className="sp-btn sp-btn-primary">Run your first analysis</Link>}
        />
      ) : (
        <Card>
          <CardHeader title="Stored analyses" subtitle="Re-open any analysis with its exact signals, scores and metrics" />
          <div className="overflow-x-auto">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Search</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th className="text-right">Signals</th>
                  <th>Top skill</th>
                  <th className="w-[16%]">Market score</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button onClick={() => open(item.id)} className="font-medium text-white hover:text-pulse-300">
                        {item.query}
                      </button>
                      <div className="sp-num text-[10.5px] text-mist-500">{item.id}</div>
                    </td>
                    <td className="sp-num whitespace-nowrap text-[12px]">{new Date(item.createdAt).toLocaleString()}</td>
                    <td>
                      {item.isDemo ? <Badge tone="amber">DEMO</Badge> : item.source === "cache" ? <Badge tone="volt">CACHED</Badge> : <Badge tone="pulse">LIVE</Badge>}
                      {item.status === "partial" ? <Badge tone="amber" className="ml-1">PARTIAL</Badge> : null}
                    </td>
                    <td className="sp-num text-right">{item.signalCount}</td>
                    <td className="text-[12px]">{item.topSkill ?? "—"}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Meter value={item.marketScore ?? 0} tone="pulse" />
                        <span className="sp-num w-7 text-right text-[11.5px] text-mist-200">{item.marketScore ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {busyId === item.id ? <Spinner size={12} /> : null}
                        <button onClick={() => open(item.id)} className="sp-btn sp-btn-ghost !px-2.5 !py-1 text-[11px]">Open</button>
                        <a href={api.exportUrl(item.id, "json")} className="sp-btn sp-btn-ghost !px-2 !py-1 text-[11px]" download title="Export JSON">
                          <IconDownload className="h-3.5 w-3.5" />
                        </a>
                        <a href={api.exportUrl(item.id, "csv", "skills")} className="sp-btn sp-btn-ghost !px-2 !py-1 text-[11px]" download title="Export CSV">
                          CSV
                        </a>
                        <button onClick={() => remove(item.id)} className="sp-btn sp-btn-ghost !px-2 !py-1 text-[11px] !text-coral-signal">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
