"""
HSE V3 — GET + POST /api/hse/diagnostic
Score qualité, capteurs, alertes Repairs, statistiques storage.
POST déclenche un nouveau diagnostic (réponse immédiate, travail async).
"""
from __future__ import annotations

import uuid
from http import HTTPStatus

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...time_utils import utc_now_iso


class HseDiagnosticView(HseBaseView):
    url = "/api/hse/diagnostic"
    name = "api:hse:diagnostic"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self._running = False

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        # DELTA-033b : ne compter que les items valides (dict) pour éviter
        # un score_pct biaisé si un item corrompu est présent dans le store.
        valid_items = {
            k: v for k, v in items.items() if isinstance(v, dict)
        }
        total = len(valid_items)

        selected = sum(
            1 for it in valid_items.values()
            if (it.get("triage") or {}).get("policy") == "selected"
        )
        ignored = sum(
            1 for it in valid_items.values()
            if (it.get("triage") or {}).get("policy") == "ignored"
        )
        pending = total - selected - ignored

        sensors_out = []
        ok_count = 0
        for item_id, item in valid_items.items():
            src = item.get("source") or {}
            eid = src.get("entity_id") or item_id

            state_obj = self.hass.states.get(eid)
            friendly = (
                (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid
            )

            health = item.get("health") or {}
            escalation = health.get("escalation") or "none"
            issues = []
            if escalation == "warning_15m":
                issues.append("Indisponible depuis plus de 15 min")
            elif escalation == "error_24h":
                issues.append("Indisponible depuis plus de 24h")
            elif escalation == "action_48h":
                issues.append("Indisponible depuis plus de 48h — action requise")
            status = "ok" if not issues else ("error" if "48h" in (issues[0] if issues else "") else "warning")
            if status == "ok":
                ok_count += 1
            sensors_out.append({
                "entity_id": eid,
                "name": friendly,
                "status": status,
                "issues": issues,
            })

        score_pct = int(ok_count / total * 100) if total > 0 else 100

        return self.json_ok({
            "score_pct": score_pct,
            "sensors": sensors_out,
            "repairs": [],
            "storage_stats": {
                "total": total,
                "selected": selected,
                "ignored": ignored,
                "pending": pending,
            },
            "last_run_at": catalogue.get("generated_at"),
        })

    async def post(self, request: web.Request) -> web.Response:
        if self._running:
            return self.json_error("Diagnostic déjà en cours", HTTPStatus.CONFLICT)

        run_id = str(uuid.uuid4())

        async def _run() -> None:
            self._running = True
            try:
                mgr = HseStorageManager(self.hass)
                from ...catalogue.scan_engine import async_scan_hass
                from ...catalogue.manager import merge_scan_into_catalogue
                scan = await async_scan_hass(self.hass)
                catalogue = await mgr.async_load_catalogue()
                updated = merge_scan_into_catalogue(catalogue, scan)
                await mgr.async_save_catalogue(updated)
            finally:
                self._running = False

        self.hass.async_create_task(_run())
        return self.json_ok({"started": True, "run_id": run_id})
