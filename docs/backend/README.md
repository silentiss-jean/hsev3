# Documentation Backend — Index

> Vue d'ensemble des 8 vues API HSE V3

---

## Vues API

| # | Module | Fichier | Endpoints | Description |
|---|--------|---------|-----------|-------------|
| 01 | **Overview** | `01_overview.md` | `GET /api/hse/overview` | Puissance live, conso 4 périodes, top5, par pièce/type, référence, qualité |
| 02 | **Diagnostic** | `02_diagnostic.md` | `GET/POST /api/hse/diagnostic` | Score fiabilité, santé capteurs, alertes Repairs HA, storage stats |
| 03 | **Catalogue & Scan** | `03_catalogue_scan.md` | `GET/POST /api/hse/catalogue*`, `GET/POST /api/hse/scan` | Catalogue paginé, triage select/ignore/reset, scan détection + quality_score |
| 04 | **Meta & Assignations** | `04_meta.md` | `GET/POST /api/hse/meta*` | Pièces, types, assignations (pending), sync preview/apply |
| 05 | **Settings (Tarification)** | `05_settings.md` | `GET/PUT /api/hse/settings/pricing` | Contrat tarifaire flat/HP-HC, validation HT/TTC/TVA |
| 06 | **Coûts, Historique, Export** | `06_costs_history.md` | `GET /api/hse/costs`, `/history`, `/export` | Coûts multi-périodes, séries temporelles, export CSV/JSON |
| 07 | **Migration & UserPrefs** | `07_migration_prefs.md` | `GET/POST /api/hse/migration*`, `GET/PATCH /api/hse/user_prefs` | Assistant V1→V3, préférences UI persistées |

---

## Règles transverses (toutes les vues)

| Règle | Description |
|-------|-------------|
| **Auth** | `requires_auth = True` (hérité `HseBaseView`) — token HA requis |
| **CORS** | `cors_allowed = False` — panel same-origin uniquement |
| **Validation** | Payloads validés **strictement** (types, cohérence, champs requis) — 422 si invalide |
| **Tokens** | **Jamais loggés** — headers `Authorization` exclus des logs |
| **Stockage** | Lecture/écriture **uniquement** via `StorageManager` → `*Store` classes — pas de JSON brut |
| **Erreurs** | Codes HTTP sémantiques : 400 (bad request), 404 (not found), 409 (conflict), 422 (unprocessable), 500 (server) |
| **Async** | Travaux longs (diagnostic, scan, refresh) → `hass.async_create_task()` + run_id / flag running |

---

## Architecture stockage

```
┌──────────────────────────────────────┐
│ API Views (HseBaseView)              │
├──────────────────────────────────────┤
│ StorageManager (storage/manager.py)  │  ← Point unique d'accès
├──────────────────────────────────────┤
│ Stores spécialisés                   │
│  ├── CatalogueStore  → catalogue.json        │
│  ├── MetaStore       → meta.json             │
│  ├── SettingsStore   → settings.json         │
│  ├── UserPrefsStore  → user_prefs.json       │
│  └── MigrationStore  → migration.json        │
├──────────────────────────────────────┤
│ Fichiers JSON (config_dir/hse/)      │
└──────────────────────────────────────┘
```

---

## Engine modules (réutilisés par les vues)

| Module | Fichier | Rôle |
|--------|---------|------|
| `calculation` | `engine/calculation.py` | `compute_totals`, `top_n_by_power`, `get_power_w`, `read_sensor` |
| `cost` | `engine/cost.py` | `cost_summary`, `subscription_eur_month` |
| `period_stats` | `engine/period_stats.py` | `async_energy_detail`, `async_energy_detail_hphc` (Recorder long terme) |
| `group_totals` | `engine/group_totals.py` | `totals_by_type` (agrégation par type via meta) |
| `reference` | `engine/reference.py` | `coverage`, `energy_coverage` (qualité vs compteur référence) |
| `sources` | `engine/sources.py` | `plan_sources` (qualification W/kWh, séparation live/ref) |
| `scan` | `engine/scan.py` | `calculate_quality_score` (détection scan) |
| `time_utils` | `time_utils.py` | `utc_now_iso`, calendrier local TZ HA |

---

## Flux de données type (ex: Overview)

```
GET /api/hse/overview
       │
       ▼
HseOverviewView.get()
       │
       ├── StorageManager.async_load_catalogue() → items selected
       ├── StorageManager.async_load_settings()  → pricing
       ├── StorageManager.async_load_meta()      → assignments (room/type)
       │
       ├── engine.sources.plan_sources()         → live_power / live_energy / reference
       ├── engine.calculation.compute_totals()   → power_now_w
       ├── engine.period_stats.async_energy_detail() → conso par période
       ├── engine.cost.cost_summary()            → coûts HT/TTC + abo
       ├── engine.calculation.top_n_by_power()   → top5
       ├── engine.group_totals.totals_by_type()  → par type
       ├── engine.reference.coverage()           → référence + delta
       └── engine.reference.energy_coverage()    → quality (level, notes, missing)
       │
       ▼
JSON response
```

---

## Definition of Done (global backend)

- [x] 8 vues API documentées avec endpoints, flux, validation, réponses, codes erreur
- [x] Règles transverses (Auth, CORS, Validation, Tokens, Stockage, Erreurs, Async) listées
- [x] Architecture stockage (StorageManager + Stores) décrite
- [x] Engine modules réutilisés listés avec rôle
- [x] Flux de données type illustré