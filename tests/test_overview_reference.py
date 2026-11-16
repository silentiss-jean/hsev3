"""Tests HSE V3 — Q7-R6 : `reference_sensor` reste non nul sans capteur de puissance.

L'index kWh (`reference_energy_entity_id`) est la référence de facturation. Si
l'utilisateur ne configure QUE cet index (cas normal d'un Linky sans capteur de
puissance séparé), `overview` ne doit pas répondre `reference_sensor: null` —
sinon l'UI affiche « aucun compteur » alors qu'une référence existe bel et bien.

Lancer : python3 -m unittest tests.test_overview_reference -v
"""
from __future__ import annotations

import asyncio
import json
import sys
import types
import unittest
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"


def _install_mocks() -> None:
    ha = types.ModuleType("homeassistant")
    ha.__path__ = []
    core = types.ModuleType("homeassistant.core")

    class HomeAssistant:  # placeholder
        pass

    core.HomeAssistant = HomeAssistant

    components = types.ModuleType("homeassistant.components")
    components.__path__ = []
    http = types.ModuleType("homeassistant.components.http")

    class HomeAssistantView:
        requires_auth = True
        cors_allowed = False

    http.HomeAssistantView = HomeAssistantView

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    storage = types.ModuleType("homeassistant.helpers.storage")

    class Store:
        def __init__(self, hass, version, key, **kwargs):
            self.hass, self.key = hass, key

        async def async_load(self):
            return None

        async def async_save(self, data):
            return None

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
        "homeassistant.helpers": helpers,
        "homeassistant.helpers.storage": storage,
        "homeassistant.util": util,
        "homeassistant.util.dt": dt,
        "aiohttp": aiohttp,
        "aiohttp.web": web,
    })


def _load(*names):
    import importlib

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
    mods = [importlib.import_module(n) for n in names]
    return mods[0] if len(mods) == 1 else mods


_install_mocks()
overview = _load("hse_t.api.views.overview")


class _State:
    def __init__(self, state, unit=None, dc=None, sc=None, name=None):
        self.state = state
        self.attributes = {
            "unit_of_measurement": unit,
            "device_class": dc,
            "state_class": sc,
            "friendly_name": name,
        }


class _States:
    def __init__(self, mapping: dict):
        self._m = mapping

    def get(self, eid):
        return self._m.get(eid)

    def async_all(self, domain=None):
        return []


class _Hass:
    def __init__(self, mapping: dict):
        self.states = _States(mapping)


TV = "sensor.tv_energy"
LINKY = "sensor.linky_index"

_CATALOGUE = {
    "items": {
        "reg:energy:tv": {
            "triage": {"policy": "selected"},
            "source": {"entity_id": TV},
        },
    }
}

_META = {"meta": {"assignments": {}, "rooms": []}}


def _build_manager(settings: dict):
    class _Mgr:
        def __init__(self, hass):
            pass

        async def async_load_catalogue(self):
            return _CATALOGUE

        async def async_load_settings(self):
            return settings

        async def async_load_meta(self):
            return _META

    return _Mgr


def _run(settings: dict, states: dict) -> dict:
    async def _detail(hass, entity_ids, period="month", hc_start=None, hc_end=None):
        return {eid: {"kwh": 10.0, "method": "stats_long_term",
                      "quality": "ok", "error": None} for eid in entity_ids}

    async def _detail_hphc(hass, entity_ids, period="month", hc_start=None, hc_end=None):
        return {eid: {"hp_kwh": 5.0, "hc_kwh": 5.0, "total_kwh": 10.0,
                      "method": "stats_long_term", "quality": "ok", "error": None}
                for eid in entity_ids}

    overview.HseStorageManager = _build_manager(settings)
    overview.async_energy_detail = _detail
    overview.async_energy_detail_hphc = _detail_hphc

    hass = _Hass(states)
    view = overview.HseOverviewView(hass)
    resp = asyncio.run(view.get(None))
    return json.loads(resp.text)


_BASE_STATES = {
    TV: _State("120.0", "kWh", "energy", "total_increasing", "TV"),
    LINKY: _State("9999.0", "kWh", "energy", "total_increasing", "Linky"),
}

_SETTINGS = {
    "mode": "flat",
    "price_ttc_kwh": 0.25,
    "subscription_eur_month": 30.0,
    "tax_rate_pct": 20.0,
    "reference_entity_id": "",
    "reference_energy_entity_id": LINKY,
}


class TestReferenceSensorToujoursNonNul(unittest.TestCase):
    """Q7-R6 — `reference_sensor` non nul dès qu'un index kWh est configuré."""

    def test_index_seul_reference_sensor_non_null(self):
        data = _run(_SETTINGS, _BASE_STATES)
        self.assertIsNotNone(data["reference_sensor"])
        self.assertEqual(data["reference_sensor"]["entity_id"], LINKY)
        self.assertEqual(data["reference_sensor"]["status"], "reference_energy_only")
        self.assertIsNone(data["reference_sensor"]["power_w"])

    def test_reference_consumption_exposee_par_periode(self):
        data = _run(_SETTINGS, _BASE_STATES)
        ref_cons = data["reference_consumption"]
        self.assertIsNotNone(ref_cons)
        for p in ("day", "week", "month", "year"):
            self.assertIn(p, ref_cons)
            self.assertIsNotNone(ref_cons[p]["kwh"])

    def test_sans_aucune_reference_laisse_null(self):
        settings = dict(_SETTINGS, reference_energy_entity_id=None,
                        reference_entity_id="")
        data = _run(settings, _BASE_STATES)
        self.assertIsNone(data["reference_sensor"])
        self.assertIsNone(data["reference_consumption"])

    def test_avec_capteur_de_puissance_le_bloc_reste_prioritaire(self):
        settings = dict(_SETTINGS, reference_entity_id="sensor.linky_power")
        states = dict(_BASE_STATES)
        states["sensor.linky_power"] = _State("450", "W", "power", "measurement", "Linky P")
        data = _run(settings, states)
        self.assertIsNotNone(data["reference_sensor"])
        self.assertEqual(data["reference_sensor"]["entity_id"], "sensor.linky_power")
        self.assertEqual(data["reference_sensor"]["power_w"], 450.0)


if __name__ == "__main__":
    unittest.main()