"""
HSE V3 — Endpoints settings
GET /api/hse/settings/pricing  — contrat tarifaire actuel
PUT /api/hse/settings/pricing  — mise à jour complète
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager

_VALID_MODES = ("flat", "hphc")


class HseSettingsPricingView(HseBaseView):
    url = "/api/hse/settings/pricing"
    name = "api:hse:settings:pricing"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()
        return self.json_ok({
            "mode": settings.get("mode", "flat"),
            # Tarif fixe (Base)
            "price_ht_kwh": settings.get("price_ht_kwh", 0.0),
            "price_ttc_kwh": settings.get("price_ttc_kwh", 0.25),
            # Heures Pleines / Heures Creuses — DELTA-065
            "price_hp_ht_kwh": settings.get("price_hp_ht_kwh", 0.0),
            "price_hp_ttc_kwh": settings.get("price_hp_ttc_kwh", 0.0),
            "price_hc_ht_kwh": settings.get("price_hc_ht_kwh", 0.0),
            "price_hc_ttc_kwh": settings.get("price_hc_ttc_kwh", 0.0),
            # Plage horaire HC — DELTA-065
            "hc_start": settings.get("hc_start", "22:00"),
            "hc_end": settings.get("hc_end", "06:00"),
            # Abonnement & fiscalité
            "subscription_eur_month": settings.get("subscription_eur_month", 0.0),
            "tax_rate_pct": settings.get("tax_rate_pct", 20.0),
            # DELTA-064 Q2 : capteur de référence (DELTA-009)
            "reference_entity_id": settings.get("reference_entity_id"),
        })

    async def put(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        mode = body.get("mode", "flat")
        if mode not in _VALID_MODES:
            return self.json_error(f"mode invalide. Valeurs: {_VALID_MODES}", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()

        for field in (
            "mode",
            # Tarif fixe
            "price_ht_kwh", "price_ttc_kwh",
            # HP/HC — DELTA-065
            "price_hp_ht_kwh", "price_hp_ttc_kwh",
            "price_hc_ht_kwh", "price_hc_ttc_kwh",
            # Plage horaire HC — DELTA-065
            "hc_start", "hc_end",
            # Abonnement & fiscalité
            "subscription_eur_month", "tax_rate_pct",
            # DELTA-064 Q2 : capteur de référence (DELTA-009)
            "reference_entity_id",
        ):
            if field in body:
                settings[field] = body[field]

        await mgr.async_save_settings(settings)
        return self.json_ok({"saved": True})
