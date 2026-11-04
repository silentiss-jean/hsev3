"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via les statistiques HA agrégées.

Principe : pour chaque entité sélectionnée dans le catalogue, on utilise les
statistiques HA (statistics_meta + statistics / statistics_short_term) pour
calculer l'énergie consommée.

- Pour un capteur de puissance (state_class=measurement, unité W) :
  énergie = mean(W) × durée(heures) / 1000 → kWh
- Pour un compteur d'énergie (state_class=total_increasing, unité kWh) :
  énergie = sum(kWh) → kWh

Quand l'entité donnée n'a pas de statistiques, on cherche une entité de
puissance correspondante (ex: *_total_energy → *_power).

Dépendances : sqlite3 sur home-assistant_v2.db (synchrone → executor)
"""
from __future__ import annotations

import logging
import re
import sqlite3
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant

from ..time_utils import window_for_period

_LOGGER = logging.getLogger(__name__)

_DB_NAME = "home-assistant_v2.db"

# Durée de chaque entrée de statistiques (en heures)
_STATS_PERIOD_H = {
    "statistics": 1.0,            # 1 heure par entrée
    "statistics_short_term": 5.0 / 60.0,  # 5 minutes par entrée
}


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _delta_from_states(state_list: list[Any]) -> float:
    """Énergie = dernier état valide - premier état valide de la liste."""
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


def _find_power_entity_id(all_statistic_ids: list[str], energy_eid: str) -> str | None:
    """Cherche une entité de puissance qui correspond à une entité énergie."""
    if energy_eid.endswith("_total_energy"):
        candidate = energy_eid.replace("_total_energy", "_power")
        if candidate in all_statistic_ids:
            return candidate
    if energy_eid.endswith("_kwh_total"):
        candidate = energy_eid.replace("_kwh_total", "_power")
        if candidate in all_statistic_ids:
            return candidate
    for suffix in ("_kwh_day", "_kwh_week", "_kwh_month", "_kwh_year"):
        if energy_eid.endswith(suffix):
            prefix = energy_eid[: -len(suffix)]
            candidate = prefix + "_power"
            if candidate in all_statistic_ids:
                return candidate
    prefix = re.sub(r"(_kwh|_total_energy).*", "", energy_eid)
    if prefix:
        candidate = prefix + "_power"
        if candidate in all_statistic_ids:
            return candidate
    return None


def _energy_from_table_sync(
    conn: sqlite3.Connection,
    meta_id: int,
    table: str,
    period_h: float,
    start_ts: float,
    end_ts: float,
) -> float:
    """
    Calcule l'énergie kWh pour une entité sur une table statistique donnée.
    Préfère sum (compteur d'énergie, déjà en kWh) ; si sum est 0 ou absent,
    utilise mean (capteur de puissance, en W → /1000).
    """
    cursor = conn.cursor()

    # 1. Essayer sum (compteur d'énergie, déjà en kWh)
    cursor.execute(
        f"SELECT COALESCE(SUM(s.sum), 0) FROM {table} s "
        f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
        (meta_id, start_ts, end_ts),
    )
    sum_val = cursor.fetchone()[0]
    if sum_val and sum_val > 0:
        return round(float(sum_val), 3)

    # 2. Essayer mean (capteur de puissance, en W → /1000)
    cursor.execute(
        f"SELECT COALESCE(SUM(s.mean), 0) FROM {table} s "
        f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
        (meta_id, start_ts, end_ts),
    )
    mean_val = cursor.fetchone()[0]
    if mean_val and mean_val > 0:
        return round(float(mean_val) * period_h / 1000.0, 3)

    return 0.0


async def async_energy_for_period(hass: HomeAssistant, entity_ids: list[str], period: str = "month") -> dict[str, float]:
    """
    Calcule l'énergie consommée (kWh) pour une liste d'entités sur une période donnée.

    Utilise les statistiques HA agrégées comme source principale.
    Fallback sur le delta d'états du recorder si les statistiques sont indisponibles.
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
        db_path = str(Path(hass.config.path(_DB_NAME)))
        start_ts = start.timestamp()
        end_ts = end.timestamp()

        # Charger toutes les statistics_meta une seule fois
        conn_meta = sqlite3.connect(db_path)
        cursor_meta = conn_meta.cursor()
        cursor_meta.execute("SELECT statistic_id, id FROM statistics_meta")
        all_stats = {row[0]: row[1] for row in cursor_meta.fetchall()}
        conn_meta.close()

        for eid in entity_ids:
            energy = 0.0

            if eid in all_stats:
                meta_id = all_stats[eid]

                # Calcul via les statistiques HA
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()

                energy = _energy_from_table_sync(conn, meta_id, "statistics", 1.0, start_ts, end_ts)
                if energy <= 0:
                    energy = _energy_from_table_sync(conn, meta_id, "statistics_short_term", 5.0 / 60.0, start_ts, end_ts)

                conn.close()
            else:
                # Entité non trouvée dans les statistiques, fallback sur le delta d'états
                def _fetch():
                    return rec_history.get_significant_states(hass, start, end, [eid], minimal_response=True)

                states_map = await hass.async_add_executor_job(_fetch)
                state_list = states_map.get(eid) or []
                energy = _delta_from_states(state_list)

            result[eid] = round(energy, 3)

    except Exception:
        _LOGGER.exception("HSE period_stats: erreur pour période %s", period)

    return result
