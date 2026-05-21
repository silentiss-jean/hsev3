"""
HSE V3 — Endpoints catalogue
GET    /api/hse/catalogue                  — liste paginée
PATCH  /api/hse/catalogue/{entity_id}      — activer/désactiver/renommer — DELTA-058
DELETE /api/hse/catalogue/{entity_id}      — supprimer du catalogue — DELTA-058
POST   /api/hse/catalogue/bulk             — actions en masse — DELTA-058
POST   /api/hse/catalogue/triage           — triage unitaire (scan)
POST   /api/hse/catalogue/triage/bulk      — triage en masse (scan)
POST   /api/hse/catalogue/refresh          — re-scan
"""
from __future__ import annotations

import uuid
from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...sensors.quality_scorer import score_item

_VALID_ACTIONS = ("select", "ignore", "reset")
_VALID_STATUS = ("all", "selected", "ignored", "pending")
_VALID_BULK_ACTIONS = ("activate", "deactivate", "delete")

# Valeurs de platform/domain qui sont des artefacts HA internes
_HA_INTERNAL_PLATFORMS = frozenset({"integration", "recorder", "homeassistant"})


def _resolve_integration_domain(hass: HomeAssistant, src: dict) -> str:
    stored_domain = src.get("integration_domain")
    if stored_domain and stored_domain not in _HA_INTERNAL_PLATFORMS:
        return stored_domain
    config_entry_id = src.get("config_entry_id")
    if config_entry_id:
        entry = hass.config_entries.async_get_entry(config_entry_id)
        if entry and entry.domain and entry.domain not in _HA_INTERNAL_PLATFORMS:
            return entry.domain
    platform = src.get("platform")
    if platform and platform not in _HA_INTERNAL_PLATFORMS:
        return platform
    if stored_domain:
        return stored_domain
    return "unknown"


def _resolve_integration_label(hass: HomeAssistant, src: dict) -> str | None:
    stored = src.get("integration_label")
    if stored:
        return stored
    config_entry_id = src.get("config_entry_id")
    if config_entry_id:
        entry = hass.config_entries.async_get_entry(config_entry_id)
        if entry:
            return entry.title or entry.domain
    domain = _resolve_integration_domain(hass, src)
    if domain and domain != "unknown":
        return domain
    platform = src.get("platform")
    if platform:
        return platform
    return None


def _find_item_key(items: dict, entity_id: str) -> str | None:
    """Retourne la clé interne du catalogue pour un entity_id donné."""
    for k, v in items.items():
        if isinstance(v, dict) and (v.get("source") or {}).get("entity_id") == entity_id:
            return k
    return None


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
            ha_state_raw = getattr(state_obj, "state", None) if state_obj else None
            resolved_domain = _resolve_integration_domain(self.hass, src)

            filtered.append({
                "entity_id": eid,
                "name": (item.get("enrichment") or {}).get("display_name") or friendly_name,
                "icon": (item.get("enrichment") or {}).get("icon") or (getattr(state_obj, "attributes", {}) or {}).get("icon"),
                "room": (item.get("enrichment") or {}).get("room_id"),
                "type": (item.get("enrichment") or {}).get("type_id"),
                "status": policy,
                "active": (item.get("enrichment") or {}).get("active", False),
                "quality_score": score_item(item, ha_state_raw),
                "integration": _resolve_integration_label(self.hass, src),
                "integration_domain": resolved_domain,
                "platform": src.get("platform"),
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


class HseCatalogueItemView(HseBaseView):
    """PATCH + DELETE /api/hse/catalogue/{entity_id} — DELTA-058."""
    url = "/api/hse/catalogue/{entity_id}"
    name = "api:hse:catalogue:item"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def patch(self, request: web.Request, entity_id: str) -> web.Response:
        """Active/désactive un capteur, ou met à jour display_name/icon."""
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        key = _find_item_key(items, entity_id)
        if key is None:
            return self.json_error(f"{entity_id} non trouvé dans le catalogue", HTTPStatus.NOT_FOUND)

        enrichment = items[key].setdefault("enrichment", {})

        if "active" in body:
            enrichment["active"] = bool(body["active"])
        if "display_name" in body and isinstance(body["display_name"], str):
            enrichment["display_name"] = body["display_name"].strip()
        if "icon" in body and isinstance(body["icon"], str):
            enrichment["icon"] = body["icon"].strip()

        await mgr.async_save_catalogue(catalogue)
        return self.json_ok({"entity_id": entity_id, "updated": True})

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Supprime un capteur du catalogue."""
        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        key = _find_item_key(items, entity_id)
        if key is None:
            return self.json_error(f"{entity_id} non trouvé dans le catalogue", HTTPStatus.NOT_FOUND)

        del items[key]
        await mgr.async_save_catalogue(catalogue)
        return self.json_ok({"entity_id": entity_id, "deleted": True})


class HseCatalogueBulkView(HseBaseView):
    """POST /api/hse/catalogue/bulk — actions en masse — DELTA-058."""
    url = "/api/hse/catalogue/bulk"
    name = "api:hse:catalogue:bulk"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def post(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        action = body.get("action")
        entity_ids = body.get("entity_ids")

        if action not in _VALID_BULK_ACTIONS:
            return self.json_error(f"action invalide. Valeurs: {_VALID_BULK_ACTIONS}", HTTPStatus.UNPROCESSABLE_ENTITY)
        if not isinstance(entity_ids, list) or not entity_ids:
            return self.json_error("entity_ids doit être une liste non vide", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        processed = 0
        errors: list[str] = []
        keys_to_delete: list[str] = []

        for eid in entity_ids:
            key = _find_item_key(items, eid)
            if key is None:
                errors.append(f"{eid}: non trouvé")
                continue
            if action == "activate":
                items[key].setdefault("enrichment", {})["active"] = True
                processed += 1
            elif action == "deactivate":
                items[key].setdefault("enrichment", {})["active"] = False
                processed += 1
            elif action == "delete":
                keys_to_delete.append(key)
                processed += 1

        for k in keys_to_delete:
            del items[k]

        await mgr.async_save_catalogue(catalogue)
        return self.json_ok({"processed": processed, "errors": errors})


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

        key = _find_item_key(items, entity_id)
        if key is None:
            return self.json_error(f"{entity_id} non trouvé dans le catalogue", HTTPStatus.NOT_FOUND)

        new_policy = {"select": "selected", "ignore": "ignored", "reset": "pending"}[action]
        items[key].setdefault("triage", {})["policy"] = new_policy
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
