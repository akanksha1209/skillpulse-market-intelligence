"""
Recommendation engine: skill-gap analysis + prioritised learning roadmap.

Priority = market demand x role weight x momentum / learning cost, with a
dependency pass so prerequisites are always scheduled before the skill that
needs them. Deterministic — the LLM never decides the order.
"""

from __future__ import annotations

from typing import Any

from .market_analyzer import round1
from .skill_extractor import normalize_skill_input
from .taxonomy import ROLES, SKILL_BY_SLUG, SKILL_NAME, role_profile

RESOURCE_LIBRARY: dict[str, list[str]] = {
    "python": ["docs.python.org/3/tutorial"],
    "sql": ["sqlbolt.com"],
    "machine-learning": ["Andrew Ng – Machine Learning Specialization"],
    "deep-learning": ["fast.ai Practical Deep Learning"],
    "pytorch": ["pytorch.org/tutorials"],
    "tensorflow": ["tensorflow.org/tutorials"],
    "scikit-learn": ["scikit-learn.org/stable/tutorial"],
    "llm": ["Hugging Face LLM course"],
    "generative-ai": ["DeepLearning.AI – Generative AI for Everyone"],
    "rag": ["LangChain RAG tutorial"],
    "langchain": ["python.langchain.com/docs/tutorials"],
    "vector-databases": ["pinecone.io/learn"],
    "prompt-engineering": ["learnprompting.org"],
    "agentic-ai": ["LangGraph documentation"],
    "fine-tuning": ["Hugging Face PEFT docs"],
    "mlops": ["mlflow.org/docs"],
    "docker": ["docs.docker.com/get-started"],
    "kubernetes": ["kubernetes.io/docs/tutorials"],
    "aws": ["AWS Skill Builder – Cloud Practitioner"],
    "azure": ["Microsoft Learn – AZ-900"],
    "gcp": ["Google Cloud Skills Boost"],
    "terraform": ["developer.hashicorp.com/terraform/tutorials"],
    "ci-cd": ["GitHub Actions quickstart"],
    "react": ["react.dev/learn"],
    "nextjs": ["nextjs.org/learn"],
    "nodejs": ["nodejs.org/en/learn"],
    "fastapi": ["fastapi.tiangolo.com/tutorial"],
    "django": ["docs.djangoproject.com – official tutorial"],
    "spring-boot": ["spring.io/guides"],
    "rest-api": ["restfulapi.net"],
    "pandas": ["pandas.pydata.org/docs/getting_started"],
    "spark": ["spark.apache.org quick-start"],
    "airflow": ["airflow.apache.org/docs"],
    "dbt": ["docs.getdbt.com/tutorial"],
    "snowflake": ["Snowflake quickstarts"],
    "databricks": ["Databricks Academy"],
    "kafka": ["kafka.apache.org quickstart"],
    "data-modeling": ["Kimball Group design tips"],
    "data-visualization": ["matplotlib.org/tutorials"],
    "tableau": ["Tableau free training"],
    "power-bi": ["Microsoft Learn – Power BI"],
    "excel": ["Excel Easy"],
    "statistics": ["Khan Academy statistics"],
    "a-b-testing": ["Trustworthy Online Controlled Experiments"],
    "cybersecurity": ["TryHackMe – Pre Security path"],
    "penetration-testing": ["PortSwigger Web Security Academy"],
    "soc-siem": ["Splunk fundamentals"],
    "incident-response": ["SANS incident response posters"],
    "iam": ["Okta identity 101"],
    "appsec": ["OWASP Top 10"],
    "cloud-security": ["AWS Security best practices"],
    "governance-risk": ["NIST CSF 2.0"],
    "linux": ["Linux Journey"],
    "git": ["git-scm.com/book"],
    "bash": ["Google shell scripting guide"],
    "javascript": ["javascript.info"],
    "typescript": ["typescriptlang.org/docs/handbook"],
    "golang": ["go.dev/tour"],
    "system-design": ["System Design Primer"],
    "microservices": ["microservices.io patterns"],
    "prometheus": ["prometheus.io/docs/tutorials"],
    "product-management": ["Inspired – Marty Cagan"],
    "agile": ["scrum.org open assessments"],
    "pytest": ["docs.pytest.org"],
    "selenium": ["selenium.dev/documentation"],
    "playwright": ["playwright.dev/docs/intro"],
    "computer-vision": ["OpenCV tutorials"],
    "nlp": ["Stanford CS224n"],
    "transformers": ["The Illustrated Transformer"],
    "hugging-face": ["huggingface.co/learn"],
    "model-deployment": ["BentoML quickstart"],
    "mlflow": ["mlflow.org quickstart"],
    "feature-engineering": ["Feature Engineering for ML"],
    "mongodb": ["MongoDB University"],
    "postgresql": ["postgresqltutorial.com"],
    "redis": ["redis.io university"],
    "ai-ethics": ["Google Responsible AI practices"],
}

WEEK_THEMES = [
    "Foundations & the highest-demand gap",
    "Core tooling & shipping",
    "Specialisation & the emerging edge",
    "Integrate, build & prove it",
    "Depth & scale",
    "Portfolio hardening",
    "Interview readiness",
    "Advanced specialisation",
]

DELIVERABLES = [
    "Publish a small repo: one script + one notebook that uses the week's skills on a real dataset.",
    "Containerise the week's code and expose it through a working API endpoint.",
    "Add the emerging skill to the project — one end-to-end feature, documented in the README.",
    "Ship a demo (deployed link + 2-minute walkthrough) and write a 300-word technical breakdown.",
    "Refactor for scale: add tests, monitoring and a documented architecture diagram.",
    "Write a case study: problem -> approach -> metrics -> trade-offs.",
    "Do two mock interviews on the topic and publish a Q&A cheatsheet.",
    "Contribute a fix or feature to an open-source project using the week's stack.",
]


def _hours(difficulty: int) -> int:
    return [4, 6, 9, 13, 18][max(0, min(4, int(difficulty) - 1))]


def required_skills_for_role(role: str, analysis: dict[str, Any] | None) -> tuple[list[dict[str, Any]], str]:
    """Prefer OBSERVED role data; fall back to the curated taxonomy profile."""
    observed = None
    if analysis:
        lowered = (role or "").strip().lower()
        for candidate in analysis.get("roles", []):
            if candidate["role"].lower() == lowered:
                observed = candidate
                break
        if observed is None:
            for candidate in analysis.get("roles", []):
                if lowered in candidate["role"].lower() or candidate["role"].lower() in lowered:
                    observed = candidate
                    break

    if observed and len(observed.get("topSkills", [])) >= 6:
        peak = max([s["demandScore"] for s in observed["topSkills"]] + [1])
        skills = [
            {
                "slug": s["slug"],
                "name": s["name"],
                "weight": round(s["demandScore"] / peak, 2),
                "demandScore": s["demandScore"],
            }
            for s in observed["topSkills"]
        ]
        return skills, "observed"

    profile = role_profile(role)
    if profile is None:
        return [], "taxonomy"

    blended: list[dict[str, Any]] = []
    observed_skills = {s["slug"]: s for s in (observed or {}).get("topSkills", [])}
    for slug, weight in profile.core:
        if slug not in SKILL_BY_SLUG:
            continue
        blended.append(
            {
                "slug": slug,
                "name": SKILL_NAME[slug],
                "weight": weight,
                "demandScore": observed_skills[slug]["demandScore"] if slug in observed_skills else round(weight * 70),
            }
        )
    for slug, weight in profile.emerging:
        if slug not in SKILL_BY_SLUG or any(b["slug"] == slug for b in blended):
            continue
        blended.append({"slug": slug, "name": SKILL_NAME[slug], "weight": round(weight * 0.75, 2), "demandScore": round(weight * 60)})

    blended.sort(key=lambda b: -b["weight"])
    return blended[:18], "taxonomy"


def analyze_skill_gap(user_skills: list[str], role: str, analysis: dict[str, Any] | None) -> dict[str, Any]:
    slugs: list[str] = []
    unresolved: list[str] = []
    for raw in user_skills:
        definition = normalize_skill_input(raw)
        if definition and definition.slug not in slugs:
            slugs.append(definition.slug)
        elif raw.strip():
            unresolved.append(raw.strip())

    required, basis = required_skills_for_role(role, analysis)
    if not required:
        return {
            "role": role,
            "readiness": 0.0,
            "matched": [],
            "missing": [],
            "extras": [{"slug": s, "name": SKILL_NAME.get(s, s)} for s in slugs],
            "requiredSkills": [],
            "earnedScore": 0.0,
            "totalScore": 0.0,
            "explanation": [
                f"No market requirement profile could be resolved for '{role}'.",
                "Pick one of the catalogue roles, or run a market search first so observed data is available.",
            ],
        }

    matched, missing = [], []
    earned = total = 0.0
    for req in required:
        total += req["weight"]
        if req["slug"] in slugs:
            earned += req["weight"]
            matched.append({**req})
        else:
            definition = SKILL_BY_SLUG.get(req["slug"])
            missing.append({**req, "difficulty": definition.difficulty if definition else 3})

    missing.sort(key=lambda m: (-(m["weight"] * m["demandScore"]), m["difficulty"]))
    matched.sort(key=lambda m: -m["demandScore"])
    extras = [{"slug": s, "name": SKILL_NAME.get(s, s)} for s in slugs if not any(r["slug"] == s for r in required)]
    readiness = round1(earned / total * 100) if total else 0.0

    basis_note = (
        f"observed market data for '{role}' from the current analysis ({analysis['overview']['totalSignals']} signals)."
        if basis == "observed" and analysis
        else f"curated SkillPulse role profile for '{role}' (too few observed signals for this role)."
    )
    explanation = [
        f"Requirement basis: {basis_note}",
        "Market Readiness = (demand weight you already cover) / (all required demand weight) x 100.",
        f"Covered weight: {round(earned, 2)} of {round(total, 2)} -> {readiness}%.",
        f"Matched {len(matched)} of {len(required)} required skills; {len(missing)} gaps remain.",
        "Weights come from the skill demand score, so a missing high-demand skill costs more readiness than a niche one.",
    ]
    if extras:
        explanation.append(f"You also list {len(extras)} skill(s) this role does not currently require ({', '.join(e['name'] for e in extras[:4])}).")
    if unresolved:
        explanation.append(f"Could not map to the skill taxonomy: {', '.join(unresolved)}.")

    return {
        "role": role,
        "readiness": readiness,
        "matched": matched,
        "missing": missing,
        "extras": extras,
        "requiredSkills": required,
        "earnedScore": round(earned, 2),
        "totalScore": round(total, 2),
        "explanation": explanation,
    }


def prioritise(gap: dict[str, Any], analysis: dict[str, Any] | None, take: int = 10) -> list[dict[str, Any]]:
    demand_by_slug = {m["slug"]: m for m in (analysis or {}).get("skills", [])}
    emerging = {e["slug"] for e in (analysis or {}).get("emerging", [])}
    scored: list[dict[str, Any]] = []

    for missing in gap["missing"]:
        definition = SKILL_BY_SLUG.get(missing["slug"])
        difficulty = definition.difficulty if definition else missing.get("difficulty", 3)
        observed = demand_by_slug.get(missing["slug"])
        demand = observed["demandScore"] if observed else missing["demandScore"]
        momentum = observed["momentumScore"] if observed else 50
        weight = missing.get("weight", 0.5)
        pull = demand / 100 * 0.55 + momentum / 100 * 0.2 + weight * 0.25
        cost = 0.8 + difficulty * 0.09
        reason_bits = [
            f"Observed demand {demand}/100 in {observed['frequency']} collected signals"
            if observed
            else f"Curated demand weight {demand}/100 for this role",
        ]
        if missing["slug"] in emerging or (definition and definition.emerging):
            reason_bits.append("flagged emerging")
        reason_bits.append(f"role weight {round(weight * 100)}%")
        reason_bits.append(f"learning cost {difficulty}/5")
        scored.append(
            {
                "slug": missing["slug"],
                "name": missing["name"],
                "priority": round1(pull / cost * 100),
                "reason": " · ".join(reason_bits),
                "hours": _hours(difficulty),
                "difficulty": difficulty,
                "prerequisites": list(definition.prerequisites) if definition else [],
            }
        )

    scored.sort(key=lambda s: -s["priority"])
    selected = scored[:take]

    have = {m["slug"] for m in gap["matched"]}
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()

    def visit(skill: dict[str, Any], depth: int = 0) -> None:
        if skill["slug"] in seen or depth > 3:
            return
        seen.add(skill["slug"])
        for pre in skill["prerequisites"]:
            if pre in have or pre in seen or pre not in SKILL_BY_SLUG:
                continue
            definition = SKILL_BY_SLUG[pre]
            visit(
                {
                    "slug": pre,
                    "name": definition.name,
                    "priority": skill["priority"] + 4,
                    "reason": f"Prerequisite for {skill['name']} (difficulty {definition.difficulty}/5)",
                    "hours": _hours(definition.difficulty),
                    "difficulty": definition.difficulty,
                    "prerequisites": list(definition.prerequisites),
                },
                depth + 1,
            )
        ordered.append(skill)

    for skill in selected:
        visit(skill)
    return ordered


def build_roadmap(gap: dict[str, Any], analysis: dict[str, Any] | None, weeks: int = 4) -> dict[str, Any]:
    weeks = max(3, min(8, int(weeks or 4)))
    prioritised = prioritise(gap, analysis, max(4, weeks * 3))

    if not prioritised:
        note = (
            f"You already cover {gap['readiness']}% of the observed market requirements for {gap['role']} — no material gap to plan for."
            if gap["readiness"] >= 95
            else "No gaps could be resolved. Add your current skills or pick a different target role."
        )
        return {"role": gap["role"], "totalHours": 0, "weeks": [], "prioritisation": [], "notes": [note]}

    buckets: list[list[dict[str, Any]]] = [[] for _ in range(weeks)]
    for i, skill in enumerate(prioritised):
        buckets[min(weeks - 1, (i * weeks) // len(prioritised))].append(skill)

    plan = []
    for idx, skills in enumerate(buckets):
        theme = WEEK_THEMES[min(len(WEEK_THEMES) - 1, idx if weeks <= 4 else idx + 2)]
        plan.append(
            {
                "week": idx + 1,
                "theme": theme,
                "focus": [{"slug": s["slug"], "name": s["name"], "reason": s["reason"], "hours": s["hours"]} for s in skills],
                "deliverable": DELIVERABLES[min(len(DELIVERABLES) - 1, idx)],
                "resources": [RESOURCE_LIBRARY.get(s["slug"], [f"Search: learn {s['name']} tutorial"])[0] for s in skills][:4],
                "estimatedHours": sum(s["hours"] for s in skills),
            }
        )

    notes = [f"Built from {len(gap['missing'])} detected gaps against {gap['role']}."]
    if analysis:
        notes.append(
            f"Demand evidence: {analysis['overview']['totalSignals']} signals ({analysis['source'].upper()}) collected at {analysis['createdAt']}."
        )
    else:
        notes.append("No market analysis attached — priorities come from the curated role profile.")
    notes.append("Hours assume focused study; adjust +/-40% to your background.")

    return {
        "role": gap["role"],
        "totalHours": sum(w["estimatedHours"] for w in plan),
        "weeks": plan,
        "prioritisation": [
            {"slug": p["slug"], "name": p["name"], "priority": p["priority"], "reason": p["reason"]} for p in prioritised
        ],
        "notes": notes,
    }


def role_catalogue() -> list[dict[str, Any]]:
    return [{"slug": r.slug, "label": r.label, "industries": list(r.industries)} for r in ROLES]
