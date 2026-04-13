"""
HSE V3 — GET /api/hse/ping

Healthcheck léger. Répond sans accès au Storage ni aux moteurs.
Permet au frontend de vérifier que le backend est actif au boot du panel.

Contrat (10_api_contrat.md) :
  GET /api/hse/ping
  → 200 { status: "ok", version: str, domain: "hse" }
  → 401 si token absent/invalide (géré par HA via requires_auth=True)
"""
from __future__ import annotations

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...const import DOMAIN, VERSION


class HsePingView(HseBaseView):
    """GET /api/hse/ping — healthcheck."""

    url = "/api/hse/ping"
    name = "api:hse:ping"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        """Retourne le statut et la version du backend HSE."""
        return self.json_ok({
            "status": "ok",
            "version": VERSION,
            "domain": DOMAIN,
        })
