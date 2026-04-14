"""
HSE V3 — StorageManager

Point d'accès unique à tous les stores HA natifs HSE.
Utilise homeassistant.helpers.storage.Store (fichiers JSON dans .storage/).

Stores gérés :
  hse.catalogue   → catalogue des capteurs
  hse.meta        → pièces, types, assignations
  hse.user_prefs  → préférences UI (règle R4 — jamais localStorage)
  hse.settings    → tarif + capteur de référence (DELTA-009)

Règle : tous les async_save_* retournent None et ne lèvent pas.
Les erreurs sont loggées, jamais propagées (le UI ne doit pas crasher pour un échec de sauvegarde).
"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from ..const import (
    STORAGE_KEY_CATALOGUE,
    STORAGE_KEY_META,
    STORAGE_KEY_USER_PREFS,
    STORAGE_KEY_SETTINGS,
    USER_PREFS_DEFAULTS,
)

_LOGGER = logging.getLogger(__name__)

_STORE_VERSION = 1

# Shape par défaut des settings (tarif + capteur référence)
_SETTINGS_DEFAULTS: dict[str, Any] = {
    "schema_version": 1,
    "mode": "flat",                  # flat | hphc
    "price_ht_kwh": 0.0,
    "price_ttc_kwh": 0.25,
    "price_hp_ttc_kwh": None,
    "price_hc_ttc_kwh": None,
    "subscription_eur_month": 0.0,
    "tax_rate_pct": 20.0,
    "reference_entity_id": None,     # capteur de référence (DELTA-009)
}


# DELTA-038 : fonction publique exportée — appelée par _svc_reset_settings dans __init__.py
def default_settings() -> dict[str, Any]:
    """Retourne une copie des settings par défaut (immuable)."""
    return dict(_SETTINGS_DEFAULTS)


class HseStorageManager:
    """
    Wrapper autour des 4 stores HA natifs HSE.
    Instancié à la demande (pas de singleton global) — léger, pas d'état interne.
    """

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    # ────────────────────────────────────────────────────────────
    # Catalogue
    # ────────────────────────────────────────────────────────────

    def _catalogue_store(self) -> Store:
        return Store(self._hass, _STORE_VERSION, STORAGE_KEY_CATALOGUE)

    async def async_load_catalogue(self) -> dict[str, Any]:
        from ..catalogue.schema import default_catalogue
        store = self._catalogue_store()
        data = await store.async_load()
        if isinstance(data, dict) and data.get("schema_version") == 1 and "items" in data:
            return data
        return default_catalogue()

    async def async_save_catalogue(self, data: dict[str, Any]) -> None:
        try:
            await self._catalogue_store().async_save(data)
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde catalogue")

    # ────────────────────────────────────────────────────────────
    # Meta (pièces, types, assignations)
    # ────────────────────────────────────────────────────────────

    def _meta_store(self) -> Store:
        return Store(self._hass, _STORE_VERSION, STORAGE_KEY_META)

    async def async_load_meta(self) -> dict[str, Any]:
        from ..meta.schema import default_meta
        store = self._meta_store()
        data = await store.async_load()
        if isinstance(data, dict) and data.get("schema_version") == 1 and "meta" in data and "sync" in data:
            return data
        return default_meta()

    async def async_save_meta(self, data: dict[str, Any]) -> None:
        try:
            await self._meta_store().async_save(data)
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde meta")

    # ────────────────────────────────────────────────────────────
    # User prefs (règle R4 — jamais localStorage)
    # ────────────────────────────────────────────────────────────

    def _prefs_store(self) -> Store:
        return Store(self._hass, _STORE_VERSION, STORAGE_KEY_USER_PREFS)

    async def async_load_user_prefs(self) -> dict[str, Any]:
        store = self._prefs_store()
        data = await store.async_load()
        result = dict(USER_PREFS_DEFAULTS)
        if isinstance(data, dict):
            for k in USER_PREFS_DEFAULTS:
                if k in data:
                    result[k] = data[k]
        return result

    async def async_patch_user_prefs(self, patch: dict[str, Any]) -> dict[str, Any]:
        """
        Merge partiel (règle 9 du contrat API).
        Retourne l'objet complet après merge.
        """
        current = await self.async_load_user_prefs()
        for k, v in patch.items():
            if k in USER_PREFS_DEFAULTS:
                current[k] = v
        await self._prefs_store().async_save(current)
        return current

    # ────────────────────────────────────────────────────────────
    # Settings (tarif + capteur référence)
    # ────────────────────────────────────────────────────────────

    def _settings_store(self) -> Store:
        return Store(self._hass, _STORE_VERSION, STORAGE_KEY_SETTINGS)

    async def async_load_settings(self) -> dict[str, Any]:
        store = self._settings_store()
        data = await store.async_load()
        result = dict(_SETTINGS_DEFAULTS)
        if isinstance(data, dict):
            for k in _SETTINGS_DEFAULTS:
                if k in data:
                    result[k] = data[k]
        return result

    async def async_save_settings(self, data: dict[str, Any]) -> None:
        try:
            await self._settings_store().async_save(data)
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde settings")
