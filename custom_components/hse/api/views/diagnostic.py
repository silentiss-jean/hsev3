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
from ...engine.measure import read_state
from ...engine.reference import find_reference_candidates
from ...engine.sources import plan_sources
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

        # V3.1 — santé des MESURES (unités, rôle, double comptage) + compteur général
        settings = await mgr.async_load_settings()
        ref_ids = [r for r in (settings.get("reference_entity_id"),
                               settings.get("reference_energy_entity_id")) if r]
        selected_items = [
            it for it in valid_items.values()
            if (it.get("triage") or {}).get("policy") == "selected"
        ]
        st_map = {
            (it.get("source") or {}).get("entity_id"): self.hass.states.get((it.get("source") or {}).get("entity_id"))
            for it in selected_items if (it.get("source") or {}).get("entity_id")
        }
        plan = plan_sources(selected_items, st_map, reference_entity_id=ref_ids)
        roles: dict[str, str] = {}
        for e in plan.live_power:
            roles[e] = "power_live"
        for e in plan.energy_meter:
            roles[e] = "energy_meter"
        for e in plan.energy_from_power:
            roles[e] = "power_live+energy_integrated"
        for e in plan.reference_ids:
            roles[e] = "reference"
        excluded = {x["entity_id"]: x["reason"] for x in plan.excluded}
        warned: dict[str, list[str]] = {}
        for w in plan.warnings:
            warned.setdefault(w["entity_id"], []).append(w["code"])
        measures = []
        for eid, st in st_map.items():
            r = read_state(st)
            measures.append({
                "entity_id": eid,
                "kind": r.kind,
                "unit": r.unit,
                "value": r.value,
                "role": roles.get(eid, "excluded"),
                "reason": excluded.get(eid) or r.reason,
                "warnings": warned.get(eid, []),
            })
        measures.sort(key=lambda m: (m["role"] == "excluded", m["entity_id"]))

        entries = []
        for st in self.hass.states.async_all("sensor"):
            a = st.attributes or {}
            entries.append({
                "entity_id": st.entity_id, "name": a.get("friendly_name"),
                "unit": a.get("unit_of_measurement"), "device_class": a.get("device_class"),
                "state_class": a.get("state_class"), "state": st.state, "platform": None,
            })
        reference_candidates = find_reference_candidates(entries)

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
            "measures": measures,
            "reference": {
                "configured": ref_ids,
                "candidates": reference_candidates,
            },
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
