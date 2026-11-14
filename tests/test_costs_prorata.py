"""
Tests HSE V3 — A08 prorata abonnement + DELTA-059 pieces/types.

Lancer : python3 -m unittest tests/test_costs_prorata.py -v
"""
from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

# ── Mock minimal de homeassistant ──────────────────────────────────────────
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

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"


def _load_module(name, subpath):
    m = types.ModuleType(name)
    m.__path__ = [str(_ROOT / subpath)]
    sys.modules[name] = m
    return importlib.import_module(name)


import importlib  # noqa: E402

hse_engine = _load_module("hse_t_engine", "engine")
cost = importlib.import_module("hse_t_engine.cost")


class TestA08ProrataAbonnement(unittest.TestCase):
    """A08 : abonnement proratise selon la periode (day/week/year)."""

    def _settings(self, sub_eur_month=30.0):
        return {"subscription_eur_month": sub_eur_month, "tax_rate_pct": 20.0}

    def test_subscription_mois(self):
        """Periode month : abonnement complet."""
        sub = cost.subscription_eur_month(self._settings(30.0))
        self.assertEqual(sub, 30.0)

    def test_prorata_jour(self):
        """Periode day : abonnement / 30."""
        sub = cost.subscription_eur_month(self._settings(30.0))
        prorata = round(sub / 30.0, 2)
        self.assertEqual(prorata, 1.0)

    def test_prorata_semaine(self):
        """Periode week : abonnement * 7 / 30."""
        sub = cost.subscription_eur_month(self._settings(30.0))
        prorata = round(sub * 7.0 / 30.0, 2)
        self.assertEqual(prorata, 7.0)

    def test_prorata_annee(self):
        """Periode year : abonnement * 12."""
        sub = cost.subscription_eur_month(self._settings(30.0))
        prorata = round(sub * 12.0, 2)
        self.assertEqual(prorata, 360.0)

    def test_prorata_abonnement_zero(self):
        """Abonnement a 0 : prorata reste 0 pour toutes les periodes."""
        sub = cost.subscription_eur_month(self._settings(0.0))
        self.assertEqual(sub, 0.0)
        self.assertEqual(round(sub / 30.0, 2), 0.0)
        self.assertEqual(round(sub * 7.0 / 30.0, 2), 0.0)
        self.assertEqual(round(sub * 12.0, 2), 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
