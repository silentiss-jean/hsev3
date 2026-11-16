"""
HSE V3 — StorageManager

Point d'accès unique à tous les stores HA natifs HSE.
Utilise homeassistant.helpers.storage.Store (fichiers JSON dans .storage/).

Stores gérés :
  hse.catalogue   → catalogue des capteurs
  hse.meta        → pièces, types, assignations
  hse.user_prefs  → préférences UI (règle R4 — jamais localStorage)
  hse.settings    → tarif + capteur de référence (DELTA-009)

Règle : tous les async_save_* retournent True si la sauvegarde a réussi, False sinon.
Les erreurs sont loggées et propagées sous forme de retour False (le UI doit pouvoir
afficher un échec explicite au lieu d'un faux saved: true).
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
# Doit correspondre exactement à _SETTINGS_KEYS dans api/views/settings.py
_SETTINGS_DEFAULTS: dict[str, Any] = {
    "schema_version": 1,
    "mode": "flat",                  # flat | hphc
    # Tarif fixe
    "price_ht_kwh": 0.0,
    "price_ttc_kwh": 0.25,
    # HP/HC
    "price_hp_ht_kwh": 0.0,
    "price_hp_ttc_kwh": 0.0,
    "price_hc_ht_kwh": 0.0,
    "price_hc_ttc_kwh": 0.0,
    # Plage horaire HC
    "hc_start": "22:00",
    "hc_end": "06:00",
    # Abonnement & fiscalité
    "subscription_eur_month": 0.0,
    "tax_rate_pct": 20.0,
    # Capteur de référence (DELTA-064 Q2)
    "reference_entity_id": None,
    # Index kWh du compteur général (V3.1)
    "reference_energy_entity_id": None,
}


# DELTA-038 : fonction publique exportée — appelée par _svc_reset_settings dans __init__.py
def default_settings() -> dict[str, Any]:
    """Retourne une copie des settings par défaut (immuable)."""
    return dict(_SETTINGS_DEFAULTS)


# DELTA-044 : fonctions publiques exportées — appelées par _svc_reset_catalogue
# et _svc_reset_meta dans __init__.py (même pattern que default_settings)
def default_catalogue() -> dict[str, Any]:
    """Proxy vers catalogue.schema.default_catalogue() — exporté depuis manager pour usage uniforme."""
    from ..catalogue.schema import default_catalogue as _default_catalogue
    return _default_catalogue()


def default_meta() -> dict[str, Any]:
    """Proxy vers meta.schema.default_meta() — exporté depuis manager pour usage uniforme."""
    from ..meta.schema import default_meta as _default_meta
    return _default_meta()


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
        store = self._catalogue_store()
        data = await store.async_load()
        if isinstance(data, dict) and data.get("schema_version") == 1 and "items" in data:
            # D3 — vocabulaire de statut unifié : `normal` (ancienne valeur
            # écrite par catalogue/defaults.py) devient `pending`, seule valeur
            # attendue par le frontend, group_totals et migration.
            # D4 — `enrichment.active` est la projection d'affichage de
            # `triage.policy` (catalogue.py:183 les synchronise déjà à
            # l'écriture). Les catalogues antérieurs laissent `active=false` sur
            # des items pourtant `selected` : on réaligne au chargement.
            # `policy` reste l'unique source de vérité pour les calculs
            # (costs.py / group_totals.py ne lisent que `policy`).
            # Migration auto-hérissante et idempotente : rien à lancer, le
            # catalogue stocké est réécrit une fois puis ne bouge plus.
            changed = False
            for item in (data.get("items") or {}).values():
                if not isinstance(item, dict):
                    continue
                triage = item.get("triage")
                if isinstance(triage, dict) and triage.get("policy") == "normal":
                    triage["policy"] = "pending"
                    changed = True
                if isinstance(triage, dict):
                    enrichment = item.get("enrichment")
                    if not isinstance(enrichment, dict):
                        enrichment = {}
                        item["enrichment"] = enrichment
                    expected_active = triage.get("policy") == "selected"
                    if bool(enrichment.get("active", False)) != expected_active:
                        enrichment["active"] = expected_active
                        changed = True
            if changed:
                try:
                    await self._catalogue_store().async_save(data)
                except Exception:
                    _LOGGER.exception("HSE: échec normalisation statut catalogue")
            return data
        return default_catalogue()

    async def async_save_catalogue(self, data: dict[str, Any]) -> bool:
        try:
            await self._catalogue_store().async_save(data)
            return True
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde catalogue")
            return False

    # ────────────────────────────────────────────────────────────
    # Meta (pièces, types, assignations)
    # ────────────────────────────────────────────────────────────

    def _meta_store(self) -> Store:
        return Store(self._hass, _STORE_VERSION, STORAGE_KEY_META)

    async def async_load_meta(self) -> dict[str, Any]:
        store = self._meta_store()
        data = await store.async_load()
        if isinstance(data, dict) and data.get("schema_version") == 1 and "meta" in data and "sync" in data:
            return data
        return default_meta()

    async def async_save_meta(self, data: dict[str, Any]) -> bool:
        try:
            await self._meta_store().async_save(data)
            return True
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde meta")
            return False

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

    async def async_save_settings(self, data: dict[str, Any]) -> bool:
        try:
            await self._settings_store().async_save(data)
            return True
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde settings")
            return False

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

    async def async_patch_user_prefs(self, patch: dict[str, Any]) -> dict[str, Any] | None:
        """
        Merge partiel (règle 9 du contrat API).
        Retourne l'objet complet après merge, ou None en cas d'échec de sauvegarde.
        """
        current = await self.async_load_user_prefs()
        for k, v in patch.items():
            if k in USER_PREFS_DEFAULTS:
                current[k] = v
        try:
            await self._prefs_store().async_save(current)
            return current
        except Exception:
            _LOGGER.exception("HSE: échec sauvegarde user_prefs")
            return None
