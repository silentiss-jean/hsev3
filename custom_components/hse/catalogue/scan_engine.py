"""
HSE V3 — Catalogue : moteur de scan (source V2 scan_engine.py adapté).
Détecte le kind (energy/power) et le statut d'une entité depuis le registry HA.
"""
from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

# Plateformes internes HSE à exclure du scan (évite l'auto-scan)
_HSE_PLATFORMS: frozenset[str] = frozenset({"hse"})


def detect_kind(device_class: str | None, unit: str | None) -> str | None:
    if device_class == "energy" or unit in ("kWh", "Wh"):
        return "energy"
    if device_class == "power" or unit in ("W", "kW"):
        return "power"
    return None


def status_from_registry(
    reg_entry: er.RegistryEntry | None,
    *,
    ha_state: str | None = None,
    ha_restored: bool = False,
) -> tuple[str, str | None]:
    """
    Retourne (status, status_reason).
    status: ok | disabled | not_provided | unknown
    """
    if reg_entry is None:
        return ("unknown", "entity_registry:missing")

    if reg_entry.disabled_by is not None:
        disabled_by_value = getattr(reg_entry.disabled_by, "value", str(reg_entry.disabled_by))
        return ("disabled", f"entity_registry:disabled_by:{disabled_by_value}")

    ent_status = getattr(reg_entry, "entity_status", None)
    if ent_status is not None:
        ent_status_value = getattr(ent_status, "value", str(ent_status))
        if ent_status_value == "not_provided":
            return ("not_provided", "entity_registry:not_provided")

    if (
        reg_entry.config_entry_id is None
        and ha_restored
        and str(ha_state or "").lower() in ("unavailable", "unknown")
    ):
        return ("not_provided", "entity_registry:orphaned+restored")

    return ("ok", None)


async def async_scan_hass(hass: HomeAssistant) -> dict:
    """
    Scanne le registry HA et retourne les candidats energy/power.
    Exclut les entités générées par HSE lui-même (platform in _HSE_PLATFORMS).
    Exclut les entités sans état actif dans HA (ha_state is None).

    Retourne
    --------
    {"candidates": [{
        "entity_id", "kind", "unit", "device_class", "state_class",
        "unique_id", "device_id", "area_id", "integration_domain",
        "platform", "integration_label", "config_entry_id", "disabled_by",
        "status", "status_reason", "ha_state", "ha_restored"
    }]}
    Shape attendue par merge_scan_into_catalogue().
    """
    ent_reg = er.async_get(hass)
    candidates = []

    for entry in ent_reg.entities.values():
        eid = getattr(entry, "entity_id", None)
        if not isinstance(eid, str) or not eid.startswith("sensor."):
            continue

        # B2 — exclure les entités produites par HSE lui-même
        platform = getattr(entry, "platform", None) or ""
        if platform in _HSE_PLATFORMS:
            continue

        state_obj = hass.states.get(eid)

        # B2 — exclure les entités sans état actif dans HA
        if state_obj is None:
            continue

        ha_state = getattr(state_obj, "state", None)
        attrs = getattr(state_obj, "attributes", {}) or {}

        unit = attrs.get("unit_of_measurement") or getattr(entry, "unit_of_measurement", None)
        device_class = attrs.get("device_class") or getattr(entry, "device_class", None)
        state_class = attrs.get("state_class")

        kind = detect_kind(device_class, unit)
        if kind is None:
            continue

        ha_restored = attrs.get("restored", False)
        status, status_reason = status_from_registry(
            entry,
            ha_state=ha_state,
            ha_restored=bool(ha_restored),
        )

        disabled_by = getattr(entry, "disabled_by", None)
        disabled_by_val = getattr(disabled_by, "value", str(disabled_by)) if disabled_by is not None else None

        # Label lisible de l'intégration source (utile pour grouper dans le front)
        integration_domain = getattr(entry, "integration_domain", None) or platform or None
        integration_label = integration_domain or "unknown"

        candidates.append({
            "entity_id": eid,
            "kind": kind,
            "unit": unit,
            "device_class": device_class,
            "state_class": state_class,
            "unique_id": getattr(entry, "unique_id", None),
            "device_id": getattr(entry, "device_id", None),
            "area_id": getattr(entry, "area_id", None),
            "integration_domain": integration_domain,
            "integration_label": integration_label,
            "platform": platform,
            "config_entry_id": getattr(entry, "config_entry_id", None),
            "disabled_by": disabled_by_val,
            "status": status,
            "status_reason": status_reason,
            "ha_state": ha_state,
            "ha_restored": bool(ha_restored),
        })

    return {"candidates": candidates}
