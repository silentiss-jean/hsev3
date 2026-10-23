"""
HSE V3 — engine/calculation.py

Calcul temps réel de la puissance et de l'énergie depuis hass.states.

V3.1 — mesures STRICTES (voir engine/measure.py) :
  - un capteur d'énergie (kWh) n'est JAMAIS compté comme de la puissance (W) ;
  - une unité inconnue est rejetée (plus de « on suppose W / kWh ») ;
  - puissance négative ou aberrante : exclue, raison remontée ;
  - chaque total dit combien de capteurs ont été retenus/rejetés et pourquoi.

Règle : pas d'accès direct à hass — on reçoit les states en paramètre
        pour rester testable sans HomeAssistant instancié.
"""
from __future__ import annotations

from typing import Any

from .measure import Reading, read_state


def _safe_float(value: Any) -> float | None:
    """Compat V3.0 : float fini ou None."""
    from .measure import parse_number
    return parse_number(value)


def read_sensor(state_obj: Any) -> Reading:
    """Lecture normalisée (W ou kWh) d'un State HA."""
    return read_state(state_obj)


def get_power_w(state_obj: Any) -> float | None:
    """
    Puissance en W, ou None si le capteur n'est pas une puissance valide
    (énergie, unité inconnue, indisponible, négative, aberrante).
    """
    r = read_state(state_obj)
    return r.value if r.kind == "power" and r.value is not None else None


def get_energy_kwh(state_obj: Any) -> float | None:
    """
    Énergie cumulée en kWh, ou None si le capteur n'est pas une énergie valide.
    """
    r = read_state(state_obj)
    return r.value if r.kind == "energy" and r.value is not None else None


def compute_totals(
    entity_ids: list[str],
    states: dict[str, Any],
) -> dict[str, Any]:
    """
    Puissance totale (W) et énergie cumulée (kWh) pour une liste d'entity_ids.

    Retourne
    --------
    {
      power_w, energy_kwh,          # None si aucun capteur valide du type
      count_ok, count_total,        # compat V3.0
      count_power, count_energy,
      rejected: [{entity_id, reason}]
    }
    """
    total_w = 0.0
    total_kwh = 0.0
    n_power = 0
    n_energy = 0
    rejected: list[dict[str, str]] = []

    for eid in entity_ids:
        r = read_state(states.get(eid))
        if r.ok and r.kind == "power":
            total_w += r.value  # type: ignore[operator]
            n_power += 1
        elif r.ok and r.kind == "energy":
            total_kwh += r.value  # type: ignore[operator]
            n_energy += 1
        else:
            rejected.append({"entity_id": eid, "reason": r.reason or "unusable"})

    return {
        "power_w": round(total_w, 1) if n_power else None,
        "energy_kwh": round(total_kwh, 3) if n_energy else None,
        "count_ok": n_power + n_energy,
        "count_total": len(entity_ids),
        "count_power": n_power,
        "count_energy": n_energy,
        "rejected": rejected,
    }


def top_n_by_power(
    entity_ids: list[str],
    states: dict[str, Any],
    n: int = 5,
) -> list[dict[str, Any]]:
    """
    N capteurs de PUISSANCE les plus consommateurs (W), tri décroissant.
    Les capteurs d'énergie en sont exclus par construction.

    Retourne list[{ entity_id, power_w, pct }]
    """
    items: list[tuple[str, float]] = []
    for eid in entity_ids:
        pw = get_power_w(states.get(eid))
        if pw is not None and pw > 0:
            items.append((eid, pw))

    items.sort(key=lambda x: x[1], reverse=True)
    total_w = sum(w for _, w in items)
    return [
        {
            "entity_id": eid,
            "power_w": round(pw, 1),
            "pct": round((pw / total_w * 100), 1) if total_w > 0 else 0.0,
        }
        for eid, pw in items[:n]
    ]
