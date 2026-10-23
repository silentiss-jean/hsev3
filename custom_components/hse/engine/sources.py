"""
HSE V3 — engine/sources.py

Planificateur de sources (module pur, sans dépendance HA).

Répond à : « parmi les capteurs sélectionnés, lequel sert à quoi, et lesquels
risquent de compter deux fois la même consommation ? »

Sorties :
  live_power        : capteurs de puissance additionnés pour la puissance instantanée
  energy_meter      : compteurs cumulatifs (kWh) utilisés pour l'énergie par période
  energy_from_power : capteurs de puissance dont l'énergie est obtenue par
                      intégration (seulement si l'appareil n'a PAS de compteur cumulatif)
  reference         : capteur de référence maison (jamais additionné aux appareils)
  excluded          : [{entity_id, reason}]
  warnings          : [{entity_id, code}] risques de double comptage / ambiguïtés
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .measure import classify

_CUMULATIVE_CLASSES = frozenset({"total", "total_increasing"})

# Compteurs « périodiques » : se remettent à zéro et doublonnent le compteur total
# du même appareil (ex. Tuya : total energy + today energy + month energy).
_PERIOD_TOKENS = (
    "today", "daily", "yesterday", "this_week", "weekly", "week_energy",
    "month", "monthly", "year_energy", "yearly",
    "aujourd", "hier", "jour", "semaine", "mois", "annee", "année",
)


@dataclass
class SourcePlan:
    live_power: list[str] = field(default_factory=list)
    energy_meter: list[str] = field(default_factory=list)
    energy_from_power: list[str] = field(default_factory=list)
    reference: str | None = None
    reference_ids: list[str] = field(default_factory=list)
    excluded: list[dict[str, str]] = field(default_factory=list)
    warnings: list[dict[str, str]] = field(default_factory=list)

    @property
    def energy_sources(self) -> list[str]:
        return [*self.energy_meter, *self.energy_from_power]


def _looks_period_counter(entity_id: str, friendly: str | None) -> bool:
    hay = f"{entity_id} {friendly or ''}".lower()
    return any(tok in hay for tok in _PERIOD_TOKENS)


def plan_sources(
    items: list[dict[str, Any]],
    states: dict[str, Any],
    reference_entity_id: str | list[str] | tuple[str, ...] | None = None,
) -> SourcePlan:
    """
    items  : items catalogue sélectionnés (dict avec clé "source").
    states : {entity_id: State | None}
    """
    if isinstance(reference_entity_id, str):
        ref_ids = {reference_entity_id}
    else:
        ref_ids = {r for r in (reference_entity_id or ()) if r}
    plan = SourcePlan()
    power_by_device: dict[str, list[str]] = {}
    energy_by_device: dict[str, list[str]] = {}
    seen: set[str] = set()

    for item in items:
        src = (item or {}).get("source") or {}
        eid = src.get("entity_id")
        if not eid or eid in seen:
            continue
        seen.add(eid)

        if eid in ref_ids:
            plan.reference = plan.reference or eid
            plan.reference_ids.append(eid)
            continue

        state = states.get(eid)
        attrs = (getattr(state, "attributes", None) or {}) if state is not None else {}
        unit = attrs.get("unit_of_measurement") or src.get("unit")
        dclass = attrs.get("device_class") or src.get("device_class")
        sclass = (attrs.get("state_class") or src.get("state_class") or "").lower() or None
        friendly = attrs.get("friendly_name")

        kind, _factor, reason = classify(dclass, unit)
        if kind is None:
            plan.excluded.append({"entity_id": eid, "reason": reason or "unclassified"})
            continue
        if reason == "class_unit_mismatch":
            plan.warnings.append({"entity_id": eid, "code": reason})

        device_key = src.get("device_id") or f"entity:{eid}"

        if kind == "power":
            power_by_device.setdefault(device_key, []).append(eid)
            continue

        # kind == "energy"
        if sclass not in _CUMULATIVE_CLASSES:
            plan.excluded.append({"entity_id": eid, "reason": "energy_not_cumulative"})
            continue
        if _looks_period_counter(eid, friendly):
            plan.excluded.append({"entity_id": eid, "reason": "period_counter_duplicate"})
            continue
        energy_by_device.setdefault(device_key, []).append(eid)

    for device_key, eids in energy_by_device.items():
        plan.energy_meter.extend(sorted(eids))
        if len(eids) > 1:
            for eid in eids:
                plan.warnings.append({"entity_id": eid, "code": "multiple_energy_same_device"})

    for device_key, eids in power_by_device.items():
        plan.live_power.extend(sorted(eids))
        if len(eids) > 1:
            for eid in eids:
                plan.warnings.append({"entity_id": eid, "code": "multiple_power_same_device"})
        if device_key not in energy_by_device:
            # Pas de compteur cumulatif sur l'appareil : énergie par intégration.
            plan.energy_from_power.extend(sorted(eids))

    plan.live_power.sort()
    plan.energy_meter.sort()
    plan.energy_from_power.sort()
    return plan
