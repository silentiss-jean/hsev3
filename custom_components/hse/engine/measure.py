"""
HSE V3 — engine/measure.py

Normalisation STRICTE des mesures électriques (module pur, sans dépendance HA).

Principe directeur : *refuser plutôt que deviner*.
  - Une unité inconnue n'est JAMAIS supposée être des W ou des kWh.
  - Une puissance (W) et une énergie (kWh) ne sont jamais mélangées.
  - Toute valeur rejetée porte une raison (`reason`) exploitable par le diagnostic.

Unités canoniques internes :
  - puissance : W
  - énergie  : kWh
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Unités HA exactes (sensibles à la casse : mW ≠ MW).
POWER_UNITS: dict[str, float] = {"mW": 1e-3, "W": 1.0, "kW": 1e3, "MW": 1e6}
ENERGY_UNITS: dict[str, float] = {"Wh": 1e-3, "kWh": 1.0, "MWh": 1e3}

# Unités électriques reconnues mais NON additionnables à de la puissance active.
NON_ACTIVE_UNITS: frozenset[str] = frozenset({"VA", "kVA", "var", "kvar", "A", "V", "mA"})

# Garde-fous de plausibilité (logement résidentiel).
MAX_PLAUSIBLE_POWER_W: float = 100_000.0   # 100 kW : au-delà => quasi sûrement une erreur d'unité
MAX_PLAUSIBLE_RATE_KW: float = 100.0       # débit max d'un compteur d'énergie (anti-glitch)

_INVALID_STATES = frozenset({"unavailable", "unknown", "", "none", "nan", "inf", "-inf"})


def clean_unit(unit: Any) -> str | None:
    if unit is None:
        return None
    u = str(unit).strip()
    return u or None


def classify(device_class: str | None, unit: str | None) -> tuple[str | None, float, str | None]:
    """
    Retourne (kind, factor, reason).

    kind   : "power" | "energy" | None
    factor : multiplicateur vers l'unité canonique (W ou kWh)
    reason : None si OK, sinon code de rejet / avertissement

    L'unité fait foi. `device_class` n'est qu'un indice : si les deux se
    contredisent, l'unité gagne et un avertissement est remonté.
    """
    u = clean_unit(unit)
    dc = (device_class or "").strip().lower() or None

    if u in POWER_UNITS:
        reason = "class_unit_mismatch" if dc == "energy" else None
        return "power", POWER_UNITS[u], reason
    if u in ENERGY_UNITS:
        reason = "class_unit_mismatch" if dc == "power" else None
        return "energy", ENERGY_UNITS[u], reason
    if u in NON_ACTIVE_UNITS:
        return None, 1.0, f"unit_not_active_power:{u}"
    if u is None:
        return None, 1.0, "unit_missing"
    return None, 1.0, f"unit_unsupported:{u}"


@dataclass(frozen=True)
class Reading:
    """Résultat de lecture d'un capteur, déjà normalisé (W ou kWh)."""

    entity_id: str | None
    kind: str | None            # power | energy | None (rejeté)
    value: float | None         # W ou kWh selon kind, None si rejeté
    raw_value: float | None
    unit: str | None
    reason: str | None = None   # code de rejet/avertissement

    @property
    def ok(self) -> bool:
        return self.kind is not None and self.value is not None


def parse_number(raw: Any) -> float | None:
    """float fini ou None. Rejette NaN, inf et états HA indisponibles."""
    if raw is None:
        return None
    if str(raw).strip().lower() in _INVALID_STATES:
        return None
    try:
        f = float(raw)
    except (TypeError, ValueError):
        return None
    if f != f or f in (float("inf"), float("-inf")):
        return None
    return f


def read_state(state_obj: Any) -> Reading:
    """Lit un objet State HA (ou compatible) et retourne une Reading normalisée."""
    if state_obj is None:
        return Reading(None, None, None, None, None, "state_missing")

    eid = getattr(state_obj, "entity_id", None)
    attrs = getattr(state_obj, "attributes", {}) or {}
    unit = clean_unit(attrs.get("unit_of_measurement"))
    kind, factor, reason = classify(attrs.get("device_class"), unit)

    raw = parse_number(getattr(state_obj, "state", None))
    if raw is None:
        return Reading(eid, kind, None, None, unit, reason or "state_unavailable")
    if kind is None:
        return Reading(eid, None, None, raw, unit, reason)

    value = raw * factor

    if kind == "power":
        if value < 0:
            # Export/production ou capteur inversé : jamais compté comme consommation.
            return Reading(eid, kind, None, raw, unit, "negative_power")
        if value > MAX_PLAUSIBLE_POWER_W:
            return Reading(eid, kind, None, raw, unit, "implausible_power")
    elif kind == "energy" and value < 0:
        return Reading(eid, kind, None, raw, unit, "negative_energy")

    return Reading(eid, kind, value, raw, unit, reason)


def energy_increments_kwh(
    samples: list[tuple[float, float]],
    *,
    factor: float = 1.0,
    max_rate_kw: float = MAX_PLAUSIBLE_RATE_KW,
) -> tuple[float, int]:
    """
    Énergie (kWh) consommée à partir d'un compteur cumulatif.

    samples : [(timestamp_s, valeur_brute)] triés par temps croissant.
    factor  : multiplicateur brut -> kWh.

    Règles :
      - hausse         : on ajoute (v - prev) ;
      - baisse         : remise à zéro du compteur => on re-base sur la nouvelle valeur
                         SANS rien ajouter (on perd au plus l'énergie entre la remise
                         à zéro et le 1er relevé, jamais d'invention d'énergie) ;
      - saut aberrant  : hausse impliquant un débit > max_rate_kw => glitch capteur,
                         on re-base sans ajouter (ex: 1234 -> 0 -> 1234).

    Retourne (kwh, nb_anomalies_ignorées).
    """
    total = 0.0
    anomalies = 0
    prev_t: float | None = None
    prev_v: float | None = None
    for t, raw in samples:
        v = raw * factor
        if prev_v is None:
            prev_t, prev_v = t, v
            continue
        delta = v - prev_v
        dt_h = max((t - (t if prev_t is None else prev_t)) / 3600.0, 0.0)
        if delta < 0:
            anomalies += 1
        elif delta > 0:
            # dt_h == 0 (même instant) : on borne par un dt minimal d'1 s
            rate_kw = delta / max(dt_h, 1.0 / 3600.0)
            if rate_kw > max_rate_kw:
                anomalies += 1
            else:
                total += delta
        prev_t, prev_v = t, v
    return total, anomalies


def integrate_power_kwh(
    samples: list[tuple[float, float | None]],
    end_ts: float,
) -> float:
    """
    Énergie (kWh) par intégration d'une puissance (méthode « sample-and-hold »).

    samples : [(timestamp_s, watts_normalisés | None)] triés ; None = indisponible
              (contribue 0 sur l'intervalle, on n'invente pas de consommation).
    end_ts  : fin de fenêtre.
    """
    if not samples:
        return 0.0
    wh = 0.0
    for i, (t, w) in enumerate(samples):
        t_next = samples[i + 1][0] if i + 1 < len(samples) else end_ts
        dt_h = max(t_next - t, 0.0) / 3600.0
        if w is not None and w > 0:
            wh += w * dt_h
    return wh / 1000.0
