# Backend — Overview API

> Spécifications techniques de `overview.py` — GET `/api/hse/overview`

---

## Fichier

```
custom_components/hse/api/views/overview.py
```

## Classe

`HseOverviewView` — Hérite de `HseBaseView`

---

## Responsabilité

Calculer et retourner la vue d'ensemble électrique : puissance live, consommation multi-périodes, top 5, totaux par pièce/type, comparaison référence, indicateurs qualité.

---

## Flux de traitement

```
1. Charge catalogue, settings, meta (StorageManager)
2. Filtre items selected + source.entity_id valide
3. plan_sources() → sépare live_power / live_energy / reference
4. compute_totals() → power_now_w (Σ appareils, hors référence)
5. async_energy_detail() / async_energy_detail_hphc() → énergie par période (calendrier local)
6. cost_summary() → coûts HT/TTC par période (+ abo proratisé)
7. top_n_by_power() → top 5
8. totals_by_type() → par type (via meta.assignments)
9. Par pièce : agrégation via meta.assignments.room
10. coverage() / energy_coverage() → référence + qualité
11. Retour JSON structuré
```

---

## Dépendances (engine)

| Module | Fonction | Rôle |
|--------|----------|------|
| `engine.calculation` | `compute_totals()`, `top_n_by_power()`, `get_power_w()`, `read_sensor()` | Maths puissance/énergie |
| `engine.cost` | `cost_summary()`, `subscription_eur_month()` | Calcul coûts |
| `engine.period_stats` | `async_energy_detail()`, `async_energy_detail_hphc()` | Stats long terme (Recorder) |
| `engine.group_totals` | `totals_by_type()` | Agrégation par type |
| `engine.reference` | `coverage()`, `energy_coverage()` | Qualité vs référence |
| `engine.sources` | `plan_sources()` | Qualification sources (W vs kWh) |
| `time_utils` | `utc_now_iso()` | Timestamp réponse |

---

## Logique clé — Qualification sources (`plan_sources`)

```python
# engine/sources.py
# Sépare les entités en 3 groupes :
# - live_power    : capteurs puissance instantanée (W) → power_now_w
# - live_energy   : capteurs énergie cumulée (kWh) → conso périodes
# - reference     : compteur général (Linky) → référence + qualité

# Règles :
# - W et kWh jamais mélangés
# - Pas de double comptage appareil/compteur
# - Compteurs périodiques (utility_meter) ignorés
# - quality.level = "ok" | "warning" | "error"
# - quality.notes = explications lisibles
# - quality.missing_energy = entités sans source énergie fiable
```

---

## Calcul consommation par période

| Période | Source | Abonnement proratisé |
|---------|--------|----------------------|
| `day` | `async_energy_detail(..., period="day")` | `sub / 30` |
| `week` | `async_energy_detail(..., period="week")` | `sub * 7 / 30` |
| `month` | `async_energy_detail(..., period="month")` | `sub` |
| `year` | `async_energy_detail(..., period="year")` | `sub * 12` |

> Calendar LOCAL (TZ HA) — `engine/period_stats.py` utilise `dt_util.now()` avec TZ configurée.

---

## Réponse JSON (shape complet)

```json
{
  "power_now_w": 2847,
  "reference_sensor": {
    "entity_id": "sensor.linky_power",
    "power_w": 3100,
    "delta_w": -253,
    "delta_pct": -8.2
  },
  "consumption": {
    "today_kwh": 12.45, "today_eur": 3.12,
    "week_kwh": 87.3, "week_eur": 21.85,
    "month_kwh": 342.1, "month_eur": 85.53,
    "year_kwh": 4105, "year_eur": 1026.25
  },
  "top5": [
    { "entity_id": "sensor.chaudiere_power", "name": "Chaudière", "power_w": 1800, "pct": 63 }
  ],
  "by_room": [
    { "room": "Cuisine", "power_w": 1200, "pct": 42 },
    { "room": "Salle de bain", "power_w": 800, "pct": 28 }
  ],
  "by_type": [
    { "type": "Heating", "power_w": 1800, "pct": 63 },
    { "type": "Water Heater", "power_w": 800, "pct": 28 }
  ],
  "status": { "level": "ok", "message": "Tous les capteurs sont actifs" },
  "quality": {
    "level": "warning",
    "notes": ["2 capteurs sans source énergie fiable"],
    "missing_energy": ["sensor.xxx", "sensor.yyy"]
  },
  "generated_at": "2026-04-08T18:30:00+02:00"
}
```

---

## Gestion d'erreurs

| Cas | Code | Message |
|-----|------|---------|
| Moteur non prêt (catalogue vide) | 503 | "Aucun capteur sélectionné — allez dans Scan" |
| Exception interne | 500 | "Erreur interne" (loggé) |

---

## Auth / CORS

- `requires_auth = True` (hérité `HseBaseView`)
- `cors_allowed = False`

---

## Tests

```bash
# Pas de pytest — utiliser unittest
python3 -m unittest discover -s custom_components/hse -p "test_*.py"
# Ou test manuel via HA dev tools : GET /api/hse/overview
```

---

## Definition of Done

- [x] Puissance live = Σ appareils sélectionnés (hors référence)
- [x] Conso 4 périodes via Recorder long terme (calendar local)
- [x] Coûts HT/TTC + abo proratisé cohérent avec costs.py
- [x] Top 5 + par pièce + par type
- [x] Référence : coverage + delta
- [x] Bloc `quality` explicatif (level, notes, missing_energy)
- [x] 503 si aucun capteur sélectionné
- [x] Auth required, CORS false