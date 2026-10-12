"""End-to-end API tests: health, search, fallback/demo mode, planning, exports."""

from __future__ import annotations

from fastapi.testclient import TestClient


# ── System ───────────────────────────────────────────────────────────────────


def test_health_reports_component_status(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "skillpulse"
    assert body["components"]["database"] is True
    assert "serpapi" in body["components"] and "llm" in body["components"]


def test_status_advertises_demo_mode_without_keys(client: TestClient):
    body = client.get("/api/status").json()
    assert body["serpapi"]["configured"] is False
    assert body["llm"]["configured"] is False
    assert body["mode"] == "demo"
    assert body["taxonomy"]["skills"] > 80


def test_index_lists_the_public_contract(client: TestClient):
    body = client.get("/").json()
    assert any("/api/search" in e for e in body["endpoints"])


# ── Search & fallback ────────────────────────────────────────────────────────


def test_search_requires_a_query(client: TestClient):
    assert client.post("/api/search", json={"query": ""}).status_code == 422
    assert client.post("/api/search", json={}).status_code == 422


def test_search_falls_back_to_labelled_demo_data(client: TestClient, analysis: dict):
    assert analysis["source"] == "demo"
    assert analysis["isDemo"] is True
    assert analysis["overview"]["totalSignals"] > 50
    assert any("DEMO MODE" in note for note in analysis["notes"])


def test_demo_data_is_deterministic_for_the_same_query(client: TestClient):
    first = client.post("/api/search", json={"query": "cybersecurity jobs India", "forceDemo": True}).json()["analysis"]
    second = client.post("/api/search", json={"query": "cybersecurity jobs India", "forceDemo": True}).json()["analysis"]
    assert first["overview"]["totalSignals"] == second["overview"]["totalSignals"]
    assert [s["id"] for s in first["signals"][:10]] == [s["id"] for s in second["signals"][:10]]


def test_analysis_contains_every_intelligence_layer(client: TestClient, analysis: dict):
    for key in ("skills", "edges", "roles", "companies", "industries", "emerging", "timeline", "classificationCounts"):
        assert analysis[key], f"missing {key}"
    assert analysis["overview"]["marketScore"] >= 0
    assert 0 <= analysis["overview"]["momentumScore"] <= 100
    assert analysis["skills"][0]["demandScore"] >= analysis["skills"][-1]["demandScore"]


def test_demo_endpoint_returns_suggested_queries(client: TestClient):
    body = client.post("/api/demo", json={"query": "data analyst India"}).json()
    assert body["demo"] is True
    assert body["analysis"]["isDemo"] is True
    assert body["suggestedQueries"]


def test_query_for_a_technology_surfaces_relevant_roles(client: TestClient):
    body = client.post("/api/search", json={"query": "generative AI", "forceDemo": True}).json()["analysis"]
    labels = {r["role"] for r in body["roles"]}
    assert "AI / GenAI Engineer" in labels
    slugs = {s["slug"] for s in body["skills"]}
    assert {"generative-ai", "llm", "rag"} & slugs


# ── Market overview, skills, roles, companies ────────────────────────────────


def test_market_overview_returns_latest_when_no_id(client: TestClient, analysis: dict):
    body = client.get("/api/market/overview").json()
    assert body["empty"] is False
    assert body["analysis"]["overview"]["totalSignals"] > 0
    assert "signals" not in body["analysis"]          # heavy payload trimmed
    assert body["sampleSignals"]                       # but a sample is provided


def test_market_overview_empty_state(client: TestClient):
    body = client.get("/api/market/overview?id=does-not-exist").json()
    assert body["empty"] is True
    assert "message" in body


def test_skills_endpoint_filters_and_exposes_breakdown(client: TestClient, analysis: dict):
    body = client.get(f"/api/skills?id={analysis['id']}&limit=5").json()
    assert body["count"] >= 1
    assert set(body["skills"][0]["breakdown"]) == {
        "frequency", "roleDiversity", "companyDiversity", "sourceBreadth", "recency", "growth",
    }
    filtered = client.get(f"/api/skills?id={analysis['id']}&classification=Exploding").json()
    assert all(s["classification"] == "Exploding" for s in filtered["skills"])


def test_skill_detail_explains_the_score(client: TestClient, analysis: dict):
    body = client.get(f"/api/skills/python?id={analysis['id']}").json()
    assert body["found"] is True
    assert body["name"] == "Python"
    assert body["explanation"] and "Frequency" in body["explanation"][0]
    assert body["momentumExplanation"]
    assert "python3" in [a.lower().replace(" ", "") for a in body["aliases"]]


def test_unknown_skill_detail_degrades_gracefully(client: TestClient):
    body = client.get("/api/skills/not-a-real-skill").json()
    assert body["found"] is False
    assert body["metric"] is None


def test_roles_endpoint_returns_catalogue(client: TestClient, analysis: dict):
    body = client.get(f"/api/roles?id={analysis['id']}").json()
    assert body["roles"]
    assert len(body["catalogue"]) >= 15
    top = body["roles"][0]
    assert top["topSkills"] and top["relatedRoles"] is not None


def test_companies_endpoint_filters_by_industry(client: TestClient, analysis: dict):
    body = client.get(f"/api/companies?id={analysis['id']}&industry=fintech").json()
    assert body["matchedSignals"] >= 0
    assert all("FinTech" in c["industries"] for c in body["companies"])


def test_companies_endpoint_filters_by_skill(client: TestClient, analysis: dict):
    body = client.get(f"/api/companies?id={analysis['id']}&skill=docker").json()
    assert body["filters"]["skill"] == "docker"


# ── Skill gap / roadmap / report ─────────────────────────────────────────────


def test_skill_gap_endpoint_computes_readiness(client: TestClient, analysis: dict):
    body = client.post(
        "/api/skill-gap",
        json={"skills": ["Python", "SQL", "machine learning", "pandas"], "role": "Machine Learning Engineer", "analysisId": analysis["id"]},
    ).json()
    gap = body["gap"]
    assert 0 < gap["readiness"] < 100
    assert body["basis"]["isDemo"] is True
    assert gap["missing"]
    assert gap["explanation"]


def test_skill_gap_endpoint_validates_input(client: TestClient):
    assert client.post("/api/skill-gap", json={"skills": [], "role": "Data Scientist"}).status_code == 422
    assert client.post("/api/skill-gap", json={"skills": ["python"], "role": ""}).status_code == 422


def test_roadmap_endpoint_returns_weekly_plan(client: TestClient, analysis: dict):
    body = client.post(
        "/api/roadmap",
        json={"skills": ["Python"], "role": "AI / GenAI Engineer", "weeks": 4, "analysisId": analysis["id"]},
    ).json()
    plan = body["roadmap"]
    assert len(plan["weeks"]) == 4
    assert all(w["focus"] and w["deliverable"] and w["estimatedHours"] > 0 for w in plan["weeks"])
    assert plan["prioritisation"]


def test_roadmap_weeks_are_clamped(client: TestClient):
    assert client.post("/api/roadmap", json={"skills": ["Python"], "role": "Data Scientist", "weeks": 99}).status_code == 422


def test_market_report_is_deterministic_without_llm(client: TestClient, analysis: dict):
    body = client.post("/api/market-report", json={"searchId": analysis["id"]}).json()
    report = body["report"]
    assert report["mode"] == "heuristic"
    assert report["model"] is None
    assert body["stored"] is True
    keys = [s["key"] for s in report["sections"]]
    assert {"market_signal", "evidence", "top_skills", "emerging_skills", "recommendation"} <= set(keys)
    assert all(s["provenance"] in {"observed", "calculated", "ai"} for s in report["sections"])
    assert "DEMO" in report["disclaimer"].upper() or "deterministic" in report["disclaimer"].lower()


def test_market_report_404_without_analysis(client: TestClient):
    assert client.post("/api/market-report", json={"searchId": "nope"}).status_code == 404


# ── History & export ─────────────────────────────────────────────────────────


def test_history_lists_stored_analyses(client: TestClient, analysis: dict):
    body = client.get("/api/history").json()
    assert body["count"] >= 1
    item = next(i for i in body["items"] if i["id"] == analysis["id"])
    assert item["query"] == analysis["query"]
    assert item["signalCount"] == analysis["overview"]["totalSignals"]
    assert item["topSkill"] == analysis["skills"][0]["name"]


def test_history_item_reopens_the_full_snapshot(client: TestClient, analysis: dict):
    body = client.get(f"/api/history/{analysis['id']}").json()
    assert body["analysis"]["overview"]["totalSignals"] == analysis["overview"]["totalSignals"]
    assert client.get("/api/history/missing-id").status_code == 404


def test_export_json_contains_methodology(client: TestClient, analysis: dict):
    response = client.get(f"/api/export/{analysis['id']}?format=json")
    assert response.status_code == 200
    document = response.json()
    assert document["report"]["product"].startswith("SkillPulse")
    assert document["report"]["methodology"]["demandScoreWeights"]["frequency"] == 0.35
    assert document["marketOverview"]["totalSignals"] == analysis["overview"]["totalSignals"]
    assert document["topSkills"]


def test_export_csv_for_each_dataset(client: TestClient, analysis: dict):
    for dataset in ("skills", "signals", "roles", "companies", "edges", "timeline"):
        response = client.get(f"/api/export/{analysis['id']}?format=csv&dataset={dataset}")
        assert response.status_code == 200, dataset
        assert response.headers["content-type"].startswith("text/csv")
        assert len(response.text.splitlines()) > 1, dataset


def test_export_rejects_unknown_dataset(client: TestClient, analysis: dict):
    assert client.get(f"/api/export/{analysis['id']}?format=csv&dataset=nope").status_code == 400


def test_delete_history_removes_the_analysis(client: TestClient):
    created = client.post("/api/search", json={"query": "temporary analysis", "forceDemo": True}).json()["analysis"]
    assert client.delete(f"/api/history/{created['id']}").json()["deleted"] is True
    assert client.get(f"/api/history/{created['id']}").status_code == 404
