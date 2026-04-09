"""
HSE V3 — Endpoints migration (Hypothèse A — DELTA-008)
GET  /api/hse/migration/export  — détection entités legacy V1/V2
POST /api/hse/migration/apply   — applique le mapping + nettoyage optionnel

• Hypothèse A : on ajoute l'entity_id V1 au catalogue V3 pour préserver l'historique.
• Pas de suppression automatique d'entités HA — cleanup_legacy retire uniquement
  les entrées du catalogue HSE (pas les entités HA elles-mêmes).
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager

_APPLYING = False


class HseMigrationExportView(HseBaseView):
    url = "/api/hse/migration/export"
    name = "api:hse:migration:export"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        # Détection heuristique : items dont l'entity_id présente le pattern V1/V2
        # Pattern V1 : sensor.hse_* ou sensor.*_hse
        # Pattern V2 : sensor.hse_v2_* (domaine 'hse' V2)
        legacy_patterns = ("sensor.hse_", "sensor.hse_v2_")
        mappings = []
        for item_id, item in items.items():
            if not isinstance(item, dict):
                continue
            src = item.get("source") or {}
            eid = src.get("entity_id") or ""
            is_legacy = any(eid.startswith(p) for p in legacy_patterns)
            if not is_legacy:
                continue
            # Proposition : remplacer le préfixe legacy par le domaine V3
            suggested = eid.replace("sensor.hse_v2_", "sensor.").replace("sensor.hse_", "sensor.")
            confidence = "high" if suggested != eid else "low"
            mappings.append({
                "legacy_entity_id": eid,
                "suggested_entity_id": suggested,
                "confidence": confidence,
                "status": (item.get("triage") or {}).get("policy", "pending"),
            })

        return self.json_ok({
            "legacy_found": len(mappings),
            "mappings": mappings,
        })


class HseMigrationApplyView(HseBaseView):
    url = "/api/hse/migration/apply"
    name = "api:hse:migration:apply"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self._applying = False

    async def post(self, request: web.Request) -> web.Response:
        if self._applying:
            return self.json_error("Migration déjà en cours", HTTPStatus.CONFLICT)
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        mappings = body.get("mappings")
        cleanup_legacy = bool(body.get("cleanup_legacy", False))

        if not isinstance(mappings, list):
            return self.json_error("mappings doit être une liste", HTTPStatus.UNPROCESSABLE_ENTITY)

        self._applying = True
        applied = 0
        cleaned = 0
        errors: list[str] = []

        try:
            mgr = HseStorageManager(self.hass)
            catalogue = await mgr.async_load_catalogue()
            items = catalogue.get("items") or {}

            # Index entity_id -> catalogue_key
            eid_index: dict[str, str] = {}
            for k, v in items.items():
                if isinstance(v, dict):
                    eid = (v.get("source") or {}).get("entity_id")
                    if eid:
                        eid_index[eid] = k

            for mapping in mappings:
                if not isinstance(mapping, dict):
                    errors.append("entrée invalide")
                    continue
                legacy_eid = mapping.get("legacy_entity_id")
                target_eid = mapping.get("target_entity_id")
                if not legacy_eid or not target_eid:
                    errors.append(f"legacy_entity_id et target_entity_id requis")
                    continue
                key = eid_index.get(legacy_eid)
                if key is None:
                    errors.append(f"{legacy_eid}: non trouvé")
                    continue
                # Hypothèse A : on met à jour l'entity_id dans source
                items[key].setdefault("source", {})["entity_id"] = target_eid
                applied += 1
                if cleanup_legacy:
                    # Retire uniquement de l'index HSE, pas l'entité HA
                    items.pop(key, None)
                    cleaned += 1

            await mgr.async_save_catalogue(catalogue)
        except Exception as exc:
            errors.append(str(exc))
        finally:
            self._applying = False

        return self.json_ok({"applied": applied, "cleaned": cleaned, "errors": errors})
