"""
Market insight generator + report export.

The heuristic engine is the source of truth: every number comes from the stored
signals. The LLM (when configured) only rewrites prose, and each section keeps
an explicit `provenance` flag — observed / calculated / ai — so a model opinion
is never presented as measured market fact.
"""

from __future__ import annotations

import time
from typing import Any

import pandas as pd

from .llm_service import llm_available, rewrite_report
from .market_analyzer import DEMAND_WEIGHTS
from .trend_analyzer import (
    CLASSIFICATION_RULES,
    PRIOR_WINDOW_DAYS,
    RECENT_WINDOW_DAYS,
    classification_counts,
)


def _pct(part: float, total: float) -> float:
    return round(part / total * 100, 1) if total else 0.0


def headline(analysis: dict[str, Any]) -> str:
    top = analysis["skills"][0] if analysis["skills"] else None
    emerging = analysis["emerging"][0] if analysis["emerging"] else None
    momentum = analysis["overview"]["momentumScore"]
    trend = "accelerating" if momentum >= 60 else "steady" if momentum >= 48 else "cooling"
    parts = [f"{analysis['query']}: demand is {trend}"]
    if top:
        parts.append(f"led by {top['name']}")
    if emerging:
        parts.append(f"with {emerging['name']} emerging fastest")
    return ", ".join(parts) + "."


def build_recommendation(analysis: dict[str, Any]) -> str:
    top = analysis["skills"][0] if analysis["skills"] else None
    emerging = analysis["emerging"][0] if analysis["emerging"] else None
    pair = analysis["edges"][0] if analysis["edges"] else None
    role = analysis["roles"][0] if analysis["roles"] else None
    parts: list[str] = []
    if top:
        parts.append(
            f"Anchor your next 60 days on {top['name']} — the most demanded skill in this market slice ({top['demandScore']}/100)."
        )
    if pair and top:
        other = pair["nameB"] if pair["skillA"] == top["slug"] else pair["nameA"]
        parts.append(f"Pair it with {other}, which co-occurs at {pair['lift']}x the expected rate.")
    if emerging:
        parts.append(f"Add one emerging bet — {emerging['name']} (momentum {emerging['momentumScore']}/100).")
    if role:
        parts.append(f"Target {role['role']} first: it holds {role['share']}% of the collected demand.")
    return " ".join(parts)


def build_actions(analysis: dict[str, Any]) -> list[str]:
    actions: list[str] = []
    anchors = [s for s in analysis["skills"] if s["demandScore"] >= 45][:3]
    if anchors:
        actions.append("Learn: " + " -> ".join(a["name"] for a in anchors) + " (highest demand-to-effort ratio).")
    emerging = [e["name"] for e in analysis["emerging"][:2]]
    if emerging:
        actions.append(f"Build one small project using {' + '.join(emerging)} and publish it — emerging skills are judged by artefacts.")
    companies = [c["name"] for c in analysis["companies"][:3]]
    if companies:
        actions.append(f"Prioritise applications to {', '.join(companies)} — they appear most often in this slice.")
    declining = [s["name"] for s in analysis["skills"] if s["classification"] == "Declining"][:2]
    if declining:
        actions.append(f"Do not start with {' / '.join(declining)} — their share of postings is shrinking.")
    return actions


def confidence_note(analysis: dict[str, Any]) -> str:
    n = analysis["overview"]["totalSignals"]
    level = "High" if n >= 100 else "Medium" if n >= 40 else "Low" if n >= 15 else "Very low"
    demo = " (DEMO — synthetic data, not real market data)" if analysis.get("isDemo") else ""
    return (
        f"Sample: {n} signals · source: {analysis['source'].upper()}{demo}. Confidence: {level}. "
        f"Growth is computed only from publication dates inside the collected {PRIOR_WINDOW_DAYS}-day window; no historical data is invented. "
        "Skill extraction is dictionary-based, so unusual spellings and brand-new tools can be missed."
    )


def heuristic_sections(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    overview = analysis["overview"]
    total = overview["totalSignals"]
    top = analysis["skills"][:8]
    growing = sorted(
        (s for s in analysis["skills"] if s["classification"] in {"Exploding", "Growing"}),
        key=lambda s: -s["growthScore"],
    )[:6]
    declining = [s for s in analysis["skills"] if s["classification"] == "Declining"][:4]
    pairs = analysis["edges"][:6]
    lead_role = analysis["roles"][0] if analysis["roles"] else None
    lead_skill = analysis["skills"][0] if analysis["skills"] else None
    momentum = overview["momentumScore"]
    word = "expanding quickly" if momentum >= 65 else "still growing" if momentum >= 55 else "flat" if momentum >= 45 else "cooling"

    evidence = []
    if lead_skill:
        evidence.append(
            f"{lead_skill['name']} appears in {lead_skill['frequency']} of {total} signals ({lead_skill['share']}%), "
            f"across {lead_skill['roleDiversity']} roles and {lead_skill['companyDiversity']} employers."
        )
    if lead_role:
        evidence.append(f"{lead_role['role']} is the dominant role ({lead_role['signalCount']} signals, {lead_role['share']}% of the sample).")
    if overview["avgSkillsPerSignal"]:
        evidence.append(f"Postings ask for {overview['avgSkillsPerSignal']} recognisable skills on average — a wide stack expectation.")
    if overview["freshnessDays"]:
        evidence.append(f"Average signal age is {overview['freshnessDays']} days, so this reflects the current hiring cycle.")
    if growing:
        evidence.append("Growth leaders (last 30d vs prior 60d): " + ", ".join(f"{g['name']} {g['growthScore']:+}%" for g in growing) + ".")
    if declining:
        evidence.append("Losing share: " + ", ".join(d["name"] for d in declining) + ".")

    return [
        {
            "key": "market_signal",
            "label": "Market signal",
            "provenance": "calculated",
            "body": (
                f"Demand for \"{analysis['query']}\" is {word}. Across {total} collected signals "
                f"({analysis['source'].upper()}), {overview['uniqueSkills']} distinct skills were detected, "
                f"{overview['uniqueCompanies']} employers appeared, market score {overview['marketScore']}/100, "
                f"momentum index {overview['momentumScore']}/100 (50 = flat)."
            ),
        },
        {
            "key": "evidence",
            "label": "Evidence",
            "provenance": "observed",
            "body": "Every claim below is counted from the stored signals for this analysis — no external estimates are used.",
            "bullets": evidence,
        },
        {
            "key": "top_skills",
            "label": "Top skills",
            "provenance": "observed",
            "body": "Ranked by the transparent demand score (35% frequency · 20% role diversity · 10% company diversity · 10% source breadth · 10% recency · 15% growth).",
            "bullets": [f"{s['name']} — demand {s['demandScore']}/100, {s['frequency']} mentions, {s['classification']}" for s in top],
        },
        {
            "key": "emerging_skills",
            "label": "Emerging technologies",
            "provenance": "calculated",
            "body": "New-generation skills with rising mention rates and a low baseline in the collected window."
            if analysis["emerging"]
            else "No emerging skill cleared the frequency threshold in this sample.",
            "bullets": [f"{e['name']} — momentum {e['momentumScore']}/100, demand {e['demandScore']}/100" for e in analysis["emerging"][:6]],
        },
        {
            "key": "pairings",
            "label": "Skill pairings",
            "provenance": "calculated",
            "body": "Co-occurrence uses lift (observed pair frequency / expected frequency). Lift > 1 means the pair appears together more than chance.",
            "bullets": [f"{p['nameA']} + {p['nameB']} — support {p['support']}, lift {p['lift']}x" for p in pairs]
            or ["Not enough overlapping postings in this sample to compute reliable pairs."],
        },
        {
            "key": "roles_employers",
            "label": "Roles & employers",
            "provenance": "observed",
            "body": f"{overview['uniqueRoles']} roles and {overview['uniqueIndustries']} industries were detected in the sample.",
            "bullets": [
                "Top roles: " + ", ".join(f"{r['role']} ({r['signalCount']})" for r in analysis["roles"][:6]),
                "Top employers: " + ", ".join(f"{c['name']} ({c['count']})" for c in analysis["companies"][:6]),
                "Top industries: " + ", ".join(f"{i['name']} {_pct(i['count'], total)}%" for i in analysis["industries"][:6]),
            ],
        },
        {"key": "recommendation", "label": "Recommendation", "provenance": "calculated", "body": build_recommendation(analysis), "bullets": build_actions(analysis)},
        {"key": "confidence", "label": "Confidence & limits", "provenance": "calculated", "body": confidence_note(analysis)},
    ]


def _facts(analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "query": analysis["query"],
        "source": analysis["source"],
        "is_demo": analysis["isDemo"],
        "overview": analysis["overview"],
        "top_skills": [
            {"name": s["name"], "demand": s["demandScore"], "momentum": s["momentumScore"], "frequency": s["frequency"], "share": s["share"], "class": s["classification"], "growth_pct": s["growthScore"]}
            for s in analysis["skills"][:15]
        ],
        "emerging": analysis["emerging"][:8],
        "roles": [{"role": r["role"], "count": r["signalCount"], "share": r["share"]} for r in analysis["roles"][:6]],
        "companies": [{"name": c["name"], "count": c["count"]} for c in analysis["companies"][:8]],
        "industries": analysis["industries"][:6],
        "pairs": [{"pair": f"{e['nameA']} + {e['nameB']}", "support": e["support"], "lift": e["lift"]} for e in analysis["edges"][:10]],
        "timeline": analysis["timeline"],
    }


def generate_report(analysis: dict[str, Any]) -> dict[str, Any]:
    """LLM-assisted when available, deterministic otherwise. Never raises."""
    sections = heuristic_sections(analysis)
    title = headline(analysis)
    mode, model = "heuristic", None

    llm = rewrite_report(_facts(analysis)) if llm_available() else None
    if llm:
        by_key = {s["key"]: s for s in llm["sections"]}
        merged = []
        for section in sections:
            override = by_key.get(section["key"])
            if override:
                body = str(override.get("body") or "").strip()
                bullets = [b for b in (override.get("bullets") or []) if isinstance(b, str)][:8]
                section = {
                    **section,
                    "provenance": "ai" if section["key"] in {"recommendation", "market_signal"} else section["provenance"],
                    "body": body or section["body"],
                    "bullets": bullets or section.get("bullets", []),
                }
            merged.append(section)
        sections = merged
        title = llm.get("headline") or title
        mode, model = "llm", llm.get("model")

    disclaimer = (
        f"Sections marked AI are model-written interpretation of the metrics shown; all numbers originate from "
        f"{analysis['overview']['totalSignals']} collected signals. Model: {model}."
        if mode == "llm"
        else f"Deterministic rule-based report (LLM unavailable: {'model call failed' if llm_available() else 'no OPENAI_API_KEY configured'}). "
        f"All statements are computed directly from {analysis['overview']['totalSignals']} collected signals."
    )

    return {
        "id": f"report-{analysis['id']}-{int(time.time())}",
        "searchId": analysis["id"],
        "query": analysis["query"],
        "mode": mode,
        "model": model,
        "headline": title,
        "sections": sections,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "disclaimer": disclaimer,
    }


# ── Export ────────────────────────────────────────────────────────────────────

CSV_DATASETS = ("skills", "signals", "roles", "companies", "edges", "timeline")


def _skills_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for s in analysis["skills"]:
        row = {k: v for k, v in s.items() if k not in {"breakdown", "roles", "companies"}}
        for key, value in s["breakdown"].items():
            row[f"pts_{key}"] = value
        rows.append(row)
    return rows


def _signals_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    return [{**s, "skills": "; ".join(s["skills"])} for s in analysis["signals"]]


def _roles_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "role": r["role"],
            "signals": r["signalCount"],
            "share_pct": r["share"],
            "demand_score": r["demandScore"],
            "top_skills": "; ".join(s["name"] for s in r["topSkills"]),
            "emerging_skills": "; ".join(s["name"] for s in r["emergingSkills"]),
            "industries": "; ".join(i["name"] for i in r["industries"]),
            "companies": "; ".join(c["name"] for c in r["companies"]),
            "salary_avg": r["salary"]["avg"],
        }
        for r in analysis["roles"]
    ]


def _companies_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    return [{"company": c["name"], "signals": c["count"], "share_pct": c["share"], "industries": "; ".join(c["industries"])} for c in analysis["companies"]]


def _edges_rows(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    return [{"skill_a": e["nameA"], "skill_b": e["nameB"], "support": e["support"], "weight_pct": e["weight"], "lift": e["lift"]} for e in analysis["edges"]]


def to_csv(analysis: dict[str, Any], dataset: str = "skills") -> str:
    builders = {
        "skills": _skills_rows,
        "signals": _signals_rows,
        "roles": _roles_rows,
        "companies": _companies_rows,
        "edges": _edges_rows,
        "timeline": lambda a: a["timeline"],
    }
    if dataset not in builders:
        raise ValueError(f"dataset must be one of {', '.join(CSV_DATASETS)}")
    rows = builders[dataset](analysis)
    if not rows:
        return ""
    return pd.DataFrame(rows).to_csv(index=False, lineterminator="\r\n")


def report_document(analysis: dict[str, Any], report: dict[str, Any] | None = None, gap: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "report": {
            "product": "SkillPulse – Market Signal Intelligence",
            "version": "1.0.0",
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "query": analysis["query"],
            "canonicalQuery": analysis["canonicalQuery"],
            "location": analysis["location"],
            "dataSource": analysis["source"],
            "demoMode": analysis["isDemo"],
            "status": analysis["status"],
            "notes": analysis["notes"],
            "methodology": {
                "demandScoreWeights": DEMAND_WEIGHTS,
                "momentumWindows": {"recentDays": RECENT_WINDOW_DAYS, "priorDays": PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS},
                "momentumScale": "0-100, where 50 = flat mention rate between windows",
                "cooccurrence": "support = signals containing both skills; lift = observed / expected",
                "classification": CLASSIFICATION_RULES,
                "classificationCounts": classification_counts(analysis["skills"]),
            },
        },
        "marketOverview": analysis["overview"],
        "topSkills": analysis["skills"],
        "emergingTechnologies": analysis["emerging"],
        "skillCooccurrence": analysis["edges"],
        "roles": analysis["roles"],
        "companies": analysis["companies"],
        "industries": analysis["industries"],
        "demandOverTime": analysis["timeline"],
        "insight": report,
        "skillGap": gap,
    }


def export_filename(analysis: dict[str, Any], ext: str, dataset: str | None = None) -> str:
    import re

    slug = re.sub(r"[^a-z0-9]+", "-", analysis["query"].lower()).strip("-")[:40] or "market"
    date = (analysis.get("createdAt") or "")[:10]
    suffix = f"-{dataset}" if dataset else ""
    return f"skillpulse-{slug}-{date}{suffix}.{ext}"
