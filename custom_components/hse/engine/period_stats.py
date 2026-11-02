"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via le recorder HA natif.

Principe : pour un compteur cumulatif (state_class = total_increasing),
l'énergie sur une période = dernier état connu dans la fenêtre - premier état connu.

Si l'entité énergie n'a pas de données (valeur à 0 ou absente du recorder),
on fallback sur les statistiques HA agrégées :
  - Pour un capteur de puissance (state_class=measurement) : mean (W) × durée / 1000
  - Pour un compteur d'énergie (state_class=total_increasing) : sum (kWh, pas de division)

Quand l'entité donnée n'a pas de statistiques, on cherche l'entité de puissance
correspondante (ex: sensor.clim_appart_2_total_energy → sensor.clim_appart_2_power).

Dépendances : homeassistant.components.recorder (synchrone → executor)
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


def _find_power_entity_id(all_statistic_ids: list[str], energy_eid: str) -> str | None:
    """
    Cherche une entité de puissance dans la liste des statistic_id
    qui correspond à une entité énergie.

    Stratégie :
    1. Remplacer _total_energy → _power
    2. Remplacer _kwh_total → _power
    3. Remplacer _kwh_day/week/month/year → _power
    4. Chercher par préfixe commun + _power
    """
    # Stratégie 1 : _total_energy → _power
    if energy_eid.endswith("_total_energy"):
        candidate = energy_eid.replace("_total_energy", "_power")
        if candidate in all_statistic_ids:
            return candidate

    # Stratégie 2 : _kwh_total → _power
    if energy_eid.endswith("_kwh_total"):
        candidate = energy_eid.replace("_kwh_total", "_power")
        if candidate in all_statistic_ids:
            return candidate

    # Stratégie 3 : _kwh_day/week/month/year → _power
    for suffix in ("_kwh_day", "_kwh_week", "_kwh_month", "_kwh_year"):
        if energy_eid.endswith(suffix):
            prefix = energy_eid[: -len(suffix)]
            candidate = prefix + "_power"
            if candidate in all_statistic_ids:
                return candidate

    # Stratégie 4 : chercher par préfixe commun
    prefix = re.sub(r"(_kwh|_total_energy).*", "", energy_eid)
    if prefix:
        candidate = prefix + "_power"
        if candidate in all_statistic_ids:
            return candidate

    return None


def _energy_from_statistics_sync(
    db_path: str, entity_id: str, start_ts: float, end_ts: float
) -> float:
    """
    Calcule l'énergie (kWh) à partir des statistiques HA agrégées.
    Fallback utilisé quand l'entité énergie n'a pas de données dans le recorder.

    Pour un capteur de puissance (state_class=measurement) : mean (W) × durée / 1000
    Pour un compteur d'énergie (state_class=total_increasing) : sum (kWh, pas de division)

    Quand l'entité donnée n'a pas de statistiques, cherche une entité de puissance
    correspondante.

    N'utilise PAS has_mean/has_sum de statistics_meta (peu fiables), mais essaie
    directement mean et sum et prend celle qui n'est pas NULL.
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Charger toutes les statistic_id disponibles pour la recherche de fallback
        cursor.execute("SELECT statistic_id FROM statistics_meta")
        all_statistic_ids = [row[0] for row in cursor.fetchall()]

        # Déterminer les entités candidates : l'entité donnée, puis une entité de puissance
        candidate_eids = [entity_id]
        power_eid = _find_power_entity_id(all_statistic_ids, entity_id)
        if power_eid and power_eid != entity_id:
            candidate_eids.append(power_eid)

        total_kwh = 0.0
        found_any = False

        for cand_eid in candidate_eids:
            cursor.execute(
                "SELECT id FROM statistics_meta WHERE statistic_id = ?",
                (cand_eid,),
            )
            row = cursor.fetchone()
            if not row:
                continue
            metadata_id = row[0]
            found_any = True

            for table, period_h in _STATS_PERIOD_H.items():
                # Essayer mean (capteur de puissance, en W → /1000)
                cursor.execute(
                    f"SELECT s.mean FROM {table} s "
                    f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
                    (metadata_id, start_ts, end_ts),
                )
                for row_val in cursor.fetchall():
                    if row_val[0] is not None:
                        total_kwh += float(row_val[0]) * period_h / 1000.0

                # Essayer sum (compteur d'énergie, déjà en kWh → pas de division)
                cursor.execute(
                    f"SELECT s.sum FROM {table} s "
                    f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
                    (metadata_id, start_ts, end_ts),
                )
                for row_val in cursor.fetchall():
                    if row_val[0] is not None:
                        total_kwh += float(row_val[0])

        conn.close()

        if found_any:
            return round(total_kwh, 3)
        return 0.0
    except Exception:
        _LOGGER.exception("HSE period_stats: erreur statistiques pour %s", entity_id)
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

        db_path = str(Path(hass.config.path(_DB_NAME)))
        start_ts = start.timestamp()
        end_ts = end.timestamp()

        for eid in entity_ids:
            state_list = states_map.get(eid) or []
            energy = _delta_from_states(state_list)
            # Fallback : si l'entité énergie n'a pas de données (0.0),
            # essayer de calculer depuis les statistiques HA
            if energy == 0.0:
                energy = await hass.async_add_executor_job(
                    _energy_from_statistics_sync, db_path, eid, start_ts, end_ts
                )
            result[eid] = energy
            # Pour les utility_meter _kwh_month, l'état actuel est déjà la conso du mois
            if eid.endswith('_kwh_month'):
                state_obj = hass.states.get(eid)
                if state_obj is not None:
                    val = _safe_float(state_obj.state)
                    if val is not None and str(state_obj.state).lower() not in ("unavailable", "unknown", "none", ""):
                        result[eid] = val

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
