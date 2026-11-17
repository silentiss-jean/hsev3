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
from http import HTTPStatus
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

# DELTA-070 (anti double comptage Linky) — tranches tarifaires d'un MÊME
# compteur. Un Linky / ZLinky expose un index global (EAST) ET des index par
# tranche (base / heures pleines / heures creuses) tous en kWh total_increasing :
# ce sont trois lectures de la MÊME énergie, pas trois énergies. Les additionner
# double ou triple le compteur. On les écarte donc du calcul agrégé comme les
# compteurs périodiques, pour la même raison.
_TARIFF_TOKENS = (
    "base", "heures_pleines", "heures_creuses", "hphc",
    "heures pleines", "heures creuses", "peak", "off_peak", "offpeak",
    "tarif", "tarifaire", "tier", "période", "periode",
)
# Tokens courts évalués sur des mots entiers uniquement (hp/hc).
_TARIFF_SHORT = ("hp", "hc")


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


def _hay(entity_id: str, friendly: str | None) -> str:
    return f"{entity_id} {friendly or ''}".lower()


def _words(hay: str) -> set[str]:
    return set(hay.replace("-", "_").replace(".", "_").replace(" ", "_").split("_"))


def _looks_period_counter(entity_id: str, friendly: str | None) -> bool:
    hay = _hay(entity_id, friendly)
    return any(tok in hay for tok in _PERIOD_TOKENS)


def _looks_tariff_counter(entity_id: str, friendly: str | None) -> bool:
    """Vrai si l'entité est un index par tranche tarifaire (base/HP/HC…)."""
    hay = _hay(entity_id, friendly)
    words = _words(hay)
    for tok in _TARIFF_TOKENS:
        if " " in tok:
            if tok in hay:
                return True
        elif tok in hay:
            return True
    return bool(words & set(_TARIFF_SHORT))


def _is_energy_index(kind: str | None, sclass: str | None) -> bool:
    """Un index d'énergie cumulatif (kWh, total/total_increasing)."""
    return kind == "energy" and (sclass or "").lower() in _CUMULATIVE_CLASSES


def _energy_index_priority(eid: str, friendly: str | None) -> tuple[int, str]:
    """Priorité de « globalité » d'un index d'énergie (plus haut = plus global).

    Sert à trancher quand deux index du MÊME appareil sont candidats : on garde
    le plus global (total cumulé), on écarte les tranches (base/HP/HC) et les
    compteurs périodiques.
    """
    if _looks_period_counter(eid, friendly):
        return (0, eid)
    if _looks_tariff_counter(eid, friendly):
        return (1, eid)
    return (2, eid)


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
    # device_key -> {entity_id: friendly_name} pour arbitrer les index d'énergie
    energy_by_device: dict[str, dict[str, str | None]] = {}
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
        if not _is_energy_index(kind, sclass):
            plan.excluded.append({"entity_id": eid, "reason": "energy_not_cumulative"})
            continue
        if _looks_period_counter(eid, friendly):
            plan.excluded.append({"entity_id": eid, "reason": "period_counter_duplicate"})
            continue
        energy_by_device.setdefault(device_key, {})[eid] = friendly

    # DELTA-070 — arbitrage anti double comptage par device : si plusieurs index
    # d'énergie du MÊME appareil survivent (typiquement un Linky : total cumulé +
    # tranches base/HP/HC), on ne garde que le plus global et on exclut les
    # autres. C'est ce qui empêche d'additionner trois fois la même énergie.
    for device_key, eids_friendly in energy_by_device.items():
        eids = sorted(eids_friendly)
        if len(eids) == 1:
            plan.energy_meter.extend(eids)
            continue
        # tri par globalité décroissante : (2, eid) global > (1, eid) tranche > (0, eid) périodique
        ranked = sorted(
            eids_friendly.items(),
            key=lambda kv: _energy_index_priority(kv[0], kv[1]),
            reverse=True,
        )
        winner_eid = ranked[0][0]
        plan.energy_meter.append(winner_eid)
        for eid, _friendly in ranked[1:]:
            reason = (
                "tariff_counter_duplicate"
                if _looks_tariff_counter(eid, _friendly)
                else "duplicate_energy_same_device"
            )
            plan.excluded.append({"entity_id": eid, "reason": reason})
            plan.warnings.append({"entity_id": eid, "code": reason})

    for device_key, eids in power_by_device.items():
        plan.live_power.extend(sorted(eids))
        if len(eids) > 1:
            for eid in eids:
                plan.warnings.append({"entity_id": eid, "code": "multiple_power_same_device"})
        # Un appareil qui a déjà un index d'énergie retenu n'a pas besoin qu'on
        # intègre sa puissance (sinon double comptage énergie).
        if device_key not in energy_by_device:
            plan.energy_from_power.extend(sorted(eids))

    plan.live_power.sort()
    plan.energy_meter.sort()
    plan.energy_from_power.sort()
    return plan


def find_energy_index_conflict(
    items: dict[str, Any],
    candidate_eid: str,
    candidate_device_id: str | None,
    candidate_state_class: str | None,
) -> dict[str, Any] | None:
    """Détecte un conflit de sélection d'index d'énergie sur le même appareil.

    Un appareil (device_id) ne doit JAMAIS avoir deux index d'énergie cumulatifs
    sélectionnés : ce sont deux lectures de la même énergie (ex. Linky total +
    tranches base/HP/HC) et les additionner double-compte.

    Retourne None si aucun conflit, sinon :
      {status, message, conflict_entity_id, device_id}

    `items` = catalogue["items"] (dict item_id -> item). On regarde les items
    déjà `policy=selected` qui sont des index d'énergie cumulatifs et qui
    partagent le `device_id` du candidat.
    """
    if not candidate_device_id:
        return None
    for key, item in items.items():
        if not isinstance(item, dict):
            continue
        if (item.get("triage") or {}).get("policy") != "selected":
            continue
        src = item.get("source") or {}
        other_eid = src.get("entity_id")
        if not other_eid or other_eid == candidate_eid:
            continue
        if src.get("device_id") != candidate_device_id:
            continue
        if _is_energy_index("energy", candidate_state_class) and _is_energy_index(
            src.get("kind"), src.get("state_class")
        ):
            return {
                "status": HTTPStatus.UNPROCESSABLE_ENTITY,
                "message": (
                    f"{candidate_eid} est un index d'énergie du même appareil "
                    f"(device_id={candidate_device_id}) que {other_eid}, déjà suivi. "
                    f"Choisir un seul index d'énergie par appareil pour éviter le "
                    f"double comptage."
                ),
                "conflict_entity_id": other_eid,
                "device_id": candidate_device_id,
            }
    return None


def is_selected_energy_index(
    items: dict[str, Any],
    candidate_eid: str,
    candidate_device_id: str | None,
    candidate_kind: str | None,
    candidate_state_class: str | None,
) -> bool:
    """Un index d'énergie cumulatif déjà sélectionné sur le même appareil ?"""
    return (
        find_energy_index_conflict(
            items, candidate_eid, candidate_device_id, candidate_state_class
        )
        is not None
    )