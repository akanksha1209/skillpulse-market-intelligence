"""SQLite storage service — analyses, signals, metrics, edges and reports."""

from __future__ import annotations

import time
from typing import Any

from ..database import dumps, get_conn, loads


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def new_id(prefix: str = "an") -> str:
    return f"{prefix}_{int(time.time() * 1000):x}_{abs(hash(time.time_ns())) % 0xFFFFFF:06x}"


def save_analysis(analysis: dict[str, Any]) -> bool:
    overview = analysis["overview"]
    try:
        with get_conn() as conn:
            conn.execute("DELETE FROM searches WHERE id = ?", (analysis["id"],))
            conn.execute(
                """INSERT INTO searches
                   (id, query, canonical_query, location, source, status, is_demo, signal_count,
                    market_score, momentum_score, top_skill, notes, analysis, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    analysis["id"], analysis["query"], analysis["canonicalQuery"], analysis["location"],
                    analysis["source"], analysis["status"], 1 if analysis["isDemo"] else 0,
                    overview["totalSignals"], overview["marketScore"], overview["momentumScore"],
                    analysis["skills"][0]["name"] if analysis["skills"] else None,
                    dumps(analysis["notes"]), dumps(analysis), analysis.get("createdAt") or _now(),
                ),
            )
            conn.executemany(
                """INSERT OR REPLACE INTO signals
                   (id, search_id, title, company, industry, role, location, via, url, snippet,
                    published_days_ago, experience_level, employment_type, salary_min, salary_max, skills)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                [
                    (
                        f"{analysis['id']}:{s['id']}"[:180], analysis["id"], s["title"][:300], s.get("company"),
                        s.get("industry"), s.get("role"), s.get("location"), s.get("via"), s.get("url"),
                        (s.get("snippet") or "")[:1200], s.get("publishedDaysAgo"), s.get("experienceLevel"),
                        s.get("employmentType"), s.get("salaryMin"), s.get("salaryMax"), dumps(s.get("skills", [])),
                    )
                    for s in analysis.get("signals", [])
                ],
            )
            conn.executemany(
                """INSERT OR REPLACE INTO skill_metrics
                   (id, search_id, slug, name, category, frequency, unique_sources, role_diversity,
                    company_diversity, recency_score, growth_score, demand_score, momentum_score,
                    classification, emerging, recent_window, prior_window)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                [
                    (
                        f"{analysis['id']}:sk:{i}", analysis["id"], m["slug"], m["name"], m["category"],
                        m["frequency"], m["uniqueSources"], m["roleDiversity"], m["companyDiversity"],
                        m["recencyScore"], m["growthScore"], m["demandScore"], m["momentumScore"],
                        m["classification"], 1 if m["emerging"] else 0, m["recentWindow"], m["priorWindow"],
                    )
                    for i, m in enumerate(analysis["skills"])
                ],
            )
            conn.executemany(
                "INSERT OR REPLACE INTO skill_edges (id, search_id, skill_a, skill_b, support, weight, lift) VALUES (?,?,?,?,?,?,?)",
                [
                    (f"{analysis['id']}:ed:{i}", analysis["id"], e["skillA"], e["skillB"], e["support"], e["weight"], e["lift"])
                    for i, e in enumerate(analysis["edges"])
                ],
            )
        return True
    except Exception:
        return False


def get_analysis(analysis_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT analysis FROM searches WHERE id = ?", (analysis_id,)).fetchone()
    return loads(row["analysis"] if row else None)


def latest_analysis() -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT analysis FROM searches ORDER BY created_at DESC LIMIT 1").fetchone()
    return loads(row["analysis"] if row else None)


def list_history(limit: int = 40) -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, query, location, source, is_demo, status, signal_count,
                      market_score, momentum_score, top_skill, created_at
               FROM searches ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
    return [
        {
            "id": r["id"], "query": r["query"], "location": r["location"] or "", "source": r["source"],
            "isDemo": bool(r["is_demo"]), "status": r["status"], "signalCount": r["signal_count"],
            "marketScore": r["market_score"], "momentumScore": r["momentum_score"], "topSkill": r["top_skill"],
            "createdAt": r["created_at"],
        }
        for r in rows
    ]


def delete_analysis(analysis_id: str) -> bool:
    with get_conn() as conn:
        conn.execute("DELETE FROM skill_edges WHERE search_id = ?", (analysis_id,))
        conn.execute("DELETE FROM skill_metrics WHERE search_id = ?", (analysis_id,))
        conn.execute("DELETE FROM signals WHERE search_id = ?", (analysis_id,))
        conn.execute("DELETE FROM reports WHERE search_id = ?", (analysis_id,))
        conn.execute("DELETE FROM searches WHERE id = ?", (analysis_id,))
    return True


def cached_signals(query: str, limit: int = 200) -> list[dict[str, Any]]:
    canonical = query.strip().lower()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM searches WHERE lower(canonical_query) = ? ORDER BY created_at DESC LIMIT 1",
            (canonical,),
        ).fetchone()
        if not row:
            return []
        rows = conn.execute("SELECT * FROM signals WHERE search_id = ? LIMIT ?", (row["id"], limit)).fetchall()
    return [
        {
            "id": r["id"], "title": r["title"], "company": r["company"] or "", "industry": r["industry"] or "",
            "role": r["role"] or "", "location": r["location"] or "", "via": r["via"] or "", "url": r["url"] or "",
            "snippet": r["snippet"] or "", "publishedDaysAgo": r["published_days_ago"] or 30,
            "experienceLevel": r["experience_level"] or "", "employmentType": r["employment_type"] or "",
            "salaryMin": r["salary_min"], "salaryMax": r["salary_max"], "skills": loads(r["skills"], []),
        }
        for r in rows
    ]


def save_report(report: dict[str, Any]) -> bool:
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO reports (id, search_id, mode, model, sections, created_at) VALUES (?,?,?,?,?,?)",
                (
                    report["id"], report["searchId"], report["mode"], report.get("model"),
                    dumps({"headline": report["headline"], "sections": report["sections"], "disclaimer": report["disclaimer"]}),
                    report.get("createdAt") or _now(),
                ),
            )
        return True
    except Exception:
        return False


def get_report(analysis_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM reports WHERE search_id = ? ORDER BY created_at DESC LIMIT 1", (analysis_id,)
        ).fetchone()
    if not row:
        return None
    payload = loads(row["sections"], {})
    return {
        "id": row["id"], "searchId": row["search_id"], "mode": row["mode"], "model": row["model"],
        "createdAt": row["created_at"], **payload,
    }


def skill_aggregates() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT slug, name, category, COUNT(*) AS analyses, ROUND(AVG(demand_score), 1) AS avg_demand,
                      ROUND(AVG(momentum_score), 1) AS avg_momentum, SUM(frequency) AS total_frequency,
                      MAX(emerging) AS emerging
               FROM skill_metrics GROUP BY slug, name, category
               ORDER BY total_frequency DESC LIMIT 200"""
        ).fetchall()
    return [dict(r) for r in rows]


def company_aggregates() -> list[dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT company, industry, COUNT(*) AS mentions, COUNT(DISTINCT role) AS roles
               FROM signals WHERE company IS NOT NULL AND company <> ''
               GROUP BY company, industry ORDER BY mentions DESC LIMIT 100"""
        ).fetchall()
    return [dict(r) for r in rows]
