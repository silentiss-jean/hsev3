"""
HSE V3 — GET /api/hse/scan   : entités HA détectées non encore dans le catalogue.
          POST /api/hse/scan  : force un nouveau scan et retourne le résultat (bouton Re-scanner).
Supporte filtrage par domain et recherche textuelle.
"""
from __future__ import annotations

from http import HTTPStatus

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...catalogue.scan_engine import async_scan_hass
from ...sensors.quality_scorer import score_item


class HseScanView(HseBaseView):
    url = "/api/hse/scan"
    name = "api:hse:scan"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    # ------------------------------------------------------------------
    # Helpers partagés GET / POST
    # ------------------------------------------------------------------

    async def _build_response(self, request: web.Request) -> web.Response:
        """Logique commune : scan HA → filtre → pagine → retourne JSON."""
        domain_filter = request.query.get("domain")
        q = (request.query.get("q") or "").lower().strip()
        try:
            page = max(1, int(request.query.get("page", 1)))
            per_page = min(200, max(1, int(request.query.get("per_page", 50))))
        except (ValueError, TypeError):
            return self.json_error("Params page/per_page invalides", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        scan = await async_scan_hass(self.hass)

        # IDs déjà dans le catalogue
        known_ids: set[str] = set()
        for item in (catalogue.get("items") or {}).values():
            if isinstance(item, dict):
                eid = (item.get("source") or {}).get("entity_id")
                if eid:
                    known_ids.add(eid)

        candidates = scan.get("candidates") or []
        result = []
        for c in candidates:
            eid = c.get("entity_id") or ""
            if eid in known_ids:
                continue
            if domain_filter and not eid.startswith(f"{domain_filter}."):
                continue
            if q and q not in eid.lower() and q not in (c.get("friendly_name") or "").lower():
                continue

            state_obj = self.hass.states.get(eid)
            ha_state_raw = getattr(state_obj, "state", None) if state_obj else None

            # Item synthétique pour quality_scorer
            attrs = (getattr(state_obj, "attributes", {}) or {}) if state_obj else {}
            synthetic_item = {
                "source": {
                    "entity_id": eid,
                    "kind": c.get("kind"),
                    "unit": attrs.get("unit_of_measurement"),
                    "device_class": attrs.get("device_class"),
                    "state_class": attrs.get("state_class"),
                    "last_seen_state": ha_state_raw,
                }
            }
            quality_score_int = score_item(synthetic_item, ha_state_raw)

            status_str = c.get("status") or ""
            result.append({
                "entity_id": eid,
                "name": attrs.get("friendly_name") or eid,
                "domain": eid.split(".")[0] if "." in eid else "",
                "device": c.get("device_id"),
                "integration": c.get("integration_label") or c.get("platform") or "unknown",
                "quality_score": quality_score_int,
                "suggested_action": "select" if status_str == "ok" else "review",
            })

        total = len(result)
        start = (page - 1) * per_page
        return self.json_ok({
            "total": total,
            "page": page,
            "per_page": per_page,
            "items": result[start:start + per_page],
        })

    # ------------------------------------------------------------------
    # GET  /api/hse/scan
    # ------------------------------------------------------------------

    async def get(self, request: web.Request) -> web.Response:
        return await self._build_response(request)

    # ------------------------------------------------------------------
    # POST /api/hse/scan  — bouton Re-scanner
    # Force un nouveau scan (même logique que GET, sans cache)
    # ------------------------------------------------------------------

    async def post(self, request: web.Request) -> web.Response:
        return await self._build_response(request)
