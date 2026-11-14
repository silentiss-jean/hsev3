"""
HSE V3 — engine/analytics.py
Historique 12 mois via le recorder HA natif.

Règle : tous les appels recorder sont faits dans un executor thread
        (recorder bloque — ne jamais appeler depuis le loop asyncio directement).

V3.1 — A12 : historique réel pour semaine et mois, global ou par entité.
             Le calcul réutilise la normalisation du moteur énergie (measure.py)
             pour cohérence avec les autres écrans.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _label_for(start: datetime, granularity: str) -> str:
    """Format d'étiquette pour l'axe X des graphiques."""
    if granularity == "week":
        return start.strftime("%Y-W%V")  # ISO semaine
    return start.strftime("%Y-%m")  # mois


def _build_ranges(
    granularity: str, n: int = 12, tz=None
) -> list[tuple[datetime, datetime]]:
    """
    Retourne n couples (start, end) couvrant les n dernières périodes complètes.
    La période en cours est EXCLUE (données incomplètes).
    """
    now = datetime.now(timezone.utc)
    if tz is not None:
        now = now.astimezone(tz)

    ranges: list[tuple[datetime, datetime]] = []
    if granularity == "week":
        start_current = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = start_current
        for _ in range(n):
            start = end - timedelta(weeks=1)
            ranges.append((start, end))
            end = start
    else:  # month
        first_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = first_current
        for _ in range(n):
            start = (end - timedelta(days=1)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            ranges.append((start, end))
            end = start

    ranges.reverse()
    return ranges


def _delta_from_states(state_list: list[Any]) -> float:
    """Énergie = dernier état valide - premier état valide de la liste."""
    first_val = None
    last_val = None
    for s in state_list:
        state_str = getattr(s, "state", None)
        if state_str and str(state_str).lower() not in (
            "unavailable",
            "unknown",
            "none",
            "",
        ):
            v = _safe_float(state_str)
            if v is not None:
                if first_val is None:
                    first_val = v
                last_val = v
    if first_val is not None and last_val is not None and last_val >= first_val:
        return round(last_val - first_val, 3)
    return 0.0


async def async_history_12months(
    hass: HomeAssistant,
    entity_id: str | None = None,
    *,
    granularity: str = "month",
) -> dict[str, Any]:
    """
    Retourne l'historique des 12 dernières périodes complètes.

    Paramètres
    ----------
    entity_id : str | None
        Si fourni : historique pour ce capteur uniquement.
        Si None   : sommation de tous les capteurs énergie du catalogue
                    (historique global).
    granularity : "month" | "week"

    Retourne
    --------
    {
        entity_id: str|None,
        granularity: str,
        points: list[{ label: str, kwh: float }]
    }
    """
    if granularity not in ("month", "week"):
        _LOGGER.warning("HSE analytics: granularité invalide %s", granularity)
        granularity = "month"

    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE: recorder non disponible — historique vide")
        return {"entity_id": entity_id, "granularity": granularity, "points": []}

    ranges = _build_ranges(granularity, n=12)

    # Déterminer la liste des entités énergie à sommer
    if entity_id:
        energy_sources: list[str] = [entity_id]
    else:
        try:
            from ..storage.manager import HseStorageManager

            mgr = HseStorageManager(hass)
            catalogue = await mgr.async_load_catalogue()
            items = catalogue.get("items") or {}
            energy_sources = [
                eid
                for eid in (
                    (it.get("source") or {}).get("entity_id")
                    for it in items.values()
                    if isinstance(it, dict)
                    and (it.get("triage") or {}).get("policy") == "selected"
                    and isinstance(it.get("source"), dict)
                )
                if eid
            ]
        except Exception:
            _LOGGER.exception("HSE analytics: échec chargement catalogue")
            energy_sources = []

    points: list[dict[str, Any]] = []

    for start, end in ranges:
        label = _label_for(start, granularity)
        total_kwh = 0.0

        try:
            # get_significant_states est synchrone → executor
            def _fetch(s=start, e=end, eids=energy_sources):
                return rec_history.get_significant_states(
                    hass, s, e, eids, minimal_response=True
                )

            states_map: dict[str, list[Any]] = await hass.async_add_executor_job(_fetch)

            for eid in energy_sources:
                state_list = states_map.get(eid) or []
                kwh = _delta_from_states(state_list)
                total_kwh += kwh

        except Exception:
            _LOGGER.exception(
                "HSE analytics: erreur récupération historique [%s]", label
            )

        points.append({"label": label, "kwh": round(total_kwh, 3)})

    return {"entity_id": entity_id, "granularity": granularity, "points": points}
