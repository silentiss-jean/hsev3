"""
HSE V3 — Endpoints user_prefs (Règle R4 — jamais localStorage)
GET   /api/hse/user_prefs  — lit les préférences (toujours les champs complets)
PATCH /api/hse/user_prefs  — merge partiel (règle 9 du contrat API)
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...const import USER_PREFS_DEFAULTS

_VALID_TABS = ("overview", "diagnostic", "scan", "config", "custom", "cards", "migration", "costs")
_VALID_PERIODS = ("day", "week", "month", "year")
_VALID_FIELDS = set(USER_PREFS_DEFAULTS.keys())


class HseUserPrefsView(HseBaseView):
    url = "/api/hse/user_prefs"
    name = "api:hse:user_prefs"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        prefs = await mgr.async_load_user_prefs()
        return self.json_ok(prefs)

    async def patch(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        # Validation des champs
        unknown = set(body.keys()) - _VALID_FIELDS
        if unknown:
            return self.json_error(f"Champs inconnus : {sorted(unknown)}", HTTPStatus.UNPROCESSABLE_ENTITY)

        # Validation des valeurs enum
        if "active_tab" in body and body["active_tab"] not in _VALID_TABS:
            return self.json_error(f"active_tab invalide. Valeurs: {_VALID_TABS}", HTTPStatus.UNPROCESSABLE_ENTITY)
        for period_field in ("overview_period", "costs_period"):
            if period_field in body and body[period_field] not in _VALID_PERIODS:
                return self.json_error(f"{period_field} invalide. Valeurs: {_VALID_PERIODS}", HTTPStatus.UNPROCESSABLE_ENTITY)
        for bool_field in ("glassmorphism", "dynamic_bg"):
            if bool_field in body and not isinstance(body[bool_field], bool):
                return self.json_error(f"{bool_field} doit être un booléen", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        updated = await mgr.async_patch_user_prefs(body)
        return self.json_ok(updated)
