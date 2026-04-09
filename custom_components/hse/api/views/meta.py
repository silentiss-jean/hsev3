"""
HSE V3 — Endpoints meta
GET  /api/hse/meta                — pièces, types, assignations
POST /api/hse/meta/sync/preview   — diff avant application
POST /api/hse/meta/sync/apply     — applique les assignations
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...meta.sync import async_build_ha_snapshot, compute_pending_diff, apply_pending_diff

_APPLYING = False


class HseMetaView(HseBaseView):
    url = "/api/hse/meta"
    name = "api:hse:meta"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        meta_store = await mgr.async_load_meta()
        meta = meta_store.get("meta") or {}

        rooms = [r.get("name", r.get("id", "")) for r in (meta.get("rooms") or []) if isinstance(r, dict)]
        types = list({a.get("type_id") for a in (meta.get("assignments") or {}).values() if isinstance(a, dict) and a.get("type_id")})

        assignments_out = []
        for eid, asn in (meta.get("assignments") or {}).items():
            if not isinstance(asn, dict):
                continue
            assignments_out.append({
                "entity_id": eid,
                "room": asn.get("room_id"),
                "type": asn.get("type_id"),
                "pending": asn.get("room_mode") == "auto",
            })

        return self.json_ok({
            "rooms": rooms,
            "types": types,
            "assignments": assignments_out,
        })


class HseMetaSyncPreviewView(HseBaseView):
    url = "/api/hse/meta/sync/preview"
    name = "api:hse:meta:sync:preview"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def post(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        meta_store = await mgr.async_load_meta()
        catalogue = await mgr.async_load_catalogue()
        snapshot = await async_build_ha_snapshot(self.hass, catalogue)
        diff = compute_pending_diff(meta_store, snapshot)

        return self.json_ok({
            "to_add": diff["rooms"]["create"],
            "to_update": diff["rooms"]["rename"],
            "to_remove": [],
            "unchanged": 0,
        })


class HseMetaSyncApplyView(HseBaseView):
    url = "/api/hse/meta/sync/apply"
    name = "api:hse:meta:sync:apply"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self._applying = False

    async def post(self, request: web.Request) -> web.Response:
        if self._applying:
            return self.json_error("Sync déjà en cours", HTTPStatus.CONFLICT)
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        self._applying = True
        errors: list[str] = []
        applied = 0
        try:
            mgr = HseStorageManager(self.hass)
            meta_store = await mgr.async_load_meta()
            catalogue = await mgr.async_load_catalogue()
            snapshot = await async_build_ha_snapshot(self.hass, catalogue)
            diff = compute_pending_diff(meta_store, snapshot)
            updated = apply_pending_diff(meta_store, diff, apply_mode="all")
            await mgr.async_save_meta(updated)
            applied = diff.get("stats", {}).get("create_rooms", 0) + diff.get("stats", {}).get("rename_rooms", 0)
        except Exception as exc:
            errors.append(str(exc))
        finally:
            self._applying = False

        return self.json_ok({"applied": applied, "errors": errors})
