"""
HSE V3 — GET /api/hse/scan
Entités HA détectées non encore présentes dans le catalogue.
Supporte filtrage par domain et recherche textuelle.
"""
from __future__ import annotations

from http import HTTPStatus

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...catalogue.scan_engine import async_scan_hass


class HseScanView(HseBaseView):
    url = "/api/hse/scan"
    name = "api:hse:scan"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
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
            result.append({
                "entity_id": eid,
                "name": (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid,
                "domain": eid.split(".")[0] if "." in eid else "",
                "device": c.get("device_id"),
                "quality_score": c.get("status"),
                "suggested_action": "select" if c.get("status") == "ok" else "review",
            })

        total = len(result)
        start = (page - 1) * per_page
        return self.json_ok({
            "total": total,
            "page": page,
            "per_page": per_page,
            "items": result[start:start + per_page],
        })
