# HSE V3 — Analyse Comparative V1 / V2 & Feuille de route

> Auteur : analyse automatisée après lecture exhaustive de tous les fichiers des repos `home_suivi_elec` (V1) et `hse` (V2).
> Date : 2026-04-07

---

## 1. Vue d'ensemble des deux versions

### 1.1 V1 — `home_suivi_elec`

**Description générale**
Intégration Home Assistant complète avec un backend Python riche et une UI web statique (panel iframe). Développée de manière itérative avec de nombreuses phases (Phase 2.7 = Storage API). L'UX est soignée mais la sécurité est absente et le code est monolithique.

**Fichiers backend principaux**

| Fichier | Taille | Rôle |
|---|---|---|
| `__init__.py` | 53 826 o | Orchestrateur principal — MONOLITHIQUE (1 000+ lignes) |
| `detect_local.py` | 36 718 o | Détection des capteurs énergie/power dans HA |
| `manage_selection_views.py` | 64 986 o | API REST — sélection capteurs, scores, historique coûts |
| `storage_manager.py` | 31 530 o | Gestionnaire Storage API HA (catalogue + sélection + ignored) |
| `energy_tracking.py` | 18 110 o | Création sensors énergie (integration sensors) |
| `cost_tracking.py` | 18 000 o | Calcul coûts en €/kWh par capteur |
| `diagnostics_engine.py` | 18 539 o | Moteur de diagnostic des capteurs |
| `history_analytics.py` | 9 850 o | Analyse historique HA |
| `group_totals.py` | 9 539 o | Totaux par pièce et par type d'appareil |
| `sensor_quality_scorer.py` | 10 118 o | Score de qualité d'un capteur |
| `sensor_sync_manager.py` | 12 953 o | Synchronisation périodique des capteurs |
| `calculation_engine.py` | 12 881 o | Moteur de calcul (kWh, W, coûts) |
| `export.py` | 19 267 o | Export CSV/JSON des données |
| `energy_analytics.py` | 8 162 o | Analyses complémentaires énergie |
| `energy_export.py` | 4 301 o | Export spécialisé énergie |
| `power_monitoring.py` | 8 536 o | Surveillance puissance en temps réel |
| `manage_selection.py` | 10 209 o | Logique métier sélection capteurs |
| `migration_storage.py` | 5 368 o | Migration JSON legacy → Storage API |
| `migration_cleanup.py` | 4 649 o | Nettoyage capteurs aberrants |
| `sensor_name_fixer.py` | 4 645 o | Correction automatique noms longs |
| `cache_manager.py` | 5 563 o | Cache mémoire requêtes API |
| `sensor_grouping.py` | 6 656 o | Regroupement capteurs par device |
| `const.py` | 7 079 o | Constantes (DOMAIN, chemins, labels) |
| `options_flow.py` | 7 487 o | Options flow HA |
| `config_flow.py` | 4 637 o | Config flow HA |
| `generator.py` | 9 604 o | Génération Lovelace YAML |
| `proxy_api.py` | 1 714 o | Proxy API externe |
| `hidden_sensors_view.py` | 986 o | Vue capteurs masqués |
| `entity_name_registry.py` | 4 218 o | Registre noms courts ↔ noms longs |
| `panel_selection.py` | 2 159 o | Enregistrement panel sidebar HA |

**Répertoires**

| Répertoire | Contenu |
|---|---|
| `api/` | `unified_api.py` + `unified_api_extensions.py` — API REST unifiée `/api/home_suivi_elec/{resource}` |
| `handlers/` | Handlers HTTP séparés |
| `helpers/` | Utilitaires partagés |
| `utils/` | Fonctions utilitaires |
| `tools/` | Outils de dev (standalone) |
| `web_static/` | Fichiers UI complets (HTML, CSS, JS) copiés dans `/www/community/` |

**Fichiers parasites à éliminer en V3**

Ces fichiers sont présents dans le composant de production — ils ne doivent PAS être portés en V3 :
- `audit_css.py`, `audit_css_vars.py`, `audit_hse_config_keys.py`, `audit_selection.py`, `audit_web_static.py`
- `hse_antidup_audit.py`, `hse_audit.py`, `hse_css_audit.py`, `hse_debug_tool.py`, `hse_frontend_audit.py`
- `apply_audit_phase1.py`, `apply_phase2_themes.py`
- `clean_css_colors.py`, `fix_css_wcag_overrides.py`, `fix_js_hardcoded_colors.py`
- `fix_json_datetime.py`, `fix_json_datetime_v2.py`
- `generate_docs.py`
- `detect_local_debug_standalone.py`
- `debug_json_sets.py`
- `sensor.py.backup`
- `migration_ultra_mapper.py` (remplacé par migration_storage.py)

---

### 1.2 V2 — `hse`

**Description générale**
Réécriture propre axée sur la fiabilité du catalogue et la cohérence. Architecture modulaire et nette, mais l'UI a régressé et de nombreuses fonctionnalités avancées (coûts, exports, group totals) sont absentes ou incomplètes.

**Fichiers backend principaux**

| Fichier | Rôle |
|---|---|
| `__init__.py` | Minimal (~130 lignes) — orchestration propre |
| `catalogue_manager.py` | Fusion scan → catalogue avec diff intelligent |
| `catalogue_store.py` | Persistance catalogue (Storage API HA) |
| `catalogue_schema.py` | Schéma/validation catalogue |
| `meta_store.py` | Persistance meta (rooms/types/assignments) |
| `meta_sync.py` | Snapshot HA + calcul diff pending |
| `scan_engine.py` | Détection kind (power/energy) depuis states HA |
| `shared_cost_engine.py` | Moteur de coût partagé (isolé, testable) |
| `repairs.py` | Intégration HA Repairs (alertes natives) |
| `const.py` | Constantes (minimal, 551 o) |
| `config_flow.py` | Config flow HA (minimal, 424 o) |
| `api/unified_api.py` | API REST unifiée |
| `translations/` | Fichiers de traduction (fr, en) |
| `web_static/` | UI web — servis via `StaticPathConfig` |

---

## 2. Analyse des forces et faiblesses

### 2.1 V1 — Points forts

- ✅ **UX très soignée** : CSS variables, thèmes light/dark, animations, cartes visuelles
- ✅ **Backend fonctionnel riche** : cost_tracking, group_totals, energy_tracking, diagnostics, export, history_analytics
- ✅ **StorageManager** : migration complète JSON → Storage API HA (Phase 2.7)
- ✅ **Détection continue** : `setup_continuous_detection` écoute `state_changed` pour détecter de nouveaux capteurs dynamiquement
- ✅ **Score de qualité capteur** : `sensor_quality_scorer.py` — sélection automatique meilleur capteur par device
- ✅ **SensorSyncManager** : synchronisation périodique, gestion lifecycle
- ✅ **9 services HA** : generate_local_data, migrate_cleanup, rollback_to_legacy, export_storage_backup, get_storage_stats, etc.
- ✅ **API REST riche** : ~18 endpoints couvrant diagnostics, sélection, coûts, historique, cache
- ✅ **Capteur de référence externe** : support `use_external` + `external_capteur`
- ✅ **Export CSV/JSON** : `export.py` + `energy_export.py`
- ✅ **OptionsFlow** complet : configuration post-installation

### 2.2 V1 — Points faibles (CRITIQUES)

- ❌ **SÉCURITÉ ZÉRO** : `requires_auth = False` sur TOUS les endpoints REST → n'importe qui sur le réseau local peut lire/modifier les données sans authentification
- ❌ **`__init__.py` monolithique** : 53 826 octets, ~1 000 lignes, 15+ responsabilités mélangées
- ❌ **Vues API inline dans `__init__.py`** : `SetIgnoredEntityView`, `DiagnosticsView`, `ChooseBestForDeviceView`, `EntityNameRegistryView` définies dans le fichier d'entrée
- ❌ **Copie UI via `shutil.copytree`** : fragile, risque de race condition, nécessite redémarrage
- ❌ **Race conditions** : deux `asyncio.create_task` en parallèle (`setup_hse_before_sensor_platform` + `_delayed_start`) sans coordination fiable
- ❌ **Log `error()` au démarrage** : `_LOGGER.error("HSE __init__.py LOADED (debug marker)")` — marker de debug en production
- ❌ **Panel `require_admin = False`** : accès ouvert à tous les utilisateurs HA
- ❌ **50+ fichiers de dev en production** : audit_*.py, fix_*.py, generate_docs.py, etc.
- ❌ **`manage_selection_views.py` monolithique** : 64 986 octets — impossible à maintenir
- ❌ **Aucune translation** : pas de dossier `translations/`
- ❌ **`sensor.py.backup`** committé dans le repo

### 2.3 V2 — Points forts

- ✅ **`__init__.py` propre** : ~130 lignes, une seule responsabilité par module
- ✅ **Catalogue avec diff intelligent** : `merge_scan_into_catalogue` — grace period offline, détection de changements
- ✅ **`meta_sync.py`** : snapshot HA → diff pending → assignments rooms/types — fiable et testable
- ✅ **`StaticPathConfig`** : fichiers UI servis directement sans copie
- ✅ **`require_admin=True`** : panel réservé aux admins HA
- ✅ **`repairs.py`** : intégration native HA Repairs (alertes visibles dans l'UI HA)
- ✅ **Translations** : dossier `translations/` avec fr/en
- ✅ **`catalogue_schema.py`** : schéma strict et validable
- ✅ **Intervalles configurables** : `CATALOGUE_REFRESH_INTERVAL_S`, `META_SYNC_INTERVAL_S`
- ✅ **`shared_cost_engine.py`** : moteur de coût isolé, sans dépendance HA
- ✅ **Architecture modulaire** : catalogue / meta / scan / repairs clairement séparés

### 2.4 V2 — Points faibles

- ❌ **Rendering frontend régressif** : perte des fonctionnalités UI avancées au fil des itérations
- ❌ **Cost tracking incomplet** : `shared_cost_engine.py` existe mais pas de création de sensors coût HA
- ❌ **Group totals absents** : pas de totaux par pièce/type
- ❌ **Export absent** : pas de CSV/JSON
- ❌ **History analytics absent** : pas d'analyse historique
- ❌ **config_flow.py minimal** : 424 octets — aucune option de configuration
- ❌ **const.py minimal** : 551 octets — manque de constantes métier
- ❌ **Onglets UI incomplets** : certaines vues non fonctionnelles

---

## 3. Sécurité — Point bloquant V3

### Problème V1

Tous les endpoints REST exposent les données **sans authentification** :

```python
# V1 — pattern dangereux répété partout
class SetIgnoredEntityView(HomeAssistantView):
    requires_auth = False  # ❌ N'importe qui sur le réseau local peut appeler
    cors_allowed = True
```

### Solution V3 — Token HA de l'utilisateur

La V3 utilise **uniquement le token HA de l'utilisateur** (Long-Lived Access Token ou session token) :

```python
# V3 — pattern correct
class HseApiView(HomeAssistantView):
    requires_auth = True   # ✅ Token HA obligatoire
    cors_allowed = False   # ✅ Pas de CORS ouvert

# Côté frontend (web_static/js) :
# Utiliser window.hassConnection ou le token passé via le panel custom
# Toutes les requêtes fetch() incluent : Authorization: Bearer <token>
```

**Récupération du token côté panel custom :**

```javascript
// Dans le panel custom, HA injecte l'objet `hass` avec le token
const token = this.hass?.auth?.data?.access_token;
fetch('/api/hsev3/catalogue', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Pas de configuration manuelle de token** : l'utilisateur se connecte normalement à HA, le panel reçoit automatiquement le token de session.

---

## 4. Description fonctionnelle des onglets V3

### Onglet 1 — Tableau de bord (Dashboard)

**Ce qu'il doit faire :**
- Afficher la **consommation totale** en temps réel (W actuel) et cumulée (kWh jour/semaine/mois)
- Afficher le **coût en cours** (€ aujourd'hui, ce mois)
- Afficher les **top 5 consommateurs** en temps réel (graphique barres ou cartes)
- Afficher les **totaux par pièce** (salon, cuisine, chambre…) — ring chart ou bento grid
- Afficher les **totaux par type d'appareil** (chauffage, éclairage, électroménager…)
- Afficher le **capteur de référence** (compteur général) avec comparaison vs somme des capteurs

**Source V1 :** `group_totals.py`, `cost_tracking.py`, `calculation_engine.py`, `web_static/`
**Source V2 :** `meta_sync.py` (rooms/types assignments), `shared_cost_engine.py`
**Fonctionnement :** API REST `GET /api/hsev3/dashboard` → retourne snapshot complet

---

### Onglet 2 — Capteurs (Catalogue)

**Ce qu'il doit faire :**
- Afficher la **liste complète** des capteurs détectés (power W + energy kWh)
- Permettre d'**activer/désactiver** chaque capteur pour le suivi
- Afficher l'**état en temps réel** de chaque capteur (état HA, dernière mise à jour)
- Afficher le **score de qualité** de chaque capteur
- Permettre d'**ignorer** un capteur (masquer des doublons)
- Permettre de **choisir le meilleur capteur** par device automatiquement
- Afficher l'**intégration source** (shelly, tasmota, tibber, hacs…)
- Afficher les **alertes** (capteur indisponible, non numérique)

**Source V1 :** `detect_local.py`, `sensor_quality_scorer.py`, `manage_selection_views.py`, `diagnostics_engine.py`
**Source V2 :** `catalogue_manager.py`, `catalogue_schema.py`, `scan_engine.py`
**Fonctionnement :** API REST `GET /api/hsev3/catalogue` + `POST /api/hsev3/catalogue/select`

---

### Onglet 3 — Configuration (Rooms & Types)

**Ce qu'il doit faire :**
- Permettre d'**assigner chaque capteur à une pièce** (salon, cuisine, chambre, bureau…)
- Permettre d'**assigner chaque capteur à un type** (chauffage, éclairage, électroménager, véhicule…)
- Afficher les **assignments en cours** avec diff pending (nouveau capteur détecté, pièce non assignée)
- Permettre de **créer/renommer des pièces et types**
- Sauvegarder la configuration sans redémarrage HA

**Source V1 :** `manage_selection.py`, `storage_manager.py` (sections rooms/zones)
**Source V2 :** `meta_sync.py`, `meta_store.py` — diff intelligent pending
**Fonctionnement :** API REST `GET /api/hsev3/meta` + `POST /api/hsev3/meta/assign`

---

### Onglet 4 — Historique & Analyses

**Ce qu'il doit faire :**
- Afficher l'**évolution de la consommation** sur 7j, 30j, 1an (graphiques Chart.js/D3)
- Afficher la **comparaison mois/mois** et **semaine/semaine**
- Afficher la **décomposition par pièce** dans le temps
- Afficher la **décomposition par type** dans le temps
- Afficher le **coût historique** (€ par mois/an)
- Permettre l'**export CSV** de l'historique sélectionné

**Source V1 :** `history_analytics.py`, `energy_analytics.py`, `export.py`, `energy_export.py`
**Source V2 :** `shared_cost_engine.py` (calcul coût), HA Statistics API
**Fonctionnement :** API REST `GET /api/hsev3/history?period=30d&group=room`

---

### Onglet 5 — Diagnostics

**Ce qu'il doit faire :**
- Afficher le **statut global** de l'intégration (ok / warning / error)
- Lister les **capteurs en anomalie** (unavailable, unknown, non numérique)
- Afficher les **alertes HA Repairs** natives
- Afficher les **statistiques Storage** (nb capteurs catalogués, sélectionnés, ignorés)
- Permettre de **forcer une rescan** du catalogue
- Permettre de **reset un capteur aberrant** (valeur anormalement élevée)
- Afficher les **logs récents** (dernières détections, erreurs)

**Source V1 :** `diagnostics_engine.py`, `storage_manager.py` (stats), services `migrate_cleanup` / `reset_integration_sensor`
**Source V2 :** `repairs.py`, `catalogue_store.py`
**Fonctionnement :** API REST `GET /api/hsev3/diagnostics` + actions POST

---

## 5. Architecture cible V3

### 5.1 Backend Python

```
custom_components/hsev3/
├── __init__.py               # ~150 lignes max — orchestration uniquement
├── manifest.json             # version 3.0.0
├── const.py                  # Toutes les constantes (domaine, chemins, labels, intervalles)
├── config_flow.py            # Config flow HA (nom intégration, options de base)
├── options_flow.py           # Options flow HA (capteur référence, tarif €/kWh)
├── services.yaml             # Déclaration des services HA
│
├── catalogue/
│   ├── __init__.py
│   ├── scan_engine.py        # Détection kind (power/energy) — de V2
│   ├── manager.py            # merge_scan_into_catalogue — de V2
│   ├── store.py              # Persistance Storage API — de V2
│   └── schema.py             # Schéma validation — de V2
│
├── meta/
│   ├── __init__.py
│   ├── sync.py               # Snapshot HA + diff pending — de V2
│   ├── store.py              # Persistance meta rooms/types — de V2
│   └── assignments.py        # Logique assignation capteur → pièce/type
│
├── engine/
│   ├── __init__.py
│   ├── cost.py               # Moteur coût €/kWh — de V2 (shared_cost_engine)
│   ├── calculation.py        # Calculs kWh/W/coûts — de V1 (calculation_engine)
│   ├── group_totals.py       # Totaux pièces/types — de V1
│   └── analytics.py          # Analyses historiques — de V1 (history_analytics)
│
├── sensors/
│   ├── __init__.py
│   ├── quality_scorer.py     # Score qualité capteur — de V1
│   ├── sync_manager.py       # Synchro périodique — de V1 (épuré)
│   └── name_fixer.py         # Correction noms longs — de V1
│
├── api/
│   ├── __init__.py
│   ├── base.py               # Classe de base avec requires_auth=True
│   ├── catalogue_api.py      # GET /api/hsev3/catalogue, POST select/ignore
│   ├── meta_api.py           # GET /api/hsev3/meta, POST assign
│   ├── dashboard_api.py      # GET /api/hsev3/dashboard
│   ├── history_api.py        # GET /api/hsev3/history
│   ├── diagnostics_api.py    # GET /api/hsev3/diagnostics
│   └── export_api.py         # GET /api/hsev3/export (CSV/JSON)
│
├── storage/
│   ├── __init__.py
│   └── manager.py            # StorageManager unifié — de V1 (épuré)
│
├── repairs.py                # Intégration HA Repairs — de V2
├── translations/
│   ├── en.json
│   └── fr.json
└── web_static/               # UI — servis via StaticPathConfig (pas de copie)
    ├── index.html
    ├── css/
    ├── js/
    └── components/
```

### 5.2 Frontend — Principes V3

**Problème central V2 :** régression du rendering. La cause identifiée est l'utilisation de Web Components avec re-renders complets (innerHTML) à chaque mise à jour de données, sans différentiation du DOM.

**Solution V3 :**
1. **Séparer données et rendu** : fetch() → store en mémoire → render uniquement si données changées (deep equal check)
2. **Pas de innerHTML global** : utiliser `textContent` pour valeurs simples, `insertAdjacentHTML` ou `replaceChild` pour éléments structurés
3. **Un composant = une responsabilité** : `hse-dashboard-card`, `hse-sensor-row`, `hse-chart-bar` — chacun gère son propre état
4. **Token HA injecté au niveau root** : `window.__hseToken` récupéré depuis `this.hass.auth.data.access_token` une seule fois au mount
5. **Pas de polling naïf** : un seul `setInterval` global à 30s au niveau app, dispatch événements vers composants

---

## 6. Règles de sécurité V3 (non négociables)

1. **`requires_auth = True`** sur TOUS les endpoints sans exception
2. **`cors_allowed = False`** — pas de CORS ouvert
3. **Panel `require_admin = True`** — réservé aux admins HA
4. **Aucun token en clair** dans les logs
5. **Validation stricte** des payloads POST (`entity_id` format check, types, limites)
6. **`StaticPathConfig`** avec `cache_headers=False` en dev — pas de copie de fichiers
7. **Aucun fichier de dev** dans le composant installé (tous les `audit_*.py`, `fix_*.py` dans un dossier `tools/` hors du composant)

---

## 7. Ce qui est à prendre de chaque version

| Fonctionnalité | Source | Fichier(s) |
|---|---|---|
| Architecture `__init__.py` propre | V2 | `__init__.py` |
| Scan/détection catalogue | V2 | `scan_engine.py` |
| Merge catalogue avec diff | V2 | `catalogue_manager.py` |
| Persistance catalogue | V2 | `catalogue_store.py`, `catalogue_schema.py` |
| Meta rooms/types + diff pending | V2 | `meta_sync.py`, `meta_store.py` |
| HA Repairs natif | V2 | `repairs.py` |
| Translations | V2 | `translations/` |
| StaticPathConfig (pas de copie) | V2 | `__init__.py` |
| require_admin panel | V2 | `__init__.py` |
| Moteur coût partagé | V2 | `shared_cost_engine.py` |
| Détection complète (detect_local) | V1 | `detect_local.py` |
| Score qualité capteur | V1 | `sensor_quality_scorer.py` |
| Cost sensors HA | V1 | `cost_tracking.py` |
| Group totals pièces/types | V1 | `group_totals.py` |
| History analytics | V1 | `history_analytics.py` |
| Export CSV/JSON | V1 | `export.py`, `energy_export.py` |
| StorageManager | V1 | `storage_manager.py` |
| Energy tracking (integration sensors) | V1 | `energy_tracking.py` |
| Power monitoring | V1 | `power_monitoring.py` |
| Sensor name fixer | V1 | `sensor_name_fixer.py` |
| Calculation engine | V1 | `calculation_engine.py` |
| Options flow complet | V1 | `options_flow.py` |
| UX / CSS / web_static | V1 | `web_static/` |
| Constantes métier | V1 | `const.py` |
| Services HA | V1 | services dans `__init__.py` à extraire |

---

## 8. Ordre de construction V3

### Phase 1 — Squelette sécurisé (base)
1. `manifest.json` + `const.py` + `config_flow.py`
2. `__init__.py` minimal (< 150 lignes) avec `StaticPathConfig` + `require_admin=True`
3. `api/base.py` avec `requires_auth = True`
4. Catalogue : `scan_engine.py` + `manager.py` + `store.py` + `schema.py`
5. `repairs.py` + `translations/`

### Phase 2 — Meta & configuration
6. `meta/sync.py` + `meta/store.py` + `meta/assignments.py`
7. `storage/manager.py` (StorageManager unifié)
8. `options_flow.py` (capteur référence + tarif €/kWh)

### Phase 3 — Moteurs métier
9. `engine/cost.py` (fusion V1 cost_tracking + V2 shared_cost_engine)
10. `engine/calculation.py`
11. `engine/group_totals.py`
12. `engine/analytics.py`
13. `sensors/quality_scorer.py` + `sensors/sync_manager.py`

### Phase 4 — APIs REST
14. `api/catalogue_api.py` + `api/meta_api.py`
15. `api/dashboard_api.py` + `api/history_api.py`
16. `api/diagnostics_api.py` + `api/export_api.py`
17. `services.yaml` + handlers services HA

### Phase 5 — Frontend
18. `web_static/` — reprise UX V1 + correction rendering (principe : données → store → render différentiel)
19. Intégration token HA (window.__hseToken depuis hass.auth)
20. Onglets : Dashboard, Capteurs, Configuration, Historique, Diagnostics

---

## 9. Points d'attention critiques

### Rendering frontend
Le problème central de V2 est la régression du rendering. **Ne jamais** faire :
```javascript
// ❌ INTERDIT — re-render complet à chaque tick
this.shadowRoot.innerHTML = this._buildHTML(data);
```
**Toujours** faire :
```javascript
// ✅ CORRECT — mise à jour ciblée
this.shadowRoot.querySelector('.power-value').textContent = `${data.power} W`;
```

### Race condition au démarrage
V1 avait deux `asyncio.create_task` non coordonnés. En V3, utiliser un seul point d'entrée différé :
```python
hass.async_create_task(_deferred_init(hass, entry))
# _deferred_init attend EVENT_HOMEASSISTANT_STARTED puis exécute en séquence
```

### Storage cohérence
Ne pas mélanger lecture directe JSON et Storage API. En V3, **tout** passe par `StorageManager` — zéro accès direct aux fichiers JSON.

### Pas de sensor.py en V3
V1 utilisait une plateforme `sensor` HA pour créer des sensors HSE. Cette approche cause les race conditions. En V3, les sensors HSE (energy, cost, totals) restent dans HA via les templates ou l'API statistics — **pas de plateforme sensor custom**.

> **Alternative propre :** utiliser `async_add_entities` uniquement si absolument nécessaire, avec un pattern de découverte basé sur les events HA (`hse_sensors_ready`) et non sur des pools `hass.data`.

---

## 10. Checklist avant premier commit V3

- [ ] `manifest.json` avec `version: "3.0.0"` et `domain: "hsev3"`
- [ ] Aucun `requires_auth = False` dans le code
- [ ] Aucun fichier de dev (`audit_*.py`, `fix_*.py`, `generate_docs.py`)
- [ ] `StaticPathConfig` utilisé (pas de `shutil.copytree`)
- [ ] `require_admin=True` sur le panel
- [ ] Aucun log `error()` ou `warning()` de debug au démarrage normal
- [ ] `translations/fr.json` et `translations/en.json` présents
- [ ] Tous les endpoints API héritent de `HseBaseView(requires_auth=True)`
- [ ] `__init__.py` < 200 lignes
- [ ] Aucun `sensor.py.backup` ni fichier `.backup`
