# HSE V3 — Synthèse décisionnelle & Spécifications consolidées

> Document de référence issu de la comparaison de `analyse0.md` et `analyse.md` du dépôt `hsev3`.  
> Date : 2026-04-07 | Destinataire : développement de la V3 de Home Suivi Élec

---

## 1. Bilan comparatif des deux analyses

Les deux fichiers d'analyse (`analyse0.md` = analyse0, `analyse.md` = analyse) ont été produits le même jour sur les mêmes sources (V1 `home_suivi_elec` + V2 `hse`). Ils convergent sur les diagnostics clés mais divergent sur la structure cible et le niveau de détail des spécifications.

| Dimension | analyse0.md | analyse.md | Verdict V3 |
|---|---|---|---|
| **Domaine HA** | `hsev3` | `hse` | **`hse`** — évite la casse des automations existantes |
| **Structure fichiers backend** | Sous-dossiers thématiques (`catalogue/`, `meta/`, `engine/`, `sensors/`, `api/`) | Flat dans `custom_components/hse/` avec sous-dossier `api/views/` | **Hybride** : sous-dossiers pour `catalogue/`, `meta/`, `engine/` + views séparées comme dans analyse.md |
| **Nombre d'onglets UI** | 5 onglets (Dashboard, Capteurs, Config, Historique, Diagnostics) | 8 onglets (Overview, Diagnostic, Scan, Config, Custom, Cards, Migration, Costs) | **8 onglets d'analyse.md** — plus granulaire, moins de surcharge par onglet |
| **Règles de rendering** | Principes généraux (deep equal, textContent) | Règles formalisées R1–R5 avec code | **Règles R1–R5 d'analyse.md** — explicites et vérifiables |
| **Nommage API** | `/api/hsev3/*` | `/api/hse/*` | **`/api/hse/*`** (cohérent avec le domaine `hse`) |
| **Plan de phases** | 5 phases (Squelette → Meta → Moteurs → APIs → Frontend) | 4 phases (Fondations → Onglets stables → Réintégration V1 → Polish) | **Fusion** : 5 phases d'analyse0.md + séquençage concret d'analyse.md |
| **Sensor platform custom** | Explicitement interdit (no `sensor.py`) | Non mentionné | **Pas de sensor.py** (règle d'analyse0.md conservée) |
| **Token auth** | `window.__hseToken` injecté au mount | `hass.auth.data.access_token` injecté dans `hse.fetch.js` | **`hse.fetch.js`** d'analyse.md — plus propre, centralisé |
| **Persistance préférences UI** | Non abordé explicitement | `user_prefs` API (remplace localStorage) | **`user_prefs` API** d'analyse.md — règle R4 |

---

## 2. Ce qui est retenu de chaque analyse

### Retenu de `analyse.md` (complet + code + règles formelles)

- **Règles de rendering R1–R5** (Séparation mount/update, re-entrance guard, JSON.stringify signature, no localStorage, skeleton systématique) — c'est la correction formelle de la régression V2
- **8 onglets nommés** avec contrat `{ mount, update_hass, unmount }` par onglet — granulaire, maintenable
- **`hse.fetch.js`** centralisant l'injection du token HA dans tous les appels fetch
- **`user_prefs` API** côté backend pour remplacer `localStorage`
- **Détail des sources de données par onglet** : chaque onglet a son endpoint, sa fréquence de polling, sa règle de rebuild DOM
- **Exemples de code** : patterns `HseBaseView`, fetch avec token, règles de rendering
- **Liste précise des fichiers à exclure de V3** (audit_*.py, fix_*.py, debug_*.py, sensor.py.backup)
- **`yamlComposer.js`** conservé pour l'onglet Cards
- **Wizard 3 étapes** pour l'onglet Migration (Détection → Validation → Application)

### Retenu de `analyse0.md` (architecture profonde + backend riche)

- **Sous-dossiers thématiques** : `catalogue/`, `meta/`, `engine/`, `sensors/`, `api/` — meilleure séparabilité que le flat d'analyse.md
- **`engine/group_totals.py`** et **`engine/calculation.py`** explicitement planifiés — absents de la structure analyse.md
- **`storage/manager.py`** unifié (StorageManager V1 épuré) — la V2 n'a pas de StorageManager direct
- **`options_flow.py`** complet (capteur référence + tarif €/kWh) — absent de la structure analyse.md
- **`sensors/sync_manager.py`** et **`sensors/name_fixer.py`** — lifecycle et nommage capteurs
- **`energy_tracking.py`** et **`power_monitoring.py`** identifiés comme sources V1 à intégrer
- **`services.yaml`** et 9 services HA déclarés — accès HA actions (generate_local_data, migrate_cleanup…)
- **Règle "no sensor.py"** + pattern `hse_sensors_ready` event — évite les race conditions de V1
- **Checklist pré-commit** formalisée (10 items vérifiables avant tout premier commit)
- **Détection continue** via `state_changed` (V1) à réintégrer proprement
- **Capteur de référence externe** (`use_external` + `external_capteur`) mentionné dans onglet Dashboard

---

## 3. Architecture cible V3 consolidée

### 3.1 Domaine et nommage

```
Domaine HA    : hse
Version       : 3.0.0
API prefix    : /api/hse/
Panel route   : /hse-panel
```

### 3.2 Structure backend (fusion des deux analyses)

```
custom_components/hse/
├── __init__.py               # < 200 lignes — orchestration uniquement
├── manifest.json             # version: 3.0.0, domain: hse
├── const.py                  # Constantes métier complètes (V1 enrichi)
├── config_flow.py            # Config flow HA (minimal)
├── options_flow.py           # Options flow : capteur référence + tarif €/kWh
├── services.yaml             # 9 services HA (generate_local_data, migrate_cleanup…)
├── repairs.py                # HA Repairs natif (V2)
├── time_utils.py
│
├── catalogue/                # V2 conservé intact
│   ├── __init__.py
│   ├── scan_engine.py
│   ├── manager.py            # (catalogue_manager.py V2)
│   ├── store.py
│   └── schema.py
│
├── meta/                     # V2 conservé intact
│   ├── __init__.py
│   ├── sync.py
│   ├── store.py
│   └── assignments.py        # Logique assignation capteur → pièce/type
│
├── engine/                   # Moteurs métier — V1 réintégrés + V2
│   ├── __init__.py
│   ├── cost.py               # shared_cost_engine.py V2 (INTACT)
│   ├── calculation.py        # calculation_engine.py V1
│   ├── group_totals.py       # group_totals.py V1
│   └── analytics.py          # history_analytics.py V1
│
├── sensors/                  # Gestion capteurs — V1 épuré
│   ├── __init__.py
│   ├── quality_scorer.py     # sensor_quality_scorer.py V1
│   ├── sync_manager.py       # sensor_sync_manager.py V1 (épuré)
│   └── name_fixer.py         # sensor_name_fixer.py V1
│
├── storage/
│   ├── __init__.py
│   └── manager.py            # StorageManager V1 épuré
│
├── api/
│   ├── __init__.py
│   ├── base.py               # HseBaseView(requires_auth=True, cors_allowed=False)
│   └── views/
│       ├── ping.py
│       ├── dashboard_overview.py
│       ├── catalogue_get.py
│       ├── catalogue_refresh.py
│       ├── catalogue_item_triage.py
│       ├── catalogue_triage_bulk.py
│       ├── costs_compare.py
│       ├── diagnostic_check.py
│       ├── entities_scan.py
│       ├── history.py          # wraps engine/analytics.py
│       ├── migration_export.py
│       ├── migration_apply.py  # NOUVEAU V3
│       ├── settings_pricing.py
│       ├── meta.py
│       ├── meta_sync_apply.py
│       ├── meta_sync_preview.py
│       ├── export_api.py       # export CSV/JSON (V1)
│       ├── user_prefs.py       # NOUVEAU V3 — remplace localStorage
│       └── frontend_manifest.py
│
├── translations/
│   ├── fr.json
│   └── en.json
│
└── web_static/               # Servis via StaticPathConfig (pas de shutil.copytree)
    └── panel/
        ├── hse_panel.html
        ├── hse_panel.js         # V2 + fix localStorage → user_prefs API
        ├── style.hse.panel.css
        └── features/
            ├── overview/        # V2 + règles R1-R5
            ├── diagnostic/      # V2 + règles R1-R5
            ├── scan/            # V2 + quality scorer V1
            ├── config/          # V2 + rooms/types (meta V2) + validation frontend
            ├── custom/          # V2 conservé
            ├── cards/           # V2 conservé (yamlComposer.js)
            ├── migration/       # V2 + wizard 3 étapes
            └── costs/           # V2 réécrit règles R1-R5 + history V1 + export CSV
        └── shared/
            ├── ui/dom.js
            ├── ui/table.js
            ├── hse.store.js
            ├── hse.fetch.js     # MODIFIÉ : inject Authorization header auto
            ├── core/shell.js
            ├── core/panel.actions.js
            ├── core/live.store.js
            ├── core/live.service.js
            └── styles/
                ├── hse_tokens.shadow.css
                ├── hse_themes.shadow.css
                ├── hse_alias.v2.css
                └── tokens.css
```

---

## 4. Règles de sécurité V3 (non négociables)

Issues des deux analyses, elles sont identiques et cumulées :

1. `requires_auth = True` sur **tous** les endpoints sans exception
2. `cors_allowed = False` sur tous les endpoints
3. Panel `require_admin = True` — réservé aux admins HA
4. Aucun token en clair dans les logs
5. Validation stricte des payloads POST (`entity_id` format, types, limites)
6. `StaticPathConfig` — pas de `shutil.copytree`
7. Aucun fichier de dev dans le composant installé
8. `proxy_api.py` V1 **supprimé** définitivement
9. Toute mutation critique : `require_admin=True` ou vérification rôle HA

```python
# Pattern V3 obligatoire sur tous les endpoints
class HseBaseView(HomeAssistantView):
    requires_auth = True
    cors_allowed = False
```

```javascript
// hse.fetch.js — injection token centralisée
export function hseFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${window.__hseToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
}
```

---

## 5. Règles de rendering frontend V3 — R1 à R5

Source : `analyse.md` — formalisées et vérifiables.

### R1 — Séparation montage / mise à jour
```
mount(container, ctx)  → construit le DOM, init données, 1er fetch
update_hass(hass)      → met à jour hass local UNIQUEMENT, ne reconstruit JAMAIS le DOM
unmount()              → annule tous timers et subscriptions
```

### R2 — Protection re-entrance (anti race condition)
```javascript
if (this._fetching) return;
this._fetching = true;
try {
  const data = await hseFetch('/api/hse/...');
  if (!this._mounted) return;
  this._render(data);
} finally {
  this._fetching = false;
}
```

### R3 — Signature JSON avant render
```javascript
const sig = JSON.stringify(data);
if (sig === this._last_sig) return;
this._last_sig = sig;
this._render(data);
```

### R4 — Pas de localStorage
Tout état persistant passe par `PATCH /api/hse/user_prefs`. Plus de `localStorage`.

### R5 — Skeleton systématique
Tout onglet en attente de données asynchrones affiche un skeleton loader `.skeleton` pendant le fetch initial.

### Règle supplémentaire (analyse0.md) — Pas de re-render complet
```javascript
// ❌ INTERDIT
container.innerHTML = buildHTML(data);

// ✅ OBLIGATOIRE
container.querySelector('.power-value').textContent = `${data.power} W`;
```

---

## 6. Spécifications des 8 onglets V3

### Onglet 1 — `overview` (Accueil/Dashboard)

**Affiche :**
- Puissance totale en cours (W) — live 10s
- Consommation jour/semaine/mois/année (kWh + coût TTC €)
- Top 5 appareils les plus consommateurs (live)
- Totaux par pièce et par type d'appareil (rings/bento) — **ajout d'analyse0.md**
- Capteur de référence avec comparaison vs somme capteurs — **ajout d'analyse0.md**
- Statut global (OK / warning / erreur) + lien vers Diagnostic

**Source de données :** `GET /api/hse/overview` (polling 30s via `live.service.js`)  
**Rendering :** DOM construit une fois dans `mount()`, `update_hass()` ne touche que les `<span>` numériques

---

### Onglet 2 — `diagnostic` (Diagnostic)

**Affiche :**
- Score qualité global (%)
- Liste capteurs avec statut détaillé (OK / helper manquant / entité introuvable)
- Alertes HA Repairs natives — **ajout d'analyse0.md**
- Statistiques Storage (nb catalogués, sélectionnés, ignorés) — **ajout d'analyse0.md**
- Résultat dernier diagnostic + timestamp
- Bouton "Relancer le diagnostic"

**Source de données :** `GET /api/hse/diagnostic` + `GET /api/hse/catalogue`

---

### Onglet 3 — `scan` (Détection)

**Affiche :**
- Entités détectées non encore dans le catalogue
- Score de qualité par entité (`sensor_quality_scorer.py` V1)
- Bouton "Ajouter au catalogue" unitaire ou en masse
- Filtre domaine / device / mot-clé
- Option "Meilleur capteur par device" automatique — **ajout d'analyse0.md**

**Source de données :** `POST /api/hse/scan` (scan déclenché explicitement, résultats paginés > 50)

---

### Onglet 4 — `config` (Configuration)

**Affiche (deux sections) :**

**Appareils :** liste catalogue, activer/désactiver, éditer nom/icône, supprimer, triage en masse, synchroniser métadonnées  
**Rooms & Types :** assignation capteur → pièce/type, diff pending, création/renommage pièces et types — **enrichi d'analyse0.md**  
**Tarifs :** formulaire contrat (fixe/HP-HC, prix HT/TTC, abonnement), prévisualisation coût mensuel

**Source de données :** `GET/POST/PATCH /api/hse/catalogue/*` + `GET/PUT /api/hse/settings/pricing` + `GET/POST /api/hse/meta`

---

### Onglet 5 — `custom` (Customisation)

**Affiche :**
- Sélecteur de thème avec prévisualisation couleurs
- Toggles : fond dynamique, glassmorphism
- Prévisualisation live via `data-theme`
- Bouton "Réinitialiser"

**Persistance :** `PATCH /api/hse/user_prefs` (règle R4)

---

### Onglet 6 — `cards` (Génération YAML Lovelace)

**Affiche :**
- Checkboxes appareils + options (type de carte, coût, période)
- Prévisualisation YAML (éditeur read-only + coloration syntaxique)
- Bouton "Copier" + "Télécharger .yaml"

**Source :** `yamlComposer.js` V2 + catalogue en mémoire (chargé au boot)

---

### Onglet 7 — `migration` (Migration capteurs)

**Affiche :**
- Wizard 3 étapes : Détection → Validation → Application
- Détection entités `sensor.home_suivi_elec_*` legacy
- Mapping proposé vers `sensor.hse_*` + validation utilisateur
- Rapport post-migration + bouton "Nettoyer anciens capteurs"

**Données persistées dans le store** pendant la navigation entre onglets  
**Source de données :** `GET /api/hse/migration/export` + `POST /api/hse/migration/apply`

---

### Onglet 8 — `costs` (Analyse de coûts)

**Affiche :**
- Tableau coûts par appareil : puissance live, énergie jour/semaine/mois/année, coût HT/TTC
- Graphique répartition (camembert top 10)
- Historique 12 derniers mois (via `history_analytics.py` V1 réintégré)
- Filtre période + export CSV
- Comparaison mois/mois ou semaine/semaine

**Règle critique (bug V2 corrigé) :** tableau construit une fois dans `mount()`, données UNIQUEMENT depuis backend, flag `_is_rendering`, signature JSON avant update  
**Source de données :** `GET /api/hse/costs` (polling 60s) + `GET /api/hse/history`

---

## 7. Sources fichiers : ce qui vient de chaque version

| Fichier V3 | Source | Notes |
|---|---|---|
| `__init__.py` | V2 | < 200 lignes |
| `catalogue/*` | V2 intact | `scan_engine`, `manager`, `store`, `schema` |
| `meta/*` | V2 intact | `sync`, `store` + `assignments` nouveau |
| `engine/cost.py` | V2 (`shared_cost_engine.py`) | INTACT — le plus fiable |
| `engine/calculation.py` | V1 | `calculation_engine.py` |
| `engine/group_totals.py` | V1 | Totaux pièces/types — absent de V2 |
| `engine/analytics.py` | V1 | `history_analytics.py` — absent de V2 |
| `sensors/quality_scorer.py` | V1 | Scoring capteurs |
| `sensors/sync_manager.py` | V1 | Épuré |
| `sensors/name_fixer.py` | V1 | Correction noms longs |
| `storage/manager.py` | V1 | StorageManager épuré |
| `repairs.py` | V2 | HA Repairs natif |
| `options_flow.py` | V1 | Capteur référence + tarif |
| `services.yaml` | V1 | 9 services HA extraits de `__init__.py` |
| `translations/` | V2 | fr.json + en.json |
| `api/base.py` | NOUVEAU | `HseBaseView` avec `requires_auth=True` |
| `api/views/user_prefs.py` | NOUVEAU | Remplace localStorage |
| `api/views/migration_apply.py` | NOUVEAU | Wizard migration étape 3 |
| `api/views/export_api.py` | V1 | `export.py` + `energy_export.py` |
| `web_static/styles/*` | V2 | Tokens CSS (`hse_tokens`, `hse_themes`, `hse_alias`) |
| `web_static/features/*/` | V2 | Tous les onglets + règles R1-R5 |
| UX / thèmes visuels | V1 | Richesse thèmes à migrer en tokens V2 |
| `hse.fetch.js` | V2 modifié | Injection token HA automatique |
| `hse_panel.js` | V2 modifié | Fix localStorage → user_prefs API |

---

## 8. Ce qui est définitivement exclu de V3

| Fichier V1 | Raison |
|---|---|
| `proxy_api.py` | Contourne la sécurité HA |
| `audit_*.py`, `hse_*audit*.py` | Outils de dev — dossier `tools/` séparé |
| `fix_css_*.py`, `fix_js_*.py`, `fix_json_*.py` | Outils de dev |
| `apply_audit_phase*.py`, `apply_phase2_themes.py` | Scripts migration internes |
| `debug_json_sets.py`, `detect_local_debug_standalone.py` | Debug |
| `generate_docs.py` | Outil de dev |
| `sensor.py.backup` | Utiliser git |
| `migration_ultra_mapper.py` | Remplacé par `migration_storage.py` |
| `manage_selection_views.py` | Architecture Python → HTML monolithique |
| Authentification custom V1 | Remplacée par token HA natif |

---

## 9. Plan de développement V3 consolidé

### Phase 1 — Squelette sécurisé (priorité absolue)
1. `manifest.json` v3.0.0 + domaine `hse`
2. `__init__.py` < 200 lignes : `StaticPathConfig` + `require_admin=True`
3. `api/base.py` : `HseBaseView(requires_auth=True, cors_allowed=False)`
4. `catalogue/` complet depuis V2
5. `repairs.py` + `translations/`
6. Test : `GET /api/hse/ping` sans token → 401

### Phase 2 — Meta, Storage, Options
7. `meta/sync.py` + `meta/store.py` + `meta/assignments.py`
8. `storage/manager.py` (StorageManager V1 épuré)
9. `options_flow.py` (capteur référence + tarif €/kWh)
10. `const.py` enrichi + `services.yaml`

### Phase 3 — Moteurs métier (réintégration V1)
11. `engine/cost.py` (V2 `shared_cost_engine.py` intact)
12. `engine/calculation.py` + `engine/group_totals.py`
13. `engine/analytics.py` (`history_analytics.py` V1)
14. `sensors/quality_scorer.py` + `sensors/sync_manager.py` + `sensors/name_fixer.py`

### Phase 4 — APIs REST
15. Toutes les views `api/views/` avec `HseBaseView`
16. `api/views/user_prefs.py` (nouveau)
17. `api/views/migration_apply.py` (nouveau)
18. `api/views/export_api.py` (V1)

### Phase 5 — Frontend
19. `hse.fetch.js` modifié (injection token HA)
20. Module `hse_tab_base.js` implémentant les règles R1–R5
21. Réécriture `costs.view.js` et `overview.view.js` selon R1–R5
22. Fix `hse_panel.js` : localStorage → user_prefs API
23. Onglets : overview, diagnostic, scan, config, custom, cards, migration, costs
24. Migration thèmes visuels V1 vers tokens CSS V2
25. Skeletons + états vides + états erreurs designés

---

## 10. Checklist avant premier commit V3

- [ ] `manifest.json` : `version: "3.0.0"`, `domain: "hse"`
- [ ] Aucun `requires_auth = False` dans le code
- [ ] Aucun `cors_allowed = True` dans le code
- [ ] Panel : `require_admin = True`
- [ ] `__init__.py` < 200 lignes
- [ ] `StaticPathConfig` utilisé (pas de `shutil.copytree`)
- [ ] Aucun fichier de dev (`audit_*.py`, `fix_*.py`, `debug_*.py`, `generate_docs.py`)
- [ ] Aucun `.backup` committé
- [ ] `translations/fr.json` et `translations/en.json` présents
- [ ] Tous les endpoints héritent de `HseBaseView`
- [ ] `hse.fetch.js` injecte le token automatiquement
- [ ] Aucun `localStorage` dans le frontend
- [ ] `engine/cost.py` est `shared_cost_engine.py` V2 non modifié
- [ ] Aucun `sensor.py` (pas de plateforme sensor custom)
- [ ] Aucun log `error()` / `warning()` de debug au démarrage normal
