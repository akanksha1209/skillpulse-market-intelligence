"""
Deterministic skill extraction & normalisation.

Boundary-aware alias matching, longest alias first, so "Python 3", "python
programming" and "Python" collapse to the canonical `python` skill and scores
stay reproducible without any model call.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .taxonomy import SKILLS, SKILL_BY_SLUG, Skill


@dataclass(frozen=True)
class Rule:
    slug: str
    alias: str
    pattern: re.Pattern[str]


def _escape(alias: str) -> str:
    return re.escape(alias)


def _build_rules() -> list[Rule]:
    rules: list[Rule] = []
    for skill in SKILLS:
        aliases = {skill.name.lower().strip(), *(a.lower().strip() for a in skill.aliases)}
        for alias in sorted(a for a in aliases if len(a) >= 2):
            rules.append(
                Rule(
                    slug=skill.slug,
                    alias=alias,
                    pattern=re.compile(rf"(?<![a-z0-9]){_escape(alias)}(?![a-z0-9])", re.IGNORECASE),
                )
            )
    rules.sort(key=lambda r: len(r.alias), reverse=True)
    return rules


RULES: list[Rule] = _build_rules()


def extract_hits(text: str) -> list[dict[str, str]]:
    """Return [{slug, alias}] for every canonical skill mentioned in `text`."""
    if not text:
        return []
    haystack = text.lower()
    seen: dict[str, dict[str, str]] = {}
    for rule in RULES:
        if rule.slug in seen:
            continue
        if rule.alias not in haystack:  # cheap pre-filter
            continue
        if rule.pattern.search(haystack):
            seen[rule.slug] = {"slug": rule.slug, "alias": rule.alias}
    return list(seen.values())


def extract_skills(text: str) -> list[str]:
    return [h["slug"] for h in extract_hits(text)]


def extract_from_parts(*parts: str | None) -> list[str]:
    return extract_skills(" \n ".join(p for p in parts if p))


def normalize_skill_input(raw: str) -> Skill | None:
    """Map user free-text ("ML", "k8s", "gen ai") to a canonical skill."""
    text = (raw or "").strip().lower()
    if not text:
        return None
    if text in SKILL_BY_SLUG:
        return SKILL_BY_SLUG[text]

    hits = extract_hits(text)
    if hits:
        hits.sort(key=lambda h: len(h["alias"]), reverse=True)
        return SKILL_BY_SLUG.get(hits[0]["slug"])

    compact = re.sub(r"[^a-z0-9]", "", text)
    for skill in SKILLS:
        for alias in (skill.name, *skill.aliases):
            if re.sub(r"[^a-z0-9]", "", alias.lower()) == compact:
                return skill

    tokens = [t for t in re.split(r"[^a-z0-9]+", text) if len(t) > 2]
    best: tuple[Skill, float] | None = None
    for skill in SKILLS:
        name_tokens = [t for t in re.split(r"[^a-z0-9]+", skill.name.lower()) if len(t) > 2]
        shared = [t for t in tokens if any(n.startswith(t) or t.startswith(n) for n in name_tokens)]
        score = len(shared) / max(1, len(tokens))
        if score >= 0.6 and (best is None or score > best[1]):
            best = (skill, score)
    return best[0] if best else None


def aliases_for(slug: str) -> list[str]:
    skill = SKILL_BY_SLUG.get(slug)
    if not skill:
        return []
    seen: list[str] = []
    for alias in (skill.name, *skill.aliases):
        if alias not in seen:
            seen.append(alias)
    return seen


def normalization_report(text: str) -> list[dict[str, str]]:
    """Evidence trail: which surface form mapped to which canonical skill."""
    hits = extract_hits(text)
    return [
        {
            "alias": h["alias"],
            "slug": h["slug"],
            "canonical": SKILL_BY_SLUG[h["slug"]].name,
        }
        for h in hits
    ]
