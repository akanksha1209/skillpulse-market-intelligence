"""Pydantic request/response models for the SkillPulse API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Requests ─────────────────────────────────────────────────────────────────


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=160, description="Role, technology, industry or market query")
    location: str = Field(default="India", max_length=80)
    limit: int = Field(default=40, ge=10, le=120, description="Requested raw results per SerpAPI engine")
    forceDemo: bool = Field(default=False, description="Skip SerpAPI and use the labelled synthetic dataset")


class DemoRequest(BaseModel):
    query: str | None = Field(default=None, max_length=160)
    location: str = "India"


class SkillGapRequest(BaseModel):
    skills: list[str] = Field(..., min_length=1, description="Your current skills (free text; normalised server-side)")
    role: str = Field(..., min_length=2, max_length=80)
    analysisId: str | None = Field(default=None, description="Analysis to compare against; defaults to the latest")


class RoadmapRequest(SkillGapRequest):
    weeks: int = Field(default=4, ge=3, le=8)


class ReportRequest(BaseModel):
    searchId: str | None = None


# ── Responses ────────────────────────────────────────────────────────────────

MomentumClass = Literal["Exploding", "Growing", "Stable", "Declining", "Emerging"]
Provenance = Literal["observed", "calculated", "ai"]


class HealthResponse(BaseModel):
    ok: bool
    service: str = "skillpulse"
    version: str
    timestamp: str
    components: dict[str, Any]
    mode: str


class StatusResponse(BaseModel):
    serpapi: dict[str, Any]
    llm: dict[str, Any]
    mode: str
    forceDemo: bool = False
    database: bool
    taxonomy: dict[str, int]


class OverviewResponse(BaseModel):
    totalSignals: int
    uniqueSkills: int
    uniqueCompanies: int
    uniqueRoles: int
    uniqueIndustries: int
    avgSkillsPerSignal: float
    marketScore: float
    momentumScore: float
    freshnessDays: int
    salaryAvg: float | None = None


class Breakdown(BaseModel):
    frequency: float
    roleDiversity: float
    companyDiversity: float
    sourceBreadth: float
    recency: float
    growth: float


class SkillMetricOut(BaseModel):
    slug: str
    name: str
    category: str
    frequency: int
    uniqueSources: int
    roleDiversity: int
    companyDiversity: int
    share: float
    recencyScore: float
    growthScore: float
    demandScore: float
    momentumScore: float
    classification: MomentumClass
    emerging: bool
    recentWindow: int
    priorWindow: int
    breakdown: Breakdown


class HistoryItem(BaseModel):
    id: str
    query: str
    location: str
    source: str
    isDemo: bool
    status: str
    signalCount: int
    marketScore: float | None
    momentumScore: float | None
    topSkill: str | None
    createdAt: str


class ReportSectionOut(BaseModel):
    key: str
    label: str
    provenance: Provenance
    body: str
    bullets: list[str] = Field(default_factory=list)


class MarketReportOut(BaseModel):
    id: str
    searchId: str
    query: str
    mode: Literal["llm", "heuristic"]
    model: str | None
    headline: str
    sections: list[ReportSectionOut]
    createdAt: str
    disclaimer: str


class AnalysisEnvelope(BaseModel):
    """The full analysis document is versioned JSON; typed at the top level."""

    id: str
    query: str
    canonicalQuery: str
    location: str
    source: Literal["serpapi", "demo", "cache"]
    isDemo: bool
    status: Literal["completed", "partial", "failed"]
    notes: list[str]
    createdAt: str
    overview: OverviewResponse
    skills: list[SkillMetricOut]
    edges: list[dict[str, Any]]
    roles: list[dict[str, Any]]
    companies: list[dict[str, Any]]
    industries: list[dict[str, Any]]
    emerging: list[dict[str, Any]]
    timeline: list[dict[str, Any]]
    classificationCounts: dict[str, int]
    signals: list[dict[str, Any]]


class SearchResponse(BaseModel):
    analysis: AnalysisEnvelope
    persisted: bool = True


class SkillGapOut(BaseModel):
    role: str
    readiness: float
    matched: list[dict[str, Any]]
    missing: list[dict[str, Any]]
    extras: list[dict[str, Any]]
    requiredSkills: list[dict[str, Any]]
    earnedScore: float
    totalScore: float
    explanation: list[str]


class SkillGapResponse(BaseModel):
    gap: SkillGapOut
    basis: dict[str, Any] | None = None
    availableRoles: list[str] = Field(default_factory=list)


class RoadmapResponse(BaseModel):
    roadmap: dict[str, Any]
    gap: SkillGapOut
    basis: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
