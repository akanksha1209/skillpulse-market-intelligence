"""Central configuration. Secrets come from the environment only — never hard-coded."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:  # optional, keeps the backend runnable without python-dotenv
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:  # pragma: no cover - dotenv is optional
    pass


def _bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    serpapi_api_key: str | None = field(default_factory=lambda: (os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY") or None))
    openai_api_key: str | None = field(default_factory=lambda: (os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or None))
    openai_base_url: str = field(default_factory=lambda: os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    database_path: str = field(default_factory=lambda: os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parents[2] / "data" / "skillpulse.db")))
    cors_origins: list[str] = field(
        default_factory=lambda: [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
    )
    force_demo: bool = field(default_factory=lambda: _bool(os.getenv("FORCE_DEMO"), False))
    request_timeout_seconds: float = field(default_factory=lambda: float(os.getenv("SERPAPI_TIMEOUT", "12")))

    @property
    def serpapi_configured(self) -> bool:
        return bool(self.serpapi_api_key and len(self.serpapi_api_key.strip()) > 8)

    @property
    def llm_configured(self) -> bool:
        return bool(self.openai_api_key and len(self.openai_api_key.strip()) > 8)


settings = Settings()
