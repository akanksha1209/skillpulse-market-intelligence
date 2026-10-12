"""Domain entities (plain dataclasses) used between services and routers."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Signal:
    id: str
    title: str
    company: str = ""
    industry: str = ""
    role: str = ""
    location: str = ""
    via: str = ""
    url: str = ""
    snippet: str = ""
    publishedDaysAgo: int = 30
    experienceLevel: str = ""
    employmentType: str = "Full-time"
    salaryMin: float | None = None
    salaryMax: float | None = None
    skills: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "title": self.title, "company": self.company, "industry": self.industry,
            "role": self.role, "location": self.location, "via": self.via, "url": self.url,
            "snippet": self.snippet, "publishedDaysAgo": self.publishedDaysAgo,
            "experienceLevel": self.experienceLevel, "employmentType": self.employmentType,
            "salaryMin": self.salaryMin, "salaryMax": self.salaryMax, "skills": self.skills,
        }

    @classmethod
    def from_dict(cls, raw: dict) -> "Signal":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in raw.items() if k in known})


@dataclass
class CollectionResult:
    signals: list[Signal] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    source: str = "demo"
    status: str = "completed"
    raw_count: int = 0
