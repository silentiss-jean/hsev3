"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via le recorder HA natif.

Principe : pour un compteur cumulatif (state_class = total_increasing),
l'énergie sur une période = dernier état connu dans la fenêtre - premier état connu.

Dépendances : homeassistant.components.recorder (synchrone → executor)
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from ..time_utils import window_for_period

_LOGGER = logging.getLogger(__name__)


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _delta_from_states(state_list: list[Any]) -> float:
    """
    Énergie = dernier état valide - premier état valide de la liste.
    Retourne 0.0 si impossible à calculer.
    """
    first_val = None
    last_val = None
    for s in state_list:
        state_str = getattr(s, "state", None)
        if state_str and str(state_str).lower() not in ("unavailable", "unknown", "none", ""):
            v = _safe_float(state_str)
            if v is not None:
                if first_val is None:
                    first_val = v
                last_val = v
    if first_val is not None and last_val is not None and last_val >= first_val:
        return round(last_val - first_val, 3)
    return 0.0


async def async_energy_for_period(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> dict[str, float]:
    """
    Calcule l'énergie consommée (kWh) sur la période pour chaque entity_id fourni.

    Paramètres
    ----------
    entity_ids : list[str]
        Liste des entity_id à interroger.
    period : "day" | "week" | "month" | "year"

    Retourne
    --------
    dict[entity_id → kwh: float]
    Toujours retourné, même si vide ou en cas d'erreur (0.0 par défaut).
    """
    if not entity_ids:
        return {}

    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE period_stats: recorder non disponible")
        return {eid: 0.0 for eid in entity_ids}

    start, end = window_for_period(period)
    result: dict[str, float] = {eid: 0.0 for eid in entity_ids}

    try:
        def _fetch():
            return rec_history.get_significant_states(
                hass, start, end, entity_ids, minimal_response=True
            )

        states_map: dict[str, list[Any]] = await hass.async_add_executor_job(_fetch)

        for eid in entity_ids:
            state_list = states_map.get(eid) or []
            result[eid] = _delta_from_states(state_list)

    except Exception:
        _LOGGER.exception("HSE period_stats: erreur recorder pour période %s", period)

    return result


async def async_total_energy_for_period(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> float:
    """
    Somme de l'énergie (kWh) de tous les entity_ids sur la période.
    Raccourci pour overview.py.
    """
    per_entity = await async_energy_for_period(hass, entity_ids, period)
    return round(sum(per_entity.values()), 3)
