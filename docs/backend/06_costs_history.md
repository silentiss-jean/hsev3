# Backend — Coûts, Historique, Export API

> Spécifications techniques de `energy_prices.py` + `history.py` — GET `/api/hse/costs`, `/api/hse/history`, `/api/hse/export`

---

## Fichiers

```
custom_components/hse/api/views/energy_prices.py
custom_components/hse/api/views/history.py
```

---

## Endpoints

| Méthode | URL | Classe | Description |
|---------|-----|--------|-------------|
| `GET` | `/api/hse/costs` | `HseCostsView` | Coûts par période + abo |
| `GET` | `/api/hse/history` | `HseHistoryView` | Série temporelle énergie/coûts |
| `GET` | `/api/hse/export` | `HseExportView` | Export CSV/JSON complet |

---

## GET `/api/hse/costs` — `HseCostsView`

### Params

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `period` | str | `month` | `day` \| `week` \| `month` \| `year` |

### Flux

```
1. Charge catalogue + settings (StorageManager)
2. Filtre items selected
3. Pour chaque période demandée :
   - async_energy_detail() → kWh
   - cost_summary() → HT/TTC + abo proratisé
4. Construit réponse {period: {...}}
```

### Abonnement proratisé

```python
# engine/cost.py → subscription_eur_month(pricing, period)
period_factors = {
    "day": 1/30,
    "week": 7/30,
    "month": 1,
    "year": 12
}
return pricing["subscription_eur_month"] * period_factors.get(period, 1)
```

---

## GET `/api/hse/history` — `HseHistoryView`

### Params

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `period` | str | `month` | `day` \| `week` \| `month` \| `year` |
| `granularity` | str | `hour` | `hour` \| `day` (si period ≥ week) |
| `entity_id` | str | `all` | Filtrer sur 1 appareil (optionnel) |

### Flux

```
1. Valide period + granularity compatibles
2. Si entity_id = all → utilise catalogue selected
3. Pour chaque entité :
   - Récupère states Recorder (async_get_significant_states)
   - Agrège par bucket (heure/jour) selon granularity
   - Calcule énergie cumulée par bucket
   - Applique cost_engine → coûts par bucket
4. Retour séries temporelles alignées
```

### Format réponse

```json
{
  "period": "month",
  "granularity": "hour",
  "series": [
    {
      "entity_id": "sensor.salon_power",
      "name": "Salon",
      "unit": "kWh",
      "points": [
        {"ts": "2026-04-08T00:00:00+02:00", "energy_kwh": 0.45, "cost_eur": 0.11},
        {"ts": "2026-04-08T01:00:00+02:00", "energy_kwh": 0.38, "cost_eur": 0.09}
      ]
    }
  ],
  "totals": [
    {"ts": "2026-04-08T00:00:00+02:00", "energy_kwh": 1.23, "cost_eur": 0.29}
  ]
}
```

---

## GET `/api/hse/export` — `HseExportView`

### Params

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `format` | str | `json` | `json` \| `csv` |
| `period` | str | `month` | `day` \| `week` \| `month` \| `year` |
| `include_diagnostics` | bool | `false` | Inclure score/health |

### Flux (JSON)

```
1. Charge catalogue + settings + meta
2. Construit objet complet :
   - meta (rooms, types, assignments)
   - catalogue (items selected + ignored + pending)
   - pricing settings
   - costs (toutes périodes)
   - history (série complète période demandée)
   - diagnostics (si include_diagnostics)
3. Retour JSON
```

### Flux (CSV)

```
1. Même données
2. Génère CSV multi-sections (une par onglet)
3. Headers : Section, Entity, Name, Room, Type, Timestamp, Energy_kWh, Cost_EUR, ...
4. Retour text/csv (attachment)
```

---

## Réponses

### GET `/costs?period=month`
```json
{
  "period": "month",
  "energy_kwh": 342.1,
  "cost_ht_eur": 71.27,
  "cost_ttc_eur": 85.53,
  "subscription_eur": 14.50,
  "by_device": [
    {"entity_id": "sensor.chauffe_eau", "name": "Chauffe-eau", "energy_kwh": 180, "cost_ttc_eur": 45.00}
  ],
  "by_room": [
    {"room": "Salle de bain", "energy_kwh": 200, "cost_ttc_eur": 50.00}
  ]
}
```

### GET `/history?period=week&granularity=day`
```json
{
  "period": "week",
  "granularity": "day",
  "series": [...],
  "totals": [...]
}
```

### GET `/export?format=csv&period=year`
```
Content-Type: text/csv
Content-Disposition: attachment; filename="hse_export_2026-04-08.csv"

Section,Entity,Name,Room,Type,Date,Energy_kWh,Cost_TTC_EUR
CATALOGUE,sensor.salon,Salon,Salon,Lighting,,,
COSTS,sensor.salon,Salon,Salon,Lighting,2026-04-08,12.45,3.12
...
```

---

## Codes d'erreur

| Endpoint | 400 | 422 | 500 |
|----------|-----|-----|-----|
| GET /costs | ✅ (period invalide) | | ✅ |
| GET /history | ✅ (granularity incompatible) | | ✅ |
| GET /export | ✅ (format invalide) | | ✅ |

---

## Auth / CORS

- Toutes : `requires_auth = True`, `cors_allowed = False`

---

## Definition of Done

- [x] GET /costs : période paramétrable, abo proratisé, détail par device/room
- [x] GET /history : série temporelle, granularity hour/day, totaux agrégés
- [x] GET /export : JSON complet + CSV multi-sections
- [x] CostEngine réutilisé (cohérence overview/costs/history)
- [x] Validation params (period, granularity compatibles)
- [x] Auth required, CORS false