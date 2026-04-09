"""
HSE V3 — sensors/quality_scorer.py
Source : sensor_quality_scorer.py V1 (réintégré + épuré).

Calcule un score de qualité (0–100) pour chaque capteur du catalogue.

Critères pondérés :
  - kind détecté (energy/power)   : +30
  - state_class = total_increasing : +25
  - unit cohérente avec kind       : +20
  - device_class cohérente         : +15
  - état non unavailable           : +10

Retourne toujours un int 0–100. Ne lève jamais.
"""
from __future__ import annotations

from typing import Any


# ────────────────────────────────────────────────────────────────────────────
# Tables de cohérence
# ────────────────────────────────────────────────────────────────────────────

_ENERGY_UNITS = {"kwh", "wh"}
_POWER_UNITS = {"w", "kw"}
_ENERGY_DEVICE_CLASSES = {"energy"}
_POWER_DEVICE_CLASSES = {"power"}


def score_item(item: dict[str, Any], ha_state: str | None = None) -> int:
    """
    Score un item du catalogue.

    Paramètres
    ----------
    item : dict
        Item tel que stocké dans catalogue.items{}.
    ha_state : str | None
        État HA actuel (ex: "1234.5", "unavailable").
        Si None, on utilise source.last_seen_state.

    Retourne
    --------
    int 0–100
    """
    try:
        return _compute_score(item, ha_state)
    except Exception:
        return 0


def _compute_score(item: dict[str, Any], ha_state: str | None) -> int:
    src = item.get("source") or {}
    kind = src.get("kind")  # "energy" | "power" | None
    unit = (src.get("unit") or "").strip().lower()
    device_class = (src.get("device_class") or "").strip().lower()
    state_class = (src.get("state_class") or "").strip().lower()
    effective_state = ha_state if ha_state is not None else (src.get("last_seen_state") or "")
    state_str = str(effective_state).lower()

    score = 0

    # +30 : kind détecté
    if kind in ("energy", "power"):
        score += 30

    # +25 : state_class correct
    if state_class in ("total_increasing", "total"):
        score += 25
    elif state_class == "measurement" and kind == "power":
        score += 20  # measurement est acceptable pour la puissance

    # +20 : unité cohérente avec kind
    if kind == "energy" and unit in _ENERGY_UNITS:
        score += 20
    elif kind == "power" and unit in _POWER_UNITS:
        score += 20
    elif kind is None and (unit in _ENERGY_UNITS or unit in _POWER_UNITS):
        score += 10  # unité OK mais kind non détecté

    # +15 : device_class cohérente
    if kind == "energy" and device_class in _ENERGY_DEVICE_CLASSES:
        score += 15
    elif kind == "power" and device_class in _POWER_DEVICE_CLASSES:
        score += 15

    # +10 : état disponible
    if state_str not in ("unavailable", "unknown", "", "none"):
        score += 10

    return min(score, 100)


def score_catalogue(
    catalogue: dict[str, Any],
    states: dict[str, Any] | None = None,
) -> dict[str, int]:
    """
    Calcule le score de tous les items du catalogue.

    Paramètres
    ----------
    catalogue : dict
        Catalogue complet (shape storage).
    states : dict[entity_id → State] | None
        States HA actuels pour enrichir le scoring.

    Retourne
    --------
    dict[entity_id → score:int]
    """
    result: dict[str, int] = {}
    items = (catalogue.get("items") or {}).items()
    for _item_id, item in items:
        if not isinstance(item, dict):
            continue
        src = item.get("source") or {}
        eid = src.get("entity_id") or item.get("entity_id")
        if not eid:
            continue
        ha_state_obj = (states or {}).get(eid)
        ha_state_raw = getattr(ha_state_obj, "state", None) if ha_state_obj else None
        result[eid] = score_item(item, ha_state_raw)
    return result


def global_quality_pct(scores: dict[str, int]) -> int:
    """
    Score global (0–100) = moyenne des scores.
    Retourne 100 si aucun capteur.
    """
    if not scores:
        return 100
    return round(sum(scores.values()) / len(scores))
