"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";
import type { MarketAnalysis } from "@/lib/types";

/**
 * Tiny global store (useSyncExternalStore) so every page shares one
 * in-flight analysis without a heavyweight state library.
 */

export interface MarketState {
  analysis: (MarketAnalysis & { signals?: MarketAnalysis["signals"] }) | null;
  loading: boolean;
  error: string | null;
  loadedAt: number;
  lastAction: string | null;
}

let state: MarketState = { analysis: null, loading: false, error: null, loadedAt: 0, lastAction: null };
const listeners = new Set<() => void>();

function set(patch: Partial<MarketState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export async function refresh(force = false) {
  if (state.loading) return;
  if (!force && state.analysis && Date.now() - state.loadedAt < 45_000) return;
  set({ loading: true, error: null });
  try {
    const res = await api.overview();
    set({
      analysis: res.analysis as MarketAnalysis | null,
      loading: false,
      loadedAt: Date.now(),
      error: res.empty ? "No analysis yet — run a market search or load the demo dataset." : null,
      lastAction: null,
    });
  } catch (e) {
    set({ loading: false, error: (e as Error).message, lastAction: null });
  }
}

export async function runSearch(query: string, location = "India") {
  set({ loading: true, error: null, lastAction: `Collecting market signals for "${query}"…` });
  try {
    const res = await api.search(query, location);
    set({
      analysis: res.analysis,
      loading: false,
      loadedAt: Date.now(),
      error: res.persisted ? null : "Analysis produced, but persistence failed — history/export may be unavailable.",
      lastAction: null,
    });
    return res.analysis;
  } catch (e) {
    set({ loading: false, error: (e as Error).message, lastAction: null });
    throw e;
  }
}

export async function runDemo(query?: string) {
  set({ loading: true, error: null, lastAction: "Generating the synthetic demo dataset…" });
  try {
    const res = await api.demo(query);
    set({ analysis: res.analysis, loading: false, loadedAt: Date.now(), error: null, lastAction: null });
    return res.analysis;
  } catch (e) {
    set({ loading: false, error: (e as Error).message, lastAction: null });
    throw e;
  }
}

export async function loadAnalysis(id: string) {
  set({ loading: true, error: null, lastAction: "Re-opening stored analysis…" });
  try {
    const res = await api.analysis(id);
    set({ analysis: res.analysis, loading: false, loadedAt: Date.now(), error: null, lastAction: null });
    return res.analysis;
  } catch (e) {
    set({ loading: false, error: (e as Error).message, lastAction: null });
    throw e;
  }
}

export function useMarket() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!snapshot.analysis && !snapshot.loading && !snapshot.loadedAt) {
      void refresh(true);
    }
  }, [snapshot.analysis, snapshot.loading, snapshot.loadedAt]);

  return { ...snapshot, refresh, runSearch, runDemo, loadAnalysis };
}

/* ── Runtime capability probe ─────────────────────────────────────────────── */

interface StatusState {
  data: {
    serpapi?: { configured: boolean };
    llm?: { configured: boolean; model?: string };
    database?: boolean;
    mode?: string;
    taxonomy?: { skills: number; roles: number };
  } | null;
  loading: boolean;
}
let statusState: StatusState = { data: null, loading: false };
const statusListeners = new Set<() => void>();

async function loadStatus() {
  if (statusState.data || statusState.loading) return;
  statusState = { ...statusState, loading: true };
  statusListeners.forEach((l) => l());
  try {
    const data = await api.status();
    statusState = { data, loading: false };
  } catch {
    statusState = { data: { mode: "unknown" }, loading: false };
  }
  statusListeners.forEach((l) => l());
}

export function useSystemStatus() {
  const snap = useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => statusState,
    () => statusState,
  );
  useEffect(() => {
    void loadStatus();
  }, []);
  return snap.data;
}
