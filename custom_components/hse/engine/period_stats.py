"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via les statistiques HA agrégées.

Principe : pour chaque entité sélectionnée dans le catalogue, on utilise les
statistiques HA (statistics_meta + statistics / statistics_short_term) pour
calculer l'énergie consommée.

Règles de calcul selon le type d'entité :

1. Capteur de puissance (unit_class=power, unité W) :
   énergie = SUM(mean(W)) × durée(heures) / 1000 → kWh
   Chaque entrée représente la puissance moyenne sur l'intervalle.

2. Compteur d'énergie cumulative (unit_class=energy, unité kWh) :
   énergie = MAX(sum) - MIN(sum) sur la période → kWh
   Chaque entrée stocke la valeur cumulative ; on prend le delta entre
   le début et la fin de la fenêtre.

3. Compteur d'énergie non cumulatif (unité kWh, unit_class != energy) :
   énergie = SUM(sum) → kWh (déjà en kWh, pas de division)

Règle d'or : on NE cumule JAMAIS sum ET mean pour la même entité sur la même
période. On choisit la méthode selon l'unité et la unit_class.

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


def _get_entity_meta(conn: sqlite3.Connection, statistic_id: str) -> dict[str, Any] | None:
    """Retourne les métadonnées d'une entité depuis statistics_meta."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, unit_of_measurement, unit_class FROM statistics_meta WHERE statistic_id = ?",
        (statistic_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "unit_of_measurement": row[1],
        "unit_class": row[2],
    }


def _is_cumulative_energy(unit_class: str | None, unit_of_measurement: str | None) -> bool:
    """Détermine si l'entité est un compteur d'énergie cumulative."""
    if not unit_class or not unit_of_measurement:
        return False
    return (
        unit_class.strip().lower() == "energy"
        and unit_of_measurement.strip().upper() == "KWH"
    )


def _is_power_sensor(unit: str | None) -> bool:
    """Détermine si l'entité est un capteur de puissance (unité W)."""
    return unit and unit.strip().upper() == "W"


def _energy_from_table_sync(
    conn: sqlite3.Connection,
    meta_id: int,
    statistic_id: str,
    unit: str | None,
    unit_class: str | None,
    table: str,
    period_h: float,
    start_ts: float,
    end_ts: float,
) -> float:
    """
    Calcule l'énergie kWh pour une entité sur une table statistique donnée.

    Règle : on NE cumule JAMAIS sum ET mean.
    - Compteur d'énergie cumulative (unit_class=energy, kWh) : delta = MAX(sum) - MIN(sum)
    - Capteur de puissance (W) : mean(W) × durée / 1000 → kWh
    - Autre compteur d'énergie (kWh, non cumulatif) : SUM(sum) → kWh
    """
    cursor = conn.cursor()
    is_cumulative = _is_cumulative_energy(unit_class, unit)
    is_power = _is_power_sensor(unit)

    # 1. Compteur d'énergie cumulative : delta entre max et min sur la période
    if is_cumulative:
        cursor.execute(
            f"SELECT MAX(s.sum), MIN(s.sum) FROM {table} s "
            f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
            (meta_id, start_ts, end_ts),
        )
        row = cursor.fetchone()
        max_sum, min_sum = row[0], row[1]
        if max_sum is not None and min_sum is not None and max_sum >= min_sum:
            return round(float(max_sum) - float(min_sum), 3)
        return 0.0

    # 2. Capteur de puissance : mean(W) × durée / 1000 → kWh
    if is_power:
        cursor.execute(
            f"SELECT COALESCE(SUM(s.mean), 0) FROM {table} s "
            f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
            (meta_id, start_ts, end_ts),
        )
        mean_val = cursor.fetchone()[0]
        if mean_val and mean_val > 0:
            return round(float(mean_val) * period_h / 1000.0, 3)
        return 0.0

    # 3. Autre compteur d'énergie (non cumulatif) : SUM(sum) → kWh
    cursor.execute(
        f"SELECT COALESCE(SUM(s.sum), 0) FROM {table} s "
        f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
        (meta_id, start_ts, end_ts),
    )
    sum_val = cursor.fetchone()[0]
    if sum_val and sum_val > 0:
        return round(float(sum_val), 3)

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
        cursor_meta.execute("SELECT statistic_id, id, unit_of_measurement, unit_class FROM statistics_meta")
        all_stats = {
            row[0]: {
                "id": row[1],
                "unit_of_measurement": row[2],
                "unit_class": row[3],
            }
            for row in cursor_meta.fetchall()
        }
        conn_meta.close()

        for eid in entity_ids:
            energy = 0.0

            if eid in all_stats:
                meta = all_stats[eid]
                meta_id = meta["id"]
                unit = meta["unit_of_measurement"]
                unit_class = meta["unit_class"]

                # Calcul via les statistiques HA
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()

                energy = _energy_from_table_sync(
                    conn, meta_id, eid, unit, unit_class,
                    "statistics", 1.0, start_ts, end_ts,
                )
                if energy <= 0:
                    energy = _energy_from_table_sync(
                        conn, meta_id, eid, unit, unit_class,
                        "statistics_short_term", 5.0 / 60.0, start_ts, end_ts,
                    )

                conn.close()
            else:
                # Entité non trouvée dans les statistiques, fallback sur le delta d'états
                def _fetch():
                    return rec_history.get_significant_states(hass, start, end, [eid], minimal_response=True)

                states_map = await hass.async_add_executor_job(_fetch)
                state_list = states_map.get(eid) or []
                energy = _delta_from_states(state_list)

            result[eid] = round(energy, 3)
            _LOGGER.debug(
                "HSE period_stats: %s période=%s énergie=%.3f kWh",
                eid, period, energy,
            )

    except Exception:
        _LOGGER.exception("HSE period_stats: erreur pour période %s", period)

    return result


def aggregate_energy_rows(rows: list[dict]) -> tuple[float, float | None]:
    """Somme des variations positives d'un compteur + dernier état.

    rows : [{"change": float|None, "state": float|None}, ...]
    Retourne (kwh, dernier_state_non_nul).
    """
    total = 0.0
    last = None
    for row in rows or []:
        change = row.get("change") if isinstance(row, dict) else None
        state = row.get("state") if isinstance(row, dict) else None
        try:
            if change is not None and float(change) > 0:
                total += float(change)
        except (TypeError, ValueError):
            pass
        try:
            if state is not None:
                last = float(state)
        except (TypeError, ValueError):
            pass
    return round(total, 3), last


def aggregate_power_rows(rows: list[dict], period_h: float = 1.0) -> float:
    """Énergie kWh = SUM(mean(W) × durée_h) / 1000.

    rows : [{"mean": float, "start": ts, "end": ts}, ...]
    La durée de chaque entrée vient de (end - start) si présents,
    sinon period_h par défaut.
    """
    total = 0.0
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        try:
            mean = row.get("mean")
            if mean is None:
                continue
            mean = float(mean)
        except (TypeError, ValueError):
            continue
        start = row.get("start")
        end = row.get("end")
        if start is not None and end is not None:
            try:
                dt_h = (float(end) - float(start)) / 3600.0
            except (TypeError, ValueError):
                dt_h = period_h
        else:
            dt_h = period_h
        if dt_h > 0 and mean > 0:
            total += mean * dt_h / 1000.0
    return round(total, 3)


def residual_energy_kwh(
    current: float | None,
    previous: float | None,
    dt_seconds: float | None = None,
    max_rate_kw: float = 100.0,
) -> float:
    """Énergie résiduelle = current - previous avec gardes.

    - current ou previous None → 0.0
    - delta < 0 (remise à zéro compteur) → 0.0
    - débit > max_rate_kw (glitch capteur) → 0.0
    """
    if current is None or previous is None:
        return 0.0
    try:
        current = float(current)
        previous = float(previous)
    except (TypeError, ValueError):
        return 0.0
    delta = current - previous
    if delta < 0:
        return 0.0
    if dt_seconds is not None:
        try:
            dt_s = float(dt_seconds)
        except (TypeError, ValueError):
            dt_s = 0.0
        if dt_s > 0:
            rate_kw = delta / (dt_s / 3600.0)
            if rate_kw > max_rate_kw:
                return 0.0
    return round(delta, 3)


async def async_energy_detail(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> dict[str, dict]:
    """Énergie par entité avec méthode et qualité (contrat API).

    Retourne {entity_id: {"kwh": float, "method": str, "quality": str}}
    method ∈ {"stats_long_term", "stats_short_term", "states_fallback", "unavailable"}
    quality ∈ {"ok", "partial", "missing"}
    """
    if not entity_ids:
        return {}

    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE period_stats: recorder non disponible")
        return {eid: {"kwh": 0.0, "method": "unavailable", "quality": "missing"}
                for eid in entity_ids}

    start, end = window_for_period(period)
    result: dict[str, dict] = {}
    start_ts = start.timestamp()
    end_ts = end.timestamp()

    try:
        db_path = str(Path(hass.config.path(_DB_NAME)))
        conn_meta = sqlite3.connect(db_path)
        cursor_meta = conn_meta.cursor()
        cursor_meta.execute(
            "SELECT statistic_id, id, unit_of_measurement, unit_class FROM statistics_meta"
        )
        all_stats = {
            row[0]: {
                "id": row[1],
                "unit_of_measurement": row[2],
                "unit_class": row[3],
            }
            for row in cursor_meta.fetchall()
        }
        conn_meta.close()

        for eid in entity_ids:
            entry = {"kwh": 0.0, "method": "unavailable", "quality": "missing"}

            if eid in all_stats:
                meta = all_stats[eid]
                meta_id = meta["id"]
                unit = meta["unit_of_measurement"]
                unit_class = meta["unit_class"]

                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()

                energy = _energy_from_table_sync(
                    conn, meta_id, eid, unit, unit_class,
                    "statistics", 1.0, start_ts, end_ts,
                )
                if energy > 0:
                    entry = {"kwh": energy, "method": "stats_long_term", "quality": "ok"}
                else:
                    energy = _energy_from_table_sync(
                        conn, meta_id, eid, unit, unit_class,
                        "statistics_short_term", 5.0 / 60.0, start_ts, end_ts,
                    )
                    if energy > 0:
                        entry = {"kwh": energy, "method": "stats_short_term", "quality": "partial"}
                    else:
                        entry = {"kwh": 0.0, "method": "stats_long_term", "quality": "missing"}
                conn.close()
            else:
                def _fetch():
                    return rec_history.get_significant_states(hass, start, end, [eid], minimal_response=True)

                states_map = await hass.async_add_executor_job(_fetch)
                state_list = states_map.get(eid) or []
                energy = _delta_from_states(state_list)
                if energy > 0:
                    entry = {"kwh": energy, "method": "states_fallback", "quality": "partial"}
                else:
                    entry = {"kwh": 0.0, "method": "states_fallback", "quality": "missing"}

            result[eid] = entry
            _LOGGER.debug(
                "HSE period_stats detail: %s période=%s énergie=%.3f kWh method=%s quality=%s",
                eid, period, entry["kwh"], entry["method"], entry["quality"],
            )

    except Exception:
        _LOGGER.exception("HSE period_stats detail: erreur pour période %s", period)
        for eid in entity_ids:
            if eid not in result:
                result[eid] = {"kwh": 0.0, "method": "unavailable", "quality": "missing"}

    return result
