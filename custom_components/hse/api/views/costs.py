"""
HSE V3 — Endpoints conso/coûts
GET /api/hse/costs    — coûts par appareil (polling 60s)
GET /api/hse/history  — historique 12 mois
GET /api/hse/export   — export CSV ou JSON
"""
from __future__ import annotations

import csv
import io
import json
from http import HTTPStatus

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...engine.calculation import get_power_w
from ...engine.cost import cost_summary, cost_eur
from ...engine.period_stats import async_energy_for_period
from ...engine.analytics import async_history_12months
from ...time_utils import utc_now_iso

_VALID_PERIODS = ("day", "week", "month", "year")


def _period_label() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class HseCostsView(HseBaseView):
    url = "/api/hse/costs"
    name = "api:hse:costs"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        period = request.query.get("period", "month")
        if period not in _VALID_PERIODS:
            return self.json_error(f"period invalide. Valeurs: {_VALID_PERIODS}", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        settings = await mgr.async_load_settings()
        meta_store = await mgr.async_load_meta()
        assignments = (meta_store.get("meta") or {}).get("assignments") or {}
        rooms_meta = (meta_store.get("meta") or {}).get("rooms") or []
        room_name_by_id = {r["id"]: r.get("name", r["id"]) for r in rooms_meta if isinstance(r, dict) and r.get("id")}

        items = catalogue.get("items") or {}
        selected = [
            item for item in items.values()
            if isinstance(item, dict)
            and (item.get("triage") or {}).get("policy") == "selected"
        ]

        # Calcul énergie sur la période demandée via recorder
        selected_eids = [
            (item.get("source") or {}).get("entity_id")
            for item in selected
            if (item.get("source") or {}).get("entity_id")
        ]
        energy_map = await async_energy_for_period(
            hass=self.hass,
            entity_ids=selected_eids,
            period=period,
        )

        result_items = []
        total_kwh = 0.0
        total_ttc = 0.0

        for item in selected:
            src = item.get("source") or {}
            eid = src.get("entity_id")
            if not eid:
                continue
            state_obj = self.hass.states.get(eid)
            pw = get_power_w(state_obj) or 0.0
            en = energy_map.get(eid, 0.0)
            cost = cost_summary(en, settings)
            asn = assignments.get(eid) or {}
            room_id = asn.get("room_id")
            friendly = (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid
            result_items.append({
                "entity_id": eid,
                "name": friendly,
                "room": room_name_by_id.get(room_id, room_id) if room_id else None,
                "type": asn.get("type_id"),
                "power_w": int(pw),
                "energy_kwh": cost["energy_kwh"],
                "cost_ht_eur": cost["cost_ht_eur"],
                "cost_ttc_eur": cost["cost_ttc_eur"],
                "pct_total": 0.0,  # calculé après
            })
            total_kwh += en
            total_ttc += cost["cost_ttc_eur"]

        # Calcul des pourcentages
        for it in result_items:
            it["pct_total"] = round(it["cost_ttc_eur"] / total_ttc * 100, 1) if total_ttc > 0 else 0.0

        result_items.sort(key=lambda x: -x["cost_ttc_eur"])

        return self.json_ok({
            "period": period,
            "generated_at": utc_now_iso(),
            "total_kwh": round(total_kwh, 3),
            "total_ttc_eur": round(total_ttc, 2),
            "items": result_items,
        })


class HseHistoryView(HseBaseView):
    url = "/api/hse/history"
    name = "api:hse:history"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        entity_id = request.query.get("entity_id") or None
        granularity = request.query.get("granularity", "month")
        if granularity not in ("month", "week"):
            return self.json_error("granularity doit être month ou week", HTTPStatus.UNPROCESSABLE_ENTITY)

        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()

        if entity_id:
            catalogue = await mgr.async_load_catalogue()
            items = catalogue.get("items") or {}
            known = any(
                (v.get("source") or {}).get("entity_id") == entity_id
                for v in items.values() if isinstance(v, dict)
            )
            if not known:
                return self.json_error(f"{entity_id} inconnu du catalogue", HTTPStatus.NOT_FOUND)

        result = await async_history_12months(self.hass, entity_id, granularity=granularity)

        # Enrichissement eur_ttc par point (analytics retourne eur_ttc=0.0)
        for pt in result.get("points", []):
            kwh = pt.get("kwh", 0.0)
            pt["eur_ttc"] = round(cost_eur(kwh, settings)["ttc"], 2)

        return self.json_ok(result)


class HseExportView(HseBaseView):
    url = "/api/hse/export"
    name = "api:hse:export"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        period = request.query.get("period", "month")
        fmt = request.query.get("format", "csv")

        if period not in _VALID_PERIODS:
            return self.json_error(f"period invalide. Valeurs: {_VALID_PERIODS}", HTTPStatus.UNPROCESSABLE_ENTITY)
        if fmt not in ("csv", "json"):
            return self.json_error("format doit être csv ou json", HTTPStatus.UNPROCESSABLE_ENTITY)

        # Réutilise la logique de HseCostsView
        mock_request = type("R", (), {"query": {"period": period}})()  # type: ignore[misc]
        costs_view = HseCostsView(self.hass)
        costs_resp = await costs_view.get(mock_request)  # type: ignore[arg-type]
        data = json.loads(costs_resp.text)

        filename = f"hse_export_{period}_{_period_label()}.{fmt}"

        if fmt == "json":
            return web.Response(
                text=json.dumps(data, ensure_ascii=False, indent=2),
                content_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        # CSV
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=["entity_id", "name", "room", "type", "power_w", "energy_kwh", "cost_ht_eur", "cost_ttc_eur", "pct_total"],
            extrasaction="ignore",
        )
        writer.writeheader()
        for row in data.get("items", []):
            writer.writerow(row)

        return web.Response(
            text=output.getvalue(),
            content_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
