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
from ...engine.cost import cost_summary, cost_eur, subscription_eur_month, subscription_prorata
from ...engine.period_stats import async_energy_detail, async_energy_detail_hphc, async_energy_for_period
from ...engine.reference import energy_coverage
from ...engine.sources import plan_sources
from ...engine.analytics import async_history_12months
from ...time_utils import utc_now_iso

_VALID_PERIODS = ("day", "week", "month", "year")


def _period_label() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# DELTA-033d : logique extraite de HseCostsView.get() pour être appelable
# directement par HseExportView sans simuler une requête HTTP.
async def _build_costs_data(
    hass: HomeAssistant,
    period: str,
) -> dict:
    mgr = HseStorageManager(hass)
    catalogue = await mgr.async_load_catalogue()
    settings = await mgr.async_load_settings()
    meta_store = await mgr.async_load_meta()
    assignments = (meta_store.get("meta") or {}).get("assignments") or {}
    rooms_meta = (meta_store.get("meta") or {}).get("rooms") or []
    room_name_by_id = {
        r["id"]: r.get("name", r["id"])
        for r in rooms_meta
        if isinstance(r, dict) and r.get("id")
    }

    items = catalogue.get("items") or {}
    selected = [
        item for item in items.values()
        if isinstance(item, dict)
        and (item.get("triage") or {}).get("policy") == "selected"
    ]

    ref_ids = [
        r for r in (settings.get("reference_entity_id"), settings.get("reference_energy_entity_id")) if r
    ]
    states = {
        (it.get("source") or {}).get("entity_id"): hass.states.get((it.get("source") or {}).get("entity_id"))
        for it in selected if (it.get("source") or {}).get("entity_id")
    }
    plan = plan_sources(selected, states, reference_entity_id=ref_ids)
    is_hphc = (settings.get("mode") or "flat").lower() == "hphc"
    hc_start = settings.get("hc_start")
    hc_end = settings.get("hc_end")
    if is_hphc and hc_start and hc_end:
        detail = await async_energy_detail_hphc(hass, plan.energy_sources, period, hc_start=hc_start, hc_end=hc_end)
    else:
        detail = await async_energy_detail(hass, plan.energy_sources, period)
    excluded = {x["entity_id"]: x["reason"] for x in plan.excluded}

    result_items = []
    total_kwh = 0.0
    total_hp_kwh = 0.0
    total_hc_kwh = 0.0
    total_ttc = 0.0

    for item in selected:
        src = item.get("source") or {}
        eid = src.get("entity_id")
        if not eid or eid in plan.reference_ids:
            continue
        state_obj = hass.states.get(eid)
        pw = get_power_w(state_obj) or 0.0
        d = detail.get(eid)
        if is_hphc and hc_start and hc_end and d:
            hp_kwh = d["hp_kwh"]
            hc_kwh = d["hc_kwh"]
            en = hp_kwh + hc_kwh
            cost_hp = cost_summary(hp_kwh, settings, is_hc=False)
            cost_hc = cost_summary(hc_kwh, settings, is_hc=True)
            cost_ttc_eur = round(cost_hp["cost_ttc_eur"] + cost_hc["cost_ttc_eur"], 2)
            cost_ht_eur = round(cost_hp["cost_ht_eur"] + cost_hc["cost_ht_eur"], 2)
            energy_kwh = en
            method = d["method"]
            quality = d["quality"]
        else:
            en = d["kwh"] if d else 0.0
            cost = cost_summary(en, settings)
            cost_ttc_eur = cost["cost_ttc_eur"]
            cost_ht_eur = cost["cost_ht_eur"]
            energy_kwh = en
            hp_kwh = None
            hc_kwh = None
            method = d["method"] if d else "excluded"
            quality = d["quality"] if d else "excluded"
        asn = assignments.get(eid) or {}
        room_id = asn.get("room_id")
        friendly = (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid
        result_items.append({
            "entity_id": eid,
            "name": friendly,
            "room": room_name_by_id.get(room_id, room_id) if room_id else None,
            "type": asn.get("type_id"),
            "power_w": int(pw),
            "energy_kwh": energy_kwh,
            "hp_kwh": hp_kwh,
            "hc_kwh": hc_kwh,
            "cost_ht_eur": cost_ht_eur,
            "cost_ttc_eur": cost_ttc_eur,
            "pct_total": 0.0,
            "method": method,
            "quality": quality,
            "excluded_reason": excluded.get(eid),
        })
        total_kwh += en
        total_hp_kwh += (hp_kwh or 0.0)
        total_hc_kwh += (hc_kwh or 0.0)
        total_ttc += cost_ttc_eur

    for it in result_items:
        it["pct_total"] = round(it["cost_ttc_eur"] / total_ttc * 100, 1) if total_ttc > 0 else 0.0

    # Abonnement ajouté une seule fois (pas par appareil), proratisé selon la période
    sub_prorata = subscription_prorata(settings, period)
    total_ttc += sub_prorata

    # ── Q7 / D1 (2026-11-16) — réconciliation avec le compteur de référence ─────
    # L'index Linky donne la consommation facturable. On la compare au total mesuré
    # par les appareils : delta_kwh < 0 (mesuré > référence) signale un doublon,
    # une conversion d'unité fausse ou un capteur figé — la facture ne peut pas
    # être inférieure au mesuré. Le compteur de référence est déjà exclu du total
    # (plan.reference_ids), donc il n'est jamais compté deux fois.
    ref_energy_id = settings.get("reference_energy_entity_id") or None
    reference: dict = {
        "entity_id": ref_energy_id,
        "status": "no_reference",
        "reference_kwh": None,
        "reference_eur": None,
        "tracked_kwh": round(total_kwh, 3),
        "delta_kwh": None,
        "surplus_kwh": None,
        "untracked_kwh": None,
        "coverage_pct": None,
    }
    if ref_energy_id:
        if is_hphc and hc_start and hc_end:
            rd = (await async_energy_detail_hphc(
                hass, [ref_energy_id], period, hc_start=hc_start, hc_end=hc_end
            )).get(ref_energy_id)
            ref_kwh = rd["total_kwh"] if rd and rd["quality"] != "missing" else None
        else:
            rd = (await async_energy_detail(hass, [ref_energy_id], period)).get(ref_energy_id)
            ref_kwh = rd["kwh"] if rd and rd["quality"] != "missing" else None
        if ref_kwh is None:
            reference["status"] = "reference_unavailable"
        else:
            reference.update(energy_coverage(ref_kwh, total_kwh))
            reference["entity_id"] = ref_energy_id
            reference["reference_eur"] = round(
                cost_summary(ref_kwh, settings, include_subscription=False)["cost_ttc_eur"]
                + sub_prorata,
                2,
            )

    result_items.sort(key=lambda x: -x["cost_ttc_eur"])

    return {
        "period": period,
        "generated_at": utc_now_iso(),
        "total_kwh": round(total_kwh, 3),
        "total_hp_kwh": round(total_hp_kwh, 3),
        "total_hc_kwh": round(total_hc_kwh, 3),
        "total_ttc_eur": round(total_ttc, 2),
        "items": result_items,
        "reference": reference,
    }


class HseCostsView(HseBaseView):
    url = "/api/hse/costs"
    name = "api:hse:costs"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        period = request.query.get("period", "month")
        if period not in _VALID_PERIODS:
            return self.json_error(
                f"period invalide. Valeurs: {_VALID_PERIODS}",
                HTTPStatus.UNPROCESSABLE_ENTITY,
            )
        data = await _build_costs_data(self.hass, period)
        return self.json_ok(data)


class HseHistoryView(HseBaseView):
    url = "/api/hse/history"
    name = "api:hse:history"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        entity_id = request.query.get("entity_id") or None
        granularity = request.query.get("granularity", "month")
        if granularity not in ("month", "week"):
            return self.json_error(
                "granularity doit être month ou week",
                HTTPStatus.UNPROCESSABLE_ENTITY,
            )

        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()

        if entity_id:
            catalogue = await mgr.async_load_catalogue()
            items = catalogue.get("items") or {}
            known = any(
                (v.get("source") or {}).get("entity_id") == entity_id
                for v in items.values()
                if isinstance(v, dict)
            )
            if not known:
                return self.json_error(
                    f"{entity_id} inconnu du catalogue",
                    HTTPStatus.NOT_FOUND,
                )

        result = await async_history_12months(self.hass, entity_id, granularity=granularity)

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
            return self.json_error(
                f"period invalide. Valeurs: {_VALID_PERIODS}",
                HTTPStatus.UNPROCESSABLE_ENTITY,
            )
        if fmt not in ("csv", "json"):
            return self.json_error(
                "format doit être csv ou json",
                HTTPStatus.UNPROCESSABLE_ENTITY,
            )

        # DELTA-033d : appel direct à _build_costs_data — plus de mock-request HTTP
        data = await _build_costs_data(self.hass, period)
        filename = f"hse_export_{period}_{_period_label()}.{fmt}"

        if fmt == "json":
            return web.Response(
                text=json.dumps(data, ensure_ascii=False, indent=2),
                content_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "entity_id", "name", "room", "type",
                "power_w", "energy_kwh", "cost_ht_eur", "cost_ttc_eur", "pct_total",
            ],
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
