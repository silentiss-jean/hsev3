"""
HSE V3 — Vue de base pour tous les endpoints.

Règles (hse_v3_synthese.md §4, 10_api_contrat.md) :
- requires_auth = True  → 401 automatique si token absent/invalide (géré par HA)
- cors_allowed  = False → pas d'accès cross-origin
- Toutes les views héritent de HseBaseView, jamais directement de HomeAssistantView
- Réponses d'erreur : code HTTP + {"message": "..."} (format HA natif)
"""
from __future__ import annotations

import json
from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant


class HseBaseView(HomeAssistantView):
    """
    Classe de base HSE — hérite de HomeAssistantView avec les contraintes V3.
    Fournit des helpers json_ok() / json_error() pour uniformiser les réponses.
    """

    # ── Sécurité (NON NÉGOCIABLE — hse_v3_synthese.md §4) ──────────────────
    requires_auth: bool = True
    cors_allowed: bool = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    # ── Helpers réponse ─────────────────────────────────────────────────────

    @staticmethod
    def json_ok(data: Any, status: HTTPStatus = HTTPStatus.OK) -> web.Response:
        """Réponse 2xx avec payload JSON."""
        return web.Response(
            text=json.dumps(data, default=str),
            status=status.value,
            content_type="application/json",
        )

    @staticmethod
    def json_error(message: str, status: HTTPStatus) -> web.Response:
        """Réponse d'erreur au format HA natif : code HTTP + {"message": "..."}."""
        return web.Response(
            text=json.dumps({"message": message}),
            status=status.value,
            content_type="application/json",
        )
