"""
Tests supplémentaires HSE V3 — période_stats (A03 à A06).
- Normalisation des unités (Wh, MWh, kW, MW → kWh/W)
- Bornes temporelles (référence avant période)
- async_energy_detail : distinction zéro / indisponible / erreur

Lancer : python3 /Users/jean/.hermes/cache/scratch/run_tests.py
"""
from __future__ import annotations

import importlib
import sqlite3
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"

# ── Mock minimal de homeassistant (même principe que test_reliability.py) ──
ha = types.ModuleType("homeassistant")
ha.core = types.ModuleType("homeassistant.core")


class HomeAssistant:
    pass


ha.core.HomeAssistant = HomeAssistant
sys.modules["homeassistant"] = ha
sys.modules["homeassistant.core"] = ha.core

rec = types.ModuleType("homeassistant.components")
rec.history = types.ModuleType("homeassistant.components.recorder.history")
rec.history.get_significant_states = lambda *a, **k: {}
sys.modules["homeassistant.components"] = rec
sys.modules["homeassistant.components.recorder"] = types.ModuleType(
    "homeassistant.components.recorder"
)
sys.modules["homeassistant.components.recorder.history"] = rec.history


def _load_period_stats():
    """Charge period_stats sans exécuter hse/__init__.py (qui importe homeassistant).

    Purge les modules hse_t en cache pour forcer le rechargement du code actuel.
    """
    for mod in list(sys.modules):
        if mod == "hse_t" or mod.startswith("hse_t."):
            del sys.modules[mod]
    for name, sub in (("hse_t", ""), ("hse_t.engine", "engine")):
        m = types.ModuleType(name)
        m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
        sys.modules[name] = m
    return importlib.import_module("hse_t.engine.period_stats")


pstats = _load_period_stats()

# Charger time_utils de manière autonome (stdlib uniquement)
import importlib.util
_tu_spec = importlib.util.spec_from_file_location("hse_t_time_utils", str(_ROOT / "time_utils.py"))
tu = importlib.util.module_from_spec(_tu_spec)
_tu_spec.loader.exec_module(tu)


class TestUnitsNormalization(unittest.TestCase):
    """A03 : normalisation des unités dans toutes les voies de calcul."""

    def test_is_power_sensor_accepte_toutes_unites_puissance(self):
        for u in ("W", "kW", "mW", "MW"):
            self.assertTrue(pstats._is_power_sensor(u), f"unité {u} rejetée")
        for u in ("kWh", "Wh", "VA", None, ""):
            self.assertFalse(pstats._is_power_sensor(u), f"unité {u} acceptée à tort")

    def test_is_cumulative_energy_accepte_toutes_unites_energie(self):
        for u in ("kWh", "Wh", "MWh"):
            self.assertTrue(
                pstats._is_cumulative_energy("energy", u), f"unité {u} rejetée"
            )
        for u in ("W", "kW", None, ""):
            self.assertFalse(
                pstats._is_cumulative_energy("energy", u), f"unité {u} acceptée à tort"
            )
        # unit_class != energy → pas cumulatif même si kWh
        self.assertFalse(pstats._is_cumulative_energy("power", "kWh"))

    def test_energy_unit_factor(self):
        self.assertEqual(pstats._energy_unit_factor("kWh"), 1.0)
        self.assertEqual(pstats._energy_unit_factor("Wh"), 1e-3)
        self.assertEqual(pstats._energy_unit_factor("MWh"), 1e3)
        self.assertEqual(pstats._energy_unit_factor(None), 1.0)
        self.assertEqual(pstats._energy_unit_factor("inconnu"), 1.0)

    def test_power_unit_factor(self):
        self.assertEqual(pstats._power_unit_factor("W"), 1.0)
        self.assertEqual(pstats._power_unit_factor("kW"), 1e3)
        self.assertEqual(pstats._power_unit_factor("mW"), 1e-3)
        self.assertEqual(pstats._power_unit_factor("MW"), 1e6)
        self.assertEqual(pstats._power_unit_factor(None), 1.0)


class TestBorneTemporelle(unittest.TestCase):
    """A04 : référence avant début de période pour compteurs cumulatifs."""

    def _make_conn(self, rows_meta, rows_stats):
        """Crée une connexion SQLite en mémoire avec les données données."""
        conn = sqlite3.connect(":memory:")
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE statistics_meta (id INTEGER, statistic_id TEXT, unit_of_measurement TEXT, unit_class TEXT)"
        )
        cur.execute(
            "CREATE TABLE statistics (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
        )
        for row in rows_meta:
            cur.execute(
                "INSERT INTO statistics_meta VALUES (?,?,?,?)", row
            )
        for row in rows_stats:
            cur.execute(
                "INSERT INTO statistics VALUES (?,?,?,?,?)", row
            )
        conn.commit()
        return conn

    def test_cumulatif_recupere_reference_avant_start(self):
        """
        Compteur à 100 avant la période, puis 105 dedans.
        MAX-MIN dans la fenêtre = 105-105 = 0 (un seul point).
        Avec la référence avant start (100), le delta devrait être 5.
        """
        conn = self._make_conn(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[
                (1, 1, 1000.0, 100.0, None),   # avant start
                (2, 1, 2000.0, 105.0, None),   # dans la fenêtre
            ],
        )
        start_ts = 1500.0
        end_ts = 3000.0
        energie = pstats._energy_from_table_sync(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(energie, 5.0, f"attendu 5.0 kWh, obtenu {energie}")

    def test_cumulatif_sans_reference_avant_start(self):
        """
        Un seul point dans la fenêtre, pas de référence avant.
        MAX-MIN = 0 car une seule valeur.
        """
        conn = self._make_conn(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[
                (1, 1, 2000.0, 105.0, None),   # seul point, dans la fenêtre
            ],
        )
        start_ts = 1500.0
        end_ts = 3000.0
        energie = pstats._energy_from_table_sync(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(energie, 0.0)

    def test_puissance_kw_converti_en_w(self):
        """
        Capteur en kW : mean = 2 kW sur 1 heure → 2 kWh.
        """
        conn = self._make_conn(
            rows_meta=[(1, "sensor.test_power", "kW", "power")],
            rows_stats=[
                (1, 1, 1000.0, None, 2.0),   # mean = 2 kW
            ],
        )
        start_ts = 1000.0
        end_ts = 2000.0
        energie = pstats._energy_from_table_sync(
            conn, 1, "sensor.test_power", "kW", "power",
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(energie, 2.0, f"attendu 2.0 kWh, obtenu {energie}")

    def test_energie_wh_converti_en_kwh(self):
        """
        Compteur non cumulatif en Wh : sum = 1500 Wh → 1.5 kWh.
        """
        conn = self._make_conn(
            rows_meta=[(1, "sensor.test", "Wh", None)],
            rows_stats=[
                (1, 1, 1000.0, 1500.0, None),
            ],
        )
        start_ts = 1000.0
        end_ts = 2000.0
        energie = pstats._energy_from_table_sync(
            conn, 1, "sensor.test", "Wh", None,
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(energie, 1.5, f"attendu 1.5 kWh, obtenu {energie}")


# ════════════════════════════════════════════════════════════════════
# A04 — Couverture des périodes : long terme partiel complété par court terme
# ════════════════════════════════════════════════════════════════════

class TestCouverturePartielle(unittest.TestCase):
    """A04 : si le long terme couvre partiellement la période, le court terme complète."""

    def _make_conn_full(self, rows_meta, rows_long, rows_short):
        conn = sqlite3.connect(":memory:")
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE statistics_meta (id INTEGER, statistic_id TEXT, unit_of_measurement TEXT, unit_class TEXT)"
        )
        cur.execute(
            "CREATE TABLE statistics (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
        )
        cur.execute(
            "CREATE TABLE statistics_short_term (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
        )
        for row in rows_meta:
            cur.execute("INSERT INTO statistics_meta VALUES (?,?,?,?)", row)
        for row in rows_long:
            cur.execute("INSERT INTO statistics VALUES (?,?,?,?,?)", row)
        for row in rows_short:
            cur.execute("INSERT INTO statistics_short_term VALUES (?,?,?,?,?)", row)
        conn.commit()
        return conn

    def test_long_terme_partiel_complete_par_court_terme(self):
        """Periode de 24h. Long terme une seule ligne. Court terme complete."""
        import tempfile
        import os

        tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        tmp.close()
        try:
            conn = sqlite3.connect(tmp.name)
            cur = conn.cursor()
            cur.execute(
                "CREATE TABLE statistics_meta (id INTEGER, statistic_id TEXT, unit_of_measurement TEXT, unit_class TEXT)"
            )
            cur.execute(
                "CREATE TABLE statistics (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
            )
            cur.execute(
                "CREATE TABLE statistics_short_term (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
            )
            cur.execute(
                "INSERT INTO statistics_meta VALUES (?,?,?,?)",
                (1, "sensor.test", "kWh", "energy"),
            )
            # Une seule ligne long terme (couverture partielle)
            cur.execute(
                "INSERT INTO statistics VALUES (?,?,?,?,?)",
                (1, 1, 1000.0, 100.0, None),
            )
            # Plusieurs lignes court terme dans la fenetre
            cur.execute(
                "INSERT INTO statistics_short_term VALUES (?,?,?,?,?)",
                (1, 1, 1000.0, 0.0, None),
            )
            cur.execute(
                "INSERT INTO statistics_short_term VALUES (?,?,?,?,?)",
                (2, 1, 1300.0, 5.0, None),
            )
            cur.execute(
                "INSERT INTO statistics_short_term VALUES (?,?,?,?,?)",
                (3, 1, 1600.0, 10.0, None),
            )
            conn.commit()
            conn.close()

            all_stats = {
                "sensor.test": {
                    "id": 1,
                    "unit_of_measurement": "kWh",
                    "unit_class": "energy",
                }
            }
            start_ts = 900.0
            end_ts = 10000.0

            # Verifier que la couverture long terme est bien partielle
            conn2 = sqlite3.connect(tmp.name)
            coverage = pstats._table_coverage_ratio(
                conn2, 1, "statistics", start_ts, end_ts, 1.0
            )
            conn2.close()
            self.assertLess(coverage, 1.0, "la couverture doit etre partielle")

            result = pstats._fetch_stats_sync_full(
                tmp.name, ["sensor.test"], all_stats, start_ts, end_ts
            )
            entry = result["sensor.test"]
            self.assertIn(
                "short_term", entry["method"],
                f"methode attendue avec short_term, obtenu '{entry['method']}'",
            )
            self.assertEqual(
                entry["quality"], "partial",
                f"qualite attendue 'partial', obtenu '{entry['quality']}'",
            )
            self.assertGreater(entry["kwh"], 0.0, "l'energie doit etre > 0")
            self.assertIsNone(entry["error"])
        finally:
            os.unlink(tmp.name)


# ═════════════════════════════════════════════════════════════════════
# A06 — Qualité « ok » même quand énergie = 0.0 (données présentes)
# ═════════════════════════════════════════════════════════════════════

class TestQualiteZeroVsAbsence(unittest.TestCase):
    """A06 : une consommation nulle réelle est « ok », pas « missing »."""

    def _make_conn_zero(self, rows_meta, rows_stats):
        conn = sqlite3.connect(":memory:")
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE statistics_meta (id INTEGER, statistic_id TEXT, unit_of_measurement TEXT, unit_class TEXT)"
        )
        cur.execute(
            "CREATE TABLE statistics (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
        )
        for row in rows_meta:
            cur.execute("INSERT INTO statistics_meta VALUES (?,?,?,?)", row)
        for row in rows_stats:
            cur.execute("INSERT INTO statistics VALUES (?,?,?,?,?)", row)
        conn.commit()
        return conn

    def test_qualite_ok_quand_energie_nulle_mais_donnees_presentes(self):
        """Données présentes dans la fenêtre mais somme = 0 → quality « ok »."""
        conn = self._make_conn_zero(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[
                (1, 1, 1500.0, 0.0, None),   # dans la fenêtre, valeur 0
            ],
        )
        start_ts = 1000.0
        end_ts = 2000.0
        kwh, method, quality, error = pstats._energy_from_table_sync_full(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(quality, "ok", f"attendu 'ok', obtenu '{quality}'")
        self.assertEqual(kwh, 0.0)
        self.assertIsNone(error)

    def test_qualite_missing_quand_aucune_donnee(self):
        """Aucune ligne dans la fenêtre → quality « missing »."""
        conn = self._make_conn_zero(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[],  # aucune donnée
        )
        start_ts = 1000.0
        end_ts = 2000.0
        kwh, method, quality, error = pstats._energy_from_table_sync_full(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", 1.0, start_ts, end_ts,
        )
        self.assertEqual(quality, "missing", f"attendu 'missing', obtenu '{quality}'")
        self.assertEqual(kwh, 0.0)


# ═════════════════════════════════════════════════════════════════════
# A07 — Split HP/HC (Heures Pleines / Heures Creuses)
# ═════════════════════════════════════════════════════════════════════

class TestSplitHPHC(unittest.TestCase):
    """A07 : séparation de l'énergie en HP et HC selon la plage configurée."""

    def _make_conn_hphc(self, rows_meta, rows_stats):
        conn = sqlite3.connect(":memory:")
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE statistics_meta (id INTEGER, statistic_id TEXT, unit_of_measurement TEXT, unit_class TEXT)"
        )
        cur.execute(
            "CREATE TABLE statistics (id INTEGER, metadata_id INTEGER, start_ts REAL, sum REAL, mean REAL)"
        )
        for row in rows_meta:
            cur.execute("INSERT INTO statistics_meta VALUES (?,?,?,?)", row)
        for row in rows_stats:
            cur.execute("INSERT INTO statistics VALUES (?,?,?,?,?)", row)
        conn.commit()
        return conn

    def _ts(self, year, month, day, hour, minute=0):
        return datetime(year, month, day, hour, minute, tzinfo=timezone.utc).timestamp()

    def test_compteur_cumulatif_split_hphc(self):
        """Compteur kWh cumulatif : delta classé HC ou HP selon l'heure."""
        conn = self._make_conn_hphc(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[
                (1, 1, self._ts(2026, 1, 1, 21, 0), 100.0, None),   # HP
                (2, 1, self._ts(2026, 1, 1, 23, 0), 110.0, None),   # HC
                (3, 1, self._ts(2026, 1, 2, 5, 0), 115.0, None),    # HC
                (4, 1, self._ts(2026, 1, 2, 7, 0), 120.0, None),    # HP
            ],
        )
        start_ts = self._ts(2026, 1, 1, 0, 0)
        end_ts = self._ts(2026, 1, 2, 12, 0)
        split = pstats._energy_hphc_split_sync(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", start_ts, end_ts,
            hc_start_min=22 * 60,   # 22:00
            hc_end_min=6 * 60,      # 06:00
        )
        self.assertEqual(split["hc_kwh"], 15.0, f"attendu 15.0 kWh HC, obtenu {split['hc_kwh']}")
        self.assertEqual(split["hp_kwh"], 5.0, f"attendu 5.0 kWh HP, obtenu {split['hp_kwh']}")
        self.assertEqual(split["total_kwh"], 20.0)

    def test_puissance_split_hphc(self):
        """Capteur kW : chaque entrée mean classée HP/HC selon l'heure."""
        conn = self._make_conn_hphc(
            rows_meta=[(1, "sensor.test_power", "kW", "power")],
            rows_stats=[
                (1, 1, self._ts(2026, 1, 1, 10, 0), None, 2.0),   # HP, 2 kW → 2 kWh
                (2, 1, self._ts(2026, 1, 1, 23, 0), None, 1.0),   # HC, 1 kW → 1 kWh
            ],
        )
        start_ts = self._ts(2026, 1, 1, 0, 0)
        end_ts = self._ts(2026, 1, 1, 23, 59)
        split = pstats._energy_hphc_split_sync(
            conn, 1, "sensor.test_power", "kW", "power",
            "statistics", start_ts, end_ts,
            hc_start_min=22 * 60,
            hc_end_min=6 * 60,
        )
        self.assertEqual(split["hp_kwh"], 2.0, f"attendu 2.0 kWh HP, obtenu {split['hp_kwh']}")
        self.assertEqual(split["hc_kwh"], 1.0, f"attendu 1.0 kWh HC, obtenu {split['hc_kwh']}")
        self.assertEqual(split["total_kwh"], 3.0)

    def test_pas_de_config_hc_retourne_tout_en_hp(self):
        """Sans hc_start/hc_end, toute l'énergie est classée HP."""
        conn = self._make_conn_hphc(
            rows_meta=[(1, "sensor.test", "kWh", "energy")],
            rows_stats=[
                (1, 1, self._ts(2026, 1, 1, 23, 0), 100.0, None),
                (2, 1, self._ts(2026, 1, 2, 1, 0), 110.0, None),
            ],
        )
        start_ts = self._ts(2026, 1, 1, 0, 0)
        end_ts = self._ts(2026, 1, 2, 12, 0)
        split = pstats._energy_hphc_split_sync(
            conn, 1, "sensor.test", "kWh", "energy",
            "statistics", start_ts, end_ts,
            hc_start_min=None,
            hc_end_min=None,
        )
        self.assertEqual(split["hp_kwh"], 10.0)
        self.assertEqual(split["hc_kwh"], 0.0)
        self.assertEqual(split["total_kwh"], 10.0)


# ═════════════════════════════════════════════════════════════════════
# A07b — Heure locale Europe/Paris pour les plages HC
# ═════════════════════════════════════════════════════════════════════

class TestIsHcHourLocal(unittest.TestCase):
    """Vérifie que is_hc_hour utilise l'heure locale Paris, pas l'UTC."""

    def test_20h_utc_est_22h_paris_donc_hc(self):
        """20:00 UTC = 22:00 Paris (UTC+2 été). Avec plage HC 22:00-06:00, c'est HC."""
        from zoneinfo import ZoneInfo
        paris = ZoneInfo("Europe/Paris")
        ts = datetime(2026, 6, 15, 20, 0, tzinfo=timezone.utc).timestamp()
        assert tu.is_hc_hour(ts, "22:00", "06:00") is True

    def test_20h_utc_en_utc_serait_hp(self):
        """En UTC pur, 20:00 n'est pas HC (plage 22:00-06:00 traverse minuit)."""
        from zoneinfo import ZoneInfo
        paris = ZoneInfo("Europe/Paris")
        ts = datetime(2026, 6, 15, 20, 0, tzinfo=timezone.utc).timestamp()
        # Vérifie que le différentiel UTC vs Paris est bien pris en compte
        dt_utc = datetime.fromtimestamp(ts, tz=timezone.utc)
        self.assertEqual(dt_utc.hour, 20)  # UTC dit 20h
        dt_paris = dt_utc.astimezone(paris)
        self.assertEqual(dt_paris.hour, 22)  # Paris dit 22h

    def test_21h_utc_est_23h_paris_donc_hc(self):
        """21:00 UTC = 23:00 Paris, dans la plage HC 22:00-06:00."""
        from zoneinfo import ZoneInfo
        ts = datetime(2026, 6, 15, 21, 0, tzinfo=timezone.utc).timestamp()
        assert tu.is_hc_hour(ts, "22:00", "06:00") is True

    def test_05h_utc_est_07h_paris_donc_hp(self):
        """05:00 UTC = 07:00 Paris (UTC+2), hors plage HC qui se termine à 06:00."""
        from zoneinfo import ZoneInfo
        ts = datetime(2026, 6, 15, 5, 0, tzinfo=timezone.utc).timestamp()
        assert tu.is_hc_hour(ts, "22:00", "06:00") is False


if __name__ == "__main__":
    unittest.main(verbosity=2)
