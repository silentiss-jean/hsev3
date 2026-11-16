"""Tests HSE V3 — Q7-R1 : refus d'un capteur de référence non cumulatif.

`reference_energy_entity_id` est la seule base de facturation autorisée. Elle
doit être un index cumulatif (unité kWh/Wh/MWh + state_class total /
total_increasing). Un capteur de puissance (W) ou un capteur périodique
(today/month) doit être refusé à l'écriture, avec un message qui dit quoi
corriger — jamais accepté silencieusement.

Lancer : python3 -m unittest tests.test_settings_reference -v
"""
from __future__ import annotations

import asyncio
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
settings_view = _load("hse_t.api.views.settings")


class _State:
    def __init__(self, state, unit=None, state_class=None, device_class=None):
        self.state = state
        self.attributes = {
            "unit_of_measurement": unit,
            "state_class": state_class,
            "device_class": device_class,
        }


class _Hass:
    def __init__(self, states: dict):
        self.states = self
        self._states = states

    def get(self, eid):
        return self._states.get(eid)


def _hass(**entities) -> _Hass:
    return _Hass(entities)


def _check(eid, hass, kind="energy"):
    return settings_view._check_reference(hass, eid, kind=kind)


class TestReferenceEnergy(unittest.TestCase):
    """Q7-R1 — `reference_energy_entity_id` doit être un index cumulatif."""

    def test_index_kwh_total_increasing_accepte(self):
        h = _hass(**{"sensor.linky_index": _State("1234.5", unit="kWh", state_class="total_increasing")})
        self.assertIsNone(_check("sensor.linky_index", h))

    def test_index_kwh_total_accepte(self):
        h = _hass(**{"sensor.linky_index": _State("1234.5", unit="kWh", state_class="total")})
        self.assertIsNone(_check("sensor.linky_index", h))

    def test_puissance_w_refusee(self):
        h = _hass(**{"sensor.linky_power": _State("450", unit="W", state_class="measurement")})
        err = _check("sensor.linky_power", h)
        self.assertIsNotNone(err)
        self.assertEqual(err["status"], 422)
        self.assertIn("index d'énergie", err["message"])

    def test_index_wh_accepte(self):
        h = _hass(**{"sensor.linky_wh": _State("1234567", unit="Wh", state_class="total_increasing")})
        self.assertIsNone(_check("sensor.linky_wh", h))

    def test_sans_state_class_refuse(self):
        h = _hass(**{"sensor.linky_index": _State("1234.5", unit="kWh", state_class=None)})
        err = _check("sensor.linky_index", h)
        self.assertIsNotNone(err)
        self.assertIn("cumulatif", err["message"])

    def test_state_class_measurement_refuse(self):
        h = _hass(**{"sensor.linky_index": _State("1.2", unit="kWh", state_class="measurement")})
        err = _check("sensor.linky_index", h)
        self.assertIsNotNone(err)
        self.assertIn("cumulatif", err["message"])

    def test_entite_inexistante_refusee(self):
        err = _check("sensor.absente", _hass())
        self.assertIsNotNone(err)
        self.assertEqual(err["status"], 422)
        self.assertIn("n'existe pas", err["message"])

    def test_entity_id_malforme_refuse(self):
        err = _check("pasunentityid", _hass())
        self.assertIsNotNone(err)
        self.assertEqual(err["status"], 422)

    def test_vide_efface_la_reference(self):
        self.assertIsNone(_check("", _hass()))
        self.assertIsNone(_check("   ", _hass()))
        self.assertIsNone(_check(None, _hass()))


class TestReferencePower(unittest.TestCase):
    """Q7-R1 — `reference_entity_id` est une puissance, jamais une facturation."""

    def test_puissance_w_acceptee(self):
        h = _hass(**{"sensor.linky_power": _State("450", unit="W", state_class="measurement")})
        self.assertIsNone(_check("sensor.linky_power", h, kind="power"))

    def test_puissance_kw_acceptee(self):
        h = _hass(**{"sensor.linky_power": _State("0.45", unit="kW", state_class="measurement")})
        self.assertIsNone(_check("sensor.linky_power", h, kind="power"))

    def test_index_kwh_refuse_comme_puissance(self):
        h = _hass(**{"sensor.linky_index": _State("1234", unit="kWh", state_class="total_increasing")})
        err = _check("sensor.linky_index", h, kind="power")
        self.assertIsNotNone(err)
        self.assertIn("puissance active", err["message"])


class TestValidateSettings(unittest.TestCase):
    """Q7-R1 — le refus passe bien par la validation d'un PUT /settings."""

    def test_reference_valide_passe(self):
        h = _hass(**{"sensor.linky_index": _State("1", unit="kWh", state_class="total_increasing")})
        self.assertIsNone(
            settings_view._validate_settings({"reference_energy_entity_id": "sensor.linky_index"}, h)
        )

    def test_reference_non_cumulative_422(self):
        h = _hass(**{"sensor.linky_power": _State("450", unit="W", state_class="measurement")})
        err = settings_view._validate_settings({"reference_energy_entity_id": "sensor.linky_power"}, h)
        self.assertIsNotNone(err)
        self.assertEqual(err["status"], 422)

    def test_autres_reglages_inchanges(self):
        # Un PUT qui ne touche pas la référence ne doit pas être impacté.
        self.assertIsNone(
            settings_view._validate_settings({"price_ttc_kwh": 0.25, "hc_start": "22:30"}, _hass())
        )

    def test_prix_negatif_toujours_refuse(self):
        err = settings_view._validate_settings({"price_ttc_kwh": -1}, _hass())
        self.assertIsNotNone(err)
        self.assertEqual(err["status"], 422)


if __name__ == "__main__":
    unittest.main()