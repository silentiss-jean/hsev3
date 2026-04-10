"""
HSE V3 — repairs.py
Pont entre le catalogue HSE et le système HA Repairs (cloche UI HA).

Fonction publique :
    async_sync_repairs(hass)  — appelé après chaque refresh catalogue

Logique :
    - escalation == "error_24h"   → issue ERROR
    - escalation == "action_48h"  → issue CRITICAL
    - triage.policy == "removed"  → supprime l'issue
    - tout autre cas              → supprime l'issue

Adaptation V2→V3 : lecture catalogue via HseStorageManager (plus hass.data direct).
"""
from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN
from .storage.manager import HseStorageManager


def _issue_id(item_id: str) -> str:
    return f"catalogue_offline_{item_id.replace(':', '_')}"


async def async_sync_repairs(hass: HomeAssistant) -> None:
    """Crée/supprime les issues Repairs selon l'état de santé du catalogue."""

    mgr = HseStorageManager(hass)
    catalogue = await mgr.async_load_catalogue()
    items = catalogue.get("items") or {}

    for item_id, item in items.items():
        if not isinstance(item, dict):
            continue

        triage = item.get("triage") or {}
        if triage.get("policy") == "removed":
            ir.async_delete_issue(hass, DOMAIN, _issue_id(item_id))
            continue

        health = item.get("health") or {}
        esc = health.get("escalation") or "none"

        if esc not in ("error_24h", "action_48h"):
            ir.async_delete_issue(hass, DOMAIN, _issue_id(item_id))
            continue

        entity_id = (item.get("source") or {}).get("entity_id") or item_id
        first_unavail = health.get("first_unavailable_at")

        severity = (
            ir.IssueSeverity.ERROR
            if esc == "error_24h"
            else ir.IssueSeverity.CRITICAL
        )

        ir.async_create_issue(
            hass,
            DOMAIN,
            _issue_id(item_id),
            is_fixable=False,
            is_persistent=True,
            severity=severity,
            translation_key="catalogue_offline",
            translation_placeholders={
                "entity_id": entity_id,
                "since": str(first_unavail or "?"),
            },
        )
