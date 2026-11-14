"""
Tests supplémentaires HSE V3 — time_utils (A07 : HP/HC).
- parse_hhmm : parsing HH:MM
- is_hc_hour : classification HP/HC avec plage traversant minuit

Lancer : python3 /Users/jean/.hermes/cache/scratch/run_tests.py
"""
from __future__ import annotations

import importlib
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"

# ── Mock minimal de homeassistant ──
ha = types.ModuleType("homeassistant")
ha.core = types.ModuleType("homeassistant.core")


class HomeAssistant:
    pass


ha.core.HomeAssistant = HomeAssistant
sys.modules["homeassistant"] = ha
sys.modules["homeassistant.core"] = ha.core


def _load_time_utils():
    """Charge time_utils sans dépendance HA."""
    for mod in list(sys.modules):
        if mod == "hse_t" or mod.startswith("hse_t."):
            del sys.modules[mod]
    for name, sub in (("hse_t", ""), ("hse_t.engine", "engine")):
        m = types.ModuleType(name)
        m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
        sys.modules[name] = m
    return importlib.import_module("hse_t.time_utils")


tu = _load_time_utils()


class TestParseHhmm(unittest.TestCase):
    def test_valide(self):
        self.assertEqual(tu.parse_hhmm("22:00"), (22, 0))
        self.assertEqual(tu.parse_hhmm("06:00"), (6, 0))
        self.assertEqual(tu.parse_hhmm("00:00"), (0, 0))
        self.assertEqual(tu.parse_hhmm("23:59"), (23, 59))

    def test_invalide(self):
        self.assertIsNone(tu.parse_hhmm("25:00"))
        self.assertIsNone(tu.parse_hhmm("22:60"))
        self.assertIsNone(tu.parse_hhmm("22"))
        self.assertIsNone(tu.parse_hhmm(""))
        self.assertIsNone(tu.parse_hhmm(None))
        self.assertIsNone(tu.parse_hhmm("abc"))


class TestIsHcHour(unittest.TestCase):
    def test_pas_de_config_retourne_none(self):
        self.assertIsNone(tu.is_hc_hour(0, None, None))
        self.assertIsNone(tu.is_hc_hour(0, "", ""))
        self.assertIsNone(tu.is_hc_hour(0, "22:00", None))
        self.assertIsNone(tu.is_hc_hour(0, None, "06:00"))

    def test_plage_simple_journee(self):
        # HC de 02:00 à 07:00
        # 03:00 → HC, 10:00 → HP, 02:00 → HC (borne incluse), 07:00 → HP (borne exclue)
        self.assertTrue(tu.is_hc_hour(3 * 3600, "02:00", "07:00"))
        self.assertFalse(tu.is_hc_hour(10 * 3600, "02:00", "07:00"))
        self.assertTrue(tu.is_hc_hour(2 * 3600, "02:00", "07:00"))
        self.assertFalse(tu.is_hc_hour(7 * 3600, "02:00", "07:00"))

    def test_plage_traversant_minuit(self):
        # HC de 22:00 à 06:00
        self.assertTrue(tu.is_hc_hour(23 * 3600, "22:00", "06:00"))   # 23:00 → HC
        self.assertTrue(tu.is_hc_hour(0, "22:00", "06:00"))            # 00:00 → HC
        self.assertTrue(tu.is_hc_hour(5 * 3600, "22:00", "06:00"))     # 05:00 → HC
        self.assertFalse(tu.is_hc_hour(7 * 3600, "22:00", "06:00"))    # 07:00 → HP
        self.assertFalse(tu.is_hc_hour(10 * 3600, "22:00", "06:00"))   # 10:00 → HP
        self.assertTrue(tu.is_hc_hour(22 * 3600, "22:00", "06:00"))    # 22:00 → HC (borne incluse)
        self.assertFalse(tu.is_hc_hour(6 * 3600, "22:00", "06:00"))    # 06:00 → HP (borne exclue)

    def test_avec_datetime(self):
        dt = datetime(2026, 11, 14, 3, 0, tzinfo=timezone.utc)  # 03:00 UTC
        self.assertTrue(tu.is_hc_hour(dt, "02:00", "07:00"))

    def test_config_invalide_retourne_none(self):
        self.assertIsNone(tu.is_hc_hour(0, "25:00", "06:00"))
        self.assertIsNone(tu.is_hc_hour(0, "22:00", "25:00"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
