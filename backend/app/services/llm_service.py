"""
Optional LLM layer.

The LLM only *rewrites prose* for the market insight report. It never produces
numbers, and if the key is missing or the call fails for any reason the
deterministic engine in `report_service` is used instead.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from ..config import settings

SYSTEM_PROMPT = (
    "You are a market intelligence analyst for SkillPulse. You are given ONLY measured metrics from "
    "collected job-market signals. Never invent numbers, companies, salaries or trends absent from the input. "
    "Reply with strict JSON: {\"headline\": string (max 140 chars), \"sections\": [{\"key\": one of "
    "market_signal|evidence|top_skills|emerging_skills|pairings|roles_employers|recommendation, "
    "\"body\": string, \"bullets\": string[]}]}. Each section body max 70 words."
)


def llm_available() -> bool:
    return settings.llm_configured


def llm_status() -> dict[str, Any]:
    return {
        "configured": llm_available(),
        "model": settings.openai_model,
        "provider": "openai-compatible",
        "fallback": "deterministic insight engine",
    }


def rewrite_report(facts: dict[str, Any], timeout: float = 25.0) -> dict[str, Any] | None:
    """Returns {headline, sections} or None. Never raises."""
    if not llm_available():
        return None
    url = settings.openai_base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.openai_model,
        "temperature": 0.25,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(facts)},
        ],
    }
    try:
        response = httpx.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            timeout=timeout,
        )
        if response.status_code != 200:
            return None
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed, dict) or not parsed.get("sections"):
            return None
        allowed = {"market_signal", "evidence", "top_skills", "emerging_skills", "pairings", "roles_employers", "recommendation"}
        sections = [s for s in parsed["sections"] if isinstance(s, dict) and s.get("key") in allowed]
        if not sections:
            return None
        return {"headline": str(parsed.get("headline", ""))[:180], "sections": sections, "model": settings.openai_model}
    except Exception:
        return None
