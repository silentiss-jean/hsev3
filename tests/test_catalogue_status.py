"""Tests HSE V3 — D3 (vocabulaire de statut) et D4 (enrichment.active).

D3 : `catalogue/defaults.py` écrivait `triage.policy = "normal"` alors que tout
le reste du système (frontend, group_totals, migration, diagnostic) attend
`pending`. Résultat : 77 items invisibles via `?status=pending` et 422 sur
`?status=normal`.

D4 : `enrichment.active` est la projection d'affichage de `triage.policy`
(catalogue.py:183 les synchronise à l'écriture). Les catalogues antérieurs
laissaient `active=false` sur des items pourtant `selected`.

Les deux sont corrigés par une normalisation au chargement dans
`storage/manager.py`, auto-hérissante et idempotente.

Lancer : python3 -m unittest tests.test_catalogue_status -v
"""
from __future__ import annotations

import asyncio
import importlib
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

    # Store en mémoire : `_STORE_DATA` est la charge à faire lire.
    # Signature réelle de HA : Store(hass, version, key).
    class Store:
        def __init__(self, hass, version, key, **kwargs):
            self.hass, self.key = hass, key

        async def async_load(self):
            return _STORE_DATA.get(self.key)

        async def async_save(self, data):
            _STORE_DATA[self.key] = data
            _SAVED.append((self.key, data))

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


def _load(*names: str):
    """Charge les modules hse_t.* sans exécuter hse/__init__.py."""
    for name, sub in (
        ("hse_t", ""),
        ("hse_t.engine", "engine"),
        ("hse_t.storage", "storage"),
        ("hse_t.catalogue", "catalogue"),
        ("hse_t.api", "api"),
        ("hse_t.api.views", "api/views"),
    ):
        m = types.ModuleType(name)
        m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
        sys.modules[name] = m
    mods = [importlib.import_module(n) for n in names]
    return mods[0] if len(mods) == 1 else mods


# État partagé du faux Store.
_STORE_DATA: dict = {}
_SAVED: list = []

_install_mocks()
storage_manager, defaults, catalogue_view = _load(
    "hse_t.storage.manager",
    "hse_t.catalogue.defaults",
    "hse_t.api.views.catalogue",
)


def _run(coro):
    return asyncio.run(coro)


def _catalogue(items: dict) -> dict:
    return {"schema_version": 1, "items": items}


class _Case(unittest.TestCase):
    def setUp(self):
        _STORE_DATA.clear()
        _SAVED.clear()

    def _load_catalogue(self, items: dict) -> dict:
        _STORE_DATA[storage_manager.STORAGE_KEY_CATALOGUE] = _catalogue(items)
        return _run(
            storage_manager.HseStorageManager(None).async_load_catalogue()
        )


class TestStatutPending(_Case):
    """D3 — `pending` est la seule valeur produite ; `normal` est un alias."""

    def test_defaults_ecrit_pending(self):
        item = defaults.ensure_item_defaults({}, base_entity_id="sensor.x")
        self.assertEqual(item["triage"]["policy"], "pending")

    def test_defaults_n_ecrit_plus_normal(self):
        item = defaults.ensure_item_defaults({}, base_entity_id="sensor.x")
        self.assertNotEqual(item["triage"]["policy"], "normal")

    def test_pending_est_valeur_reference(self):
        self.assertIn("pending", catalogue_view._VALID_STATUS)

    def test_normal_reste_accepte_en_entree(self):
        # Rétrocompatibilité : un client qui envoie encore `?status=normal`
        # ne doit pas prendre un 422.
        self.assertIn("normal", catalogue_view._VALID_STATUS)

    def test_normal_est_un_alias_de_pending(self):
        self.assertEqual(catalogue_view._STATUS_ALIASES.get("normal"), "pending")

    def test_statut_invalide_rejete(self):
        self.assertNotIn("bogus", catalogue_view._VALID_STATUS)


class TestMigrationAutomatique(_Case):
    """D3 — le catalogue stocké est réécrit une fois au chargement."""

    def test_normal_devient_pending(self):
        data = self._load_catalogue(
            {
                "a": {"triage": {"policy": "normal"}},
                "b": {"triage": {"policy": "selected"}},
            }
        )
        self.assertEqual(data["items"]["a"]["triage"]["policy"], "pending")
        # Et il est persisté, pas seulement corrigé en mémoire.
        self.assertEqual(len(_SAVED), 1)
        saved = _SAVED[0][1]
        self.assertEqual(saved["items"]["a"]["triage"]["policy"], "pending")

    def test_les_autres_statuts_sont_intacts(self):
        data = self._load_catalogue(
            {
                "a": {"triage": {"policy": "selected"}},
                "b": {"triage": {"policy": "ignored"}},
                "c": {"triage": {"policy": "removed"}},
            }
        )
        self.assertEqual(data["items"]["a"]["triage"]["policy"], "selected")
        self.assertEqual(data["items"]["b"]["triage"]["policy"], "ignored")
        self.assertEqual(data["items"]["c"]["triage"]["policy"], "removed")

    def test_aucune_modification_ne_reecrit_pas(self):
        self._load_catalogue(
            {"a": {"triage": {"policy": "selected"}, "enrichment": {"active": True}}}
        )
        self.assertEqual(_SAVED, [])

    def test_idempotent(self):
        data = self._load_catalogue({"a": {"triage": {"policy": "normal"}}})
        self.assertEqual(data["items"]["a"]["triage"]["policy"], "pending")
        self.assertEqual(len(_SAVED), 1)
        # Second passage : plus rien à corriger, donc plus d'écriture.
        _SAVED.clear()
        again = _run(
            storage_manager.HseStorageManager(None).async_load_catalogue()
        )
        self.assertEqual(again["items"]["a"]["triage"]["policy"], "pending")
        self.assertEqual(_SAVED, [])

    def test_catalogue_vide_intact(self):
        data = self._load_catalogue({})
        self.assertEqual(data["items"], {})
        self.assertEqual(_SAVED, [])


class TestEnrichmentActive(_Case):
    """D4 — `active` est la projection de `policy`."""

    def test_selected_active_vrai(self):
        data = self._load_catalogue(
            {"a": {"triage": {"policy": "selected"}, "enrichment": {"active": False}}}
        )
        self.assertTrue(data["items"]["a"]["enrichment"]["active"])

    def test_ignored_active_faux(self):
        data = self._load_catalogue(
            {"a": {"triage": {"policy": "ignored"}, "enrichment": {"active": True}}}
        )
        self.assertFalse(data["items"]["a"]["enrichment"]["active"])

    def test_pending_active_faux(self):
        data = self._load_catalogue(
            {"a": {"triage": {"policy": "pending"}, "enrichment": {"active": True}}}
        )
        self.assertFalse(data["items"]["a"]["enrichment"]["active"])

    def test_enrichment_manquant_cree(self):
        data = self._load_catalogue({"a": {"triage": {"policy": "selected"}}})
        self.assertTrue(data["items"]["a"]["enrichment"]["active"])

    def test_deja_coherent_ne_reecrit_pas(self):
        self._load_catalogue(
            {
                "a": {"triage": {"policy": "selected"}, "enrichment": {"active": True}},
                "b": {"triage": {"policy": "pending"}, "enrichment": {"active": False}},
            }
        )
        self.assertEqual(_SAVED, [])

    def test_item_sans_triage_est_laise(self):
        # Sans `triage`, on ne fabrique pas de statut : `policy` reste
        # l'unique source de vérité et l'UI retombe sur `active = False`
        # (catalogue.py:132). On ne réécrit donc rien.
        data = self._load_catalogue({"a": {"source": {"entity_id": "sensor.x"}}})
        self.assertNotIn("enrichment", data["items"]["a"])
        self.assertEqual(_SAVED, [])


if __name__ == "__main__":
    unittest.main()