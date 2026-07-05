"""
HSE V3 — Endpoints meta
GET  /api/hse/meta                — pièces, types, assignations
POST /api/hse/meta                — création manuelle pièce/type (R1)
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

        # DELTA-064 Q3 : rooms retourné comme [{"id": str, "name": str}]
        # (correction bug affichage "?" dans Pièces & Types — l'ancien format string[]
        # rendait room.name indéfini côté frontend)
        rooms_out = []
        for r in (meta.get("rooms") or []):
            if isinstance(r, dict):
                room_id = r.get("id", "")
                room_name = r.get("name") or room_id
                rooms_out.append({"id": room_id, "name": room_name})
            elif isinstance(r, str):
                # Compatibilité ascendante : store ancien format string
                rooms_out.append({"id": r, "name": r})

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
            "rooms": rooms_out,
            "types": types,
            "assignments": assignments_out,
        })

    async def post(self, request: web.Request) -> web.Response:
        """R1 — Création manuelle de pièce ou type.

        Body attendu :
            {"action": "create_room", "name": "Garage"}
            {"action": "create_type", "name": "Chauffe-eau"}
            {"action": "rename_room", "id": "garage", "name": "Atelier"}
            {"action": "delete_room", "id": "garage"}
            {"action": "assign", "entity_id": "sensor.x", "room_id": "garage", "type_id": "Chauffe-eau"}
        """
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        action = body.get("action")
        if not action:
            return self.json_error("action requis", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        meta_store = await mgr.async_load_meta()
        meta = meta_store.setdefault("meta", {})
        rooms = meta.setdefault("rooms", [])
        assignments = meta.setdefault("assignments", {})

        if action == "create_room":
            name = (body.get("name") or "").strip()
            if not name:
                return self.json_error("name requis", HTTPStatus.UNPROCESSABLE_ENTITY)
            room_id = name.lower().replace(" ", "_").replace("-", "_")
            # Éviter les doublons
            if any((r.get("id") if isinstance(r, dict) else r) == room_id for r in rooms):
                return self.json_error(f"Pièce '{room_id}' existe déjà", HTTPStatus.CONFLICT)
            rooms.append({"id": room_id, "name": name})
            await mgr.async_save_meta(meta_store)
            return self.json_ok({"id": room_id, "name": name})

        if action == "create_type":
            name = (body.get("name") or "").strip()
            if not name:
                return self.json_error("name requis", HTTPStatus.UNPROCESSABLE_ENTITY)
            # Les types sont déduits des assignments ; on ne stocke pas de liste séparée.
            # Pour créer un type, on l'ajoute à une liste "types" dans le store.
            types_list = meta.setdefault("types", [])
            if name in types_list:
                return self.json_error(f"Type '{name}' existe déjà", HTTPStatus.CONFLICT)
            types_list.append(name)
            await mgr.async_save_meta(meta_store)
            return self.json_ok({"name": name})

        if action == "rename_room":
            room_id = body.get("id")
            name = (body.get("name") or "").strip()
            if not room_id or not name:
                return self.json_error("id et name requis", HTTPStatus.UNPROCESSABLE_ENTITY)
            found = False
            for r in rooms:
                if isinstance(r, dict) and r.get("id") == room_id:
                    r["name"] = name
                    found = True
                    break
            if not found:
                return self.json_error(f"Pièce '{room_id}' introuvable", HTTPStatus.NOT_FOUND)
            await mgr.async_save_meta(meta_store)
            return self.json_ok({"id": room_id, "name": name})

        if action == "delete_room":
            room_id = body.get("id")
            if not room_id:
                return self.json_error("id requis", HTTPStatus.UNPROCESSABLE_ENTITY)
            meta["rooms"] = [r for r in rooms if (r.get("id") if isinstance(r, dict) else r) != room_id]
            # Retirer les assignments qui référencent cette pièce
            for asn in assignments.values():
                if isinstance(asn, dict) and asn.get("room_id") == room_id:
                    asn["room_id"] = None
            await mgr.async_save_meta(meta_store)
            return self.json_ok({"deleted": room_id})

        if action == "assign":
            entity_id = body.get("entity_id")
            if not entity_id:
                return self.json_error("entity_id requis", HTTPStatus.UNPROCESSABLE_ENTITY)
            asn = assignments.setdefault(entity_id, {})
            if "room_id" in body:
                asn["room_id"] = body.get("room_id")
            if "type_id" in body:
                asn["type_id"] = body.get("type_id")
            await mgr.async_save_meta(meta_store)
            return self.json_ok({"entity_id": entity_id, "room_id": asn.get("room_id"), "type_id": asn.get("type_id")})

        return self.json_error(f"action inconnue: {action}", HTTPStatus.UNPROCESSABLE_ENTITY)


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

        # Expose ce que compute_pending_diff calcule réellement.
        # NOTE : pas de "to_remove" — la suppression de pièces n'est pas gérée
        # par le moteur de sync actuel (les pièces HSE sont créées/renommées
        # depuis les areas HA, jamais supprimées automatiquement).
        return self.json_ok({
            "to_add": diff["rooms"]["create"],
            "to_update": diff["rooms"]["rename"],
            "to_remove": [],
            "suggest_room": diff["assignments"]["suggest_room"],
            "stats": diff["stats"],
            "has_changes": diff["has_changes"],
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
