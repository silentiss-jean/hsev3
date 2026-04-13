"""
HSE V3 — engine/group_totals.py
Source : group_totals.py V1 (réintégré + épuré).

Calcul des totaux de puissance et d'énergie groupés par :
  - pièce (room)  → via meta.assignments
  - type d'appareil (type) → via meta.assignments

Dépendances : engine/calculation.py (get_power_w, get_energy_kwh)
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from .calculation import get_power_w, get_energy_kwh


def _items_by_status(
    catalogue: dict[str, Any],
    status_filter: str | None = "selected",
) -> list[dict[str, Any]]:
    """
    Retourne les items du catalogue dont le triage.policy == status_filter.
    Si status_filter est None, retourne tous les items.
    """
    items = (catalogue.get("items") or {}).values()
    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        if status_filter is None:
            result.append(item)
            continue
        policy = (item.get("triage") or {}).get("policy") or "pending"
        if policy == status_filter:
            result.append(item)
    return result


def _entity_id_of(item: dict[str, Any]) -> str | None:
    src = item.get("source")
    if isinstance(src, dict):
        return src.get("entity_id")
    return item.get("entity_id")


# ────────────────────────────────────────────────────────────────────────────
# API publique
# ────────────────────────────────────────────────────────────────────────────

def totals_by_room(
    catalogue: dict[str, Any],
    meta_store: dict[str, Any],
    states: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Retourne les totaux de puissance (W) par pièce.

    Retourne
    --------
    list[{ room_id, room_name, power_w, pct }]  — trié par power_w desc
    """
    meta = (meta_store.get("meta") or {}) if isinstance(meta_store, dict) else {}
    assignments: dict[str, Any] = meta.get("assignments") or {}
    rooms_list: list[dict[str, Any]] = meta.get("rooms") or []
    room_name_by_id: dict[str, str] = {
        r["id"]: r.get("name", r["id"])
        for r in rooms_list
        if isinstance(r, dict) and r.get("id")
    }

    power_by_room: dict[str, float] = defaultdict(float)

    for item in _items_by_status(catalogue, "selected"):
        eid = _entity_id_of(item)
        if not eid:
            continue
        room_id = (assignments.get(eid) or {}).get("room_id") or "__unassigned__"
        pw = get_power_w(states.get(eid))
        if pw is not None:
            power_by_room[room_id] += pw

    total_w = sum(power_by_room.values())
    result = []
    for room_id, pw in sorted(power_by_room.items(), key=lambda x: x[1], reverse=True):
        pct = round((pw / total_w * 100), 1) if total_w > 0 else 0.0
        name = room_name_by_id.get(room_id, room_id)
        result.append({"room_id": room_id, "room": name, "power_w": round(pw, 1), "pct": pct})
    return result


def totals_by_type(
    catalogue: dict[str, Any],
    meta_store: dict[str, Any],
    states: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Retourne les totaux de puissance (W) par type d'appareil.

    Retourne
    --------
    list[{ type_id, type_name, power_w, pct }]  — trié par power_w desc
    """
    meta = (meta_store.get("meta") or {}) if isinstance(meta_store, dict) else {}
    assignments: dict[str, Any] = meta.get("assignments") or {}

    power_by_type: dict[str, float] = defaultdict(float)

    for item in _items_by_status(catalogue, "selected"):
        eid = _entity_id_of(item)
        if not eid:
            continue
        type_id = (assignments.get(eid) or {}).get("type_id") or "__untyped__"
        pw = get_power_w(states.get(eid))
        if pw is not None:
            power_by_type[type_id] += pw

    total_w = sum(power_by_type.values())
    result = []
    for type_id, pw in sorted(power_by_type.items(), key=lambda x: x[1], reverse=True):
        pct = round((pw / total_w * 100), 1) if total_w > 0 else 0.0
        label = type_id if type_id != "__untyped__" else "Non classé"
        result.append({"type_id": type_id, "type": label, "power_w": round(pw, 1), "pct": pct})
    return result


def costs_by_entity(
    catalogue: dict[str, Any],
    meta_store: dict[str, Any],
    states: dict[str, Any],
    energy_map: dict[str, float],
    settings: dict[str, Any],
    period_label: str = "month",
) -> list[dict[str, Any]]:
    """
    Retourne un tableau de coûts par entité pour l'endpoint GET /api/hse/costs.

    Paramètres
    ----------
    energy_map : dict[entity_id → kwh]
        Énergie consommée sur la période, issue de async_energy_for_period().
        DOIT être calculée avant l'appel (pas d'accès recorder ici — module sync).

    Retourne
    --------
    list[{ entity_id, name, room, type, power_w, energy_kwh, cost_ht_eur, cost_ttc_eur, pct_total }]
    """
    from .cost import cost_eur

    meta = (meta_store.get("meta") or {}) if isinstance(meta_store, dict) else {}
    assignments: dict[str, Any] = meta.get("assignments") or {}
    rooms_list: list[dict[str, Any]] = meta.get("rooms") or []
    room_name_by_id: dict[str, str] = {
        r["id"]: r.get("name", r["id"])
        for r in rooms_list
        if isinstance(r, dict) and r.get("id")
    }

    rows: list[dict[str, Any]] = []
    total_kwh_all = 0.0

    for item in _items_by_status(catalogue, "selected"):
        if not isinstance(item, dict):
            continue
        eid = _entity_id_of(item)
        if not eid:
            continue

        # Puissance temps réel depuis hass.states (affichage colonne W)
        pw = get_power_w(states.get(eid))

        # Énergie sur la période depuis le recorder (passée via energy_map)
        energy = energy_map.get(eid, 0.0)

        if energy == 0.0 and pw is None:
            continue

        total_kwh_all += energy
        costs = cost_eur(energy, settings)

        assign = assignments.get(eid) or {}
        room_id = assign.get("room_id") or "__unassigned__"
        type_id = assign.get("type_id") or "__untyped__"

        naming = (item.get("enrichment") or {}).get("naming") or {}
        name = naming.get("display_name") or eid

        rows.append({
            "entity_id": eid,
            "name": name,
            "room": room_name_by_id.get(room_id, room_id),
            "type": type_id,
            "power_w": round(pw, 1) if pw is not None else None,
            "energy_kwh": round(energy, 3),
            "cost_ht_eur": costs["ht"],
            "cost_ttc_eur": costs["ttc"],
            "pct_total": 0.0,  # calculé après
        })

    # Calcul des pourcentages
    for row in rows:
        row["pct_total"] = round((row["energy_kwh"] / total_kwh_all * 100), 1) if total_kwh_all > 0 else 0.0

    rows.sort(key=lambda r: r["energy_kwh"], reverse=True)
    return rows
