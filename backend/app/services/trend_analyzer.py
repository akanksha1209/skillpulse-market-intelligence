"""
Market momentum & trend analysis.

Momentum is computed ONLY from the publication dates of the signals that were
actually collected — SkillPulse never invents historical observations. When the
sample comes from the demo generator, that fact is propagated into the notes so
the UI can label it.
"""

from __future__ import annotations

import math
from typing import Any, Iterable

RECENT_WINDOW_DAYS = 30
PRIOR_WINDOW_DAYS = 90

CLASSIFICATIONS = ("Exploding", "Growing", "Stable", "Declining", "Emerging")

CLASSIFICATION_RULES = {
    "Exploding": "growth >= +70% and >= 3 recent mentions",
    "Growing": "growth >= +18%",
    "Stable": "growth between -18% and +18%",
    "Declining": "growth <= -18%",
    "Emerging": "taxonomy-emerging skill with <= 2 prior-window mentions and >= 2 recent",
}


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def round1(value: float) -> float:
    return round(float(value) + 0.0, 1)


def compute_growth(recent: int, prior: int, emerging: bool = False) -> dict[str, Any]:
    """Rate-of-change between the last 30 days and the previous 60 days."""
    recent_rate = recent / RECENT_WINDOW_DAYS
    prior_rate = prior / (PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS)

    if prior_rate > 0:
        growth_pct = (recent_rate - prior_rate) / prior_rate
    elif recent_rate > 0:
        growth_pct = min(3.0, recent_rate * 60)  # no prior baseline → capped
    else:
        growth_pct = 0.0

    base = 50 + math.tanh(growth_pct / 1.2) * 45
    novelty = 6 if (emerging and prior == 0 and recent > 0) else 0
    momentum = round1(_clamp(base + novelty))

    if emerging and prior <= 2 and recent >= 2:
        classification = "Emerging"
    elif growth_pct >= 0.7 and recent >= 3:
        classification = "Exploding"
    elif growth_pct >= 0.18:
        classification = "Growing"
    elif growth_pct <= -0.18 and (prior >= 3 or recent >= 1):
        classification = "Declining"
    else:
        classification = "Stable"

    return {
        "recent": recent,
        "prior": prior,
        "recent_rate": round(recent_rate, 4),
        "prior_rate": round(prior_rate, 4),
        "growth_pct": round1(growth_pct * 100),
        "momentum_score": momentum,
        "classification": classification,
    }


def window_counts(signals: Iterable[dict[str, Any]], slug: str) -> tuple[int, int]:
    recent = prior = 0
    for s in signals:
        if slug not in (s.get("skills") or []):
            continue
        days = int(s.get("publishedDaysAgo") or s.get("published_days_ago") or 0)
        if days <= RECENT_WINDOW_DAYS:
            recent += 1
        elif days <= PRIOR_WINDOW_DAYS:
            prior += 1
    return recent, prior


def build_timeline(signals: list[dict[str, Any]], weeks: int = 13, emerging_slugs: set[str] | None = None) -> list[dict[str, Any]]:
    """Weekly buckets of collected signals — observed publication dates only."""
    emerging_slugs = emerging_slugs or set()
    buckets = [
        {"label": f"-{(weeks - 1 - i) * 7}d", "weekIndex": i, "signals": 0, "demandIndex": 0, "emergingIndex": 0, "_emerging": 0}
        for i in range(weeks)
    ]
    for s in signals:
        days = int(s.get("publishedDaysAgo") or s.get("published_days_ago") or 0)
        w = days // 7
        if w < 0 or w >= weeks:
            continue
        idx = weeks - 1 - w
        buckets[idx]["signals"] += 1
        if any(slug in emerging_slugs for slug in (s.get("skills") or [])):
            buckets[idx]["_emerging"] += 1

    peak = max(1, *(b["signals"] for b in buckets))
    for b in buckets:
        b["demandIndex"] = round(b["signals"] / peak * 100)
        b["emergingIndex"] = round(b["_emerging"] / b["signals"] * 100) if b["signals"] else 0
        b.pop("_emerging")
    return buckets


def classification_counts(metrics: list[dict[str, Any]]) -> dict[str, int]:
    counts = {c: 0 for c in CLASSIFICATIONS}
    for m in metrics:
        key = m.get("classification")
        if key in counts:
            counts[key] += 1
    return counts


def explain_momentum(metric: dict[str, Any]) -> str:
    recent = metric.get("recentWindow", metric.get("recent_window", 0))
    prior = metric.get("priorWindow", metric.get("prior_window", 0))
    classification = metric.get("classification", "Stable")
    direction = {
        "Declining": "fewer recent mentions than the prior window",
        "Stable": "roughly the same mention rate as the prior window",
    }.get(classification, "more recent mentions than the prior window")
    return (
        f"{recent} mentions in the last {RECENT_WINDOW_DAYS} days vs {prior} in the previous "
        f"{PRIOR_WINDOW_DAYS - RECENT_WINDOW_DAYS} days — {direction}. "
        f"Momentum index {metric.get('momentumScore', metric.get('momentum_score'))}/100 (50 = flat)."
    )
