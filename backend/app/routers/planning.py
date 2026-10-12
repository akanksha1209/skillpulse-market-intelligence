"""Skill gap, roadmap, insight report, history and export endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from ..schemas import ReportRequest, RoadmapRequest, SkillGapRequest
from ..services import storage
from ..services.recommendation_engine import analyze_skill_gap, build_roadmap, role_catalogue
from ..services.taxonomy import ROLE_LABELS
from ..services.serpapi_service import serpapi_configured
from ..services.report_service import (
    CSV_DATASETS,
    export_filename,
    generate_report,
    report_document,
    to_csv,
)

router = APIRouter(tags=["planning"])


def _resolve(analysis_id: str | None) -> dict[str, Any] | None:
    return storage.get_analysis(analysis_id) if analysis_id else storage.latest_analysis()


@router.get("/skill-gap", summary="Skill-gap endpoint contract")
def skill_gap_contract() -> dict[str, Any]:
    return {"roles": ROLE_LABELS, "catalogue": role_catalogue(), "usage": "POST { skills: string[], role: string, analysisId?: string }"}


@router.post("/skill-gap", summary="Compare your skills with the observed market requirements")
def skill_gap(payload: SkillGapRequest) -> dict[str, Any]:
    analysis = _resolve(payload.analysisId)
    gap = analyze_skill_gap(payload.skills, payload.role, analysis)
    return {
        "gap": gap,
        "basis": (
            {"analysisId": analysis["id"], "source": analysis["source"], "isDemo": analysis["isDemo"]}
            if analysis
            else None
        ),
        "availableRoles": ROLE_LABELS,
    }


@router.post("/roadmap", summary="Generate a prioritised 30-day (or N-week) learning roadmap")
def roadmap(payload: RoadmapRequest) -> dict[str, Any]:
    analysis = _resolve(payload.analysisId)
    gap = analyze_skill_gap(payload.skills, payload.role, analysis)
    plan = build_roadmap(gap, analysis, payload.weeks)
    return {
        "roadmap": plan,
        "gap": gap,
        "basis": (
            {"analysisId": analysis["id"], "source": analysis["source"], "isDemo": analysis["isDemo"]}
            if analysis
            else None
        ),
    }


@router.post("/market-report", summary="AI-assisted market intelligence report (deterministic fallback)")
def market_report(payload: ReportRequest | None = None) -> dict[str, Any]:
    analysis = _resolve(payload.searchId if payload else None)
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis available. Run POST /api/search (or POST /api/demo) first.")
    report = generate_report(analysis)
    return {"report": report, "stored": storage.save_report(report)}


@router.get("/history", summary="Stored analyses")
def history(limit: int = Query(40, ge=1, le=200)) -> dict[str, Any]:
    items = storage.list_history(limit)
    return {"count": len(items), "items": items, "liveCapable": serpapi_configured()}


@router.get("/history/{analysis_id}", summary="Re-open one stored analysis")
def history_item(analysis_id: str) -> dict[str, Any]:
    analysis = storage.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return {"analysis": analysis}


@router.delete("/history/{analysis_id}", summary="Delete a stored analysis")
def history_delete(analysis_id: str) -> dict[str, Any]:
    storage.delete_analysis(analysis_id)
    return {"deleted": True, "id": analysis_id}


@router.get("/export/{analysis_id}", summary="Export a market intelligence report as JSON or CSV")
def export(
    analysis_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    dataset: str = Query("skills"),
) -> Response:
    analysis = storage.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    if format == "csv":
        if dataset not in CSV_DATASETS:
            raise HTTPException(status_code=400, detail=f"dataset must be one of {', '.join(CSV_DATASETS)}")
        csv = to_csv(analysis, dataset)
        if not csv:
            raise HTTPException(status_code=404, detail="No rows to export for this dataset.")
        return Response(
            content=csv,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{export_filename(analysis, "csv", dataset)}"'},
        )

    document = report_document(analysis, report=storage.get_report(analysis_id))
    return JSONResponse(
        content=document,
        headers={"Content-Disposition": f'attachment; filename="{export_filename(analysis, "json")}"'},
    )
