"""
HSE V3 — Endpoints settings
GET  /api/hse/settings           — config complète (référence + pricing)
PUT  /api/hse/settings           — mise à jour partielle (toute clé settings acceptée)
GET  /api/hse/settings/pricing   — alias : bloc pricing uniquement (rétrocompat)
PUT  /api/hse/settings/pricing   — alias : mise à jour pricing uniquement (rétrocompat)
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager

_VALID_MODES = ("flat", "hphc")

# Source de vérité unique des clés settings acceptées en GET/PUT.
# Toute clé ajoutée ici doit aussi être documentée dans ROADMAP_TO_PROD.md §8.
_SETTINGS_KEYS = (
    "mode",
    # Tarif fixe
    "price_ht_kwh", "price_ttc_kwh",
    # HP/HC
    "price_hp_ht_kwh", "price_hp_ttc_kwh",
    "price_hc_ht_kwh", "price_hc_ttc_kwh",
    # Plage horaire HC
    "hc_start", "hc_end",
    # Abonnement & fiscalité
    "subscription_eur_month", "tax_rate_pct",
    # Capteur de référence (DELTA-064 Q2)
    "reference_entity_id",
)


def _serialize_settings(settings: dict) -> dict:
    """Sérialise un dict settings en payload complet avec défauts."""
    return {
        "mode": settings.get("mode", "flat"),
        "price_ht_kwh": settings.get("price_ht_kwh", 0.0),
        "price_ttc_kwh": settings.get("price_ttc_kwh", 0.25),
        "price_hp_ht_kwh": settings.get("price_hp_ht_kwh", 0.0),
        "price_hp_ttc_kwh": settings.get("price_hp_ttc_kwh", 0.0),
        "price_hc_ht_kwh": settings.get("price_hc_ht_kwh", 0.0),
        "price_hc_ttc_kwh": settings.get("price_hc_ttc_kwh", 0.0),
        "hc_start": settings.get("hc_start", "22:00"),
        "hc_end": settings.get("hc_end", "06:00"),
        "subscription_eur_month": settings.get("subscription_eur_month", 0.0),
        "tax_rate_pct": settings.get("tax_rate_pct", 20.0),
        "reference_entity_id": settings.get("reference_entity_id"),
    }


async def _apply_settings_update(hass: HomeAssistant, body: dict) -> tuple[dict, dict | None]:
    """Applique un PUT partiel. Retourne (settings_mis_à_jour, erreur_ou_None)."""
    if "mode" in body and body["mode"] not in _VALID_MODES:
        return {}, {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"mode invalide. Valeurs: {_VALID_MODES}"}

    unknown = [k for k in body.keys() if k not in _SETTINGS_KEYS]
    if unknown:
        return {}, {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"Clés inconnues: {unknown}. Autorisées: {_SETTINGS_KEYS}"}

    mgr = HseStorageManager(hass)
    settings = await mgr.async_load_settings()
    for field in _SETTINGS_KEYS:
        if field in body:
            settings[field] = body[field]
    await mgr.async_save_settings(settings)
    return settings, None


class HseSettingsView(HseBaseView):
    """GET/PUT /api/hse/settings — config complète (référence + pricing)."""
    url = "/api/hse/settings"
    name = "api:hse:settings"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()
        return self.json_ok(_serialize_settings(settings))

    async def put(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        settings, err = await _apply_settings_update(self.hass, body)
        if err:
            return self.json_error(err["message"], err["status"])
        return self.json_ok({"saved": True, "settings": _serialize_settings(settings)})


class HseSettingsPricingView(HseBaseView):
    """GET/PUT /api/hse/settings/pricing — alias historique (rétrocompat frontend)."""
    url = "/api/hse/settings/pricing"
    name = "api:hse:settings:pricing"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()
        full = _serialize_settings(settings)
        # Bloc pricing uniquement (rétrocompat frontend existant)
        return self.json_ok({k: full[k] for k in (
            "mode", "price_ht_kwh", "price_ttc_kwh",
            "price_hp_ht_kwh", "price_hp_ttc_kwh",
            "price_hc_ht_kwh", "price_hc_ttc_kwh",
            "hc_start", "hc_end",
            "subscription_eur_month", "tax_rate_pct",
            "reference_entity_id",
        )})

    async def put(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        settings, err = await _apply_settings_update(self.hass, body)
        if err:
            return self.json_error(err["message"], err["status"])
        return self.json_ok({"saved": True})
