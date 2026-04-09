"""
HSE V3 — sensors/name_fixer.py
Source : sensor_name_fixer.py V1 (épuré).

Correction des noms de capteurs trop longs ou mal formés.

Problème V1/V2 : certains capteurs HA ont des noms > 64 caractères issus
de la concaténation device_name + entity_name, ce qui cause des débordements
dans l'UI et des clés de store trop longues.

Règle : on ne modifie JAMAIS l'entity_id — uniquement display_name dans
le catalogue (enrichment.naming.display_name).
"""
from __future__ import annotations

import re
from typing import Any

MAX_DISPLAY_LEN = 64


def fix_display_name(raw: str | None) -> str:
    """
    Nettoie et tronque un nom d'affichage.
    - Supprime les espaces multiples
    - Tronque à MAX_DISPLAY_LEN sans couper un mot en plein milieu
    - Ajoute "…" si tronqué
    """
    if not raw:
        return ""
    name = re.sub(r"\s+", " ", raw).strip()
    if len(name) <= MAX_DISPLAY_LEN:
        return name
    # Tronquer sur un espace pour éviter de couper un mot
    truncated = name[: MAX_DISPLAY_LEN - 1]
    last_space = truncated.rfind(" ")
    if last_space > MAX_DISPLAY_LEN // 2:
        truncated = truncated[:last_space]
    return truncated.rstrip() + "\u2026"  # …


def apply_name_fixes(
    catalogue: dict[str, Any],
    *,
    force: bool = False,
) -> int:
    """
    Parcourt tous les items du catalogue et corrige les display_name trop longs.

    Paramètres
    ----------
    catalogue : dict
        Catalogue complet (modifié en place).
    force : bool
        Si True, réapplique même sur les noms en mode "locked".

    Retourne
    --------
    int : nombre d'items corrigés
    """
    fixed = 0
    items = (catalogue.get("items") or {}).values()
    for item in items:
        if not isinstance(item, dict):
            continue
        enrichment = item.setdefault("enrichment", {})
        naming = enrichment.setdefault("naming", {})
        if not force and naming.get("mode") == "locked":
            continue
        src = item.get("source") or {}
        # Source du nom brut : friendly_name HA ou entity_id
        raw_name = (
            src.get("friendly_name")
            or src.get("entity_id")
            or ""
        )
        current = naming.get("display_name") or raw_name
        fixed_name = fix_display_name(current)
        if fixed_name != current:
            naming["display_name"] = fixed_name
            fixed += 1
        elif not naming.get("display_name"):
            naming["display_name"] = fix_display_name(raw_name)
    return fixed
