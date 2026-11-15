# Contrat API Complet — HSE V3

> Source de vérité unique pour tous les endpoints. Toute modification doit être répercutée ici **avant** d'être codée.

---

## Règles transversales

| # | Règle |
|---|-------|
| 1 | Auth requise sur tous les endpoints (`requires_auth=True`) |
| 2 | `cors_allowed = False` sans exception |
| 3 | Erreur format : `422 { "message": "description lisible" }` |
| 4 | Déjà en cours : `409 Conflict` |
| 5 | Ressource absente : `404 Not Found` |
| 6 | Moteurs non prêts : `503 Service Unavailable` |
| 7 | Dates : ISO 8601 avec TZ (`2026-04-08T18:30:00+02:00`) |
| 8 | € : 2 décimales, kWh : float, W : int |
| 9 | Pagination : `{ total, page, per_page, items[] }` |
| 10 | `PATCH /user_prefs` = merge partiel ; autres = remplacement complet |

---

## Vue d'ensemble

| Méthode | URL | Onglet | Description |
|---------|-----|--------|-------------|
| `GET` | `/ping` | — | Healthcheck |
| `GET` | `/frontend_manifest` | Shell | Version, feature flags, tabs |
| `GET` | `/overview` | 1 | Puissance live, conso, top5, totaux |
| `GET` | `/diagnostic` | 2 | Score qualité, capteurs, alertes |
| `POST` | `/diagnostic` | 2 | Déclenche nouveau diagnostic |
| `GET` | `/catalogue` | 2,3,4 | Liste entités (filtrée, paginée) |
| `POST` | `/catalogue/triage` | 4 | Activer/désactiver/réinitialiser |
| `POST` | `/catalogue/triage/bulk` | 4 | Triage en masse |
| `POST` | `/catalogue/refresh` | 3 | Déclenche re-scan |
| `GET` | `/scan` | 3 | Entités détectées non cataloguées |
| `GET` | `/meta` | 4 | Pièces, types, assignations |
| `POST` | `/meta/sync/preview` | 4 | Diff assignations (avant apply) |
| `POST` | `/meta/sync/apply` | 4 | Applique assignations |
| `GET` | `/settings/pricing` | 4 | Contrat tarifaire actuel |
| `PUT` | `/settings/pricing` | 4 | Met à jour contrat tarifaire |
| `GET` | `/costs` | 8 | Coûts par appareil (polling 60s) |
| `GET` | `/history` | 8 | Historique 12 mois |
| `GET` | `/export` | 8 | Export CSV/JSON |
| `GET` | `/migration/export` | 7 | Détection entités legacy |
| `POST` | `/migration/apply` | 7 | Applique mapping + nettoyage |
| `GET` | `/user_prefs` | Tous | Lit préférences persistantes |
| `PATCH` | `/user_prefs` | Tous | Met à jour préférences (merge) |

---

## Détail par endpoint

### `GET /api/hse/ping`
- **Réponse 200** : `{ status: "ok", version: str, domain: "hse" }`

### `GET /api/hse/frontend_manifest`
- **Réponse 200** : `{ version, domain, tabs: string[], features: object, require_admin: bool }`

### `GET /api/hse/overview`
- **Params** : aucun (polling 30s front, 10s puissance)
- **Réponse 200** :
  - `power_now_w: int`
  - `reference_sensor: { entity_id, power_w, delta_w, delta_pct } | null`
  - `consumption: { today_kwh, today_eur, week_kwh, week_eur, month_kwh, month_eur, year_kwh, year_eur }`
  - `top5: [{ entity_id, name, power_w, pct }]`
  - `by_room: [{ room, power_w, pct }]`
  - `by_type: [{ type, power_w, pct }]`
  - `status: { level: "ok"|"warning"|"error", message: str|null }`
  - `generated_at: datetime`

### `GET /api/hse/diagnostic`
- **Réponse 200** :
  - `score_pct: int` (0–100)
  - `sensors: [{ entity_id, name, status: "ok"|"warning"|"error", issues: string[] }]`
  - `repairs: [{ issue_id, severity, description }]`
  - `storage_stats: { total, selected, ignored, pending }`
  - `last_run_at: datetime|null`

### `POST /api/hse/diagnostic`
- **Body** : `{}`
- **Réponse 200** : `{ started: bool, run_id: str }`

### `GET /api/hse/catalogue`
- **Params** : `?status=all|selected|ignored|pending` (défaut `all`), `?page=int`, `?per_page=int` (max 200)
- **Réponse 200** : `{ total, page, per_page, items: [{ entity_id, name, icon, room, type, status, quality_score }] }`

### `POST /api/hse/catalogue/triage`
- **Body** : `{ entity_id: str, action: "select"|"ignore"|"reset" }`
- **Réponse 200** : `{ entity_id, status }`

### `POST /api/hse/catalogue/triage/bulk`
- **Body** : `{ items: [{ entity_id, action }] }`
- **Réponse 200** : `{ processed: int, errors: string[] }`

### `POST /api/hse/catalogue/refresh`
- **Body** : `{}`
- **Réponse 200** : `{ triggered: bool }`

### `GET /api/hse/scan`
- **Params** : `?domain=str`, `?q=str`, `?page=int`, `?per_page=int`
- **Réponse 200** : `{ total, page, per_page, items: [{ entity_id, name, domain, device, quality_score, suggested_action }] }`

### `GET /api/hse/meta`
- **Réponse 200** : `{ rooms: [{ id, name }], types: string[], assignments: [{ entity_id, room, type, pending: bool }] }`

### `POST /api/hse/meta/sync/preview`
- **Body** : `{ assignments: [{ entity_id, room, type }] }`
- **Réponse 200** : `{ to_add: [], to_update: [], to_remove: [], unchanged: int }`

### `POST /api/hse/meta/sync/apply`
- **Body** : identique à preview
- **Réponse 200** : `{ applied: int, errors: string[] }`

### `GET /api/hse/settings/pricing`
- **Réponse 200** : `{ mode: "flat"|"hphc", price_ht_kwh, price_ttc_kwh, price_hp_ttc_kwh?, price_hc_ttc_kwh?, subscription_eur_month, tax_rate_pct, reference_entity_id }`

### `PUT /api/hse/settings/pricing`
- **Body** : shape identique à GET (complet)
- **Réponse 200** : `{ saved: bool }`

### `GET /api/hse/costs`
- **Params** : `?period=day|week|month|year` (défaut `month`)
- **Réponse 200** : `{ period, generated_at, total_kwh, total_ttc_eur, items: [{ entity_id, name, room, type, power_w, energy_kwh, cost_ht_eur, cost_ttc_eur, pct_total }] }`

### `GET /api/hse/history`
- **Params** : `?entity_id=str` (optionnel), `?granularity=month|week` (défaut `month`)
- **Réponse 200** : `{ entity_id: str|null, granularity, points: [{ label: "YYYY-MM", kwh, eur_ttc }] }`

### `GET /api/hse/export`
- **Params** : `?period=day|week|month|year`, `?format=csv|json` (défaut `csv`)
- **Réponse 200** : fichier CSV/JSON + `Content-Disposition: attachment`

### `GET /api/hse/migration/export`
- **Réponse 200** : `{ legacy_found: int, mappings: [{ legacy_entity_id, suggested_entity_id, confidence: "high"|"medium"|"low", status: "pending"|"validated"|"skipped" }] }`

### `POST /api/hse/migration/apply`
- **Body** : `{ mappings: [{ legacy_entity_id, target_entity_id }], cleanup_legacy: bool }`
- **Réponse 200** : `{ applied: int, cleaned: int, errors: string[] }`

### `GET /api/hse/user_prefs`
- **Réponse 200** : `{ active_tab, overview_period, costs_period, theme, glassmorphism, dynamic_bg }`
- **Défauts** : `overview`, `day`, `month`, `default`, `false`, `false`

### `PATCH /api/hse/user_prefs`
- **Body** : champs partiels (merge)
- **Réponse 200** : objet **complet** après merge
- **Champs valides** : `active_tab` (enum tabs), `overview_period`/`costs_period` (enum), `theme` (string), `glassmorphism`/`dynamic_bg` (bool)

---

## Codes d'erreur par endpoint

| Endpoint | 401 | 404 | 409 | 422 | 503 |
|----------|-----|-----|-----|-----|-----|
| `/ping` | ✅ | | | | |
| `/frontend_manifest` | ✅ | | | | |
| `/overview` | ✅ | | | | ✅ |
| `/diagnostic` (GET) | ✅ | | | | |
| `/diagnostic` (POST) | ✅ | | ✅ | | |
| `/catalogue` | ✅ | | | ✅ | |
| `/catalogue/triage` | ✅ | ✅ | | ✅ | |
| `/catalogue/triage/bulk` | ✅ | | | ✅ | |
| `/catalogue/refresh` | ✅ | | ✅ | | |
| `/scan` | ✅ | | | | ✅ |
| `/meta` | ✅ | | | | |
| `/meta/sync/preview` | ✅ | | | ✅ | |
| `/meta/sync/apply` | ✅ | | ✅ | ✅ | |
| `/settings/pricing` (GET) | ✅ | | | | |
| `/settings/pricing` (PUT) | ✅ | | | ✅ | |
| `/costs` | ✅ | | | ✅ | ✅ |
| `/history` | ✅ | ✅ | | | |
| `/export` | ✅ | | | ✅ | |
| `/migration/export` | ✅ | | | | |
| `/migration/apply` | ✅ | ✅ | ✅ | ✅ | |
| `/user_prefs` (GET) | ✅ | | | | |
| `/user_prefs` (PATCH) | ✅ | | | ✅ | |

---

*Dernière sync : v3.0.119 — Source : `custom_components/hse/api/views/` + `doc/10_api_contrat.md`*