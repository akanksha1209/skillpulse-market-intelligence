"""
Search orchestration with a three-tier data strategy:

    LIVE   -> SerpAPI (google_jobs + google)     source = "serpapi"
    CACHED -> signals stored for the same query  source = "cache"
    DEMO   -> deterministic synthetic dataset    source = "demo"

Whichever tier succeeds is labelled in the response so the UI can always tell
the user whether they are looking at live market data or demo data.
"""

from __future__ import annotations

import re
import time
from typing import Any

from ..config import settings
from . import storage
from .demo_data import generate_demo_signals
from .market_analyzer import analyze
from .serpapi_service import collect_signals, serpapi_configured


def canonicalize(query: str) -> str:
    return re.sub(r"\s+", " ", (query or "").strip().lower())[:120]


def system_status() -> dict[str, Any]:
    from .llm_service import llm_status
    from .taxonomy import ROLES, SKILLS

    return {
        "serpapi": {"configured": serpapi_configured(), "endpoint": "https://serpapi.com/search.json", "engines": ["google_jobs", "google"]},
        "llm": llm_status(),
        "mode": "live-capable" if serpapi_configured() else "demo",
        "forceDemo": settings.force_demo,
        "taxonomy": {"skills": len(SKILLS), "roles": len(ROLES)},
    }


def run_search(query: str, location: str = "India", limit: int = 40, force_demo: bool = False) -> dict[str, Any]:
    query = (query or "").strip() or "AI Engineer"
    canonical = canonicalize(query)
    location = (location or "India").strip() or "India"
    limit = max(10, min(120, int(limit or 40)))

    notes: list[str] = []
    signals: list[dict[str, Any]] = []
    source = "demo"
    status = "completed"

    if force_demo or settings.force_demo or not serpapi_configured():
        notes.append(
            "Demo mode requested explicitly — synthetic signals used instead of SerpAPI."
            if (force_demo or settings.force_demo)
            else "SerpAPI key not configured (SERPAPI_API_KEY) — running in DEMO mode with synthetic signals."
        )
    else:
        collected = collect_signals(query, location, limit)
        notes.extend(collected["notes"])
        signals = collected["signals"]
        source = collected["source"]
        status = collected["status"]

        if len(signals) < 5:
            cached = storage.cached_signals(query, 200)
            if len(cached) >= 5:
                notes.append(f"Reused {len(cached)} cached signals from a previous analysis of \"{query}\".")
                signals, source, status = cached, "cache", "partial"
            elif not signals:
                notes.append("No cached signals available — falling back to the synthetic demo dataset so the product stays usable.")
                source = "demo"

    is_demo = source == "demo"
    if is_demo and not signals:
        demo = generate_demo_signals(query, location, max(120, limit * 3))
        signals = demo["signals"]
        for note in demo["notes"]:
            if note not in notes:
                notes.append(note)
        status = "completed"
    if is_demo and signals and not any("DEMO MODE" in n for n in notes):
        notes.append("DEMO MODE: signals are synthetic and clearly labelled — they are not real market data.")

    analysis = analyze(
        analysis_id=storage.new_id(),
        query=query,
        canonical_query=canonical,
        location=location,
        source=source,
        is_demo=is_demo,
        status=status,
        notes=list(dict.fromkeys(n for n in notes if n)),
        signals=signals,
        created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )
    analysis["persisted"] = storage.save_analysis(analysis)
    return analysis
