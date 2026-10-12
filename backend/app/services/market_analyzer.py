"""
Market analyzer — turns normalised signals into structured market intelligence.

Aggregation is done with pandas; scoring mirrors the TypeScript engine exactly
so the FastAPI backend and the Next.js API return identical numbers.

SKILL DEMAND SCORE (0-100):
    35% frequency · 20% role diversity · 10% company diversity ·
    10% source breadth · 10% recency · 15% growth
"""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from itertools import combinations
from typing import Any, Iterable

import pandas as pd

from .taxonomy import SKILL_BY_SLUG, SKILL_NAME, detect_role
from .trend_analyzer import (
    PRIOR_WINDOW_DAYS,
    RECENT_WINDOW_DAYS,
    build_timeline,
    classification_counts,
    compute_growth,
    round1,
)

DEMAND_WEIGHTS = {
    "frequency": 0.35,
    "roleDiversity": 0.20,
    "companyDiversity": 0.10,
    "sourceBreadth": 0.10,
    "recency": 0.10,
    "growth": 0.15,
}


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _days(signal: dict[str, Any]) -> int:
    return int(signal.get("publishedDaysAgo", signal.get("published_days_ago", 0)) or 0)


def _skills(signal: dict[str, Any]) -> list[str]:
    return list(signal.get("skills") or [])


def signals_frame(signals: Iterable[dict[str, Any]]) -> pd.DataFrame:
    """Explode signals into one row per (signal, skill) pair."""
    rows = [
        {
            "signal_id": s.get("id"),
            "slug": slug,
            "role": s.get("role") or detect_role(s.get("title", "")),
            "company": s.get("company") or "",
            "industry": s.get("industry") or "",
            "via": s.get("via") or "",
            "days": _days(s),
        }
        for s in signals
        for slug in set(_skills(s))
    ]
    return pd.DataFrame(rows, columns=["signal_id", "slug", "role", "company", "industry", "via", "days"])


def corpus_stats(signals: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "totalSignals": len(signals),
        "distinctSources": max(1, len({s.get("via") for s in signals if s.get("via")})),
        "distinctRoles": max(1, len({s.get("role") for s in signals if s.get("role")})),
        "distinctCompanies": max(1, len({s.get("company") for s in signals if s.get("company")})),
    }


def build_skill_metrics(signals: list[dict[str, Any]], min_frequency: int = 2) -> list[dict[str, Any]]:
    df = signals_frame(signals)
    if df.empty:
        return []

    stats = corpus_stats(signals)
    grouped = df.groupby("slug")
    summary = grouped.agg(
        frequency=("slug", "size"),
        unique_sources=("via", "nunique"),
        role_diversity=("role", "nunique"),
        company_diversity=("company", "nunique"),
    )
    fresh = df[df["days"] <= 14].groupby("slug").size()
    recent = df[df["days"] <= RECENT_WINDOW_DAYS].groupby("slug").size()
    prior = df[(df["days"] > RECENT_WINDOW_DAYS) & (df["days"] <= PRIOR_WINDOW_DAYS)].groupby("slug").size()
    # Frequency is scored relative to the most-mentioned skill in this
    # collection so the component stays discriminative instead of saturating.
    max_frequency = max(1, int(summary["frequency"].max()))

    metrics: list[dict[str, Any]] = []
    for slug, row in summary.iterrows():
        frequency = int(row["frequency"])
        if frequency < min_frequency:
            continue
        definition = SKILL_BY_SLUG.get(slug)
        recent_n = int(recent.get(slug, 0))
        prior_n = int(prior.get(slug, 0))
        growth = compute_growth(recent_n, prior_n, bool(definition and definition.emerging))

        frequency_share = frequency / max(1, stats["totalSignals"])
        frequency_norm = frequency / max_frequency
        role_div = int(row["role_diversity"]) / stats["distinctRoles"]
        company_div = int(row["company_diversity"]) / min(stats["distinctCompanies"], 40)
        source_breadth = int(row["unique_sources"]) / stats["distinctSources"]
        recency_share = (int(fresh.get(slug, 0)) / frequency) if frequency else 0.0
        growth_norm = _clamp(50 + math.tanh(growth["growth_pct"] / 100 / 1.2) * 50) / 100

        components = {
            "frequency": _clamp(frequency_norm * 100),
            "roleDiversity": _clamp(role_div * 100),
            "companyDiversity": _clamp(company_div * 100),
            "sourceBreadth": _clamp(source_breadth * 100),
            "recency": _clamp(recency_share * 100),
            "growth": _clamp(growth_norm * 100),
        }
        demand = sum(components[k] * DEMAND_WEIGHTS[k] for k in DEMAND_WEIGHTS)

        role_counts = Counter(df[df["slug"] == slug]["role"])
        company_counts = Counter(df[df["slug"] == slug]["company"])

        metrics.append(
            {
                "slug": slug,
                "name": SKILL_NAME.get(slug, slug),
                "category": definition.category if definition else "Other",
                "frequency": frequency,
                "uniqueSources": int(row["unique_sources"]),
                "roleDiversity": int(row["role_diversity"]),
                "companyDiversity": int(row["company_diversity"]),
                "share": round1(frequency_share * 100),
                "recencyScore": round1(_clamp(recency_share * 100)),
                "growthScore": growth["growth_pct"],
                "demandScore": round1(demand),
                "momentumScore": growth["momentum_score"],
                "classification": growth["classification"],
                "emerging": bool(definition and definition.emerging),
                "recentWindow": recent_n,
                "priorWindow": prior_n,
                "breakdown": {k: round1(components[k] * DEMAND_WEIGHTS[k]) for k in DEMAND_WEIGHTS},
                "roles": [{"name": n, "count": c} for n, c in role_counts.most_common(8)],
                "companies": [{"name": n, "count": c} for n, c in company_counts.most_common(8) if n],
            }
        )

    metrics.sort(key=lambda m: (-m["demandScore"], -m["frequency"]))
    return metrics


def explain_demand_score(m: dict[str, Any]) -> list[str]:
    b = m["breakdown"]
    return [
        f"Frequency: mentioned in {m['frequency']} of the collected signals ({m['share']}% share), "
        f"scored against the most-mentioned skill in this collection -> {b['frequency']} pts of 35",
        f"Role diversity: asked for by {m['roleDiversity']} distinct roles -> {b['roleDiversity']} pts of 20",
        f"Company diversity: {m['companyDiversity']} distinct employers -> {b['companyDiversity']} pts of 10",
        f"Source breadth: appeared on {m['uniqueSources']} channel(s) -> {b['sourceBreadth']} pts of 10",
        f"Recency: {m['recencyScore']}% of its mentions are from the last 14 days -> {b['recency']} pts of 10",
        f"Growth: {m['recentWindow']} mentions in the last 30d vs {m['priorWindow']} in the prior 60d "
        f"({m['growthScore']:+}%) -> {b['growth']} pts of 15",
    ]


def build_cooccurrence(signals: list[dict[str, Any]], max_edges: int = 80) -> list[dict[str, Any]]:
    pairs: Counter[tuple[str, str]] = Counter()
    freq: Counter[str] = Counter()
    for s in signals:
        unique = sorted(set(_skills(s)))
        freq.update(unique)
        for a, b in combinations(unique[:18], 2):
            pairs[(a, b)] += 1

    total = max(1, len(signals))
    edges: list[dict[str, Any]] = []
    for (a, b), support in pairs.items():
        if support < 3:
            continue
        expected = (freq[a] / total) * (freq[b] / total) * total
        lift = support / expected if expected > 0 else 0.0
        if lift < 1.05:
            continue
        edges.append(
            {
                "skillA": a,
                "skillB": b,
                "nameA": SKILL_NAME.get(a, a),
                "nameB": SKILL_NAME.get(b, b),
                "support": support,
                "weight": round1(support / total * 100),
                "lift": round(lift, 2),
            }
        )
    edges.sort(key=lambda e: -(e["lift"] * math.log(1 + e["support"])))
    return edges[:max_edges]


def partners_for(edges: list[dict[str, Any]], slug: str, limit: int = 8) -> list[dict[str, Any]]:
    out = []
    for e in edges:
        if e["skillA"] == slug:
            out.append({"slug": e["skillB"], "name": e["nameB"], "support": e["support"], "lift": e["lift"]})
        elif e["skillB"] == slug:
            out.append({"slug": e["skillA"], "name": e["nameA"], "support": e["support"], "lift": e["lift"]})
    out.sort(key=lambda p: -p["lift"])
    return out[:limit]


def build_roles(signals: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for s in signals:
        grouped[s.get("role") or detect_role(s.get("title", ""))].append(s)

    total = max(1, len(signals))
    roles: list[dict[str, Any]] = []
    for role, items in grouped.items():
        if role == "Other" and len(items) < 3:
            continue
        freq: Counter[str] = Counter()
        for s in items:
            freq.update(set(_skills(s)))
        industries = Counter(s["industry"] for s in items if s.get("industry"))
        companies = Counter(s["company"] for s in items if s.get("company"))
        experience = Counter(s["experienceLevel"] for s in items if s.get("experienceLevel"))
        n = len(items)
        top = freq.most_common(12)
        salaries = [s for s in items if s.get("salaryMin") is not None and s.get("salaryMax") is not None]

        roles.append(
            {
                "role": role,
                "signalCount": n,
                "share": round1(n / total * 100),
                "demandScore": round(
                    min(100, n / total * 120 + min(25, len(companies) * 1.6) + min(15, len(top)))
                ),
                "topSkills": [
                    {"slug": slug, "name": SKILL_NAME.get(slug, slug), "demandScore": round(min(100, count / n * 130))}
                    for slug, count in top
                ],
                "emergingSkills": [
                    {
                        "slug": slug,
                        "name": SKILL_NAME.get(slug, slug),
                        "momentumScore": round(min(100, 55 + count / n * 90)),
                    }
                    for slug, count in freq.most_common()
                    if SKILL_BY_SLUG.get(slug) and SKILL_BY_SLUG[slug].emerging
                ][:6],
                "tools": [
                    SKILL_NAME.get(slug, slug)
                    for slug, _ in freq.most_common()
                    if SKILL_BY_SLUG.get(slug) and SKILL_BY_SLUG[slug].category in {"Tooling", "Cloud", "DevOps", "Database"}
                ][:8],
                "industries": [{"name": k, "count": v} for k, v in industries.most_common(6)],
                "companies": [{"name": k, "count": v} for k, v in companies.most_common(8)],
                "experience": [{"level": k, "count": v} for k, v in experience.most_common()],
                "relatedRoles": [],
                "salary": {
                    "min": min((s["salaryMin"] for s in salaries), default=None),
                    "max": max((s["salaryMax"] for s in salaries), default=None),
                    "avg": round(sum((s["salaryMin"] + s["salaryMax"]) / 2 for s in salaries) / len(salaries))
                    if salaries
                    else None,
                },
            }
        )

    roles.sort(key=lambda r: -r["signalCount"])
    sets = {r["role"]: {s["slug"] for s in signals_frame([x for x in signals if (x.get("role") or "Other") == r["role"]]).to_dict("records")} for r in roles}
    for r in roles:
        mine = sets.get(r["role"], set())
        related = []
        for other in roles:
            if other["role"] == r["role"]:
                continue
            theirs = sets.get(other["role"], set())
            union = len(mine | theirs) or 1
            related.append({"role": other["role"], "overlap": round(len(mine & theirs) / union * 100)})
        related.sort(key=lambda x: -x["overlap"])
        r["relatedRoles"] = related[:4]
    return roles[:limit]


def build_companies(signals: list[dict[str, Any]], limit: int = 15) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter(s["company"] for s in signals if s.get("company"))
    industries: dict[str, set[str]] = defaultdict(set)
    for s in signals:
        if s.get("company") and s.get("industry"):
            industries[s["company"]].add(s["industry"])
    total = max(1, len(signals))
    return [
        {"name": name, "count": c, "share": round1(c / total * 100), "industries": sorted(industries[name])}
        for name, c in counts.most_common(limit)
    ]


def build_industries(signals: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter(s["industry"] for s in signals if s.get("industry"))
    total = max(1, len(signals))
    return [{"name": k, "count": v, "share": round1(v / total * 100)} for k, v in counts.most_common(limit)]


def compute_market_score(metrics: list[dict[str, Any]], signals: list[dict[str, Any]]) -> float:
    if not metrics:
        return 0.0
    top = metrics[:10]
    demand_avg = sum(m["demandScore"] for m in top) / len(top)
    momentum_avg = sum(m["momentumScore"] for m in top) / len(top)
    volume = _clamp(math.log2(1 + len(signals)) / math.log2(201), 0, 1) * 100
    freshness = _clamp(100 - (sum(_days(s) for s in signals) / len(signals)) * 1.4) if signals else 0.0
    diversity = _clamp(len({s.get("company") for s in signals}) / max(1, len(signals)) * 140)
    return round1(demand_avg * 0.4 + momentum_avg * 0.15 + volume * 0.2 + freshness * 0.15 + diversity * 0.1)


def compute_momentum_score(metrics: list[dict[str, Any]]) -> float:
    if not metrics:
        return 50.0
    top = metrics[:15]
    num = sum(m["momentumScore"] * (0.5 + m["demandScore"] / 100) for m in top)
    den = sum(0.5 + m["demandScore"] / 100 for m in top)
    return round1(num / den if den else 50.0)


def analyze(
    *,
    analysis_id: str,
    query: str,
    canonical_query: str,
    location: str,
    source: str,
    is_demo: bool,
    status: str,
    notes: list[str],
    signals: list[dict[str, Any]],
    created_at: str,
) -> dict[str, Any]:
    """Assemble the full MarketAnalysis document."""
    metrics = build_skill_metrics(signals, 2 if len(signals) > 40 else 1)
    edges = build_cooccurrence(signals)
    roles = build_roles(signals)
    companies = build_companies(signals)
    industries = build_industries(signals)
    emerging_slugs = {m["slug"] for m in metrics if m["emerging"]}
    timeline = build_timeline(signals, emerging_slugs=emerging_slugs)

    emerging = sorted(
        (m for m in metrics if m["emerging"] or m["classification"] in {"Emerging", "Exploding"}),
        key=lambda m: (not m["emerging"], -m["momentumScore"], -m["demandScore"]),
    )[:12]

    salaries = [s for s in signals if s.get("salaryMin") is not None and s.get("salaryMax") is not None]

    return {
        "id": analysis_id,
        "query": query,
        "canonicalQuery": canonical_query,
        "location": location,
        "source": source,
        "isDemo": is_demo,
        "status": status,
        "notes": notes,
        "createdAt": created_at,
        "overview": {
            "totalSignals": len(signals),
            "uniqueSkills": len(metrics),
            "uniqueCompanies": len({s.get("company") for s in signals if s.get("company")}),
            "uniqueRoles": len(roles),
            "uniqueIndustries": len(industries),
            "avgSkillsPerSignal": round1(sum(len(_skills(s)) for s in signals) / len(signals)) if signals else 0,
            "marketScore": compute_market_score(metrics, signals),
            "momentumScore": compute_momentum_score(metrics),
            "freshnessDays": round(sum(_days(s) for s in signals) / len(signals)) if signals else 0,
            "salaryAvg": round(sum((s["salaryMin"] + s["salaryMax"]) / 2 for s in salaries) / len(salaries)) if salaries else None,
        },
        "skills": metrics,
        "edges": edges,
        "roles": roles,
        "companies": companies,
        "industries": industries,
        "emerging": [
            {"slug": m["slug"], "name": m["name"], "demandScore": m["demandScore"], "momentumScore": m["momentumScore"]}
            for m in emerging
        ],
        "timeline": timeline,
        "classificationCounts": classification_counts(metrics),
        "signals": signals[:60],
    }
