"""
HSE V3 — engine/period_stats.py

Énergie consommée (kWh) sur une période, par capteur, avec la MÉTHODE utilisée.

Pourquoi plus la même logique qu'en V3.0 :
  - le recorder purge les états bruts (10 jours par défaut) : mois/année faux ;
    les statistiques long terme (state_class) sont conservées → méthode n°1 ;
  - « dernier - premier état » ignore les remises à zéro et l'unité (Wh) ;
  - un capteur de puissance (W) n'a pas de « delta » : on intègre la puissance ;
  - les bornes de période sont celles du calendrier LOCAL (pas UTC).

Méthodes (champ `method`) :
  statistics        compteur cumulatif, somme des `change` des stats long terme
                    (+ résiduel live depuis la dernière stat compilée)
  statistics_power  puissance, Σ moyenne horaire × durée (+ résiduel intégré)
  history           repli : états bruts du recorder (fiable seulement dans la fenêtre
                    de purge)
  none              aucune donnée exploitable → kwh = 0.0 et `quality` = "missing"

Les fonctions `aggregate_*` sont pures et testées sans Home Assistant.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from .measure import (
    ENERGY_UNITS,
    MAX_PLAUSIBLE_RATE_KW,
    classify,
    energy_increments_kwh,
    integrate_power_kwh,
    parse_number,
    read_state,
)
from ..time_utils import window_for_period

_LOGGER = logging.getLogger(__name__)

_CACHE_TTL_S = 60.0
_cache: dict[tuple, tuple[float, dict[str, dict[str, Any]]]] = {}


# ── Utilitaires purs ──────────────────────────────────────────────────────────

def _ts(x: Any) -> float | None:
    """datetime | float | int -> timestamp (s)."""
    if x is None:
        return None
    if isinstance(x, datetime):
        return x.timestamp()
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def aggregate_energy_rows(
    rows: list[dict[str, Any]],
) -> tuple[float, float | None]:
    """
    Somme des `change` (kWh) des lignes de statistiques.
    Retourne (kwh, dernier_state_kwh). Les `change` négatifs sont ignorés.
    """
    total = 0.0
    last_state: float | None = None
    for row in rows or []:
        ch = parse_number(row.get("change"))
        if ch is not None and ch > 0:
            total += ch
        st = parse_number(row.get("state"))
        if st is not None:
            last_state = st
    return total, last_state


def aggregate_power_rows(rows: list[dict[str, Any]], default_hours: float) -> float:
    """Σ (moyenne W × durée h) / 1000 → kWh. Moyennes négatives/absentes ignorées."""
    wh = 0.0
    for row in rows or []:
        mean = parse_number(row.get("mean"))
        if mean is None or mean <= 0:
            continue
        s, e = _ts(row.get("start")), _ts(row.get("end"))
        hours = (e - s) / 3600.0 if s is not None and e is not None and e > s else default_hours
        wh += mean * hours
    return wh / 1000.0


def residual_energy_kwh(live_kwh: float | None, last_state_kwh: float | None,
                        seconds_since: float | None = None) -> float:
    """
    Énergie accumulée depuis la dernière statistique compilée (≤ 1 h de retard).
    Remise à zéro / valeur manquante / débit aberrant => 0 (on n'invente rien).
    """
    if live_kwh is None or last_state_kwh is None:
        return 0.0
    d = live_kwh - last_state_kwh
    if d <= 0:
        return 0.0
    if seconds_since is not None and seconds_since > 0:
        if d / (seconds_since / 3600.0) > MAX_PLAUSIBLE_RATE_KW:
            return 0.0
    return d


def history_samples(state_list: list[Any]) -> list[tuple[float, float]]:
    """[(ts, valeur_brute)] depuis des états recorder (minimal_response)."""
    out: list[tuple[float, float]] = []
    for s in state_list or []:
        v = parse_number(getattr(s, "state", None))
        t = _ts(getattr(s, "last_updated", None) or getattr(s, "last_changed", None))
        if v is not None and t is not None:
            out.append((t, v))
    out.sort(key=lambda x: x[0])
    return out


def history_power_samples(state_list: list[Any], factor: float) -> list[tuple[float, float | None]]:
    out: list[tuple[float, float | None]] = []
    for s in state_list or []:
        t = _ts(getattr(s, "last_updated", None) or getattr(s, "last_changed", None))
        if t is None:
            continue
        v = parse_number(getattr(s, "state", None))
        out.append((t, None if v is None else v * factor))
    out.sort(key=lambda x: x[0])
    return out


# ── Accès recorder (exécuté dans l'executor) ───────────────────────────────────────

def _fetch_statistics(hass, start, end, ids: list[str], bucket: str) -> dict[str, list[dict]]:
    from homeassistant.components.recorder.statistics import statistics_during_period
    return statistics_during_period(
        hass, start, end, set(ids), bucket,
        {"energy": "kWh", "power": "W"},
        {"change", "mean", "state"},
    ) or {}


def _fetch_history(hass, start, end, ids: list[str]) -> dict[str, list[Any]]:
    from homeassistant.components.recorder import history as rec_history
    return rec_history.get_significant_states(
        hass, start, end, ids,
        include_start_time_state=True,
        significant_changes_only=False,
        minimal_response=True,
        no_attributes=True,
    ) or {}


def _local_midnight_utc(tz: Any, now: datetime) -> datetime:
    local = now.astimezone(tz) if tz is not None else now
    return local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)


async def async_energy_detail(
    hass,
    entity_ids: list[str],
    period: str = "month",
    *,
    now: datetime | None = None,
    use_cache: bool = True,
) -> dict[str, dict[str, Any]]:
    """
    {entity_id: {kwh, method, quality, anomalies}} pour la période (calendrier local).
    quality : "ok" | "partial" | "missing"
    Ne lève jamais : toute erreur => kwh 0.0, method "none", quality "missing".
    """
    if not entity_ids:
        return {}

    ids = sorted(set(entity_ids))
    cache_key = (period, tuple(ids))
    if use_cache and now is None:
        hit = _cache.get(cache_key)
        if hit and time.monotonic() - hit[0] < _CACHE_TTL_S:
            return hit[1]

    result: dict[str, dict[str, Any]] = {
        e: {"kwh": 0.0, "method": "none", "quality": "missing", "anomalies": 0} for e in ids
    }

    try:
        from homeassistant.util import dt as dt_util
        tz = dt_util.DEFAULT_TIME_ZONE
    except Exception:  # pragma: no cover
        tz = None

    start, end = window_for_period(period, now=now, tz=tz)
    midnight = _local_midnight_utc(tz, end)

    kinds: dict[str, tuple[str | None, float]] = {}
    live_kwh: dict[str, float | None] = {}
    for e in ids:
        st = hass.states.get(e)
        attrs = (getattr(st, "attributes", None) or {}) if st is not None else {}
        kind, factor, _ = classify(attrs.get("device_class"), attrs.get("unit_of_measurement"))
        kinds[e] = (kind, factor)
        live_kwh[e] = read_state(st).value if kind == "energy" else None

    # 1) Statistiques long terme -----------------------------------------
    rows_by_id: dict[str, list[dict]] = {}
    try:
        def _stats():
            out: dict[str, list[dict]] = {}
            if period == "day":
                parts = [(start, end, "hour")]
            else:
                parts = [(start, midnight, "day"), (midnight, end, "hour")]
            for a, b, bucket in parts:
                if b <= a:
                    continue
                for sid, rows in _fetch_statistics(hass, a, b, ids, bucket).items():
                    out.setdefault(sid, []).extend(rows)
            return out
        from homeassistant.components.recorder import get_instance
        rows_by_id = await get_instance(hass).async_add_executor_job(_stats)
    except Exception:
        _LOGGER.exception("HSE period_stats: statistiques indisponibles (%s)", period)

    need_history: list[str] = []
    residual_window_start = end.replace(minute=0, second=0, microsecond=0)
    for e in ids:
        kind, _factor = kinds[e]
        rows = rows_by_id.get(e) or []
        if kind == "energy" and rows:
            kwh, last_state = aggregate_energy_rows(rows)
            kwh += residual_energy_kwh(live_kwh[e], last_state, 3600.0)
            result[e].update(kwh=kwh, method="statistics", quality="ok")
        elif kind == "power" and rows and any(r.get("mean") is not None for r in rows):
            kwh = aggregate_power_rows(rows, 24.0 if period != "day" else 1.0)
            result[e].update(kwh=kwh, method="statistics_power", quality="ok")
            need_history.append(e)  # résiduel de l'heure en cours
        elif kind in ("energy", "power"):
            need_history.append(e)

    # 2) Repli historique + résiduel de l'heure en cours ------------------
    residual_ids = [e for e in need_history if result[e]["method"] == "statistics_power"]
    fallback_ids = [e for e in need_history if e not in residual_ids]
    end_ts = end.timestamp()
    rs = residual_window_start.timestamp()

    if residual_ids:
        try:
            sm_map = await hass.async_add_executor_job(
                lambda: _fetch_history(hass, residual_window_start, end, residual_ids))
            for e in residual_ids:
                samples = history_power_samples(sm_map.get(e) or [], kinds[e][1])
                prior = [x for x in samples if x[0] <= rs]
                inside = [x for x in samples if x[0] > rs]
                held = ([(rs, prior[-1][1])] if prior else []) + inside
                result[e]["kwh"] += integrate_power_kwh(held, end_ts)
        except Exception:
            _LOGGER.exception("HSE period_stats: résiduel horaire indisponible")

    if fallback_ids:
        try:
            states_map = await hass.async_add_executor_job(
                lambda: _fetch_history(hass, start, end, fallback_ids))
            for e in fallback_ids:
                kind, factor = kinds[e]
                lst = states_map.get(e) or []
                if kind == "energy":
                    samples = history_samples(lst)
                    if len(samples) >= 2:
                        kwh, anomalies = energy_increments_kwh(samples, factor=factor)
                        result[e].update(kwh=kwh, method="history", quality="partial",
                                         anomalies=anomalies)
                elif kind == "power":
                    samples = history_power_samples(lst, factor)
                    if samples:
                        samples[0] = (max(samples[0][0], start.timestamp()), samples[0][1])
                        result[e].update(kwh=integrate_power_kwh(samples, end_ts),
                                         method="history", quality="partial")
        except Exception:
            _LOGGER.exception("HSE period_stats: historique indisponible (%s)", period)

    for e in ids:
        result[e]["kwh"] = round(float(result[e]["kwh"]), 3)

    if use_cache and now is None:
        _cache[cache_key] = (time.monotonic(), result)
    return result


# ── API de compatibilité V3.0 ───────────────────────────────────────────────────────

async def async_energy_for_period(
    hass,
    entity_ids: list[str],
    period: str = "month",
) -> dict[str, float]:
    """dict[entity_id -> kWh]. Toujours retourné, 0.0 par défaut."""
    detail = await async_energy_detail(hass, entity_ids, period)
    return {e: d["kwh"] for e, d in detail.items()}


async def async_total_energy_for_period(
    hass,
    entity_ids: list[str],
    period: str = "month",
) -> float:
    per_entity = await async_energy_for_period(hass, entity_ids, period)
    return round(sum(per_entity.values()), 3)


__all__ = [
    "async_energy_detail", "async_energy_for_period", "async_total_energy_for_period",
    "aggregate_energy_rows", "aggregate_power_rows", "residual_energy_kwh",
    "history_samples", "history_power_samples", "ENERGY_UNITS",
]
