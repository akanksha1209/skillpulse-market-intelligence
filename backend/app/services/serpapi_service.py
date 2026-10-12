"""
SerpAPI market-signal collector.

Queries the `google_jobs` engine (primary) and the `google` organic engine
(enrichment), then normalises raw results into structured `Signal` records and
runs them through the deterministic skill extractor. Raw SerpAPI output is never
surfaced to the user.

Every failure mode degrades gracefully — missing key, HTTP 429 rate limit,
non-200, malformed JSON, network timeout or zero usable results — so the caller
can fall back to cached/demo data instead of crashing.
"""

from __future__ import annotations

import base64
import re
from typing import Any

import httpx

from ..config import settings
from .skill_extractor import extract_from_parts
from .taxonomy import COMPANIES, detect_role

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

INDUSTRY_KEYWORDS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"bank|financial|payment|fintech|insurance|capital|nbfc", re.I), "FinTech"),
    (re.compile(r"hospital|health|pharma|medical|clinic|life sciences", re.I), "Healthcare"),
    (re.compile(r"retail|commerce|shop|mart|fashion", re.I), "E-commerce"),
    (re.compile(r"securit|cyber|defence|defense", re.I), "Cybersecurity"),
    (re.compile(r"cloud|software|saas|platform|tech", re.I), "SaaS"),
    (re.compile(r"consult|advisory|services|solutions", re.I), "Consulting"),
    (re.compile(r"telecom|network|broadband", re.I), "Telecom"),
    (re.compile(r"auto|vehicle|mobility", re.I), "Automotive"),
    (re.compile(r"manufactur|industrial|engineering|energy", re.I), "Manufacturing"),
    (re.compile(r"edu|learning|university|school", re.I), "EdTech"),
]


def serpapi_configured() -> bool:
    return settings.serpapi_configured


def infer_industry(company: str, text: str) -> str:
    for name, industry in COMPANIES:
        if name.lower() == (company or "").lower():
            return industry
    haystack = f"{company} {text}"
    for pattern, label in INDUSTRY_KEYWORDS:
        if pattern.search(haystack):
            return label
    return "IT Services"


def parse_days_ago(*candidates: Any) -> int:
    for candidate in candidates:
        text = str(candidate or "").lower()
        if not text:
            continue
        if re.search(r"just now|today|active", text):
            return 0
        if re.search(r"\d+\s*(hour|hr)", text):
            return 0
        day = re.search(r"(\d+)\s*day", text)
        if day:
            return min(365, int(day.group(1)))
        week = re.search(r"(\d+)\s*week", text)
        if week:
            return min(365, int(week.group(1)) * 7)
        month = re.search(r"(\d+)\s*month", text)
        if month:
            return min(365, int(month.group(1)) * 30)
    return 30  # unknown age → conservative assumption, never fabricated precision


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.\-]", "", value)
        if cleaned:
            try:
                return float(cleaned)
            except ValueError:
                return None
    return None


def _short_id(*parts: str) -> str:
    raw = "".join(parts).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")[:16]


def job_result_to_signal(raw: dict[str, Any], index: int, query: str) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    title = str(raw.get("title") or "").strip()
    if not title:
        return None
    company = str(raw.get("company_name") or raw.get("source") or "Unknown employer")
    description = str(raw.get("description") or raw.get("snippet") or "")
    extensions = raw.get("extensions") or {}
    detected = extensions.get("detected_extensions") or {}
    related = raw.get("related_links") or []
    url = next((l.get("link") for l in related if isinstance(l, dict) and "job" in str(l.get("text", "")).lower()), "") or raw.get("link", "")

    skills = extract_from_parts(title, description, company)
    if not skills:
        return None  # no recognisable skill → not a usable market signal

    level = (
        "Internship" if re.search(r"intern", title, re.I)
        else "Senior (5-8 yrs)" if re.search(r"senior|lead|staff|principal", title, re.I)
        else "Entry level (0-2 yrs)" if re.search(r"junior|graduate|fresher|entry", title, re.I)
        else "Mid level (2-5 yrs)"
    )
    role = detect_role(title)

    return {
        "id": f"serp-job-{index}-{_short_id(title, company)}",
        "title": title,
        "company": company,
        "industry": infer_industry(company, f"{title} {description}"),
        "role": role if role != "Other" else title[:48],
        "location": str(raw.get("location") or query),
        "via": str(raw.get("via") or "SerpAPI"),
        "url": str(url or ""),
        "snippet": description[:600],
        "publishedDaysAgo": parse_days_ago(detected.get("posted_at"), raw.get("posted_at"), extensions.get("posted_at")),
        "experienceLevel": level,
        "employmentType": str(detected.get("schedule_type") or "Full-time"),
        "salaryMin": _to_number(detected.get("min_salary") or extensions.get("min_salary")),
        "salaryMax": _to_number(detected.get("max_salary") or extensions.get("max_salary")),
        "skills": skills,
    }


def organic_result_to_signal(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    title = str(raw.get("title") or "").strip()
    snippet = str(raw.get("snippet") or "")
    if not title:
        return None
    skills = extract_from_parts(title, snippet)
    if not skills:
        return None
    link = str(raw.get("link") or "")
    source = str(raw.get("source") or "")
    if not source and link:
        source = re.sub(r"^www\.", "", link.split("/")[2] if len(link.split("/")) > 2 else "web")
    role = detect_role(title)
    return {
        "id": f"serp-web-{index}-{_short_id(title)}",
        "title": re.sub(r"\s*[-|–].*$", "", title)[:120],
        "company": source or "web",
        "industry": infer_industry(source, f"{title} {snippet}"),
        "role": role if role != "Other" else "Signal (web mention)",
        "location": "",
        "via": source or "web",
        "url": link,
        "snippet": snippet[:500],
        "publishedDaysAgo": parse_days_ago(raw.get("date")),
        "experienceLevel": "Unknown",
        "employmentType": "Unknown",
        "salaryMin": None,
        "salaryMax": None,
        "skills": skills,
    }


def _call(params: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    """Returns (payload, error_message). Never raises."""
    if not settings.serpapi_api_key:
        return None, "SerpAPI key not configured (SERPAPI_API_KEY)."
    payload = {"api_key": settings.serpapi_api_key, "hl": "en", **params}
    try:
        response = httpx.get(SERPAPI_ENDPOINT, params=payload, timeout=settings.request_timeout_seconds)
    except httpx.TimeoutException:
        return None, "SerpAPI request timed out."
    except httpx.HTTPError as exc:  # network errors, DNS, TLS…
        return None, f"Network error contacting SerpAPI: {exc}"

    if response.status_code == 429:
        return None, "SerpAPI rate limit reached (HTTP 429)."
    if response.status_code != 200:
        return None, f"SerpAPI returned HTTP {response.status_code}."
    try:
        data = response.json()
    except ValueError:
        return None, "SerpAPI returned a malformed (non-JSON) response."
    if not isinstance(data, dict):
        return None, "SerpAPI response was not an object."
    if data.get("error"):
        return data, f"SerpAPI error: {data['error']}"
    return data, None


def collect_signals(query: str, location: str = "India", limit: int = 60) -> dict[str, Any]:
    """Three-tier safe collector: returns signals + provenance notes."""
    if not serpapi_configured():
        return {
            "signals": [],
            "notes": ["SerpAPI key not configured (SERPAPI_API_KEY). Falling back to cached/demo signals."],
            "source": "demo",
            "status": "failed",
            "rawCount": 0,
        }

    notes: list[str] = []
    signals: list[dict[str, Any]] = []
    raw_count = 0
    status = "completed"
    india = "india" in (location or "").lower()

    jobs, error = _call(
        {
            "engine": "google_jobs",
            "q": query,
            "gl": "in" if india else "us",
            "google_domain": "google.co.in" if india else "google.com",
            "lru": str(limit),
        }
    )
    if error:
        notes.append(error)
        status = "partial"
    for index, raw in enumerate((jobs or {}).get("jobs_results") or []):
        raw_count += 1
        signal = job_result_to_signal(raw, index, query)
        if signal:
            signals.append(signal)

    organic, error = _call(
        {
            "engine": "google",
            "q": f"{query} jobs hiring requirements {location or 'India'}".strip(),
            "num": "20",
            "gl": "in" if india else "us",
        }
    )
    if error:
        notes.append(error)
        status = "partial"
    for index, raw in enumerate((organic or {}).get("organic_results") or []):
        raw_count += 1
        signal = organic_result_to_signal(raw, index)
        if signal:
            signals.append(signal)

    if not signals:
        notes.append("SerpAPI returned no results containing recognisable skills for this query.")
        return {"signals": [], "notes": notes, "source": "cache", "status": "failed", "rawCount": raw_count}

    notes.append(f"SerpAPI: {raw_count} raw results -> {len(signals)} usable market signals (google_jobs + google engines).")
    if len(signals) < 10:
        status = "partial"
        notes.append("Low signal volume — metrics are directional only.")

    return {"signals": signals[: limit * 3], "notes": notes, "source": "serpapi", "status": status, "rawCount": raw_count}
