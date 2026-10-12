"""Small shared helpers."""

from __future__ import annotations

from typing import Any


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def truncate(text: str, length: int = 240) -> str:
    text = text or ""
    return text if len(text) <= length else text[: length - 1] + "…"
