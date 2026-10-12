"""Skill normalisation, extraction, demand scoring and momentum classification."""

from __future__ import annotations

from app.services.market_analyzer import (
    build_cooccurrence,
    build_skill_metrics,
    compute_market_score,
    explain_demand_score,
)
from app.services.recommendation_engine import analyze_skill_gap, build_roadmap
from app.services.skill_extractor import aliases_for, extract_skills, normalize_skill_input
from app.services.taxonomy import detect_role, role_profile
from app.services.trend_analyzer import compute_growth


# ── Normalisation ────────────────────────────────────────────────────────────


def test_equivalent_python_spellings_collapse_to_one_skill():
    for text in ["Python", "python 3", "Python programming", "Py"]:
        assert "python" in extract_skills(text), text


def test_ml_and_genai_aliases_normalise():
    assert "machine-learning" in extract_skills("Strong ML background required")
    assert "generative-ai" in extract_skills("building GenAI products")
    assert "generative-ai" in extract_skills("Generative AI engineer")
    assert "llm" in extract_skills("experience with LLMs and GPT-4")


def test_word_boundaries_prevent_false_positives():
    skills = extract_skills("We use NoSQL stores and write HTML emails")
    assert "sql" not in skills          # 'nosql' must not match 'sql'
    assert "mongodb" in skills           # but the nosql alias maps to mongodb
    assert "html-css" in skills


def test_normalize_skill_input_handles_fuzzy_user_text():
    assert normalize_skill_input("k8s").slug == "kubernetes"
    assert normalize_skill_input("Tensorflow").slug == "tensorflow"
    assert normalize_skill_input("vector db").slug == "vector-databases"
    assert normalize_skill_input("definitely-not-a-skill-xyz") is None


def test_aliases_are_exposed_for_transparency():
    aliases = aliases_for("rag")
    assert "retrieval augmented generation" in aliases


# ── Role attribution ─────────────────────────────────────────────────────────


def test_detect_role_prefers_the_most_specific_fragment():
    assert detect_role("Senior Machine Learning Engineer – Platform") == "Machine Learning Engineer"
    assert detect_role("Software Engineer") == "Software Engineer"
    assert detect_role("Office Administrator") == "Other"


def test_role_profile_fallback_is_available_for_catalogue_roles():
    profile = role_profile("Data Scientist")
    assert profile is not None
    assert any(slug == "python" for slug, _ in profile.core)


# ── Demand score ─────────────────────────────────────────────────────────────


def _signal(i: int, skills: list[str], days: int = 5, role: str = "Machine Learning Engineer", company: str = "Acme") -> dict:
    return {
        "id": f"s{i}", "title": f"{role} #{i}", "company": company, "industry": "SaaS", "role": role,
        "location": "Bengaluru, India", "via": "LinkedIn", "url": "", "snippet": "", "publishedDaysAgo": days,
        "experienceLevel": "Mid level (2-5 yrs)", "employmentType": "Full-time",
        "salaryMin": 10.0, "salaryMax": 20.0, "skills": skills,
    }


def test_demand_score_ranks_a_more_frequent_skill_higher():
    signals = [_signal(i, ["python", "sql"]) for i in range(10)]
    signals += [_signal(i + 10, ["python"]) for i in range(5)]
    metrics = {m["slug"]: m for m in build_skill_metrics(signals, min_frequency=1)}
    assert metrics["python"]["demandScore"] > metrics["sql"]["demandScore"]
    assert metrics["python"]["frequency"] == 15


def test_demand_score_breakdown_sums_to_the_score():
    signals = [_signal(i, ["python", "docker", "aws"], days=i % 60, company=f"C{i % 7}") for i in range(30)]
    metric = next(m for m in build_skill_metrics(signals, min_frequency=1) if m["slug"] == "python")
    assert abs(sum(metric["breakdown"].values()) - metric["demandScore"]) < 0.35
    assert len(explain_demand_score(metric)) == 6


def test_role_and_company_diversity_increase_the_score():
    roles = ["DevOps / SRE Engineer", "Machine Learning Engineer", "Backend Engineer", "Data Engineer"]
    signals = [
        _signal(i, ["docker"], role=roles[i % 4], company=f"C{i % 6}") for i in range(12)
    ]
    # 'selenium' has identical frequency but only one role and one employer.
    signals += [_signal(i + 50, ["selenium"], role="QA / Test Automation Engineer", company="QA Co") for i in range(12)]

    metrics = {m["slug"]: m for m in build_skill_metrics(signals, min_frequency=1)}
    assert metrics["docker"]["roleDiversity"] == 4
    assert metrics["selenium"]["roleDiversity"] == 1
    assert metrics["docker"]["companyDiversity"] > metrics["selenium"]["companyDiversity"]
    assert metrics["docker"]["demandScore"] > metrics["selenium"]["demandScore"]


def test_market_score_is_bounded():
    signals = [_signal(i, ["python", "sql"], days=i) for i in range(50)]
    metrics = build_skill_metrics(signals, min_frequency=1)
    score = compute_market_score(metrics, signals)
    assert 0 <= score <= 100


# ── Momentum ─────────────────────────────────────────────────────────────────


def test_flat_mention_rate_is_classified_stable():
    # 10 mentions in 30d vs 20 in the previous 60d == identical daily rate.
    growth = compute_growth(recent=10, prior=20, emerging=False)
    assert growth["classification"] == "Stable"
    assert abs(growth["momentum_score"] - 50) <= 2


def test_accelerating_skill_is_exploding():
    growth = compute_growth(recent=30, prior=5, emerging=False)
    assert growth["classification"] == "Exploding"
    assert growth["momentum_score"] > 80


def test_shrinking_skill_is_declining():
    growth = compute_growth(recent=2, prior=30, emerging=False)
    assert growth["classification"] == "Declining"
    assert growth["momentum_score"] < 40


def test_new_skill_with_no_history_is_emerging():
    growth = compute_growth(recent=5, prior=0, emerging=True)
    assert growth["classification"] == "Emerging"


# ── Co-occurrence ────────────────────────────────────────────────────────────


def test_cooccurrence_detects_a_real_pair_and_lift():
    # Two disjoint stacks: python+sql always travel together, docker+kubernetes too.
    signals = [_signal(i, ["python", "sql"]) for i in range(10)]
    signals += [_signal(i + 20, ["docker", "kubernetes"], role="DevOps / SRE Engineer") for i in range(10)]
    edges = build_cooccurrence(signals)
    pair = next((e for e in edges if {e["skillA"], e["skillB"]} == {"python", "sql"}), None)
    assert pair is not None
    assert pair["support"] == 10
    assert pair["lift"] > 1.5
    # A pair that only co-occurs by chance is filtered out.
    assert next((e for e in edges if {e["skillA"], e["skillB"]} == {"python", "docker"}), None) is None


# ── Skill gap & roadmap ──────────────────────────────────────────────────────


def test_skill_gap_readiness_is_weighted_and_explained():
    analysis = {"roles": [], "skills": [], "emerging": [], "overview": {"totalSignals": 0}, "source": "demo", "createdAt": ""}
    gap = analyze_skill_gap(["Python", "SQL", "Machine Learning"], "Machine Learning Engineer", analysis)
    assert 0 < gap["readiness"] < 100
    assert any(m["slug"] == "docker" for m in gap["missing"])
    assert gap["explanation"]
    assert "Requirement basis" in gap["explanation"][0]


def test_skill_gap_full_coverage_scores_100():
    analysis = {"roles": [], "skills": [], "emerging": [], "overview": {"totalSignals": 0}, "source": "demo", "createdAt": ""}
    profile = role_profile("Machine Learning Engineer")
    all_skills = [slug for slug, _ in profile.core] + [slug for slug, _ in profile.emerging]
    gap = analyze_skill_gap(all_skills, "Machine Learning Engineer", analysis)
    assert gap["readiness"] == 100.0
    assert gap["missing"] == []


def test_roadmap_orders_prerequisites_before_dependents():
    analysis = {"roles": [], "skills": [], "emerging": [], "overview": {"totalSignals": 0}, "source": "demo", "createdAt": ""}
    gap = analyze_skill_gap(["Python"], "Machine Learning Engineer", analysis)
    plan = build_roadmap(gap, analysis, weeks=4)
    slugs = [f["slug"] for week in plan["weeks"] for f in week["focus"]]
    assert "machine-learning" in slugs
    if "mlops" in slugs and "docker" in slugs:
        assert slugs.index("docker") < slugs.index("mlops")
    assert len(plan["weeks"]) == 4
    assert plan["totalHours"] > 0
    assert all(week["deliverable"] for week in plan["weeks"])


def test_roadmap_is_empty_when_there_is_no_gap():
    analysis = {"roles": [], "skills": [], "emerging": [], "overview": {"totalSignals": 0}, "source": "demo", "createdAt": ""}
    profile = role_profile("Data Analyst")
    gap = analyze_skill_gap([slug for slug, _ in list(profile.core) + list(profile.emerging)], "Data Analyst", analysis)
    assert gap["readiness"] == 100.0
    plan = build_roadmap(gap, analysis)
    assert plan["weeks"] == []
    assert plan["notes"]
