"""Market collection & overview endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from ..schemas import DemoRequest, SearchRequest
from ..services import storage
from ..services.demo_data import DEMO_QUERIES
from ..services.search_service import run_search

router = APIRouter(tags=["market"])


@router.post("/search", summary="Collect market signals and run the full analysis pipeline")
def search(payload: SearchRequest) -> dict[str, Any]:
    try:
        analysis = run_search(payload.query, payload.location, payload.limit, payload.forceDemo)
    except Exception as exc:  # never crash the app on a collection failure
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc
    return {"analysis": analysis, "persisted": analysis.pop("persisted", False)}


@router.get("/search", summary="Query-string variant of POST /api/search")
def search_get(
    q: str = Query(..., min_length=1, description="Market query"),
    location: str = Query("India"),
    limit: int = Query(40, ge=10, le=120),
    demo: int = Query(0, ge=0, le=1),
) -> dict[str, Any]:
    analysis = run_search(q, location, limit, bool(demo))
    return {"analysis": analysis, "persisted": analysis.pop("persisted", False)}


@router.post("/demo", summary="One click → complete, clearly-labelled synthetic analysis")
def demo(payload: DemoRequest | None = None) -> dict[str, Any]:
    query = (payload.query if payload and payload.query else "AI Engineer India")
    location = payload.location if payload else "India"
    analysis = run_search(query, location, 40, force_demo=True)
    return {
        "demo": True,
        "analysis": analysis,
        "persisted": analysis.pop("persisted", False),
        "suggestedQueries": DEMO_QUERIES,
    }


@router.get("/market/overview", summary="Market overview for one analysis (or the latest)")
def market_overview(id: str | None = Query(None)) -> dict[str, Any]:
    analysis = storage.get_analysis(id) if id else storage.latest_analysis()
    if not analysis:
        return {
            "analysis": None,
            "empty": True,
            "message": "No market analysis has been run yet. Use POST /api/search or POST /api/demo.",
        }
    trimmed = {k: v for k, v in analysis.items() if k != "signals"}
    return {"analysis": trimmed, "empty": False, "sampleSignals": analysis.get("signals", [])[:12]}
