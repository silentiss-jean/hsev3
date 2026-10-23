"""
HSE V3 — engine/reference.py

Compteur de référence MAISON (ZLinky/Linky/Lixee/Téléinfo/Leexi…) — module pur.

  1. find_reference_candidates : retrouve automatiquement les capteurs probables du
     compteur général (index kWh, puissance active W, puissance apparente VA).
  2. coverage : compare la somme des appareils suivis au compteur et rend un statut
     explicite (couverture, non-suivi, incohérence).

Le compteur de référence N'EST JAMAIS additionné aux appareils (double comptage).
"""
from __future__ import annotations

from typing import Any

from .measure import classify

# Indices forts d'un compteur général.
_STRONG = ("zlinky", "lixee", "linky", "teleinfo", "téléinfo", "leexi", "enedis", "tic")
_MEDIUM = ("compteur", "smart meter", "smart_meter", "electricity meter", "electric_meter",
           "main meter", "grid", "reseau", "réseau", "general", "général", "maison", "house", "home")
_ENERGY_HINTS = ("index", "summation", "delivered", "consommation totale", "total_energy", "base")
# Indices d'un appareil individuel (pas le compteur).
_DEVICE_HINTS = ("clim", "ballon", "chauffe", "cumulus", "prise", "plug", "radiateur",
                 "heater", "socket", "tv", "lave", "four", "frigo", "fridge", "pompe",
                 "ev", "wallbox", "light", "lumi")

# Tolérances de cohérence appareils vs compteur.
OVER_TOLERANCE = 1.10      # somme appareils > compteur +10 % => incohérent
MIN_REFERENCE_W = 50.0     # sous 50 W de référence, les ratios n'ont pas de sens


def _tokens_hit(hay: str, tokens: tuple[str, ...]) -> list[str]:
    # « tic » et « ev » sont courts : on exige des bornes de mot.
    hits = []
    words = set(hay.replace("-", "_").replace(".", "_").replace(" ", "_").split("_"))
    for t in tokens:
        t_norm = t.replace(" ", "_")
        if len(t) <= 3:
            if t in words:
                hits.append(t)
        elif t_norm in hay.replace(" ", "_"):
            hits.append(t)
    return hits


def find_reference_candidates(entries: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
    """
    entries : [{entity_id, name, platform, unit, device_class, state_class, state}]
    Retourne une liste triée par score décroissant :
      {entity_id, name, score, role, unit, reasons[]}
    role : energy_index | active_power | apparent_power
    """
    out: list[dict[str, Any]] = []
    for e in entries:
        eid = e.get("entity_id") or ""
        if not eid.startswith("sensor."):
            continue
        unit = e.get("unit")
        kind, _f, reason = classify(e.get("device_class"), unit)
        role = None
        if kind == "energy" and (e.get("state_class") or "") in ("total", "total_increasing"):
            role = "energy_index"
        elif kind == "power":
            role = "active_power"
        elif reason and reason.startswith("unit_not_active_power:") and unit in ("VA", "kVA"):
            role = "apparent_power"
        if role is None:
            continue

        hay = f"{eid} {e.get('name') or ''} {e.get('platform') or ''}".lower()
        score = 0
        reasons: list[str] = []
        strong = _tokens_hit(hay, _STRONG)
        if strong:
            score += 50
            reasons.append(f"nom/intégration: {', '.join(sorted(set(strong)))}")
        medium = _tokens_hit(hay, _MEDIUM)
        if medium:
            score += 15
            reasons.append(f"nom: {', '.join(sorted(set(medium)))}")
        if role == "energy_index":
            score += 10
            if _tokens_hit(hay, _ENERGY_HINTS):
                score += 10
                reasons.append("index cumulatif")
        if role == "active_power":
            score += 5
        dev = _tokens_hit(hay, _DEVICE_HINTS)
        if dev:
            score -= 60
            reasons.append(f"ressemble à un appareil: {', '.join(sorted(set(dev)))}")
        if _tokens_hit(hay, ("today", "daily", "month", "week", "year", "jour", "mois")):
            score -= 25
            reasons.append("compteur périodique")
        if score <= 0:
            continue
        out.append({
            "entity_id": eid, "name": e.get("name") or eid, "score": score,
            "role": role, "unit": unit, "reasons": reasons,
        })
    out.sort(key=lambda c: (-c["score"], c["entity_id"]))
    return out[:limit]


def coverage(reference_w: float | None, tracked_w: float | None) -> dict[str, Any]:
    """
    Compare la puissance du compteur général et la somme des appareils suivis.

    status :
      no_reference           compteur absent/indisponible
      reference_too_low      référence < 50 W : ratio non significatif
      ok                     appareils ≤ compteur (+10 %) : le reste = non suivi
      tracked_exceeds_ref    appareils > compteur +10 % : double comptage, unité erronée
                             ou capteur figé → NE PAS FAIRE CONFIANCE aux appareils
    """
    if reference_w is None:
        return {"status": "no_reference", "reference_w": None, "tracked_w": tracked_w,
                "untracked_w": None, "coverage_pct": None}
    tracked = float(tracked_w or 0.0)
    if reference_w < MIN_REFERENCE_W:
        return {"status": "reference_too_low", "reference_w": round(reference_w, 1),
                "tracked_w": round(tracked, 1), "untracked_w": None, "coverage_pct": None}
    status = "tracked_exceeds_ref" if tracked > reference_w * OVER_TOLERANCE else "ok"
    return {
        "status": status,
        "reference_w": round(reference_w, 1),
        "tracked_w": round(tracked, 1),
        "untracked_w": round(max(reference_w - tracked, 0.0), 1),
        "coverage_pct": round(min(tracked / reference_w * 100.0, 999.0), 1),
    }


def energy_coverage(reference_kwh: float | None, tracked_kwh: float | None) -> dict[str, Any]:
    """Même logique sur l'énergie d'une période (plus fiable que l'instantané)."""
    if reference_kwh is None:
        return {"status": "no_reference", "reference_kwh": None, "tracked_kwh": tracked_kwh,
                "untracked_kwh": None, "coverage_pct": None}
    tracked = float(tracked_kwh or 0.0)
    if reference_kwh <= 0.05:
        return {"status": "reference_too_low", "reference_kwh": round(reference_kwh, 3),
                "tracked_kwh": round(tracked, 3), "untracked_kwh": None, "coverage_pct": None}
    status = "tracked_exceeds_ref" if tracked > reference_kwh * OVER_TOLERANCE else "ok"
    return {
        "status": status,
        "reference_kwh": round(reference_kwh, 3),
        "tracked_kwh": round(tracked, 3),
        "untracked_kwh": round(max(reference_kwh - tracked, 0.0), 3),
        "coverage_pct": round(min(tracked / reference_kwh * 100.0, 999.0), 1),
    }
