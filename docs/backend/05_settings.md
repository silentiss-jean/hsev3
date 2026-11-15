# Backend — Settings (Tarification) API

> Spécifications techniques de `settings.py` — GET/PUT `/api/hse/settings/pricing`

---

## Fichier

```
custom_components/hse/api/views/settings.py
```

## Classe

`HseSettingsPricingView` — Hérite de `HseBaseView`

---

## Responsabilité

Gérer le contrat tarifaire : mode (base/HP-HC), prix HT/TTC, abonnement, TVA, capteur référence.

---

## Structure settings.json (SettingsStore)

```json
{
  "pricing": {
    "mode": "flat",                    // "flat" | "hphc"
    "price_ht_kwh": 0.1587,            // €/kWh HT
    "price_ttc_kwh": 0.1904,           // €/kWh TTC (base)
    "price_hp_ttc_kwh": 0.2200,        // €/kWh TTC Heures Pleines
    "price_hc_ttc_kwh": 0.1600,        // €/kWh TTC Heures Creuses
    "subscription_eur_month": 14.50,   // €/mois
    "tax_rate_pct": 20.0,              // % TVA
    "reference_entity_id": "sensor.linky_power"
  }
}
```

---

## GET `/api/hse/settings/pricing`

### Flux

```
1. Charge settings (StorageManager → SettingsStore)
2. Retourne pricing{} avec valeurs par défaut si absent
```

### Défauts serveur

```python
DEFAULT_PRICING = {
    "mode": "flat",
    "price_ht_kwh": 0.0,
    "price_ttc_kwh": 0.0,
    "price_hp_ttc_kwh": 0.0,
    "price_hc_ttc_kwh": 0.0,
    "subscription_eur_month": 0.0,
    "tax_rate_pct": 20.0,
    "reference_entity_id": None
}
```

---

## PUT `/api/hse/settings/pricing`

### Body (complet — remplacement total)

```json
{
  "mode": "hphc",
  "price_ht_kwh": 0.1587,
  "price_ttc_kwh": 0.1904,
  "price_hp_ttc_kwh": 0.2200,
  "price_hc_ttc_kwh": 0.1600,
  "subscription_eur_month": 14.50,
  "tax_rate_pct": 20.0,
  "reference_entity_id": "sensor.linky_power"
}
```

### Validation stricte

```python
def validate_pricing(payload: dict) -> tuple[bool, str]:
    # Champs obligatoires
    required = ["mode", "price_ht_kwh", "price_ttc_kwh",
                "subscription_eur_month", "tax_rate_pct"]
    for f in required:
        if f not in payload:
            return False, f"Champ manquant: {f}"
    
    # Mode
    if payload["mode"] not in ("flat", "hphc"):
        return False, "mode doit être 'flat' ou 'hphc'"
    
    # Si hphc → prix HP/HC obligatoires
    if payload["mode"] == "hphc":
        for f in ("price_hp_ttc_kwh", "price_hc_ttc_kwh"):
            if f not in payload:
                return False, f"Champ requis en mode hphc: {f}"
    
    # Types numériques
    numeric = ["price_ht_kwh", "price_ttc_kwh", "price_hp_ttc_kwh",
               "price_hc_ttc_kwh", "subscription_eur_month", "tax_rate_pct"]
    for f in numeric:
        try:
            float(payload[f])
        except (TypeError, ValueError):
            return False, f"{f} doit être un nombre"
    
    # Cohérence TVA
    ht = float(payload["price_ht_kwh"])
    ttc = float(payload["price_ttc_kwh"])
    tax = float(payload["tax_rate_pct"])
    expected_ttc = round(ht * (1 + tax / 100), 6)
    if abs(ttc - expected_ttc) > 0.001:
        return False, f"Incohérence HT/TTC/TVA: {ht}*(1+{tax}%)={expected_ttc} ≠ {ttc}"
    
    return True, ""
```

### Flux

```
1. Valide payload (validate_pricing) → 422 si invalide
2. Charge settings actuel
3. Remplace settings["pricing"] = payload_validé
4. Sauvegarde settings (SettingsStore)
5. Retour {saved: true}
```

---

## Utilisation par CostEngine

```python
# engine/cost.py
def cost_summary(energy_kwh: float, settings: dict, period: str = "month") -> dict:
    pricing = settings.get("pricing", DEFAULT_PRICING)
    mode = pricing["mode"]
    
    if mode == "flat":
        price = pricing["price_ttc_kwh"]
        energy_cost = energy_kwh * price
    else:
        # Estimation 60% HP / 40% HC par défaut
        hp_kwh = energy_kwh * 0.6
        hc_kwh = energy_kwh * 0.4
        energy_cost = hp_kwh * pricing["price_hp_ttc_kwh"] + hc_kwh * pricing["price_hc_ttc_kwh"]
    
    subscription = subscription_eur_month(pricing, period)
    total_ttc = energy_cost + subscription
    total_ht = total_ttc / (1 + pricing["tax_rate_pct"] / 100)
    
    return {
        "energy_kwh": energy_kwh,
        "cost_ht_eur": round(total_ht, 2),
        "cost_ttc_eur": round(total_ttc, 2),
        "subscription_eur": round(subscription, 2)
    }
```

---

## Réponses

### GET
```json
{
  "mode": "hphc",
  "price_ht_kwh": 0.1587,
  "price_ttc_kwh": 0.1904,
  "price_hp_ttc_kwh": 0.2200,
  "price_hc_ttc_kwh": 0.1600,
  "subscription_eur_month": 14.50,
  "tax_rate_pct": 20.0,
  "reference_entity_id": "sensor.linky_power"
}
```

### PUT
```json
{ "saved": true }
```

---

## Codes d'erreur

| Code | Condition |
|------|-----------|
| 400 | Body JSON invalide |
| 422 | Validation échouée (message détaillé) |
| 500 | Erreur sauvegarde |

---

## Auth / CORS

- `requires_auth = True`
- `cors_allowed = False`

---

## Definition of Done

- [x] GET : retourne pricing complet avec défauts
- [x] PUT : validation stricte (champs, types, cohérence HT/TTC/TVA, mode hphc)
- [x] PUT : remplacement complet (pas de merge)
- [x] Sauvegarde via SettingsStore (StorageManager)
- [x] Utilisé par CostEngine pour coûts overview/costs/history
- [x] Auth required, CORS false