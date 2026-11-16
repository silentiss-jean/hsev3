"""
Tests HSE V3 — Q7 / D1 : réconciliation du compteur de référence dans /api/hse/costs.

VALIDE QUE LE BLOC `reference` EST BIEN EXPÉDÉ PAR `_build_costs_data` :
  - référence configurée, mesuré < référence  → delta_kwh positif, status ok
  - référence configurée, mesuré > référence  → delta_kwh négatif, surplus chiffré
  - référence non configurée                  → status no_reference, valeurs None

Stratégie : on mocke le stockage et la lecture d'énergie (period_stats), pas la
logique de réconciliation — c'est elle qu'on teste. stdlib uniquement.

Lancer : python3 -m unittest tests.test_costs_reference -v
"""
from __future__ import annotations

import asyncio
import importlib
import sys
import types
import unittest
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"


# ── Mock minimal de homeassistant + aiohttp ──────────────────────────────────
def _install_mocks() -> None:
    ha = types.ModuleType("homeassistant")
    ha.__path__ = []

    core = types.ModuleType("homeassistant.core")

    class HomeAssistant:  # noqa: D401 — placeholder
        pass

    core.HomeAssistant = HomeAssistant

    components = types.ModuleType("homeassistant.components")
    components.__path__ = []

    http = types.ModuleType("homeassistant.components.http")

    class HomeAssistantView:
        requires_auth = True
        cors_allowed = False

    http.HomeAssistantView = HomeAssistantView

    recorder = types.ModuleType("homeassistant.components.recorder")
    recorder.__path__ = []
    rec_history = types.ModuleType("homeassistant.components.recorder.history")
    rec_history.get_significant_states = lambda *a, **k: {}

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    storage = types.ModuleType("homeassistant.helpers.storage")

    class Store:
        def __init__(self, hass, key, version=None, **kwargs):
            self.hass, self.key = hass, key
            self._data = None

        async def async_load(self):
            return self._data

        async def async_save(self, data):
            self._data = data

    storage.Store = Store

    util = types.ModuleType("homeassistant.util")
    util.__path__ = []
    dt = types.ModuleType("homeassistant.util.dt")
    dt.DEFAULT_TIME_ZONE = None
    dt.now = lambda *a, **k: None
    util.dt = dt

    aiohttp = types.ModuleType("aiohttp")
    aiohttp.__path__ = []
    web = types.ModuleType("aiohttp.web")

    class Response:
        def __init__(self, text="", content_type=None, headers=None, status=200):
            self.text, self.status = text, status

    class Request:  # placeholder
        pass

    web.Response = Response
    web.Request = Request
    aiohttp.web = web

    sys.modules.update({
        "homeassistant": ha,
        "homeassistant.core": core,
        "homeassistant.components": components,
        "homeassistant.components.http": http,
        "homeassistant.components.recorder": recorder,
        "homeassistant.components.recorder.history": rec_history,
        "homeassistant.helpers": helpers,
        "homeassistant.helpers.storage": storage,
        "homeassistant.util": util,
        "homeassistant.util.dt": dt,
        "aiohttp": aiohttp,
        "aiohttp.web": web,
    })


def _load_views():
    """Charge hse_t.api.views.costs sans exécuter hse/__init__.py."""
    for name, sub in (
        ("hse_t", ""),
        ("hse_t.engine", "engine"),
        ("hse_t.storage", "storage"),
        ("hse_t.api", "api"),
        ("hse_t.api.views", "api/views"),
    ):
        m = types.ModuleType(name)
        m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
        sys.modules[name] = m
    return importlib.import_module("hse_t.api.views.costs")


_install_mocks()
costs = _load_views()


# ── Doublures ────────────────────────────────────────────────────────────────
class _State:
    def __init__(self, state, unit=None, dc=None, sc=None, name=None):
        self.state = state
        self.attributes = {
            k: v for k, v in {
                "unit_of_measurement": unit,
                "device_class": dc,
                "state_class": sc,
                "friendly_name": name,
            }.items() if v is not None
        }


class _States:
    def __init__(self, mapping):
        self._m = mapping

    def get(self, eid):
        return self._m.get(eid)

    def async_all(self, domain=None):
        return []


class _Hass:
    def __init__(self, states):
        self.states = _States(states)
        self.config = types.SimpleNamespace(path=lambda p: p)


def _item(eid, unit="kWh", dc="energy", sc="total_increasing", policy="selected"):
    return {
        "source": {"entity_id": eid, "kind": "energy", "unit": unit,
                   "device_class": dc, "state_class": sc, "device_id": eid},
        "triage": {"policy": policy},
    }


def _build_manager(catalogue, settings, meta=None):
    class _Mgr:
        def __init__(self, hass):
            pass

        async def async_load_catalogue(self):
            return catalogue

        async def async_load_settings(self):
            return settings

        async def async_load_meta(self):
            return meta or {"meta": {"assignments": {}, "rooms": []}}

    return _Mgr


def _patch_energy(ref_kwh, tracked_kwh):
    """Remplace async_energy_detail / _hphc par des valeurs contrôlées."""

    async def _detail(hass, entity_ids, period="month", start=None, end=None):
        return {
            eid: {"kwh": (ref_kwh if eid == REF_EID else tracked_kwh),
                  "method": "stats_long_term", "quality": "ok", "error": None}
            for eid in entity_ids
        }

    async def _detail_hphc(hass, entity_ids, period="month", hc_start=None, hc_end=None):
        out = {}
        for eid in entity_ids:
            kwh = ref_kwh if eid == REF_EID else tracked_kwh
            out[eid] = {"hp_kwh": kwh / 2.0, "hc_kwh": kwh / 2.0,
                        "total_kwh": kwh, "method": "stats_long_term",
                        "quality": "ok", "error": None}
        return out

    costs.async_energy_detail = _detail
    costs.async_energy_detail_hphc = _detail_hphc


REF_EID = "sensor.linky_index"
OTHER_EID = "sensor.tv_energy"

SETTINGS_REF = {
    "mode": "flat",
    "price_ttc_kwh": 0.25,
    "subscription_eur_month": 30.0,
    "tax_rate_pct": 20.0,
    "reference_entity_id": "",
    "reference_energy_entity_id": REF_EID,
}

SETTINGS_NO_REF = {
    "mode": "flat",
    "price_ttc_kwh": 0.25,
    "subscription_eur_month": 30.0,
    "tax_rate_pct": 20.0,
    "reference_entity_id": "",
    "reference_energy_entity_id": None,
}

CATALOGUE = {
    "items": {
        "reg:energy:tv": _item(OTHER_EID),
        # Le Linky est au catalogue mais identifié comme référence : il ne doit
        # jamais être additionné aux appareils (plan.reference_ids).
        "reg:energy:linky": _item(REF_EID),
    }
}


class TestCostsReferenceBlock(unittest.TestCase):
    def setUp(self):
        self.hass = _Hass({
            OTHER_EID: _State("120.0", "kWh", "energy", "total_increasing", "TV"),
            REF_EID: _State("9999.0", "kWh", "energy", "total_increasing", "Linky"),
        })
        self._mgr = costs.HseStorageManager

    def tearDown(self):
        costs.HseStorageManager = self._mgr

    def _run(self, settings, ref_kwh, tracked_kwh):
        costs.HseStorageManager = _build_manager(CATALOGUE, settings)
        _patch_energy(ref_kwh, tracked_kwh)
        return asyncio.run(costs._build_costs_data(self.hass, "month"))

    def test_reference_absente(self):
        """Sans index de référence : status no_reference, valeurs None."""
        data = self._run(SETTINGS_NO_REF, 0.0, 10.0)
        ref = data["reference"]
        self.assertEqual(ref["status"], "no_reference")
        self.assertIsNone(ref["entity_id"])
        self.assertIsNone(ref["delta_kwh"])
        self.assertIsNone(ref["surplus_kwh"])
        # le mesuré reste exposé, c'est la seule valeur qui ait un sens
        self.assertEqual(ref["tracked_kwh"], 10.0)

    def test_mesure_inferee_a_la_reference(self):
        """Mesuré < référence : delta positif, non suivi chiffré."""
        data = self._run(SETTINGS_REF, 20.0, 10.0)
        ref = data["reference"]
        self.assertEqual(ref["entity_id"], REF_EID)
        self.assertEqual(ref["status"], "ok")
        self.assertEqual(ref["reference_kwh"], 20.0)
        self.assertEqual(ref["tracked_kwh"], 10.0)
        self.assertEqual(ref["delta_kwh"], 10.0)
        self.assertEqual(ref["untracked_kwh"], 10.0)
        self.assertEqual(ref["surplus_kwh"], 0.0)
        self.assertEqual(ref["coverage_pct"], 50.0)
        # 20 kWh × 0,25 € + 30 € d'abonnement
        self.assertEqual(ref["reference_eur"], 35.0)

    def test_mesure_depasse_la_reference(self):
        """Mesuré > référence : delta négatif et surplus chiffré (D5)."""
        data = self._run(SETTINGS_REF, 8.0, 10.0)
        ref = data["reference"]
        self.assertEqual(ref["status"], "tracked_exceeds_ref")
        self.assertEqual(ref["delta_kwh"], -2.0)
        self.assertEqual(ref["surplus_kwh"], 2.0)
        self.assertEqual(ref["untracked_kwh"], 0.0)
        self.assertEqual(ref["reference_eur"], 32.0)   # 8 × 0,25 + 30

    def test_reference_jamais_additionnee_au_total(self):
        """Le Linky est au catalogue mais ne doit pas compter dans total_kwh."""
        data = self._run(SETTINGS_REF, 20.0, 10.0)
        # un seul appareil mesuré (TV) → 10 kWh, pas 10 + 9999
        self.assertEqual(data["total_kwh"], 10.0)
        self.assertEqual(data["reference"]["tracked_kwh"], 10.0)


if __name__ == "__main__":
    unittest.main()