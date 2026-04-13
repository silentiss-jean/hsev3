"""
HSE V3 — GET /api/hse/overview
Puissance live, conso, top5, totaux par pièce et par type.
Polling 30s côté front.
"""
from __future__ import annotations

from http import HTTPStatus

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...engine.calculation import compute_totals, top_n_by_power
from ...engine.cost import cost_summary
from ...engine.period_stats import async_energy_for_period
from ...engine.group_totals import totals_by_type
from ...time_utils import utc_now_iso


class HseOverviewView(HseBaseView):
    url = "/api/hse/overview"
    name = "api:hse:overview"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        settings = await mgr.async_load_settings()
        meta = await mgr.async_load_meta()

        items = catalogue.get("items") or {}
        # Seules les entités "selected" participent aux calculs
        selected_ids = [
            item["source"]["entity_id"]
            for item in items.values()
            if isinstance(item, dict)
            and (item.get("triage") or {}).get("policy") == "selected"
            and isinstance(item.get("source"), dict)
            and item["source"].get("entity_id")
        ]

        states = {eid: self.hass.states.get(eid) for eid in selected_ids}
        totals = compute_totals(selected_ids, states)
        top5_raw = top_n_by_power(selected_ids, states, n=5)

        # Enrichissement top5 avec nom lisible
        top5 = []
        for entry in top5_raw:
            eid = entry["entity_id"]
            state_obj = states.get(eid)
            name = (
                (getattr(state_obj, "attributes", {}) or {}).get("friendly_name")
                or eid
            )
            top5.append({**entry, "name": name})

        # Calcul énergie réelle par période via recorder
        periods: dict[str, dict] = {}
        for p in ("day", "week", "month", "year"):
            kwh_map = await async_energy_for_period(
                hass=self.hass, entity_ids=selected_ids, period=p
            )
            total_kwh = round(sum(kwh_map.values()), 3)
            periods[p] = {
                "kwh": total_kwh,
                "eur": cost_summary(total_kwh, settings)["cost_ttc_eur"],
            }

        # Groupement par pièce
        assignments = (meta.get("meta") or {}).get("assignments") or {}
        rooms_meta = (meta.get("meta") or {}).get("rooms") or []
        room_name_by_id = {r["id"]: r.get("name", r["id"]) for r in rooms_meta if isinstance(r, dict) and r.get("id")}

        by_room: dict[str, float] = {}
        for eid in selected_ids:
            from ...engine.calculation import get_power_w
            pw = get_power_w(states.get(eid))
            if pw is None or pw <= 0:
                continue
            room_id = (assignments.get(eid) or {}).get("room_id") or "unknown"
            by_room[room_id] = by_room.get(room_id, 0.0) + pw

        total_w = totals.get("power_w") or 0.0
        by_room_list = [
            {
                "room": room_name_by_id.get(rid, rid),
                "power_w": round(pw, 1),
                "pct": round(pw / total_w * 100, 1) if total_w > 0 else 0.0,
            }
            for rid, pw in sorted(by_room.items(), key=lambda x: -x[1])
        ]

        # Capteur de référence
        ref_entity_id = settings.get("reference_entity_id")
        reference_sensor = None
        if ref_entity_id:
            from ...engine.calculation import get_power_w
            ref_state = self.hass.states.get(ref_entity_id)
            ref_pw = get_power_w(ref_state)
            if ref_pw is not None:
                delta_w = ref_pw - (totals.get("power_w") or 0.0)
                reference_sensor = {
                    "entity_id": ref_entity_id,
                    "power_w": round(ref_pw, 1),
                    "delta_w": round(delta_w, 1),
                    "delta_pct": round(delta_w / ref_pw * 100, 1) if ref_pw != 0 else 0.0,
                }

        return self.json_ok({
            "power_now_w": int(totals.get("power_w") or 0),
            "reference_sensor": reference_sensor,
            "consumption": {
                "today_kwh": periods["day"]["kwh"],
                "today_eur": periods["day"]["eur"],
                "week_kwh": periods["week"]["kwh"],
                "week_eur": periods["week"]["eur"],
                "month_kwh": periods["month"]["kwh"],
                "month_eur": periods["month"]["eur"],
                "year_kwh": periods["year"]["kwh"],
                "year_eur": periods["year"]["eur"],
            },
            "top5": top5,
            "by_room": by_room_list,
            "by_type": totals_by_type(catalogue, meta, states),
            "status": {
                "level": "ok" if totals["count_ok"] > 0 else "warning",
                "message": None if totals["count_ok"] > 0 else "Aucun capteur actif",
            },
            "generated_at": utc_now_iso(),
        })
