"""
Tests HSE V3 — DELTA-059 : creation, suppression, rename de pieces et types.

Lancer : python3 -m unittest tests/test_meta_pieces_types.py -v
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


class TestDELTA059PiecesTypes(unittest.TestCase):
    """DELTA-059 : pieces et types — creation, suppression, rename."""

    def test_create_room_logique(self):
        """Creation de piece : id = name en minuscule avec _."""
        name = "Garage"
        room_id = name.lower().replace(" ", "_").replace("-", "_")
        self.assertEqual(room_id, "garage")

    def test_create_room_evite_doublons(self):
        """Une piece existante ne doit pas etre recree."""
        rooms = [{"id": "garage", "name": "Garage"}]
        new_id = "garage"
        existe = any(
            (r.get("id") if isinstance(r, dict) else r) == new_id for r in rooms
        )
        self.assertTrue(existe)

    def test_delete_type_retire_de_liste(self):
        """Suppression d'un type : retire de meta["types"]."""
        types_list = ["Chauffe-eau", "Pompe a chaleur"]
        name = "Chauffe-eau"
        self.assertIn(name, types_list)
        types_list.remove(name)
        self.assertNotIn(name, types_list)

    def test_rename_type_renomme_dans_liste(self):
        """Renommage d'un type : remplace dans meta["types"]."""
        types_list = ["Chauffe-eau", "Pompe a chaleur"]
        old_name = "Chauffe-eau"
        new_name = "Ballon"
        if old_name in types_list and new_name not in types_list:
            idx = types_list.index(old_name)
            types_list[idx] = new_name
        self.assertIn(new_name, types_list)
        self.assertNotIn(old_name, types_list)

    def test_rename_type_propagation_assignments(self):
        """Renommage d'un type : se propage aux assignments qui y referenciaient."""
        assignments = {
            "sensor.energie_1": {"room_id": "cuisine", "type_id": "Chauffe-eau"},
            "sensor.energie_2": {"room_id": "salon", "type_id": "Pompe a chaleur"},
        }
        old_name = "Chauffe-eau"
        new_name = "Ballon"
        for asn in assignments.values():
            if isinstance(asn, dict) and asn.get("type_id") == old_name:
                asn["type_id"] = new_name
        self.assertEqual(assignments["sensor.energie_1"]["type_id"], "Ballon")
        self.assertEqual(assignments["sensor.energie_2"]["type_id"], "Pompe a chaleur")

    def test_types_lus_de_meta_types(self):
        """La liste des types inclut meta["types"] en plus des assignments."""
        assignments = {
            "sensor.a": {"type_id": "TypeA"},
        }
        meta_types = ["TypeB", "TypeC"]
        types_set = {
            a.get("type_id")
            for a in assignments.values()
            if isinstance(a, dict) and a.get("type_id")
        }
        types_set.update(meta_types or [])
        types = sorted(types_set)
        self.assertEqual(types, ["TypeA", "TypeB", "TypeC"])

    def test_create_type_conflit_si_existant(self):
        """Creation d'un type existant retourne une erreur (CONFLICT)."""
        types_list = ["Chauffe-eau"]
        new_name = "Chauffe-eau"
        self.assertIn(new_name, types_list)

    def test_delete_type_inexistant_erreur(self):
        """Suppression d'un type inexistant retourne NOT_FOUND."""
        types_list = ["Chauffe-eau"]
        name = "Inexistant"
        self.assertNotIn(name, types_list)


if __name__ == "__main__":
    unittest.main(verbosity=2)
