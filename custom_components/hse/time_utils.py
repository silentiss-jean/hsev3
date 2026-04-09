"""
HSE V3 — Utilitaires temps (source V2 intact).
"""
from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts)
    except Exception:
        return None


def seconds_since(ts: str | None) -> int | None:
    dt = parse_iso(ts)
    if not dt:
        return None
    return int((utc_now() - dt).total_seconds())
