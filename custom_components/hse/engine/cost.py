"""
HSE V3 — engine/cost.py
Source : shared_cost_engine.py V2 — INTACT (hse_v3_synthese.md §7).

Calcul du coût électrique à partir d'une énergie en kWh et d'un contrat tarifaire.
Supporte deux modes :
  - flat  : prix unique €/kWh
  - hphc  : Heures Pleines / Heures Creuses (deux prix distincts)

Règle : ce fichier ne doit PAS être modifié sauf décision explicite dans DELTA.md.
"""
from __future__ import annotations

from typing import Any


# ────────────────────────────────────────────────────────────────────────────
# Helpers internes
# ────────────────────────────────────────────────────────────────────────────

def _safe_float(value: Any, default: float = 0.0) -> float:
    """Convertit en float sans lever d'exception."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ────────────────────────────────────────────────────────────────────────────
# Coût unitaire
# ────────────────────────────────────────────────────────────────────────────

def cost_eur(
    energy_kwh: float,
    settings: dict[str, Any],
    *,
    is_hc: bool = False,
) -> dict[str, float]:
    """
    Calcule le coût HT et TTC pour une énergie donnée.

    Paramètres
    ----------
    energy_kwh : float
        Énergie consommée en kWh.
    settings : dict
        Contrat tarifaire (shape = storage/manager.py _SETTINGS_DEFAULTS).
    is_hc : bool
        Si True et mode hphc, utilise le tarif HC.

    Retourne
    --------
    { ht: float, ttc: float }
    """
    mode = (settings.get("mode") or "flat").lower()
    tax = _safe_float(settings.get("tax_rate_pct"), 20.0) / 100.0

    if mode == "hphc":
        if is_hc:
            price_ttc = _safe_float(settings.get("price_hc_ttc_kwh"))
        else:
            price_ttc = _safe_float(settings.get("price_hp_ttc_kwh"))
    else:
        price_ttc = _safe_float(settings.get("price_ttc_kwh"), 0.25)

    if tax > 0:
        price_ht = price_ttc / (1.0 + tax)
    else:
        price_ht = price_ttc

    ttc = round(energy_kwh * price_ttc, 4)
    ht = round(energy_kwh * price_ht, 4)
    return {"ht": ht, "ttc": ttc}


def subscription_eur_month(settings: dict[str, Any]) -> float:
    """Abonnement mensuel HT en euros."""
    return round(_safe_float(settings.get("subscription_eur_month")), 2)


def cost_summary(
    energy_kwh: float,
    settings: dict[str, Any],
    *,
    is_hc: bool = False,
    include_subscription: bool = False,
) -> dict[str, float]:
    """
    Résumé complet : énergie + coût + abonnement optionnel.

    Retourne
    --------
    { energy_kwh, cost_ht_eur, cost_ttc_eur, subscription_eur }
    """
    costs = cost_eur(energy_kwh, settings, is_hc=is_hc)
    sub = subscription_eur_month(settings) if include_subscription else 0.0
    return {
        "energy_kwh": round(energy_kwh, 3),
        "cost_ht_eur": round(costs["ht"] + sub / (1.0 + _safe_float(settings.get("tax_rate_pct"), 20.0) / 100.0), 2),
        "cost_ttc_eur": round(costs["ttc"] + sub, 2),
        "subscription_eur": round(sub, 2),
    }
