"""
HSE V3 — engine/analytics.py
Source : history_analytics.py V1 (réintégré + épuré).

Historique 12 mois via le recorder HA natif.

Règle : tous les appels recorder sont faits dans un executor thread
        (recorder bloque — ne jamais appeler depuis le loop asyncio directement).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


def _months_range(n: int = 12) -> list[tuple[datetime, datetime]]:
    """
    Retourne n couples (start, end) couvrant les n derniers mois complets (UTC).
    Le mois en cours est EXCLU (données incomplètes).
    """
    now = datetime.now(timezone.utc)
    # Premier jour du mois courant
    first_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ranges = []
    end = first_current
    for _ in range(n):
        # Premier jour du mois précédent
        start = (end - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ranges.append((start, end))
        end = start
    ranges.reverse()
    return ranges


def _label_for(start: datetime) -> str:
    """Format YYYY-MM pour l'axe X des graphiques."""
    return start.strftime("%Y-%m")


async def async_history_12months(
    hass: HomeAssistant,
    entity_id: str | None = None,
    *,
    granularity: str = "month",
) -> dict[str, Any]:
    """
    Retourne l'historique des 12 derniers mois complets.

    Paramètres
    ----------
    entity_id : str | None
        Si fourni : historique pour ce capteur uniquement.
        Si None   : sommation de tous les capteurs energy du catalogue
                    (non implémenté ici — placeholder retourné).
    granularity : "month" | "week"
        Seul "month" est implémenté pour l'instant.

    Retourne
    --------
    {
        entity_id: str|None,
        granularity: str,
        points: list[{ label: "YYYY-MM", kwh: float, eur_ttc: float }]
    }
    """
    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE: recorder non disponible — historique vide")
        return {"entity_id": entity_id, "granularity": granularity, "points": []}

    if not entity_id:
        # Global non implémenté en V3 Bloc 3 — retourné vide
        return {"entity_id": None, "granularity": granularity, "points": []}

    ranges = _months_range(12)
    points: list[dict[str, Any]] = []

    for start, end in ranges:
        label = _label_for(start)
        kwh = 0.0
        try:
            # get_significant_states est synchrone → executor
            def _fetch(s=start, e=end, eid=entity_id):
                return rec_history.get_significant_states(
                    hass, s, e, [eid], minimal_response=True
                )

            states_map: dict[str, list[Any]] = await hass.async_add_executor_job(_fetch)
            state_list = states_map.get(entity_id) or []

            if state_list:
                def _to_float(v: Any) -> float | None:
                    try:
                        return float(v)
                    except (TypeError, ValueError):
                        return None

                first_val = None
                last_val = None
                for s in state_list:
                    state_str = getattr(s, "state", None)
                    if state_str and str(state_str).lower() not in ("unavailable", "unknown"):
                        v = _to_float(state_str)
                        if v is not None:
                            if first_val is None:
                                first_val = v
                            last_val = v

                if first_val is not None and last_val is not None and last_val >= first_val:
                    kwh = round(last_val - first_val, 3)

        except Exception:
            _LOGGER.exception("HSE analytics: erreur récupération historique %s [%s]", entity_id, label)

        points.append({"label": label, "kwh": kwh, "eur_ttc": 0.0})  # eur_ttc calculé par la view

    return {"entity_id": entity_id, "granularity": granularity, "points": points}
