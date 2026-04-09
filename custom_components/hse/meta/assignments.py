"""
HSE V3 — Meta : logique d'assignation capteur → pièce / type.

Responsabilités :
  - Lire / écrire les assignations depuis le store meta
  - Appliquer une assignation manuelle (room_mode="manual" ou type_mode="manual")
  - Appliquer en masse un diff calculé par sync.compute_pending_diff()
  - Aucune dépendance directe sur HomeAssistant — les helpers reçoivent
    le store meta déjà chargé pour rester testables sans HA
"""
from __future__ import annotations

import re
from typing import Any

_ENTITY_ID_RE = re.compile(r"^[a-z_]+\.[a-z0-9_]+$")


# ──────────────────────────────────────────────────────────────────────────────
# Helpers purs (sans I/O)
# ──────────────────────────────────────────────────────────────────────────────

def get_assignment(meta_store: dict[str, Any], entity_id: str) -> dict[str, Any]:
    """Retourne l'assignation d'une entité (dict vide si absente)."""
    meta = (meta_store or {}).get("meta") or {}
    assignments = meta.get("assignments") if isinstance(meta, dict) else {}
    if not isinstance(assignments, dict):
        return {}
    return assignments.get(entity_id) or {}


def set_room(
    meta_store: dict[str, Any],
    entity_id: str,
    room_id: str,
    *,
    manual: bool = True,
) -> dict[str, Any]:
    """
    Assigne une pièce à une entité.
    manual=True → room_mode="manual" (protégé contre le sync auto).
    Retourne le meta_store modifié (in-place).
    """
    if not _ENTITY_ID_RE.match(entity_id):
        raise ValueError(f"entity_id invalide : {entity_id!r}")
    meta = meta_store.setdefault("meta", {})
    assignments = meta.setdefault("assignments", {})
    cur = assignments.setdefault(entity_id, {})
    cur["room_id"] = room_id
    cur["room_mode"] = "manual" if manual else "auto"
    return meta_store


def set_type(
    meta_store: dict[str, Any],
    entity_id: str,
    type_id: str,
    *,
    manual: bool = True,
) -> dict[str, Any]:
    """
    Assigne un type d'appareil à une entité.
    manual=True → type_mode="manual" (protégé contre les règles auto).
    Retourne le meta_store modifié (in-place).
    """
    if not _ENTITY_ID_RE.match(entity_id):
        raise ValueError(f"entity_id invalide : {entity_id!r}")
    meta = meta_store.setdefault("meta", {})
    assignments = meta.setdefault("assignments", {})
    cur = assignments.setdefault(entity_id, {})
    cur["type_id"] = type_id
    cur["type_mode"] = "manual" if manual else "auto"
    return meta_store


def clear_assignment(
    meta_store: dict[str, Any],
    entity_id: str,
    *,
    field: str = "both",
) -> dict[str, Any]:
    """
    Supprime l'assignation room et/ou type pour une entité.
    field : "room" | "type" | "both"
    """
    meta = (meta_store or {}).get("meta") or {}
    assignments = meta.get("assignments") if isinstance(meta, dict) else {}
    if not isinstance(assignments, dict) or entity_id not in assignments:
        return meta_store
    cur = assignments[entity_id]
    if field in ("room", "both"):
        cur.pop("room_id", None)
        cur.pop("room_mode", None)
    if field in ("type", "both"):
        cur.pop("type_id", None)
        cur.pop("type_mode", None)
    if not cur:
        del assignments[entity_id]
    return meta_store


def apply_bulk_assignments(
    meta_store: dict[str, Any],
    items: list[dict[str, Any]],
    *,
    manual: bool = False,
) -> tuple[dict[str, Any], list[str]]:
    """
    Applique une liste d'assignations en masse.
    Chaque item : {"entity_id": str, "room_id"?: str, "type_id"?: str}
    Retourne (meta_store modifié, liste des entity_id ignorés pour format invalide).
    """
    skipped: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            skipped.append("<non-dict>")
            continue
        eid = item.get("entity_id")
        if not isinstance(eid, str) or not _ENTITY_ID_RE.match(eid):
            skipped.append(str(eid))
            continue
        if "room_id" in item and isinstance(item["room_id"], str):
            set_room(meta_store, eid, item["room_id"], manual=manual)
        if "type_id" in item and isinstance(item["type_id"], str):
            set_type(meta_store, eid, item["type_id"], manual=manual)
    return meta_store, skipped


def list_unassigned_entities(
    meta_store: dict[str, Any],
    entity_ids: list[str],
    *,
    field: str = "room",
) -> list[str]:
    """
    Retourne les entity_id (parmi la liste fournie) sans assignation
    pour le champ demandé ("room" | "type" | "both").
    """
    meta = (meta_store or {}).get("meta") or {}
    assignments = meta.get("assignments") if isinstance(meta, dict) else {}
    assignments = assignments if isinstance(assignments, dict) else {}
    result: list[str] = []
    for eid in entity_ids:
        cur = assignments.get(eid) or {}
        missing_room = field in ("room", "both") and not cur.get("room_id")
        missing_type = field in ("type", "both") and not cur.get("type_id")
        if (field == "both" and (missing_room or missing_type)) or \
           (field == "room" and missing_room) or \
           (field == "type" and missing_type):
            result.append(eid)
    return result
