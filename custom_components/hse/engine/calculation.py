"""
HSE V3 — engine/calculation.py
Source : calculation_engine.py V1 (réintégré + épuré).

Calcul temps réel de la puissance et de l'énergie depuis hass.states.

Règle : pas d'accès direct à hass — on reçoit les states en paramètre
        pour rester testable sans HomeAssistant instancié.
"""
from __future__ import annotations

from typing import Any


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _safe_float(value: Any) -> float | None:
    """Retourne float ou None si non convertible."""
    if value is None:
        return None
    try:
        f = float(value)
        # Filtre les valeurs impossibles (ex: unavailable converti en NaN)
        if f != f:  # NaN check
            return None
        return f
    except (TypeError, ValueError):
        return None


def _unit_to_watts(value: float, unit: str | None) -> float:
    """Normalise une valeur de puissance en Watts."""
    u = (unit or "").strip().lower()
    if u == "kw":
        return value * 1000.0
    return value  # W ou unité inconnue — on suppose W


def _unit_to_kwh(value: float, unit: str | None) -> float:
    """Normalise une valeur d'énergie en kWh."""
    u = (unit or "").strip().lower()
    if u == "wh":
        return value / 1000.0
    return value  # kWh ou unité inconnue — on suppose kWh


# ────────────────────────────────────────────────────────────────────────────
# API publique
# ────────────────────────────────────────────────────────────────────────────

def get_power_w(state_obj: Any) -> float | None:
    """
    Retourne la puissance en Watts depuis un objet State HA.
    Supporte W et kW.
    Retourne None si l'état est indisponible ou non numérique.
    """
    if state_obj is None:
        return None
    raw = getattr(state_obj, "state", None)
    if str(raw or "").lower() in ("unavailable", "unknown", "", "none"):
        return None
    val = _safe_float(raw)
    if val is None:
        return None
    attrs = getattr(state_obj, "attributes", {}) or {}
    unit = attrs.get("unit_of_measurement")
    return _unit_to_watts(val, unit)


def get_energy_kwh(state_obj: Any) -> float | None:
    """
    Retourne l'énergie en kWh depuis un objet State HA.
    Supporte kWh et Wh.
    Retourne None si l'état est indisponible ou non numérique.
    """
    if state_obj is None:
        return None
    raw = getattr(state_obj, "state", None)
    if str(raw or "").lower() in ("unavailable", "unknown", "", "none"):
        return None
    val = _safe_float(raw)
    if val is None:
        return None
    attrs = getattr(state_obj, "attributes", {}) or {}
    unit = attrs.get("unit_of_measurement")
    return _unit_to_kwh(val, unit)


def compute_totals(
    entity_ids: list[str],
    states: dict[str, Any],
) -> dict[str, float | None]:
    """
    Calcule la puissance totale (W) et l'énergie totale (kWh)
    pour une liste d'entity_ids.

    Paramètres
    ----------
    entity_ids : list[str]
        Liste des entity_id à sommer.
    states : dict[str, State]
        Snapshot de hass.states (ou sous-ensemble).

    Retourne
    --------
    { power_w: float|None, energy_kwh: float|None, count_ok: int, count_total: int }
    """
    total_w: float = 0.0
    total_kwh: float = 0.0
    count_ok = 0
    has_power = False
    has_energy = False

    for eid in entity_ids:
        state = states.get(eid)
        pw = get_power_w(state)
        en = get_energy_kwh(state)
        if pw is not None:
            total_w += pw
            has_power = True
            count_ok += 1
        elif en is not None:
            total_kwh += en
            has_energy = True
            count_ok += 1

    return {
        "power_w": round(total_w, 1) if has_power else None,
        "energy_kwh": round(total_kwh, 3) if has_energy else None,
        "count_ok": count_ok,
        "count_total": len(entity_ids),
    }


def top_n_by_power(
    entity_ids: list[str],
    states: dict[str, Any],
    n: int = 5,
) -> list[dict[str, Any]]:
    """
    Retourne les N capteurs les plus consommateurs (puissance en W).

    Retourne
    --------
    list[{ entity_id, power_w, pct }]  — trié par power_w desc
    """
    items: list[tuple[str, float]] = []
    for eid in entity_ids:
        pw = get_power_w(states.get(eid))
        if pw is not None and pw > 0:
            items.append((eid, pw))

    items.sort(key=lambda x: x[1], reverse=True)
    top = items[:n]

    total_w = sum(w for _, w in items)
    result = []
    for eid, pw in top:
        pct = round((pw / total_w * 100), 1) if total_w > 0 else 0.0
        result.append({"entity_id": eid, "power_w": round(pw, 1), "pct": pct})
    return result
