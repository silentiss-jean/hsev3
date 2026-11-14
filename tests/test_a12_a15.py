"""
Tests HSE V3 — A12 historique moteur commun + A15 export/unload (logique pure).

Lancer : python3 -m unittest tests/test_a12_a15.py -v
"""
from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

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

import importlib  # noqa: E402


class TestA12HistoriqueMoteurCommun(unittest.TestCase):
    """A12 : analytics utilise async_energy_detail (moteur energetique commun)."""

    def test_async_history_importe_async_energy_detail(self):
        """Le code source d'analytics importe async_energy_detail depuis period_stats."""
        analytics_path = (
            Path(__file__).resolve().parents[1]
            / "custom_components"
            / "hse"
            / "engine"
            / "analytics.py"
        )
        source = analytics_path.read_text()
        self.assertIn(
            "from .period_stats import async_energy_detail",
            source,
            "analytics.py doit importer async_energy_detail",
        )

    def test_async_history_utilise_async_energy_detail(self):
        """Le corps de async_history_12months appelle async_energy_detail."""
        analytics_path = (
            Path(__file__).resolve().parents[1]
            / "custom_components"
            / "hse"
            / "engine"
            / "analytics.py"
        )
        source = analytics_path.read_text()
        self.assertIn(
            "async_energy_detail(",
            source,
            "async_history_12months doit appeler async_energy_detail",
        )

    def test_async_history_passe_start_end(self):
        """async_energy_detail est appele avec start et end personnalises."""
        analytics_path = (
            Path(__file__).resolve().parents[1]
            / "custom_components"
            / "hse"
            / "engine"
            / "analytics.py"
        )
        source = analytics_path.read_text()
        self.assertIn(
            "start=start, end=end",
            source,
            "async_energy_detail doit recevoir start et end personnalises",
        )


class TestA15ExportUnload(unittest.TestCase):
    """A15 : export_data stocke le resultat ; unload desactive les services."""

    def test_export_data_stocke_dans_hass_data(self):
        """Le code source d'export_data stocke dans hass.data[DOMAIN]['last_export']."""
        init_path = (
            Path(__file__).resolve().parents[1]
            / "custom_components"
            / "hse"
            / "__init__.py"
        )
        source = init_path.read_text()
        self.assertIn(
            '"last_export"',
            source,
            "_svc_export_data doit stocker le resultat dans hass.data",
        )
        self.assertIn(
            "hass.data.setdefault(DOMAIN, {})[\"last_export\"]",
            source,
        )

    def test_unload_desactive_services(self):
        """Le code source d'unload_entry desactive tous les services HSE."""
        init_path = (
            Path(__file__).resolve().parents[1]
            / "custom_components"
            / "hse"
            / "__init__.py"
        )
        source = init_path.read_text()
        self.assertIn(
            "async_unload_entry",
            source,
        )
        self.assertIn(
            "hass.services.async_remove(DOMAIN, name)",
            source,
            "unload_entry doit desactiver les services",
        )
        for svc in (
            "catalogue_refresh",
            "meta_sync",
            "export_data",
            "migrate_cleanup",
            "reset_catalogue",
            "reset_settings",
            "reset_meta",
            "set_entity_assignment",
            "set_triage_policy",
        ):
            self.assertIn(
                f'"{svc}"',
                source,
                f"le service {svc} doit etre desactive a l'unload",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
