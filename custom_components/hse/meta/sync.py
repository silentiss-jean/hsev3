"""
HSE V3 — Meta : sync HA → pièces/assignations (source V2 meta_sync.py adapté).
Construire un snapshot du registry HA, calculer le diff, appliquer les changements.
"""
from __future__ import annotations

import re
from typing import Any

from homeassistant.core import HomeAssistant


_ENTITY_ID_RE = re.compile(r"^[a-z_]+\.[a-z0-9_]+$")


def _safe_id(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def room_id_for_area(area_id: str) -> str:
    return "ha_" + _safe_id(area_id)


def _build_catalogue_entity_ids(catalogue: dict[str, Any] | None) -> set[str]:
    if not catalogue or not isinstance(catalogue, dict):
        return set()
    items = catalogue.get("items")
    if not isinstance(items, dict):
        return set()
    result: set[str] = set()
    for item in items.values():
        if not isinstance(item, dict):
            continue
        src = item.get("source")
        eid = src.get("entity_id") if isinstance(src, dict) else item.get("entity_id")
        if isinstance(eid, str) and eid:
            result.add(eid)
    return result


async def async_build_ha_snapshot(
    hass: HomeAssistant,
    catalogue: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from homeassistant.helpers import area_registry as ar
    from homeassistant.helpers import entity_registry as er

    ent_reg = er.async_get(hass)
    area_reg = ar.async_get(hass)

    area_name_by_id: dict[str, str] = {
        a.id: a.name or a.id
        for a in area_reg.async_list_areas()
        if a and a.id
    }

    catalogue_eids = _build_catalogue_entity_ids(catalogue)
    filter_by_catalogue = len(catalogue_eids) > 0

    entities: dict[str, Any] = {}
    for e in ent_reg.entities.values():
        eid = getattr(e, "entity_id", None)
        if not isinstance(eid, str) or not eid:
            continue
        if not eid.startswith("sensor."):
            continue
        if filter_by_catalogue and eid not in catalogue_eids:
            continue
        entities[eid] = {
            "entity_id": eid,
            "device_id": getattr(e, "device_id", None),
            "area_id": getattr(e, "area_id", None),
            "area_name": area_name_by_id.get(getattr(e, "area_id", None) or ""),
            "platform": getattr(e, "platform", None),
            "config_entry_id": getattr(e, "config_entry_id", None),
            "unique_id": getattr(e, "unique_id", None),
            "name": getattr(e, "name", None),
            "original_name": getattr(e, "original_name", None),
        }

    return {
        "areas": [{"area_id": aid, "name": nm} for aid, nm in area_name_by_id.items()],
        "entities": entities,
    }


def compute_pending_diff(
    meta_store: dict[str, Any],
    snapshot: dict[str, Any],
) -> dict[str, Any]:
    meta = (meta_store or {}).get("meta") or {}
    rooms = meta.get("rooms") if isinstance(meta, dict) else []
    rooms = rooms if isinstance(rooms, list) else []

    area_name_by_id: dict[str, str] = {
        a["area_id"]: str(a.get("name") or a["area_id"])
        for a in (snapshot.get("areas") or [])
        if isinstance(a, dict) and isinstance(a.get("area_id"), str)
    }

    room_by_area: dict[str, dict[str, Any]] = {
        r["ha_area_id"]: r
        for r in rooms
        if isinstance(r, dict) and isinstance(r.get("ha_area_id"), str) and r["ha_area_id"]
    }

    create_rooms: list[dict[str, Any]] = []
    rename_rooms: list[dict[str, Any]] = []

    for area_id, area_name in area_name_by_id.items():
        if area_id not in room_by_area:
            create_rooms.append({"room_id": room_id_for_area(area_id), "name": area_name, "ha_area_id": area_id})
        else:
            r = room_by_area[area_id]
            cur_name = r.get("name")
            if isinstance(cur_name, str) and cur_name and cur_name != area_name:
                eligible = r.get("name_mode") != "manual"
                rename_rooms.append({"room_id": r.get("id"), "ha_area_id": area_id, "from": cur_name, "to": area_name, "eligible": eligible})

    assignments = meta.get("assignments") if isinstance(meta, dict) else {}
    assignments = assignments if isinstance(assignments, dict) else {}
    entities = snapshot.get("entities") if isinstance(snapshot, dict) else {}
    entities = entities if isinstance(entities, dict) else {}

    suggest_room: list[dict[str, Any]] = []
    for eid, e in entities.items():
        if not isinstance(eid, str) or not _ENTITY_ID_RE.match(eid):
            continue
        if not isinstance(e, dict):
            continue
        area_id = e.get("area_id")
        if not isinstance(area_id, str) or not area_id:
            continue
        target_room_id = room_by_area[area_id].get("id") if area_id in room_by_area else room_id_for_area(area_id)
        cur = assignments.get(eid) or {}
        if not isinstance(cur, dict):
            continue
        if cur.get("room_mode") == "manual":
            continue
        if cur.get("room_id") == target_room_id:
            continue
        suggest_room.append({"entity_id": eid, "from_room_id": cur.get("room_id"), "to_room_id": target_room_id, "reason": "ha_area"})

    return {
        "has_changes": bool(create_rooms or rename_rooms or suggest_room),
        "rooms": {"create": create_rooms, "rename": rename_rooms},
        "assignments": {"suggest_room": suggest_room},
        "stats": {"create_rooms": len(create_rooms), "rename_rooms": len(rename_rooms), "suggest_room": len(suggest_room)},
    }


def apply_pending_diff(
    meta_store: dict[str, Any],
    diff: dict[str, Any],
    *,
    apply_mode: str = "auto",
) -> dict[str, Any]:
    if apply_mode not in ("auto", "all"):
        apply_mode = "auto"
    meta = (meta_store or {}).get("meta")
    if not isinstance(meta, dict):
        return meta_store

    rooms = meta.setdefault("rooms", [])
    if not isinstance(rooms, list):
        rooms = []
        meta["rooms"] = rooms
    room_by_id: dict[str, dict[str, Any]] = {
        r["id"]: r for r in rooms if isinstance(r, dict) and isinstance(r.get("id"), str)
    }

    for it in ((diff or {}).get("rooms") or {}).get("create") or []:
        if not isinstance(it, dict):
            continue
        rid = it.get("room_id")
        if not isinstance(rid, str) or not rid or rid in room_by_id:
            continue
        nm = it.get("name") or rid
        aid = it.get("ha_area_id")
        room_obj = {"id": rid, "name": nm, "ha_area_id": aid if isinstance(aid, str) else None, "mode": "auto", "name_mode": "auto"}
        rooms.append(room_obj)
        room_by_id[rid] = room_obj

    for it in ((diff or {}).get("rooms") or {}).get("rename") or []:
        if not isinstance(it, dict):
            continue
        rid = it.get("room_id")
        to = it.get("to")
        if apply_mode == "auto" and not it.get("eligible"):
            continue
        if not isinstance(rid, str) or not isinstance(to, str) or not rid or not to:
            continue
        r = room_by_id.get(rid)
        if r:
            r["name"] = to

    assignments = meta.setdefault("assignments", {})
    if not isinstance(assignments, dict):
        assignments = {}
        meta["assignments"] = assignments

    for it in ((diff or {}).get("assignments") or {}).get("suggest_room") or []:
        if not isinstance(it, dict):
            continue
        eid = it.get("entity_id")
        to_room_id = it.get("to_room_id")
        if not isinstance(eid, str) or not _ENTITY_ID_RE.match(eid):
            continue
        if not isinstance(to_room_id, str) or not to_room_id:
            continue
        cur = assignments.setdefault(eid, {})
        if not isinstance(cur, dict):
            continue
        if apply_mode == "auto" and cur.get("room_mode") == "manual":
            continue
        cur["room_id"] = to_room_id
        cur.setdefault("room_mode", "auto")

    return meta_store
