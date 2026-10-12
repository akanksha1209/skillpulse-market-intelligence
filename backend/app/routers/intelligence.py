"""Skill, role and company intelligence endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from ..services import storage
from ..services.market_analyzer import explain_demand_score, partners_for
from ..services.skill_extractor import aliases_for
from ..services.taxonomy import ROLE_LABELS, ROLES, SKILL_BY_SLUG, SKILLS
from ..services.trend_analyzer import explain_momentum

router = APIRouter(tags=["intelligence"])


def _resolve(analysis_id: str | None) -> dict[str, Any] | None:
    return storage.get_analysis(analysis_id) if analysis_id else storage.latest_analysis()


@router.get("/skills", summary="Ranked skills for an analysis (+ cross-analysis aggregates)")
def skills(
    id: str | None = Query(None),
    q: str | None = Query(None),
    classification: str | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(60, ge=1, le=300),
) -> dict[str, Any]:
    analysis = _resolve(id)
    items = list((analysis or {}).get("skills", []))
    if q:
        needle = q.lower()
        items = [s for s in items if needle in s["name"].lower() or needle in s["slug"]]
    if classification:
        items = [s for s in items if s["classification"] == classification]
    if category:
        items = [s for s in items if s["category"] == category]
    return {
        "analysisId": (analysis or {}).get("id"),
        "source": (analysis or {}).get("source"),
        "isDemo": (analysis or {}).get("isDemo"),
        "count": len(items),
        "skills": items[:limit],
        "historical": storage.skill_aggregates(),
        "taxonomySize": len(SKILLS),
        "categories": sorted({s.category for s in SKILLS}),
    }


@router.get("/skills/{slug}", summary="Deep dive for one skill")
def skill_detail(slug: str, id: str | None = Query(None)) -> dict[str, Any]:
    key = slug.lower()
    definition = SKILL_BY_SLUG.get(key)
    analysis = _resolve(id)
    metric = next((m for m in (analysis or {}).get("skills", []) if m["slug"] == key), None)
    demanding = []
    for role in (analysis or {}).get("roles", []):
        hit = next((s for s in role["topSkills"] if s["slug"] == key), None)
        if hit:
            demanding.append({"role": role["role"], "demandScore": hit["demandScore"], "signals": role["signalCount"]})
    demanding.sort(key=lambda r: -r["demandScore"])
    return {
        "slug": key,
        "name": definition.name if definition else key,
        "category": definition.category if definition else "Other",
        "difficulty": definition.difficulty if definition else None,
        "emerging": definition.emerging if definition else False,
        "aliases": aliases_for(key),
        "prerequisites": [
            {"slug": p, "name": SKILL_BY_SLUG[p].name} for p in (definition.prerequisites if definition else ()) if p in SKILL_BY_SLUG
        ],
        "found": metric is not None,
        "metric": metric,
        "explanation": explain_demand_score(metric) if metric else None,
        "momentumExplanation": explain_momentum(metric) if metric else None,
        "partners": partners_for((analysis or {}).get("edges", []), key, 10) if metric else [],
        "roles": demanding,
        "analysisId": (analysis or {}).get("id"),
        "source": (analysis or {}).get("source"),
    }


@router.get("/roles", summary="Role intelligence for an analysis")
def roles(id: str | None = Query(None), role: str | None = Query(None)) -> dict[str, Any]:
    analysis = _resolve(id)
    items = list((analysis or {}).get("roles", []))
    if role:
        needle = role.lower()
        items = [r for r in items if needle in r["role"].lower()]
    return {
        "analysisId": (analysis or {}).get("id"),
        "source": (analysis or {}).get("source"),
        "isDemo": (analysis or {}).get("isDemo"),
        "roles": items,
        "catalogue": [{"slug": r.slug, "label": r.label, "industries": list(r.industries)} for r in ROLES],
        "labels": ROLE_LABELS,
    }


@router.get("/companies", summary="Employer intelligence with role/skill/industry/location filters")
def companies(
    id: str | None = Query(None),
    industry: str | None = Query(None),
    role: str | None = Query(None),
    skill: str | None = Query(None),
    location: str | None = Query(None),
) -> dict[str, Any]:
    analysis = _resolve(id)
    signals = list((analysis or {}).get("signals", []))
    if industry:
        signals = [s for s in signals if industry.lower() in (s.get("industry") or "").lower()]
    if role:
        signals = [s for s in signals if role.lower() in (s.get("role") or "").lower()]
    if location:
        signals = [s for s in signals if location.lower() in (s.get("location") or "").lower()]
    if skill:
        needle = skill.lower()
        signals = [s for s in signals if any(needle in slug or needle in slug.replace("-", " ") for slug in s.get("skills", []))]

    grouped: dict[str, dict[str, Any]] = {}
    for s in signals:
        entry = grouped.setdefault(s.get("company") or "Unknown", {"count": 0, "industries": set(), "roles": set(), "locations": set()})
        entry["count"] += 1
        entry["industries"].add(s.get("industry") or "")
        entry["roles"].add(s.get("role") or "")
        entry["locations"].add(s.get("location") or "")

    total = max(1, len(signals))
    rows = [
        {
            "name": name,
            "count": e["count"],
            "share": round(e["count"] / total * 100, 1),
            "industries": sorted(i for i in e["industries"] if i),
            "roles": sorted(r for r in e["roles"] if r)[:6],
            "locations": sorted(l for l in e["locations"] if l)[:4],
        }
        for name, e in grouped.items()
    ]
    rows.sort(key=lambda r: -r["count"])

    return {
        "analysisId": (analysis or {}).get("id"),
        "source": (analysis or {}).get("source"),
        "isDemo": (analysis or {}).get("isDemo"),
        "filters": {"industry": industry, "role": role, "skill": skill, "location": location},
        "matchedSignals": len(signals),
        "companies": rows[:60],
        "industries": (analysis or {}).get("industries", []),
        "historical": storage.company_aggregates(),
    }
