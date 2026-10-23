"""
HSE V3 — Utilitaires temps (source V2 intact + extensions V3).

Fournit :
  - utc_now / utc_now_iso / parse_iso / seconds_since  (V2, inchangés)
  - start_of_day / start_of_week / start_of_month / start_of_year  (V3, utilisés par period_stats et analytics)

Toutes les fonctions retournent des datetime timezone-aware (UTC).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


# ────────────────────────────────────────────────────────────────────────────
# Héritage V2 (inchangé)
# ────────────────────────────────────────────────────────────────────────────

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


# ────────────────────────────────────────────────────────────────────────────
# Fenêtres temporelles V3 (UTC, timezone-aware)
# Utilisées par engine/period_stats.py et engine/analytics.py
# ────────────────────────────────────────────────────────────────────────────

def start_of_day(now: datetime | None = None) -> datetime:
    """Début du jour courant (UTC 00:00:00)."""
    t = now or utc_now()
    return t.replace(hour=0, minute=0, second=0, microsecond=0)


def start_of_week(now: datetime | None = None) -> datetime:
    """Lundi de la semaine courante (UTC 00:00:00)."""
    t = now or utc_now()
    return (t - timedelta(days=t.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


def start_of_month(now: datetime | None = None) -> datetime:
    """Premier jour du mois courant (UTC 00:00:00)."""
    t = now or utc_now()
    return t.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def start_of_year(now: datetime | None = None) -> datetime:
    """Premier jour de l'année courante (UTC 00:00:00)."""
    t = now or utc_now()
    return t.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)


def window_for_period(
    period: str,
    now: datetime | None = None,
    tz: Any = None,
) -> tuple[datetime, datetime]:
    """
    Retourne (start, end) en UTC pour la période demandée.
    end = maintenant. start = début de la fenêtre.

    period : "day" | "week" | "month" | "year"
    tz     : fuseau local (ex. dt_util.DEFAULT_TIME_ZONE). Si fourni, les bornes
             sont celles du calendrier LOCAL (minuit local, lundi local, 1er du
             mois local…) puis converties en UTC. Sans tz : comportement V3.0 (UTC).
    """
    t = now or utc_now()
    if tz is None:
        mapping = {
            "day":   start_of_day(t),
            "week":  start_of_week(t),
            "month": start_of_month(t),
            "year":  start_of_year(t),
        }
        return mapping.get(period, start_of_day(t)), t

    local = t.astimezone(tz)
    midnight = local.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        start_local = midnight - timedelta(days=local.weekday())
    elif period == "month":
        start_local = midnight.replace(day=1)
    elif period == "year":
        start_local = midnight.replace(month=1, day=1)
    else:
        start_local = midnight
    return start_local.astimezone(timezone.utc), t.astimezone(timezone.utc)
