"""SQLite persistence (stdlib sqlite3 — no ORM required, zero extra services)."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS searches (
    id               TEXT PRIMARY KEY,
    query            TEXT NOT NULL,
    canonical_query  TEXT,
    location         TEXT,
    source           TEXT NOT NULL DEFAULT 'demo',
    status           TEXT NOT NULL DEFAULT 'completed',
    is_demo          INTEGER NOT NULL DEFAULT 1,
    signal_count     INTEGER NOT NULL DEFAULT 0,
    market_score     REAL,
    momentum_score   REAL,
    top_skill        TEXT,
    notes            TEXT,
    analysis         TEXT,
    created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS searches_created_idx ON searches(created_at DESC);

CREATE TABLE IF NOT EXISTS signals (
    id                TEXT PRIMARY KEY,
    search_id         TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    company           TEXT,
    industry          TEXT,
    role              TEXT,
    location          TEXT,
    via               TEXT,
    url               TEXT,
    snippet           TEXT,
    published_days_ago INTEGER,
    experience_level  TEXT,
    employment_type   TEXT,
    salary_min        REAL,
    salary_max        REAL,
    skills            TEXT
);
CREATE INDEX IF NOT EXISTS signals_search_idx ON signals(search_id);

CREATE TABLE IF NOT EXISTS skill_metrics (
    id                 TEXT PRIMARY KEY,
    search_id          TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    slug               TEXT NOT NULL,
    name               TEXT NOT NULL,
    category           TEXT,
    frequency          INTEGER NOT NULL DEFAULT 0,
    unique_sources     INTEGER NOT NULL DEFAULT 0,
    role_diversity     INTEGER NOT NULL DEFAULT 0,
    company_diversity  INTEGER NOT NULL DEFAULT 0,
    recency_score      REAL,
    growth_score       REAL,
    demand_score       REAL,
    momentum_score     REAL,
    classification     TEXT,
    emerging           INTEGER NOT NULL DEFAULT 0,
    recent_window      INTEGER NOT NULL DEFAULT 0,
    prior_window       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS skill_metrics_search_idx ON skill_metrics(search_id);

CREATE TABLE IF NOT EXISTS skill_edges (
    id        TEXT PRIMARY KEY,
    search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    skill_a   TEXT NOT NULL,
    skill_b   TEXT NOT NULL,
    support   INTEGER NOT NULL DEFAULT 0,
    weight    REAL NOT NULL DEFAULT 0,
    lift      REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reports (
    id         TEXT PRIMARY KEY,
    search_id  TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    mode       TEXT NOT NULL DEFAULT 'heuristic',
    model      TEXT,
    sections   TEXT,
    created_at TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    path = Path(settings.database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def dumps(value: Any) -> str:
    return json.dumps(value, default=str)


def loads(value: str | None, fallback: Any = None) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def healthcheck() -> bool:
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
