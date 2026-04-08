# HSE V3 — Contrat API backend

> Source de vérité des interfaces entre le backend Python et le frontend JS.
> Toute modification d'un endpoint doit être répercutée ici **avant** d'être codée.
>
> **Décisions de session (2026-04-08) :**
> - Format des fiches : **compact** (méthode + URL + params + champs + erreurs, pas d'exemples JSON)
> - Format d'erreur : **HA natif** — code HTTP + `{"message": "description lisible"}`
> - Tous les endpoints héritent de `HseBaseView(requires_auth=True, cors_allowed=False)`
> - Préfixe commun : `/api/hse/`

---

## Règles transversales

| # | Règle |
|---|---|
| 1 | Tout appel sans token valide → `401 Unauthorized` (géré par HA natif) |
| 2 | Payload invalide → `422 Unprocessable Entity` + `{"message": "..."}` |
| 3 | Opération déjà en cours → `409 Conflict` |
| 4 | Ressource absente → `404 Not Found` |
| 5 | Moteurs non initialisés → `503 Service Unavailable` |
| 6 | Dates en ISO 8601 avec timezone : `2026-04-08T18:30:00+02:00` |
| 7 | Montants euros arrondis à 2 décimales, énergies en `kwh` (float), puissances en `w` (int) |
| 8 | Listes paginniées : `{ total, page, per_page, items[] }` |
| 9 | `PATCH /user_prefs` = merge partiel. Tous les autres endpoints remplacent complètement. |
| 10 | `cors_allowed = False` sans exception |

---

## Vue d'ensemble

| Méthode | URL | Onglet | Description |
|---|---|---|---|
| `GET` | `/ping` | — | Healthcheck |
| `GET` | `/frontend_manifest` | Shell | Version, feature flags |
| `GET` | `/overview` | 1 | Puissance live, conso, top5, totaux |
| `GET` | `/diagnostic` | 2 | Score qualité, capteurs, alertes Repairs |
| `POST` | `/diagnostic` | 2 | Déclenche un nouveau diagnostic |
| `GET` | `/catalogue` | 2,3,4 | Liste entités cataloguées (filtrée, paginée) |
| `POST` | `/catalogue/triage` | 4 | Activer/désactiver une entité |
| `POST` | `/catalogue/triage/bulk` | 4 | Triage en masse |
| `POST` | `/catalogue/refresh` | 3 | Déclenche un re-scan |
| `GET` | `/scan` | 3 | Entités détectées non encore cataloguées |
| `GET` | `/meta` | 4 | Pièces, types, assignations |
| `POST` | `/meta/sync/preview` | 4 | Diff assignations (avant application) |
| `POST` | `/meta/sync/apply` | 4 | Applique les assignations |
| `GET` | `/settings/pricing` | 4 | Contrat tarifaire actuel |
| `PUT` | `/settings/pricing` | 4 | Met à jour le contrat tarifaire |
| `GET` | `/costs` | 8 | Coûts par appareil (polling 60s) |
| `GET` | `/history` | 8 | Historique 12 mois |
| `GET` | `/export` | 8 | Export CSV ou JSON |
| `GET` | `/migration/export` | 7 | Détection entités legacy |
| `POST` | `/migration/apply` | 7 | Applique le mapping + nettoyage |
| `GET` | `/user_prefs` | Tous | Lit les préférences persistantes |
| `PATCH` | `/user_prefs` | Tous | Met à jour les préférences (merge partiel) |

---

## Détail des endpoints

---

### `GET /api/hse/ping`
- **Params** : aucun
- **Réponse 200** : `{ status: "ok", version: str, domain: "hse" }`
- **Erreurs** : 401

---

### `GET /api/hse/frontend_manifest`
- **Params** : aucun
- **Réponse 200** : `{ version: str, domain: str, tabs: list[str], features: dict, require_admin: bool }`
- **Erreurs** : 401

---

### `GET /api/hse/overview`
- **Params** : aucun (polling 30s côté front)
- **Réponse 200** :
  - `power_now_w: int`
  - `reference_sensor: { entity_id, power_w, delta_w, delta_pct } | null`
  - `consumption: { today_kwh, today_eur, week_kwh, week_eur, month_kwh, month_eur, year_kwh, year_eur }`
  - `top5: list[{ entity_id, name, power_w, pct }]`
  - `by_room: list[{ room, power_w, pct }]`
  - `by_type: list[{ type, power_w, pct }]`
  - `status: { level: "ok"|"warning"|"error", message: str|null }`
  - `generated_at: datetime`
- **Erreurs** : 401, 503

---

### `GET /api/hse/diagnostic`
- **Params** : aucun
- **Réponse 200** :
  - `score_pct: int` (0–100)
  - `sensors: list[{ entity_id, name, status: "ok"|"warning"|"error", issues: list[str] }]`
  - `repairs: list[{ issue_id, severity, description }]`
  - `storage_stats: { total, selected, ignored, pending }`
  - `last_run_at: datetime | null`
- **Erreurs** : 401

### `POST /api/hse/diagnostic`
- **Body** : `{}` (déclenche un nouveau diagnostic)
- **Réponse 200** : `{ started: bool, run_id: str }`
- **Erreurs** : 401, 409 (déjà en cours)

---

### `GET /api/hse/catalogue`
- **Params** : `?status=all|selected|ignored|pending` (défaut `all`), `?page=int`, `?per_page=int` (max 200)
- **Réponse 200** : `{ total, page, per_page, items: list[{ entity_id, name, icon, room, type, status, quality_score }] }`
- **Erreurs** : 401, 422

### `POST /api/hse/catalogue/triage`
- **Body** : `{ entity_id: str, action: "select"|"ignore"|"reset" }`
- **Réponse 200** : `{ entity_id, status }`
- **Erreurs** : 401, 404, 422

### `POST /api/hse/catalogue/triage/bulk`
- **Body** : `{ items: list[{ entity_id, action }] }`
- **Réponse 200** : `{ processed: int, errors: list[str] }` (partial success accepté)
- **Erreurs** : 401, 422

### `POST /api/hse/catalogue/refresh`
- **Body** : aucun
- **Réponse 200** : `{ triggered: bool }`
- **Erreurs** : 401, 409 (scan déjà en cours)

---

### `GET /api/hse/scan`
- **Params** : `?domain=str`, `?q=str`, `?page=int`, `?per_page=int`
- **Réponse 200** : `{ total, page, per_page, items: list[{ entity_id, name, domain, device, quality_score, suggested_action }] }`
- **Erreurs** : 401, 503

---

### `GET /api/hse/meta`
- **Params** : aucun
- **Réponse 200** : `{ rooms: list[str], types: list[str], assignments: list[{ entity_id, room, type, pending: bool }] }`
- **Erreurs** : 401

### `POST /api/hse/meta/sync/preview`
- **Body** : `{ assignments: list[{ entity_id, room, type }] }`
- **Réponse 200** : `{ to_add: list, to_update: list, to_remove: list, unchanged: int }`
- **Erreurs** : 401, 422

### `POST /api/hse/meta/sync/apply`
- **Body** : identique à `meta/sync/preview`
- **Réponse 200** : `{ applied: int, errors: list[str] }`
- **Erreurs** : 401, 409, 422

---

### `GET /api/hse/settings/pricing`
- **Params** : aucun
- **Réponse 200** : `{ mode: "flat"|"hphc", price_ht_kwh, price_ttc_kwh, price_hp_ttc_kwh?, price_hc_ttc_kwh?, subscription_eur_month, tax_rate_pct }`
- **Erreurs** : 401

### `PUT /api/hse/settings/pricing`
- **Body** : même shape que la réponse GET (complet, pas partiel)
- **Réponse 200** : `{ saved: bool }`
- **Erreurs** : 401, 422

---

### `GET /api/hse/costs`
- **Params** : `?period=day|week|month|year` (défaut `month`)
- **Réponse 200** : `{ period, generated_at, total_kwh, total_ttc_eur, items: list[{ entity_id, name, room, type, power_w, energy_kwh, cost_ht_eur, cost_ttc_eur, pct_total }] }`
- **Erreurs** : 401, 422, 503

### `GET /api/hse/history`
- **Params** : `?entity_id=str` (optionnel — si absent : global), `?granularity=month|week` (défaut `month`)
- **Réponse 200** : `{ entity_id: str|null, granularity, points: list[{ label: "YYYY-MM", kwh, eur_ttc }] }`
- **Erreurs** : 401, 404 (si entity_id fourni mais inconnu)

### `GET /api/hse/export`
- **Params** : `?period=day|week|month|year`, `?format=csv|json` (défaut `csv`)
- **Réponse 200** : fichier CSV ou JSON (même shape que `/costs`)
- **Headers** : `Content-Disposition: attachment; filename="hse_export_<period>_<date>.csv"`
- **Erreurs** : 401, 422

---

### `GET /api/hse/migration/export`
- **Params** : aucun
- **Réponse 200** : `{ legacy_found: int, mappings: list[{ legacy_entity_id, suggested_entity_id, confidence: "high"|"medium"|"low", status: "pending"|"validated"|"skipped" }] }`
- **Erreurs** : 401

### `POST /api/hse/migration/apply`
- **Body** : `{ mappings: list[{ legacy_entity_id, target_entity_id }], cleanup_legacy: bool }`
- **Réponse 200** : `{ applied: int, cleaned: int, errors: list[str] }`
- **Erreurs** : 401, 404, 409, 422

---

### `GET /api/hse/user_prefs`
- **Params** : aucun
- **Réponse 200** : `{ active_tab, overview_period, costs_period, theme, glassmorphism, dynamic_bg }`
- **Valeurs par défaut** (retournées si jamais modifiées) :
  - `active_tab: "overview"`
  - `overview_period: "day"`
  - `costs_period: "month"`
  - `theme: "default"`
  - `glassmorphism: false`
  - `dynamic_bg: false`
- **Stockage backend** : `StorageManager` dans `storage/manager.py` — fichier HA natif `.storage/hse_user_prefs` (Store HA)
- **Erreurs** : 401

### `PATCH /api/hse/user_prefs`
- **Body** : un ou plusieurs champs (merge partiel — seuls les champs envoyés sont écrasés)
- **Réponse 200** : objet **complet** après merge (même shape que GET, pas juste les champs modifiés)
- **Champs valides** :
  - `active_tab` : `overview|diagnostic|scan|config|custom|cards|migration|costs`
  - `overview_period` / `costs_period` : `day|week|month|year`
  - `theme` : toute clé de thème définie dans les tokens CSS
  - `glassmorphism` / `dynamic_bg` : `bool`
- **Erreurs** : 401, 422 (champ inconnu ou valeur hors enum)
