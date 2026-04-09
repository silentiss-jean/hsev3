"""
HSE V3 — GET /api/hse/frontend_manifest
Retourne la version, le domaine, les onglets et les feature flags.
Utilisé par le shell JS au démarrage pour configurer le panel.
"""
from __future__ import annotations

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...const import DOMAIN, VERSION


class HseFrontendManifestView(HseBaseView):
    url = "/api/hse/frontend_manifest"
    name = "api:hse:frontend_manifest"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        # Import lazy pour éviter les cycles et respecter la règle DELTA-010
        try:
            from ...frontend_manifest import HSE_TABS, HSE_FEATURES, HSE_REQUIRE_ADMIN
        except ImportError:
            HSE_TABS = ["overview", "diagnostic", "scan", "config", "custom", "cards", "migration", "costs"]
            HSE_FEATURES = {}
            HSE_REQUIRE_ADMIN = True

        return self.json_ok({
            "version": VERSION,
            "domain": DOMAIN,
            "tabs": HSE_TABS,
            "features": HSE_FEATURES,
            "require_admin": HSE_REQUIRE_ADMIN,
        })
