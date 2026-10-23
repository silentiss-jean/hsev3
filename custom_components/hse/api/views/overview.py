"""
HSE V3 — GET /api/hse/overview
Puissance live, conso, top5, totaux par pièce et par type.
Polling 30s côté front.

V3.1 — fiabilisation :
  - les capteurs sont qualifiés (engine/sources.py) : W et kWh ne sont jamais mélangés,
    pas de double comptage appareil/compteur, compteurs périodiques ignorés ;
  - l'énergie par période vient des statistiques long terme (engine/period_stats.py),
    en calendrier LOCAL ;
  - le compteur général (ZLinky…) sert de référence : couverture + cohérence ;
  - un bloc `quality` explique d'où vient chaque chiffre (champs existants inchangés).
"""
from __future__ import annotations

from http import HTTPStatus  # noqa: F401  (compat)

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager
from ...engine.calculation import compute_totals, top_n_by_power, get_power_w, read_sensor
from ...engine.cost import cost_summary
from ...engine.period_stats import async_energy_detail
from ...engine.group_totals import totals_by_type
from ...engine.reference import coverage, energy_coverage
from ...engine.sources import plan_sources
from ...time_utils import utc_now_iso

_PERIODS = ("day", "week", "month", "year")


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
        selected_items = [
            item for item in items.values()
            if isinstance(item, dict)
            and (item.get("triage") or {}).get("policy") == "selected"
            and isinstance(item.get("source"), dict)
            and item["source"].get("entity_id")
        ]
        selected_ids = [i["source"]["entity_id"] for i in selected_items]

        ref_power_id = settings.get("reference_entity_id")
        ref_energy_id = settings.get("reference_energy_entity_id")
        ref_ids = [r for r in (ref_power_id, ref_energy_id) if r]

        states = {eid: self.hass.states.get(eid) for eid in {*selected_ids, *ref_ids}}
        plan = plan_sources(selected_items, states, reference_entity_id=ref_ids)

        # ── Puissance instantanée (appareils uniquement, référence exclue) ─────────────
        totals = compute_totals(plan.live_power, states)
        top5_raw = top_n_by_power(plan.live_power, states, n=5)
        top5 = []
        for entry in top5_raw:
            state_obj = states.get(entry["entity_id"])
            name = (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or entry["entity_id"]
            top5.append({**entry, "name": name})

        # ── Énergie par période ──────────────────────────────────────────────────
        periods: dict[str, dict] = {}
        method_count: dict[str, int] = {}
        missing_ids: set[str] = set()
        energy_cov: dict[str, dict] = {}
        for p in _PERIODS:
            detail = await async_energy_detail(self.hass, plan.energy_sources, p)
            total_kwh = round(sum(d["kwh"] for d in detail.values()), 3)
            periods[p] = {"kwh": total_kwh, "eur": cost_summary(total_kwh, settings)["cost_ttc_eur"]}
            for eid, d in detail.items():
                method_count[d["method"]] = method_count.get(d["method"], 0) + 1
                if d["quality"] == "missing":
                    missing_ids.add(eid)
            if ref_energy_id:
                rd = (await async_energy_detail(self.hass, [ref_energy_id], p)).get(ref_energy_id)
                ref_kwh = rd["kwh"] if rd and rd["quality"] != "missing" else None
                energy_cov[p] = energy_coverage(ref_kwh, total_kwh)
                periods[p]["reference_kwh"] = ref_kwh
                periods[p]["reference_eur"] = (
                    cost_summary(ref_kwh, settings)["cost_ttc_eur"] if ref_kwh is not None else None
                )

        # ── Pièces ─────────────────────────────────────────────────────────────
        assignments = (meta.get("meta") or {}).get("assignments") or {}
        rooms_meta = (meta.get("meta") or {}).get("rooms") or []
        room_name_by_id = {
            r["id"]: r.get("name", r["id"])
            for r in rooms_meta if isinstance(r, dict) and r.get("id")
        }
        by_room: dict[str, float] = {}
        for eid in plan.live_power:
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

        # ── Compteur de référence ─────────────────────────────────────────────
        reference_sensor = None
        power_cov = coverage(None, total_w)
        ref_reading = read_sensor(self.hass.states.get(ref_power_id)) if ref_power_id else None
        if ref_reading is not None and ref_reading.kind == "power" and ref_reading.value is not None:
            power_cov = coverage(ref_reading.value, total_w)
            delta_w = ref_reading.value - total_w
            reference_sensor = {
                "entity_id": ref_power_id,
                "power_w": round(ref_reading.value, 1),
                "delta_w": round(delta_w, 1),
                "delta_pct": round(delta_w / ref_reading.value * 100, 1) if ref_reading.value else 0.0,
                "coverage_pct": power_cov["coverage_pct"],
                "status": power_cov["status"],
            }
        elif ref_reading is not None:
            reference_sensor = {
                "entity_id": ref_power_id, "power_w": None, "delta_w": None, "delta_pct": None,
                "coverage_pct": None, "status": "reference_unusable", "reason": ref_reading.reason,
            }

        # ── Qualité globale ─────────────────────────────────────────────────────
        notes: list[str] = []
        level = "ok"
        if (settings.get("mode") or "flat").lower() == "hphc":
            notes.append("hphc_costs_at_hp_rate")  # le split HP/HC n'est pas encore calculé
            level = "warning"
        if not ref_ids:
            notes.append("no_reference_configured")
            level = "warning"
        if plan.excluded or missing_ids:
            level = "warning"
        if (power_cov["status"] == "tracked_exceeds_ref"
                or any(c["status"] == "tracked_exceeds_ref" for c in energy_cov.values())):
            level = "error"
            notes.append("tracked_exceeds_reference")
        if totals["count_ok"] == 0 and not plan.energy_sources:
            level = "warning"

        quality = {
            "level": level,
            "notes": notes,
            "sources": {
                "live_power": len(plan.live_power),
                "energy_meter": len(plan.energy_meter),
                "energy_from_power": len(plan.energy_from_power),
            },
            "methods": method_count,
            "excluded": plan.excluded,
            "warnings": plan.warnings,
            "missing_energy": sorted(missing_ids),
            "rejected_live": totals.get("rejected", []),
            "coverage_power": power_cov,
            "coverage_energy": energy_cov,
        }

        # états sans référence pour les regroupements par type (anti double comptage)
        states_devices = {k: v for k, v in states.items() if k not in ref_ids}

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
            "reference_consumption": {
                p: {"kwh": periods[p].get("reference_kwh"), "eur": periods[p].get("reference_eur")}
                for p in _PERIODS
            } if ref_energy_id else None,
            "top5": top5,
            "by_room": by_room_list,
            "by_type": totals_by_type(catalogue, meta, states_devices),
            "quality": quality,
            "status": {
                "level": "ok" if totals["count_ok"] > 0 else "warning",
                "message": None if totals["count_ok"] > 0 else "Aucun capteur actif",
            },
            "generated_at": utc_now_iso(),
        })
