"""
HSE V3 — Endpoints catalogue
GET  /api/hse/catalogue             — liste paginée
POST /api/hse/catalogue/triage      — triage unitaire
POST /api/hse/catalogue/triage/bulk — triage en masse
POST /api/hse/catalogue/refresh     — re-scan
"""
from __future__ import annotations

import uuid
from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager

_VALID_ACTIONS = ("select", "ignore", "reset")
_VALID_STATUS = ("all", "selected", "ignored", "pending")
_SCANNING = False  # flag module-level simple


class HseCatalogueView(HseBaseView):
    url = "/api/hse/catalogue"
    name = "api:hse:catalogue"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        status_filter = request.query.get("status", "all")
        if status_filter not in _VALID_STATUS:
            return self.json_error(f"Param status invalide. Valeurs: {_VALID_STATUS}", HTTPStatus.UNPROCESSABLE_ENTITY)

        try:
            page = max(1, int(request.query.get("page", 1)))
            per_page = min(200, max(1, int(request.query.get("per_page", 50))))
        except (ValueError, TypeError):
            return self.json_error("Params page/per_page doivent être des entiers", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        filtered = []
        for item_id, item in items.items():
            if not isinstance(item, dict):
                continue
            policy = (item.get("triage") or {}).get("policy") or "pending"
            if status_filter != "all" and policy != status_filter:
                continue
            src = item.get("source") or {}
            eid = src.get("entity_id") or item_id
            state_obj = self.hass.states.get(eid)
            friendly_name = (
                (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid
            )
            filtered.append({
                "entity_id": eid,
                "name": friendly_name,
                "icon": (getattr(state_obj, "attributes", {}) or {}).get("icon"),
                "room": (item.get("enrichment") or {}).get("room_id"),
                "type": (item.get("enrichment") or {}).get("type_id"),
                "status": policy,
                "quality_score": (item.get("health") or {}).get("escalation", "none"),
            })

        total = len(filtered)
        start = (page - 1) * per_page
        page_items = filtered[start:start + per_page]

        return self.json_ok({
            "total": total,
            "page": page,
            "per_page": per_page,
            "items": page_items,
        })


class HseCatalogueTriageView(HseBaseView):
    url = "/api/hse/catalogue/triage"
    name = "api:hse:catalogue:triage"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def post(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        entity_id = body.get("entity_id")
        action = body.get("action")

        if not entity_id or not isinstance(entity_id, str):
            return self.json_error("entity_id requis", HTTPStatus.UNPROCESSABLE_ENTITY)
        if action not in _VALID_ACTIONS:
            return self.json_error(f"action invalide. Valeurs: {_VALID_ACTIONS}", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        # Recherche de l'item par entity_id
        target_key = None
        for k, v in items.items():
            if isinstance(v, dict) and (v.get("source") or {}).get("entity_id") == entity_id:
                target_key = k
                break

        if target_key is None:
            return self.json_error(f"{entity_id} non trouvé dans le catalogue", HTTPStatus.NOT_FOUND)

        new_policy = {"select": "selected", "ignore": "ignored", "reset": "pending"}[action]
        items[target_key].setdefault("triage", {})["policy"] = new_policy
        await mgr.async_save_catalogue(catalogue)

        return self.json_ok({"entity_id": entity_id, "status": new_policy})


class HseCatalogueTriageBulkView(HseBaseView):
    url = "/api/hse/catalogue/triage/bulk"
    name = "api:hse:catalogue:triage:bulk"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def post(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        bulk_items = body.get("items")
        if not isinstance(bulk_items, list):
            return self.json_error("items doit être une liste", HTTPStatus.UNPROCESSABLE_ENTITY)

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

        processed = 0
        errors: list[str] = []
        for entry in bulk_items:
            if not isinstance(entry, dict):
                errors.append("entrée invalide (non-dict)")
                continue
            eid = entry.get("entity_id")
            action = entry.get("action")
            if not eid or action not in _VALID_ACTIONS:
                errors.append(f"{eid}: action invalide ou manquante")
                continue
            key = eid_index.get(eid)
            if key is None:
                errors.append(f"{eid}: non trouvé")
                continue
            new_policy = {"select": "selected", "ignore": "ignored", "reset": "pending"}[action]
            items[key].setdefault("triage", {})["policy"] = new_policy
            processed += 1

        await mgr.async_save_catalogue(catalogue)
        return self.json_ok({"processed": processed, "errors": errors})


class HseCatalogueRefreshView(HseBaseView):
    url = "/api/hse/catalogue/refresh"
    name = "api:hse:catalogue:refresh"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self._scanning = False

    async def post(self, request: web.Request) -> web.Response:
        if self._scanning:
            return self.json_error("Scan déjà en cours", HTTPStatus.CONFLICT)

        async def _do_scan() -> None:
            self._scanning = True
            try:
                from ...catalogue.scan_engine import async_scan_hass
                from ...catalogue.manager import merge_scan_into_catalogue
                mgr = HseStorageManager(self.hass)
                scan = await async_scan_hass(self.hass)
                catalogue = await mgr.async_load_catalogue()
                updated = merge_scan_into_catalogue(catalogue, scan)
                await mgr.async_save_catalogue(updated)
            finally:
                self._scanning = False

        self.hass.async_create_task(_do_scan())
        return self.json_ok({"triggered": True})
