"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via les statistiques HA agrégées.

Principe : pour chaque entité sélectionnée dans le catalogue, on utilise les
statistiques HA (statistics_meta + statistics / statistics_short_term) pour
calculer l'énergie consommée.

Règles de calcul selon le type d'entité :

1. Capteur de puissance (unit_class=power, unité W/kW/mW/MW) :
   énergie = SUM(mean(unité_puissance)) × durée(heures) / 1000 → kWh
   Chaque entrée représente la puissance moyenne sur l'intervalle.

2. Compteur d'énergie cumulative (unit_class=energy, unité kWh/Wh/MWh) :
   énergie = MAX(sum) - MIN(sum) sur la période → kWh
   Chaque entrée stocke la valeur cumulative ; on prend le delta entre
   le début et la fin de la fenêtre. On récupère aussi la référence
   précédant le début de période pour ne pas perdre le premier intervalle.

3. Compteur d'énergie non cumulatif (unité kWh/Wh/MWh, unit_class != energy) :
   énergie = SUM(sum) → kWh (déjà en énergie, pas de division)

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
from .measure import ENERGY_UNITS, POWER_UNITS

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
    """Détermine si l'entité est un compteur d'énergie cumulative.

    Accepte kWh, Wh, MWh (toutes les unités énergie canoniques, casse HA exacte).
    """
    if not unit_class or not unit_of_measurement:
        return False
    return (
        unit_class.strip().lower() == "energy"
        and unit_of_measurement.strip() in ENERGY_UNITS
    )


def _is_power_sensor(unit: str | None) -> bool:
    """Détermine si l'entité est un capteur de puissance (W/kW/mW/MW, casse HA exacte)."""
    return bool(unit and unit.strip() in POWER_UNITS)


def _energy_unit_factor(unit: str | None) -> float:
    """Facteur de conversion vers kWh pour une unité d'énergie (casse HA exacte)."""
    if not unit:
        return 1.0
    return ENERGY_UNITS.get(unit.strip(), 1.0)


def _power_unit_factor(unit: str | None) -> float:
    """Facteur de conversion vers W pour une unité de puissance (casse HA exacte)."""
    if not unit:
        return 1.0
    return POWER_UNITS.get(unit.strip(), 1.0)


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
    - Compteur d'énergie cumulative (unit_class=energy) : delta = MAX(sum) - MIN(sum)
      avec récupération de la référence précédant start_ts (A04).
    - Capteur de puissance : mean(unité) converti en W × durée / 1000 → kWh (A03).
    - Autre compteur d'énergie (non cumulatif) : SUM(sum) converti en kWh (A03).
    """
    cursor = conn.cursor()
    is_cumulative = _is_cumulative_energy(unit_class, unit)
    is_power = _is_power_sensor(unit)
    energy_factor = _energy_unit_factor(unit)
    power_factor = _power_unit_factor(unit)

    # 1. Compteur d'énergie cumulative : delta entre max et min sur la période
    if is_cumulative:
        cursor.execute(
            f"SELECT MAX(s.sum), MIN(s.sum) FROM {table} s "
            f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
            (meta_id, start_ts, end_ts),
        )
        row = cursor.fetchone()
        max_sum, min_sum = row[0], row[1]

        # A04 : récupère la dernière valeur avant le début de période
        ref_before = None
        cursor.execute(
            f"SELECT s.sum FROM {table} s "
            f"WHERE s.metadata_id = ? AND s.start_ts < ? "
            f"ORDER BY s.start_ts DESC LIMIT 1",
            (meta_id, start_ts),
        )
        ref_row = cursor.fetchone()
        if ref_row:
            ref_before = _safe_float(ref_row[0])

        if max_sum is not None and min_sum is not None and max_sum >= min_sum:
            delta = float(max_sum) - float(min_sum)
            # Si une référence avant start existe et est plus basse que min_sum,
            # on l'utilise comme borne inférieure (évite de perdre le premier intervalle).
            if ref_before is not None and ref_before < min_sum:
                delta = float(max_sum) - ref_before
            if delta >= 0:
                return round(delta * energy_factor, 3)
        return 0.0

    # 2. Capteur de puissance : mean(unité) converti en W × durée / 1000 → kWh
    if is_power:
        cursor.execute(
            f"SELECT COALESCE(SUM(s.mean), 0) FROM {table} s "
            f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
            (meta_id, start_ts, end_ts),
        )
        mean_val = cursor.fetchone()[0]
        if mean_val and mean_val > 0:
            watts = float(mean_val) * power_factor
            return round(watts * period_h / 1000.0, 3)
        return 0.0

    # 3. Autre compteur d'énergie (non cumulatif) : SUM(sum) converti en kWh
    cursor.execute(
        f"SELECT COALESCE(SUM(s.sum), 0) FROM {table} s "
        f"WHERE s.metadata_id = ? AND s.start_ts >= ? AND s.start_ts < ?",
        (meta_id, start_ts, end_ts),
    )
    sum_val = cursor.fetchone()[0]
    if sum_val and sum_val > 0:
        return round(float(sum_val) * energy_factor, 3)

    return 0.0


def _energy_from_table_sync_full(
    conn: sqlite3.Connection,
    meta_id: int,
    statistic_id: str,
    unit: str | None,
    unit_class: str | None,
    table: str,
    period_h: float,
    start_ts: float,
    end_ts: float,
) -> tuple[float, str, str, str | None]:
    """
    Même calcul que _energy_from_table_sync mais retourne aussi method/quality/error.

    Retourne (kwh, method, quality, error)
    method ∈ {"stats_long_term", "stats_short_term"}
    quality ∈ {"ok", "partial", "missing"}
    error ∈ {None, "no_data", "db_error"}
    """
    try:
        energy = _energy_from_table_sync(
            conn, meta_id, statistic_id, unit, unit_class,
            table, period_h, start_ts, end_ts,
        )
        if energy > 0:
            return energy, "stats_long_term", "ok", None
        return 0.0, "stats_long_term", "missing", None
    except Exception:
        _LOGGER.exception("period_stats: erreur lecture table %s pour %s", table, statistic_id)
        return 0.0, "stats_long_term", "missing", "db_error"


async def _fetch_stats_sync(
    hass: HomeAssistant,
    db_path: str,
    entity_ids: list[str],
    all_stats: dict[str, dict],
    start_ts: float,
    end_ts: float,
) -> dict[str, dict]:
    """
    Travail synchrone DB pour async_energy_detail. Appelé via
    hass.async_add_executor_job pour ne pas bloquer la boucle async (A05).

    Retourne {entity_id: {"kwh": float, "method": str, "quality": str, "error": str|null}}
    """
    result: dict[str, dict] = {}
    conn = sqlite3.connect(db_path)
    try:
        for eid in entity_ids:
            entry = {"kwh": 0.0, "method": "unavailable", "quality": "missing", "error": None}
            if eid in all_stats:
                meta = all_stats[eid]
                meta_id = meta["id"]
                unit = meta["unit_of_measurement"]
                unit_class = meta["unit_class"]

                # Long terme
                energy, method, quality, error = _energy_from_table_sync_full(
                    conn, meta_id, eid, unit, unit_class,
                    "statistics", 1.0, start_ts, end_ts,
                )
                if energy > 0:
                    entry = {"kwh": energy, "method": "stats_long_term", "quality": "ok", "error": None}
                else:
                    # Court terme
                    energy2, method2, quality2, error2 = _energy_from_table_sync_full(
                        conn, meta_id, eid, unit, unit_class,
                        "statistics_short_term", 5.0 / 60.0, start_ts, end_ts,
                    )
                    if energy2 > 0:
                        entry = {"kwh": energy2, "method": "stats_short_term", "quality": "partial", "error": None}
                    else:
                        entry = {"kwh": 0.0, "method": "stats_long_term", "quality": "missing", "error": error or None}
            else:
                entry = {"kwh": 0.0, "method": "unavailable", "quality": "missing", "error": None}
            result[eid] = entry
    finally:
        conn.close()
    return result


async def async_energy_for_period(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> dict[str, float]:
    """
    Calcule l'énergie consommée (kWh) pour une liste d'entités sur une période donnée.

    Utilise les statistiques HA agrégées comme source principale.
    Fallback sur le delta d'états du recorder si les statistiques sont indisponibles.

    Tous les accès SQLite sont délégués à l'executor (A05).
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
    start_ts = start.timestamp()
    end_ts = end.timestamp()

    try:
        db_path = str(Path(hass.config.path(_DB_NAME)))

        # Charger toutes les statistics_meta une seule fois (dans l'executor)
        def _load_meta():
            conn = sqlite3.connect(db_path)
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT statistic_id, id, unit_of_measurement, unit_class FROM statistics_meta"
                )
                return {
                    row[0]: {
                        "id": row[1],
                        "unit_of_measurement": row[2],
                        "unit_class": row[3],
                    }
                    for row in cursor.fetchall()
                }
            finally:
                conn.close()

        all_stats = await hass.async_add_executor_job(_load_meta)

        for eid in entity_ids:
            energy = 0.0

            if eid in all_stats:
                meta = all_stats[eid]
                meta_id = meta["id"]
                unit = meta["unit_of_measurement"]
                unit_class = meta["unit_class"]

                # Calcul via les statistiques HA (dans l'executor)
                def _calc(table: str, period_h: float) -> float:
                    conn = sqlite3.connect(db_path)
                    try:
                        return _energy_from_table_sync(
                            conn, meta_id, eid, unit, unit_class,
                            table, period_h, start_ts, end_ts,
                        )
                    finally:
                        conn.close()

                energy = await hass.async_add_executor_job(_calc, "statistics", 1.0)
                if energy <= 0:
                    energy = await hass.async_add_executor_job(
                        _calc, "statistics_short_term", 5.0 / 60.0
                    )
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

    Retourne {entity_id: {"kwh": float, "method": str, "quality": str, "error": str|null}}
    method ∈ {"stats_long_term", "stats_short_term", "states_fallback", "unavailable"}
    quality ∈ {"ok", "partial", "missing"}
    error ∈ {None, "db_error"}

    Tous les accès SQLite sont délégués à l'executor (A05).
    Zéro, indisponible et erreur sont distingués (A06).
    """
    if not entity_ids:
        return {}

    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE period_stats: recorder non disponible")
        return {
            eid: {"kwh": 0.0, "method": "unavailable", "quality": "missing", "error": None}
            for eid in entity_ids
        }

    start, end = window_for_period(period)
    result: dict[str, dict] = {}
    start_ts = start.timestamp()
    end_ts = end.timestamp()

    try:
        db_path = str(Path(hass.config.path(_DB_NAME)))

        # Charger toutes les statistics_meta une seule fois (dans l'executor)
        def _load_meta():
            conn = sqlite3.connect(db_path)
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT statistic_id, id, unit_of_measurement, unit_class FROM statistics_meta"
                )
                return {
                    row[0]: {
                        "id": row[1],
                        "unit_of_measurement": row[2],
                        "unit_class": row[3],
                    }
                    for row in cursor.fetchall()
                }
            finally:
                conn.close()

        all_stats = await hass.async_add_executor_job(_load_meta)

        # Traitement des entités avec statistiques (tout dans l'executor)
        stats_results = await _fetch_stats_sync(
            hass, db_path, entity_ids, all_stats, start_ts, end_ts
        )

        for eid in entity_ids:
            if eid in stats_results:
                result[eid] = stats_results[eid]
                continue

            # Entité sans statistiques : fallback sur le delta d'états
            def _fetch():
                return rec_history.get_significant_states(
                    hass, start, end, [eid], minimal_response=True
                )

            states_map = await hass.async_add_executor_job(_fetch)
            state_list = states_map.get(eid) or []
            energy = _delta_from_states(state_list)
            if energy > 0:
                result[eid] = {
                    "kwh": energy,
                    "method": "states_fallback",
                    "quality": "partial",
                    "error": None,
                }
            else:
                result[eid] = {
                    "kwh": 0.0,
                    "method": "states_fallback",
                    "quality": "missing",
                    "error": None,
                }

            _LOGGER.debug(
                "HSE period_stats detail: %s période=%s énergie=%.3f kWh method=%s quality=%s",
                eid, period, result[eid]["kwh"], result[eid]["method"], result[eid]["quality"],
            )

    except Exception:
        _LOGGER.exception("HSE period_stats detail: erreur pour période %s", period)
        for eid in entity_ids:
            if eid not in result:
                result[eid] = {
                    "kwh": 0.0,
                    "method": "unavailable",
                    "quality": "missing",
                    "error": "db_error",
                }

    return result
