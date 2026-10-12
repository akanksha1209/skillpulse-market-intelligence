"""
SkillPulse – Market Signal Intelligence · FastAPI application.

Run:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Interactive docs: http://localhost:8000/docs
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .config import settings
from .database import healthcheck, init_db
from .routers import API_ROUTERS
from .services.llm_service import llm_status
from .services.search_service import system_status
from .services.serpapi_service import serpapi_configured


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SkillPulse – Market Signal Intelligence",
    version=__version__,
    summary="Turn live job-market signals into skill demand scores, momentum classification, "
    "co-occurrence pairs, role analytics, skill-gap analysis and learning roadmaps.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """The API degrades gracefully instead of leaking stack traces."""
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error.", "detail": str(exc)},
    )


@app.get("/health", tags=["system"], summary="Liveness + component health")
def health() -> dict[str, Any]:
    database = healthcheck()
    return {
        "ok": True,
        "service": "skillpulse",
        "version": __version__,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "components": {
            "database": database,
            "serpapi": "configured" if serpapi_configured() else "missing-key (demo fallback active)",
            "llm": "configured" if llm_status()["configured"] else "missing-key (deterministic fallback active)",
        },
        "mode": "live-capable" if serpapi_configured() else "demo",
    }


@app.get("/api/status", tags=["system"], summary="Runtime capability probe used by the UI")
def status() -> dict[str, Any]:
    return {**system_status(), "database": healthcheck()}


@app.get("/", tags=["system"], summary="API index")
def index() -> dict[str, Any]:
    return {
        "product": "SkillPulse – Market Signal Intelligence",
        "version": __version__,
        "docs": "/docs",
        "endpoints": [
            "GET  /health",
            "GET  /api/status",
            "POST /api/search",
            "GET  /api/search?q=",
            "POST /api/demo",
            "GET  /api/market/overview",
            "GET  /api/skills",
            "GET  /api/skills/{slug}",
            "GET  /api/roles",
            "GET  /api/companies",
            "GET  /api/skill-gap",
            "POST /api/skill-gap",
            "POST /api/roadmap",
            "POST /api/market-report",
            "GET  /api/history",
            "GET  /api/history/{id}",
            "DELETE /api/history/{id}",
            "GET  /api/export/{id}?format=json|csv&dataset=skills|signals|roles|companies|edges|timeline",
        ],
        "mode": "live-capable" if serpapi_configured() else "demo",
    }


for _router, _prefix in API_ROUTERS:
    app.include_router(_router, prefix=_prefix)
