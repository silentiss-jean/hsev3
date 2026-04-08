# HSE V3 — Contrat des endpoints `/api/hse/*`

> **Ce fichier est la source de vérité des interfaces entre le backend Python et le frontend JS.**
> Toute modification d'un endpoint (ajout de champ, changement de type, nouveau code d'erreur)
> doit être répercutée ici **avant** d'être codée.
>
> Associé à DELTA-005. À fermer quand ce fichier est commité et validé.

---

## Format d'erreur uniforme

Tous les endpoints retournent ce format en cas d'erreur, quel que soit le code HTTP :

```json
{
  "error": "ERROR_CODE",
  "message": "Description lisible par un humain",
  "detail": {}
}
```

| Champ | Type | Rôle |
|---|---|---|
| `error` | `string` | Code machine en MAJUSCULES_SNAKE (ex. `NOT_FOUND`, `INVALID_PAYLOAD`) |
| `message` | `string` | Message lisible, jamais de stack trace |
| `detail` | `object` | Contexte supplémentaire optionnel (champs invalides, valeurs reçues…) |

### Codes d'erreur standards

| Code HTTP | `error` | Usage |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | Body mal formé ou champ manquant |
| 400 | `VALIDATION_ERROR` | Valeur hors limites ou type incorrect |
| 401 | `UNAUTHORIZED` | Token absent ou invalide (géré par HA natif) |
| 404 | `NOT_FOUND` | Ressource introuvable |
| 409 | `CONFLICT` | Opération incompatible avec l'état actuel |
| 500 | `INTERNAL_ERROR` | Erreur non anticipée côté backend |
| 503 | `ENGINE_UNAVAILABLE` | Moteur de calcul non initialisé |

---

## Vue d'ensemble — toutes les routes

| Méthode | URL | Onglet(s) | Auth | Description |
|---|---|---|---|---|
| `GET` | `/api/hse/ping` | — | ✓ | Healthcheck, vérifie que le composant est chargé |
| `GET` | `/api/hse/overview` | 1 — Overview | ✓ | Puissance live, conso, top 5, totaux pièces/types |
| `GET` | `/api/hse/diagnostic` | 2 — Diagnostic | ✓ | Score qualité, liste capteurs, alertes Repairs |
| `GET` | `/api/hse/catalogue` | 2, 3, 4 | ✓ | Liste complète des entités cataloguées |
| `POST` | `/api/hse/catalogue/triage` | 4 — Config | ✓ | Activer / désactiver une entité |
| `POST` | `/api/hse/catalogue/triage/bulk` | 4 — Config | ✓ | Triage en masse |
| `POST` | `/api/hse/catalogue/refresh` | 3 — Scan | ✓ | Déclenche un re-scan du catalogue |
| `GET` | `/api/hse/scan` | 3 — Scan | ✓ | Entités détectées non encore cataloguées |
| `GET` | `/api/hse/meta` | 4 — Config | ✓ | Pièces, types, assignations capteur→pièce/type |
| `POST` | `/api/hse/meta/sync/preview` | 4 — Config | ✓ | Aperçu diff assignations avant application |
| `POST` | `/api/hse/meta/sync/apply` | 4 — Config | ✓ | Applique les assignations |
| `GET` | `/api/hse/settings/pricing` | 4 — Config | ✓ | Contrat tarifaire actuel |
| `PUT` | `/api/hse/settings/pricing` | 4 — Config | ✓ | Met à jour le contrat tarifaire |
| `GET` | `/api/hse/costs` | 8 — Costs | ✓ | Tableau coûts par appareil (polling 60s) |
| `GET` | `/api/hse/history` | 8 — Costs | ✓ | Historique 12 mois par appareil |
| `GET` | `/api/hse/export` | 8 — Costs | ✓ | Export CSV ou JSON |
| `GET` | `/api/hse/migration/export` | 7 — Migration | ✓ | Détection entités legacy `home_suivi_elec_*` |
| `POST` | `/api/hse/migration/apply` | 7 — Migration | ✓ | Applique le mapping et nettoie les anciens capteurs |
| `GET` | `/api/hse/user_prefs` | Tous | ✓ | Lit les préférences persistantes de l'utilisateur |
| `PATCH` | `/api/hse/user_prefs` | Tous | ✓ | Met à jour (merge partiel) les préférences |
| `GET` | `/api/hse/frontend_manifest` | Shell | ✓ | Version, feature flags, config panel |

---

## Détail des endpoints

---

### `GET /api/hse/ping`

**Rôle :** Vérifie que le composant HSE est chargé et répond. Utilisé pour la checklist pré-commit et les tests d'intégration.

**Réponse 200 :**
```json
{
  "status": "ok",
  "version": "3.0.0",
  "domain": "hse"
}
```

**Erreurs possibles :** aucune (si 401 → géré par HA natif).

---

### `GET /api/hse/overview`

**Rôle :** Données principales de l'onglet Overview. Pollé toutes les 30s par `live.service.js`.

**Réponse 200 :**
```json
{
  "power_now_w": 1240,
  "reference_sensor": {
    "entity_id": "sensor.linky_power",
    "power_w": 1260,
    "delta_w": 20,
    "delta_pct": 1.6
  },
  "consumption": {
    "today_kwh":   3.2,
    "today_eur":   0.82,
    "week_kwh":   18.4,
    "week_eur":    4.71,
    "month_kwh":  74.1,
    "month_eur":  18.95,
    "year_kwh":  890.2,
    "year_eur":  227.45
  },
  "top5": [
    { "entity_id": "sensor.hse_chauffe_eau", "name": "Chauffe-eau",  "power_w": 2000, "pct": 38.2 },
    { "entity_id": "sensor.hse_four",        "name": "Four",          "power_w": 800,  "pct": 15.3 }
  ],
  "by_room": [
    { "room": "Cuisine",    "power_w": 950,  "pct": 18.1 },
    { "room": "Salle de bain", "power_w": 2000, "pct": 38.2 }
  ],
  "by_type": [
    { "type": "Chauffage",   "power_w": 1200, "pct": 22.9 },
    { "type": "Eau chaude",  "power_w": 2000, "pct": 38.2 }
  ],
  "status": {
    "level": "ok",
    "message": null
  },
  "generated_at": "2026-04-08T18:30:00+02:00"
}
```

**Champs `status.level` possibles :** `"ok"` | `"warning"` | `"error"`

**Erreurs possibles :**

| Code | `error` | Condition |
|---|---|---|
| 503 | `ENGINE_UNAVAILABLE` | `StorageManager` ou moteur de calcul non initialisé |

---

### `GET /api/hse/diagnostic`

**Rôle :** Score qualité, état capteurs, alertes HA Repairs, statistiques Storage.

**Réponse 200 :**
```json
{
  "score_pct": 87,
  "sensors": [
    {
      "entity_id": "sensor.hse_chauffe_eau",
      "name": "Chauffe-eau",
      "status": "ok",
      "issues": []
    },
    {
      "entity_id": "sensor.hse_four",
      "name": "Four",
      "status": "warning",
      "issues": ["helper_manquant"]
    }
  ],
  "repairs": [
    { "issue_id": "hse_missing_helper_four", "severity": "warning", "description": "Helper energy manquant pour Four" }
  ],
  "storage_stats": {
    "total": 42,
    "selected": 35,
    "ignored": 4,
    "pending": 3
  },
  "last_run_at": "2026-04-08T17:00:00+02:00"
}
```

**`sensors[].status` possibles :** `"ok"` | `"warning"` | `"error"`

**`sensors[].issues` possibles :** `"helper_manquant"` | `"entite_introuvable"` | `"valeur_nulle"` | `"nom_trop_long"`

---

### `GET /api/hse/catalogue`

**Rôle :** Liste complète des entités dans le catalogue (toutes, pas seulement les sélectionnées).

**Query params optionnels :**

| Param | Type | Défaut | Description |
|---|---|---|---|
| `status` | `string` | `all` | Filtre : `all` \| `selected` \| `ignored` \| `pending` |
| `page` | `int` | `1` | Pagination |
| `per_page` | `int` | `50` | Max 200 |

**Réponse 200 :**
```json
{
  "total": 42,
  "page": 1,
  "per_page": 50,
  "items": [
    {
      "entity_id": "sensor.hse_chauffe_eau",
      "name": "Chauffe-eau",
      "icon": "mdi:water-boiler",
      "room": "Salle de bain",
      "type": "Eau chaude",
      "status": "selected",
      "quality_score": 95
    }
  ]
}
```

---

### `POST /api/hse/catalogue/triage`

**Rôle :** Activer ou désactiver une entité du catalogue.

**Body :**
```json
{
  "entity_id": "sensor.hse_chauffe_eau",
  "action": "select"
}
```

`action` : `"select"` | `"ignore"` | `"reset"`

**Réponse 200 :**
```json
{ "entity_id": "sensor.hse_chauffe_eau", "status": "selected" }
```

**Erreurs :**

| Code | `error` | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | `entity_id` absent du catalogue |
| 400 | `VALIDATION_ERROR` | `action` invalide |

---

### `POST /api/hse/catalogue/triage/bulk`

**Rôle :** Triage en masse sur une liste d'entités.

**Body :**
```json
{
  "items": [
    { "entity_id": "sensor.hse_chauffe_eau", "action": "select" },
    { "entity_id": "sensor.hse_four",        "action": "ignore" }
  ]
}
```

**Réponse 200 :**
```json
{
  "processed": 2,
  "errors": []
}
```

Si certains items échouent, ils apparaissent dans `errors` mais le reste est appliqué (partial success).

---

### `POST /api/hse/catalogue/refresh`

**Rôle :** Déclenche un re-scan des entités HA et met à jour le catalogue.

**Body :** aucun.

**Réponse 200 :**
```json
{ "triggered": true, "message": "Scan déclenché, résultat disponible via GET /api/hse/scan" }
```

---

### `GET /api/hse/scan`

**Rôle :** Entités détectées non encore dans le catalogue, avec leur score de qualité.

**Query params optionnels :**

| Param | Type | Défaut | Description |
|---|---|---|---|
| `domain` | `string` | `all` | Filtre par domaine HA (ex. `sensor`) |
| `q` | `string` | `""` | Filtre texte libre (nom / entity_id) |
| `page` | `int` | `1` | Pagination |
| `per_page` | `int` | `50` | Max 200 |

**Réponse 200 :**
```json
{
  "total": 12,
  "page": 1,
  "per_page": 50,
  "items": [
    {
      "entity_id": "sensor.new_device_power",
      "name": "New Device Power",
      "domain": "sensor",
      "device": "New Device",
      "quality_score": 78,
      "suggested_action": "select"
    }
  ]
}
```

---

### `GET /api/hse/meta`

**Rôle :** Pièces, types d'appareils, et assignations capteur → pièce/type.

**Réponse 200 :**
```json
{
  "rooms": ["Cuisine", "Salon", "Salle de bain", "Chambre"],
  "types": ["Chauffage", "Eau chaude", Éclairage", "Cuisson"],
  "assignments": [
    {
      "entity_id": "sensor.hse_chauffe_eau",
      "room": "Salle de bain",
      "type": "Eau chaude",
      "pending": false
    }
  ]
}
```

---

### `POST /api/hse/meta/sync/preview`

**Rôle :** Calcule et retourne le diff des assignations avant application.

**Body :**
```json
{
  "assignments": [
    { "entity_id": "sensor.hse_chauffe_eau", "room": "Salle de bain", "type": "Eau chaude" }
  ]
}
```

**Réponse 200 :**
```json
{
  "to_add":    [ { "entity_id": "sensor.hse_chauffe_eau", "room": "Salle de bain", "type": "Eau chaude" } ],
  "to_update": [],
  "to_remove": [],
  "unchanged": 34
}
```

---

### `POST /api/hse/meta/sync/apply`

**Rôle :** Applique définitivement les assignations.

**Body :** identique à `meta/sync/preview`.

**Réponse 200 :**
```json
{ "applied": 1, "errors": [] }
```

---

### `GET /api/hse/settings/pricing`

**Rôle :** Retourne le contrat tarifaire configuré.

**Réponse 200 :**
```json
{
  "mode": "flat",
  "price_ht_kwh": 0.2276,
  "price_ttc_kwh": 0.2516,
  "subscription_eur_month": 9.53,
  "tax_rate_pct": 10.5
}
```

`mode` : `"flat"` | `"hphc"`

En mode `hphc`, deux champs supplémentaires sont présents :
```json
{
  "mode": "hphc",
  "price_hp_ttc_kwh": 0.2516,
  "price_hc_ttc_kwh": 0.1650,
  "...": "..."
}
```

---

### `PUT /api/hse/settings/pricing`

**Rôle :** Met à jour le contrat tarifaire.

**Body :** même shape que la réponse de `GET /api/hse/settings/pricing`.

**Réponse 200 :**
```json
{ "saved": true }
```

**Erreurs :**

| Code | `error` | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Prix négatif, mode inconnu, champ manquant |

---

### `GET /api/hse/costs`

**Rôle :** Tableau des coûts par appareil. Pollé toutes les 60s par `costs.view.js`.

**Query params optionnels :**

| Param | Type | Défaut | Description |
|---|---|---|---|
| `period` | `string` | `day` | `day` \| `week` \| `month` \| `year` |

**Réponse 200 :**
```json
{
  "period": "month",
  "generated_at": "2026-04-08T18:30:00+02:00",
  "items": [
    {
      "entity_id":   "sensor.hse_chauffe_eau",
      "name":        "Chauffe-eau",
      "room":        "Salle de bain",
      "type":        "Eau chaude",
      "power_w":     2000,
      "energy_kwh":  120.4,
      "cost_ht_eur": 27.40,
      "cost_ttc_eur": 30.31,
      "pct_total":   38.2
    }
  ],
  "total_kwh":   315.2,
  "total_ttc_eur": 79.32
}
```

**Erreurs :**

| Code | `error` | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `period` invalide |
| 503 | `ENGINE_UNAVAILABLE` | Moteur `cost.py` non initialisé |

---

### `GET /api/hse/history`

**Rôle :** Historique de consommation sur les 12 derniers mois, pour un appareil ou global.

**Query params :**

| Param | Type | Requis | Description |
|---|---|---|---|
| `entity_id` | `string` | Non | Si absent → total global |
| `granularity` | `string` | Non | `month` (défaut) \| `week` |

**Réponse 200 :**
```json
{
  "entity_id": null,
  "granularity": "month",
  "points": [
    { "label": "2025-05", "kwh": 310.2, "eur_ttc": 78.01 },
    { "label": "2025-06", "kwh": 295.8, "eur_ttc": 74.38 }
  ]
}
```

---

### `GET /api/hse/export`

**Rôle :** Exporte les données de coûts en CSV ou JSON.

**Query params :**

| Param | Type | Défaut | Description |
|---|---|---|---|
| `format` | `string` | `csv` | `csv` \| `json` |
| `period` | `string` | `month` | `day` \| `week` \| `month` \| `year` |

**Réponse 200 :**
- `Content-Type: text/csv` si `format=csv`
- `Content-Type: application/json` si `format=json` (même shape que `GET /api/hse/costs`)
- `Content-Disposition: attachment; filename="hse_export_<period>_<date>.csv"`

---

### `GET /api/hse/migration/export`

**Rôle :** Détecte les entités legacy `sensor.home_suivi_elec_*` et propose un mapping vers `sensor.hse_*`.

**Réponse 200 :**
```json
{
  "legacy_found": 8,
  "mappings": [
    {
      "legacy_entity_id": "sensor.home_suivi_elec_chauffe_eau_energy",
      "suggested_entity_id": "sensor.hse_chauffe_eau_energy",
      "confidence": "high",
      "status": "pending"
    }
  ]
}
```

`confidence` : `"high"` | `"medium"` | `"low"`

`status` : `"pending"` | `"validated"` | `"skipped"`

---

### `POST /api/hse/migration/apply`

**Rôle :** Applique le mapping validé et nettoie les anciens capteurs.

**Body :**
```json
{
  "mappings": [
    {
      "legacy_entity_id": "sensor.home_suivi_elec_chauffe_eau_energy",
      "target_entity_id": "sensor.hse_chauffe_eau_energy"
    }
  ],
  "cleanup_legacy": true
}
```

**Réponse 200 :**
```json
{
  "applied": 8,
  "cleaned": 8,
  "errors": []
}
```

**Erreurs :**

| Code | `error` | Condition |
|---|---|---|
| 409 | `CONFLICT` | `target_entity_id` déjà existant dans le catalogue |
| 404 | `NOT_FOUND` | `legacy_entity_id` introuvable dans HA |

---

### `GET /api/hse/user_prefs`

**Rôle :** Lit les préférences persistantes de l'utilisateur (remplace `localStorage`).

**Réponse 200 :**
```json
{
  "active_tab": "overview",
  "overview_period": "month",
  "costs_period": "month",
  "theme": "default",
  "glassmorphism": false,
  "dynamic_bg": true
}
```

### `PATCH /api/hse/user_prefs`

**Rôle :** Met à jour **partiellement** les préférences (merge). Seuls les champs envoyés sont écrasés.

**Body (exemple partiel) :**
```json
{ "costs_period": "week", "theme": "dark_blue" }
```

**Réponse 200 :**
```json
{
  "active_tab": "overview",
  "overview_period": "month",
  "costs_period": "week",
  "theme": "dark_blue",
  "glassmorphism": false,
  "dynamic_bg": true
}
```

La réponse est toujours l'objet **complet** après merge.

**Champs et valeurs valides :**

| Champ | Type | Valeurs possibles |
|---|---|---|
| `active_tab` | `string` | `overview` \| `diagnostic` \| `scan` \| `config` \| `custom` \| `cards` \| `migration` \| `costs` |
| `overview_period` | `string` | `day` \| `week` \| `month` \| `year` |
| `costs_period` | `string` | `day` \| `week` \| `month` \| `year` |
| `theme` | `string` | Toute clé de thème définie dans les tokens CSS |
| `glassmorphism` | `bool` | `true` \| `false` |
| `dynamic_bg` | `bool` | `true` \| `false` |

**Erreurs :**

| Code | `error` | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Champ inconnu ou valeur hors enum |

---

### `GET /api/hse/frontend_manifest`

**Rôle :** Métadonnées de configuration pour le shell du panel.

**Réponse 200 :**
```json
{
  "version": "3.0.0",
  "domain": "hse",
  "tabs": ["overview", "diagnostic", "scan", "config", "custom", "cards", "migration", "costs"],
  "features": {
    "migration": true,
    "export_csv": true,
    "hphc_mode": false
  },
  "require_admin": true
}
```

---

## Règles transversales

1. **Toutes les dates** sont en ISO 8601 avec timezone : `"2026-04-08T18:30:00+02:00"`
2. **Tous les montants** en euros sont arrondis à 2 décimales
3. **Tous les pourcentages** sont des `float` entre 0 et 100
4. **Toutes les energies** sont en `kwh` (float), toutes les puissances en `w` (int)
5. **Pagination** : toujours `{ total, page, per_page, items[] }` pour les listes
6. **Merge partiel** : uniquement sur `PATCH /api/hse/user_prefs` — tous les autres endpoints remplacent complètement
7. **Content-Type** : toujours `application/json` sauf pour l'export CSV
