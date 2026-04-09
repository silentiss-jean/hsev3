"""
HSE V3 — sensors/sync_manager.py
Source : sensor_sync_manager.py V1 (épuré).

Orchestre le cycle complet :
  1. Scan HA (catalogue/scan_engine.py)
  2. Merge dans le catalogue (catalogue/manager.py)
  3. Sync meta/rooms depuis areas HA (meta/sync.py)
  4. Sauvegarde via storage/manager.py

Peut être appelé :
  - Au démarrage (async_setup_entry)
  - Sur déclenchement manuel (POST /api/hse/catalogue/refresh)
  - En réponse à l'event hse_sensors_ready
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

# Lock global par instance HA — évite les scans concurrents
_SCAN_LOCKS: dict[str, asyncio.Lock] = {}


def _get_lock(entry_id: str) -> asyncio.Lock:
    if entry_id not in _SCAN_LOCKS:
        _SCAN_LOCKS[entry_id] = asyncio.Lock()
    return _SCAN_LOCKS[entry_id]


async def async_run_full_sync(
    hass: HomeAssistant,
    entry_id: str,
    *,
    offline_grace_s: int = 900,
) -> dict[str, Any]:
    """
    Cycle complet : scan → merge catalogue → sync meta → save.

    Retourne
    --------
    { scanned: int, merged: int, already_running: bool }
    """
    lock = _get_lock(entry_id)
    if lock.locked():
        return {"scanned": 0, "merged": 0, "already_running": True}

    async with lock:
        try:
            return await _do_sync(hass, offline_grace_s=offline_grace_s)
        except Exception:
            _LOGGER.exception("HSE SyncManager: erreur cycle complet")
            return {"scanned": 0, "merged": 0, "already_running": False}


async def _do_sync(
    hass: HomeAssistant,
    *,
    offline_grace_s: int,
) -> dict[str, Any]:
    from ..catalogue.scan_engine import async_scan_hass
    from ..catalogue.manager import merge_scan_into_catalogue
    from ..meta.sync import async_build_ha_snapshot, compute_pending_diff, apply_pending_diff
    from ..storage.manager import HseStorageManager

    mgr = HseStorageManager(hass)

    # 1. Chargement des données persistées
    catalogue = await mgr.async_load_catalogue()
    meta_store = await mgr.async_load_meta()

    # 2. Scan HA
    scan_result = await async_scan_hass(hass)
    scanned = len((scan_result.get("candidates") or []))

    # 3. Merge scan → catalogue
    catalogue = merge_scan_into_catalogue(
        catalogue, scan_result, offline_grace_s=offline_grace_s
    )
    merged = len((catalogue.get("items") or {}))

    # 4. Sync meta rooms depuis areas HA
    snapshot = await async_build_ha_snapshot(hass, catalogue)
    diff = compute_pending_diff(meta_store, snapshot)
    if diff.get("has_changes"):
        meta_store = apply_pending_diff(meta_store, diff, apply_mode="auto")

    # 5. Sauvegarde
    await mgr.async_save_catalogue(catalogue)
    await mgr.async_save_meta(meta_store)

    _LOGGER.debug(
        "HSE SyncManager: scan=%d merged=%d rooms_changes=%s",
        scanned, merged, diff.get("has_changes"),
    )
    return {"scanned": scanned, "merged": merged, "already_running": False}
