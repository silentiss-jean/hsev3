"""Tests HSE V3 — DELTA-070 : anti double comptage des index d'énergie.

Un même appareil (device_id) peut exposer plusieurs index kWh cumulatifs
(Linky : total EAST + tranches base/HP/HC). Ce fichier prouve que :

  1. `plan_sources` ne retient qu'UN index d'énergie par device (le plus global)
     et exclut les tranches (base/HP/HC) et les compteurs périodiques.
  2. Les compteurs périodiques (today/month) restent exclus comme avant.
  3. Un index non-cumulatif (measurement) reste exclu (non-régression).
  4. Le compteur de référence (ZLinky) n'est jamais compté dans les appareils.
  5. `find_energy_index_conflict` refuse un 2e index d'énergie du même device.

Lancer : python3 -m unittest tests.test_sources_double_counting -v
"""
from __future__ import annotations

import importlib
import importlib.util
import sys
import types
import unittest
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"


def _load_engine():
    """Charge hse_t.engine.sources + measure sans exécuter hse/__init__.py."""
    for mod in list(sys.modules):
        if mod == "hse_t" or mod.startswith("hse_t."):
            del sys.modules[mod]
    for name, sub in (("hse_t", ""), ("hse_t.engine", "engine")):
        m = types.ModuleType(name)
        m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
        sys.modules[name] = m
    measure = importlib.import_module("hse_t.engine.measure")
    sources = importlib.import_module("hse_t.engine.sources")
    return sources, measure


sources, measure = _load_engine()


# ── Doublures ────────────────────────────────────────────────────────────────
class _State:
    def __init__(self, state, unit=None, dc=None, sc=None, name=None):
        self.state = state
        self.attributes = {}
        if unit is not None:
            self.attributes["unit_of_measurement"] = unit
        if dc is not None:
            self.attributes["device_class"] = dc
        if sc is not None:
            self.attributes["state_class"] = sc
        if name is not None:
            self.attributes["friendly_name"] = name


def _item(eid, kind="energy", unit="kWh", dc="energy", sc="total_increasing", device="dev1"):
    return {
        "source": {
            "entity_id": eid,
            "kind": kind,
            "unit": unit,
            "device_class": dc,
            "state_class": sc,
            "device_id": device,
        }
    }


# ── Le Linky réel de l'utilisateur (5 entités, 1 device) ─────────────────────
LINKY_DEVICE = "zlinky_tic_v2"

LINKY_STATES = {
    "sensor.zlinky_east": _State("164085", "kWh", "energy", "total_increasing", "Lixee total cumulé"),
    "sensor.zlinky_base": _State("60197", "kWh", "energy", "total_increasing", "Lixee base"),
    "sensor.zlinky_hphc_hp": _State("103886", "kWh", "energy", "total_increasing", "Lixee heures pleines"),
    "sensor.zlinky_hphc_hc": _State("59017", "kWh", "energy", "total_increasing", "Lixee heures creuses"),
    "sensor.zlinky_ccasn": _State("4154", "W", "power", "measurement", "Lixee Puissance mesurée"),
}

LINKY_ITEMS = [
    _item("sensor.zlinky_east", device=LINKY_DEVICE),
    _item("sensor.zlinky_base", device=LINKY_DEVICE),
    _item("sensor.zlinky_hphc_hp", device=LINKY_DEVICE),
    _item("sensor.zlinky_hphc_hc", device=LINKY_DEVICE),
    _item("sensor.zlinky_ccasn", kind="power", unit="W", dc="power", sc="measurement", device=LINKY_DEVICE),
]


class TestLinkyAntiDoubleComptage(unittest.TestCase):
    """Le Linky complet ne doit jamais produire plus d'un index d'énergie."""

    def test_un_seul_index_energie_retenu(self):
        plan = sources.plan_sources(LINKY_ITEMS, LINKY_STATES)
        # Un seul index d'énergie global : le total cumulé (EAST), pas les tranches.
        self.assertEqual(plan.energy_meter, ["sensor.zlinky_east"])

    def test_tranches_exclues(self):
        plan = sources.plan_sources(LINKY_ITEMS, LINKY_STATES)
        excluded_ids = {e["entity_id"]: e["reason"] for e in plan.excluded}
        self.assertIn("sensor.zlinky_base", excluded_ids)
        self.assertIn("sensor.zlinky_hphc_hp", excluded_ids)
        self.assertIn("sensor.zlinky_hphc_hc", excluded_ids)
        # Toutes classées en doublon tarifaire.
        for eid in ("sensor.zlinky_base", "sensor.zlinky_hphc_hp", "sensor.zlinky_hphc_hc"):
            self.assertEqual(excluded_ids[eid], "tariff_counter_duplicate")

    def test_puissance_reste_un_seul_live_power(self):
        plan = sources.plan_sources(LINKY_ITEMS, LINKY_STATES)
        # CCASN (power) reste la puissance live ; EAST ne part pas en energy_from_power.
        self.assertIn("sensor.zlinky_ccasn", plan.live_power)
        self.assertNotIn("sensor.zlinky_east", plan.live_power)

    def test_pas_d_integration_de_puissance_si_index_present(self):
        """Un appareil avec index cumulatif n'intègre pas sa puissance (2× sinon)."""
        plan = sources.plan_sources(LINKY_ITEMS, LINKY_STATES)
        self.assertEqual(plan.energy_from_power, [])


class TestCompteursPeriodiques(unittest.TestCase):
    """Non-régression : les compteurs today/month restent exclus."""

    def test_today_exclu(self):
        items = [
            _item("sensor.tv_energy", device="tv"),
            _item("sensor.tv_energy_today", device="tv"),
        ]
        states = {
            "sensor.tv_energy": _State("120", "kWh", "energy", "total_increasing", "TV total"),
            "sensor.tv_energy_today": _State("1.5", "kWh", "energy", "total_increasing", "TV today"),
        }
        plan = sources.plan_sources(items, states)
        self.assertEqual(plan.energy_meter, ["sensor.tv_energy"])
        excluded = {e["entity_id"]: e["reason"] for e in plan.excluded}
        self.assertEqual(excluded.get("sensor.tv_energy_today"), "period_counter_duplicate")

    def test_month_exclu(self):
        items = [
            _item("sensor.fr_energy", device="fr"),
            _item("sensor.fr_energy_month", device="fr"),
        ]
        states = {
            "sensor.fr_energy": _State("50", "kWh", "energy", "total_increasing", "Frigo total"),
            "sensor.fr_energy_month": _State("8", "kWh", "energy", "total_increasing", "Frigo month"),
        }
        plan = sources.plan_sources(items, states)
        self.assertEqual(plan.energy_meter, ["sensor.fr_energy"])
        excluded = {e["entity_id"]: e["reason"] for e in plan.excluded}
        self.assertEqual(excluded.get("sensor.fr_energy_month"), "period_counter_duplicate")


class TestNonRegression(unittest.TestCase):
    """Les règles existantes restent intactes."""

    def test_index_non_cumulatif_exclu(self):
        items = [_item("sensor.prise_energy", device="prise")]
        states = {"sensor.prise_energy": _State("1.5", "kWh", "energy", "measurement", "Prise")}
        plan = sources.plan_sources(items, states)
        self.assertEqual(plan.energy_meter, [])
        excluded = {e["entity_id"]: e["reason"] for e in plan.excluded}
        self.assertEqual(excluded.get("sensor.prise_energy"), "energy_not_cumulative")

    def test_deux_appareils_distints_deux_index(self):
        """Deux appareils différents, un index chacun : les deux sont gardés."""
        items = [
            _item("sensor.tv_energy", device="tv"),
            _item("sensor.fr_energy", device="fr"),
        ]
        states = {
            "sensor.tv_energy": _State("120", "kWh", "energy", "total_increasing", "TV"),
            "sensor.fr_energy": _State("50", "kWh", "energy", "total_increasing", "Frigo"),
        }
        plan = sources.plan_sources(items, states)
        self.assertCountEqual(plan.energy_meter, ["sensor.tv_energy", "sensor.fr_energy"])

    def test_reference_jamais_additionnee(self):
        """Le Linky désigné comme référence sort du calcul, pas compté 2×."""
        items = [
            _item("sensor.linky_index", device=LINKY_DEVICE),
            _item("sensor.tv_energy", device="tv"),
        ]
        states = {
            "sensor.linky_index": _State("9999", "kWh", "energy", "total_increasing", "Linky"),
            "sensor.tv_energy": _State("10", "kWh", "energy", "total_increasing", "TV"),
        }
        plan = sources.plan_sources(items, states, reference_entity_id="sensor.linky_index")
        self.assertIn("sensor.linky_index", plan.reference_ids)
        self.assertNotIn("sensor.linky_index", plan.energy_meter)
        self.assertNotIn("sensor.linky_index", plan.energy_sources)
        self.assertEqual(plan.energy_meter, ["sensor.tv_energy"])


class TestConflitSelection(unittest.TestCase):
    """find_energy_index_conflict : refus d'un 2e index d'énergie du même device."""

    def test_conflit_detecte(self):
        items = {
            "reg:linky:east": {
                "source": {"entity_id": "sensor.zlinky_east", "kind": "energy",
                           "state_class": "total_increasing", "device_id": LINKY_DEVICE},
                "triage": {"policy": "selected"},
            }
        }
        conflict = sources.find_energy_index_conflict(
            items, "sensor.zlinky_base", LINKY_DEVICE, "total_increasing"
        )
        self.assertIsNotNone(conflict)
        self.assertEqual(conflict["status"], 422)
        self.assertIn("sensor.zlinky_east", conflict["message"])

    def test_pas_de_conflit_si_autre_appareil(self):
        items = {
            "reg:tv:energy": {
                "source": {"entity_id": "sensor.tv_energy", "kind": "energy",
                           "state_class": "total_increasing", "device_id": "tv"},
                "triage": {"policy": "selected"},
            }
        }
        conflict = sources.find_energy_index_conflict(
            items, "sensor.zlinky_east", LINKY_DEVICE, "total_increasing"
        )
        self.assertIsNone(conflict)

    def test_pas_de_conflit_si_pas_de_device(self):
        conflict = sources.find_energy_index_conflict(
            {}, "sensor.zlinky_east", None, "total_increasing"
        )
        self.assertIsNone(conflict)

    def test_pas_de_conflit_si_candidate_puissance(self):
        items = {
            "reg:linky:east": {
                "source": {"entity_id": "sensor.zlinky_east", "kind": "energy",
                           "state_class": "total_increasing", "device_id": LINKY_DEVICE},
                "triage": {"policy": "selected"},
            }
        }
        # Candidat puissance (measurement W) : pas un index d'énergie -> pas de conflit.
        conflict = sources.find_energy_index_conflict(
            items, "sensor.zlinky_ccasn", LINKY_DEVICE, "measurement"
        )
        self.assertIsNone(conflict)

    def test_pas_de_conflit_si_autre_non_selected(self):
        items = {
            "reg:linky:east": {
                "source": {"entity_id": "sensor.zlinky_east", "kind": "energy",
                           "state_class": "total_increasing", "device_id": LINKY_DEVICE},
                "triage": {"policy": "ignored"},
            }
        }
        conflict = sources.find_energy_index_conflict(
            items, "sensor.zlinky_base", LINKY_DEVICE, "total_increasing"
        )
        self.assertIsNone(conflict)


class TestPrioriteGlobalite(unittest.TestCase):
    """L'arbitrage garde l'index le plus global."""

    def test_total_bat_tranche(self):
        self.assertGreater(
            sources._energy_index_priority("sensor.zlinky_east", "Lixee total cumulé"),
            sources._energy_index_priority("sensor.zlinky_base", "Lixee base"),
        )

    def test_tranche_bat_periodique(self):
        self.assertGreater(
            sources._energy_index_priority("sensor.zlinky_base", "Lixee base"),
            sources._energy_index_priority("sensor.x_today", "X today"),
        )

    def test_tariff_counter_detecte_base(self):
        self.assertTrue(sources._looks_tariff_counter("sensor.zlinky_base", "Lixee base"))
        self.assertTrue(sources._looks_tariff_counter("sensor.linky_hc", "heures creuses"))

    def test_tariff_counter_ne_detecte_pas_total(self):
        self.assertFalse(sources._looks_tariff_counter("sensor.zlinky_east", "Lixee total cumulé"))


if __name__ == "__main__":
    unittest.main()