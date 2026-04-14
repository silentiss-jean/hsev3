"""
HSE V3 — Meta : store (lecture/écriture via HseStorageManager).

Ce module expose des helpers haut niveau pour charger et sauvegarder
le store meta (pièces, types, assignations) sans manipuler le
StorageManager directement depuis les views.
"""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from ..time_utils import utc_now_iso


async def async_load_meta(hass: HomeAssistant) -> dict[str, Any]:
    """
    Charge le store meta complet.
    Retourne toujours un dict valide (défaut si store absent ou corrompu).
    """
    from ..storage.manager import HseStorageManager
    return await HseStorageManager(hass).async_load_meta()


async def async_save_meta(hass: HomeAssistant, data: dict[str, Any]) -> None:
    """
    Sauvegarde le store meta complet.
    Les erreurs sont absorbées et loggées (jamais propagées).
    """
    from ..storage.manager import HseStorageManager
    await HseStorageManager(hass).async_save_meta(data)


async def async_get_rooms(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Retourne la liste des pièces depuis le store meta."""
    data = await async_load_meta(hass)
    meta = (data or {}).get("meta") or {}
    rooms = meta.get("rooms") if isinstance(meta, dict) else []
    return rooms if isinstance(rooms, list) else []


async def async_get_types(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Retourne la liste des types d'appareils depuis le store meta."""
    data = await async_load_meta(hass)
    meta = (data or {}).get("meta") or {}
    types = meta.get("types") if isinstance(meta, dict) else []
    return types if isinstance(types, list) else []


async def async_get_assignments(hass: HomeAssistant) -> dict[str, Any]:
    """Retourne le dict d'assignations entity_id → {room_id, type_id, …}."""
    data = await async_load_meta(hass)
    meta = (data or {}).get("meta") or {}
    assignments = meta.get("assignments") if isinstance(meta, dict) else {}
    return assignments if isinstance(assignments, dict) else {}


async def async_patch_meta(
    hass: HomeAssistant,
    *,
    rooms: list[dict[str, Any]] | None = None,
    types: list[dict[str, Any]] | None = None,
    assignments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Merge partiel sur le store meta.
    Seuls les arguments fournis (non None) sont écrasés.
    Retourne le store complet après merge.
    """
    data = await async_load_meta(hass)
    meta = data.setdefault("meta", {})
    if not isinstance(meta, dict):
        meta = {}
        data["meta"] = meta

    if rooms is not None:
        meta["rooms"] = rooms
    if types is not None:
        meta["types"] = types
    if assignments is not None:
        meta["assignments"] = assignments

    meta["updated_at"] = utc_now_iso()
    await async_save_meta(hass, data)
    return data
