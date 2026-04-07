# HSE V3 — Analyse comparative V1 / V2 et spécifications V3

> **Fichier de référence IA.** Dernière mise à jour : 2026-04-07  
> Auteur : analyse automatisée des dépôts `home_suivi_elec` (V1) et `hse` (V2)  
> Destination : `hsev3` — Version 3 de Home Suivi Élec

---

## 1. Vue d'ensemble des deux versions

### V1 — `home_suivi_elec`

**Points forts :**
- UX visuellement très soignée (thèmes multiples, tokens CSS, mode sombre/clair)
- Richesse fonctionnelle : détection locale (`detect_local.py` 36 Ko), analytique d'historique (`history_analytics.py`), export CSV/JSON, groupement de capteurs (`sensor_grouping.py`), scoring qualité (`sensor_quality_scorer.py`)
- Moteur de calcul indépendant (`calculation_engine.py` 12 Ko) avec logique coût HT/TTC
- Système de migration complet (`migration_ultra_mapper.py`, `migration_storage.py`, `migration_cleanup.py`)
- Registre de noms d'entités (`entity_name_registry.py`) avec détection intelligente
- `proxy_api.py` — proxy interne pour éviter les CORS
- Nombreux outils d'audit CSS et JS (`audit_css.py`, `audit_css_vars.py`, `hse_css_audit.py`, `fix_css_wcag_overrides.py`, `fix_js_hardcoded_colors.py`) : preuve d'une préoccupation qualité CSS réelle
- Frontend généré côté Python (`manage_selection_views.py` 64 Ko) — monolithique mais complet
- Gestion du cache (`cache_manager.py`)
- `diagnostics_engine.py` (18 Ko) très complet

**Problèmes identifiés (V1) :**
- **Sécurité** : l'authentification n'est pas basée sur le token HA de l'utilisateur — vulnérable
- Architecture monolithique : `__init__.py` fait 53 Ko, `manage_selection_views.py` fait 64 Ko — intenable à maintenir
- Fichiers de debug, d'audit, de fix en production (`debug_json_sets.py`, `detect_local_debug_standalone.py`, `sensor.py.backup`) — ne doivent pas être dans le composant livré
- Pas de séparation claire entre état, vue et logique métier côté frontend
- CSS incrusté dans du Python via `manage_selection_views.py` — impossible à maintenir
- Pas de store/bus d'événements frontend centralisé
- `proxy_api.py` contourne la sécurité HA plutôt que de l'utiliser

---

### V2 — `hse`

**Points forts :**
- **Architecture frontend propre** : router mount-once (`hse_panel.js`), pattern `{ mount, update_hass, unmount }` par onglet, registre `window.hse_tabs_registry`
- **Séparation stricte** : `hse_panel.js` ne connaît pas les onglets — ils s'auto-enregistrent
- **Système de tokens CSS** complet (`hse_tokens.shadow.css`, `hse_themes.shadow.css`, `hse_alias.v2.css`, `tokens.css`)
- **Backend modulaire** : catalogue (`catalogue_manager.py`, `catalogue_store.py`, `catalogue_schema.py`), métadonnées (`meta_store.py`, `meta_sync.py`), moteur de coût partagé (`shared_cost_engine.py`)
- **`shared_cost_engine.py`** : UI-agnostique, calcul HT/TTC par période (heure, jour, semaine, mois, année), résolution des helpers par catalogue ou par dérivation legacy, agrégation multi-appareils — **c'est le moteur le plus fiable des deux versions**
- **API REST structurée** : routeur unifié (`unified_api.py`), vues séparées par responsabilité (30+ endpoints)
- **`scan_engine.py`** : moteur de scan des entités HA — extraction propre et découplée
- `live.service.js` + `live.store.js` — polling live centralisé
- **Système de thèmes** avec override dynamique via `data-theme`
- **CONTEXT.md** : documentation de session IA — excellente pratique
- **Convention de commit** avec tag `[doc:]` — traçabilité

**Problèmes identifiés (V2) — cause de la régression :**
- Le **rendering des onglets régresse** : le contrat `{ mount, update_hass, unmount }` est bien défini, mais les onglets comme `overview` et `costs` accumulent des états incohérents entre les appels `update_hass` successifs — le DOM n'est pas systématiquement protégé contre les re-renders concurrents
- `hse_panel.js` utilise `window.localStorage` pour persister l'onglet actif — échoue silencieusement dans les iframes sandboxées (Home Assistant)
- Les **features avancées de V1** (`history_analytics`, scoring qualité, export, groupement) ont été **abandonnées** sans être réintégrées
- Le boot séquentiel (chargement de ~25 scripts JS) est fragile : un seul échec réseau bloque tout
- `hse_live_service` redémarre à chaque boot sans vérification d'un double démarrage robuste
- L'onglet `costs` utilise encore des données du store global et re-rend à chaque `update_hass` — source du bug de rendu
- Pas de protection contre les `update_hass` pendant le montage d'un onglet (race condition)

---

## 2. Architecture cible V3

### Principe fondateur

> **V3 utilise exclusivement le token HA de l'utilisateur (`hass.auth.token` ou `hass.connection.options.auth.access_token`). Zéro authentification supplémentaire. Zéro proxy custom.**

Tous les appels API backend utilisent :
```
Authorization: Bearer <hass.auth.data.access_token>
```
Le backend valide ce token via le mécanisme standard HA (`require_admin=False` pour la lecture, `require_admin=True` pour les mutations critiques).

---

### Stack technique

| Couche | Choix V3 | Justification |
|---|---|---|
| Backend Python | Modules séparés + `__init__.py` léger | Évite le monolithe V1 |
| Moteur de coût | `shared_cost_engine.py` de V2 (conservé tel quel) | Le plus robuste |
| Moteur de scan | `scan_engine.py` de V2 (conservé + amélioré) | Propre et découplé |
| API REST | Routeur unifié V2 + token HA obligatoire | Sécurisé |
| Frontend custom element | `hse-panel` V2 (architecture mount-once) | Solide |
| Tab modules | Contrat `{ mount, update_hass, unmount }` V2 | Conservé |
| Tokens CSS | Système V2 (`hse_tokens`, `hse_themes`, `hse_alias`) | Conservé |
| Thèmes UI | Thèmes V1 (richesse visuelle) migrés en tokens V2 | Le meilleur des deux |
| Analytique histoire | `history_analytics.py` de V1 réintégré | Fonctionnalité perdue en V2 |
| Export | `energy_export.py` + `export.py` de V1 réintégrés | Fonctionnalité perdue en V2 |
| Scoring qualité | `sensor_quality_scorer.py` de V1 réintégré | Fonctionnalité perdue en V2 |

---

## 3. Spécifications des onglets V3

### Onglet 1 — `overview` (Accueil)

**Rôle :** tableau de bord temps réel de la consommation globale.

**Ce qu'il doit afficher :**
- Puissance totale en cours (W) — live, toutes les 10 secondes
- Consommation par période : jour / semaine / mois / année (kWh + coût TTC €)
- Top 5 appareils les plus consommateurs (live)
- Indicateur de statut global de l'intégration (OK / warning / erreur)
- Lien rapide vers Diagnostic si des capteurs ont des problèmes

**Règles de rendu :**
- Le DOM est construit UNE SEULE FOIS dans `mount()`. `update_hass()` ne reconstruit rien — il met à jour uniquement les valeurs numériques via `textContent` direct sur des `<span>` identifiés
- Si `hass` est null au montage, afficher un skeleton loader
- Pas d'appel API dans `update_hass()` — les données live viennent du `live.store` (polling backend)

**Source de données :**
- `GET /api/hse/overview` → agrégats depuis `dashboard_overview.py`
- Polling toutes les 30s via `live.service.js`

---

### Onglet 2 — `diagnostic` (Diagnostic)

**Rôle :** santé de l'intégration, vérification des entités et helpers.

**Ce qu'il doit afficher :**
- Score de qualité global (% d'appareils correctement configurés)
- Liste des capteurs avec statut : OK / helper manquant / entité introuvable / état inconnu
- Pour chaque capteur en erreur : indication précise du problème et lien vers l'action corrective (Détection ou Configuration)
- Résultat du dernier diagnostic avec timestamp
- Bouton "Relancer le diagnostic"

**Règles de rendu :**
- Le diagnostic est déclenché explicitement (bouton) ou au premier montage si le résultat a plus de 5 minutes
- Les résultats sont mis en cache dans le store — pas de re-fetch à chaque `update_hass()`
- Le tableau de résultats utilise le composant `table.js` de V2

**Source de données :**
- `GET /api/hse/diagnostic` → `diagnostic_check.py`
- `GET /api/hse/catalogue` → pour la liste des appareils connus

---

### Onglet 3 — `scan` (Détection)

**Rôle :** découverte automatique des capteurs de puissance dans HA et proposition d'ajout au catalogue.

**Ce qu'il doit afficher :**
- Liste des entités détectées comme capteurs de puissance (W/kW) non encore dans le catalogue
- Score de qualité par entité détectée (via `sensor_quality_scorer.py` de V1)
- Bouton "Ajouter au catalogue" par entité ou en masse
- Filtre par domaine, par device, par mot-clé
- Statut de la détection (dernière date de scan)

**Règles de rendu :**
- Scan déclenché explicitement via bouton "Lancer la détection"
- Résultats paginés si > 50 entités
- Pas de re-scan automatique au changement de `hass`

**Source de données :**
- `POST /api/hse/scan` → `entities_scan.py` + `scan_engine.py`

---

### Onglet 4 — `config` (Configuration)

**Rôle :** gestion du catalogue d'appareils et des tarifs.

**Ce qu'il doit afficher :**

**Section Appareils :**
- Liste de tous les appareils du catalogue avec leur statut de helpers
- Actions par appareil : éditer le nom, changer l'icône, activer/désactiver, supprimer
- Triage en masse : activer/désactiver plusieurs appareils d'un coup
- Bouton "Synchroniser les métadonnées" (applique `meta_sync_apply.py`)

**Section Tarifs :**
- Formulaire de saisie du contrat : type (fixe / HP-HC), prix HT, prix TTC, abonnement
- Prévisualisation du coût mensuel estimé sur la base des données actuelles
- Sauvegarde via `settings_pricing.py`

**Règles de rendu :**
- Les formulaires sont construits une seule fois dans `mount()`
- Les modifications sont envoyées par PATCH/POST — pas de rechargement complet de l'onglet après sauvegarde, mise à jour locale de l'état
- Validation côté frontend avant envoi (champs obligatoires, format numérique)

**Source de données :**
- `GET/POST/PATCH /api/hse/catalogue/*`
- `GET/PUT /api/hse/settings/pricing`

---

### Onglet 5 — `custom` (Customisation)

**Rôle :** personnalisation visuelle du panel.

**Ce qu'il doit afficher :**
- Sélecteur de thème (liste des thèmes disponibles avec prévisualisation des couleurs)
- Toggle fond dynamique (on/off)
- Toggle effet glassmorphism (on/off)
- Prévisualisation live : les changements s'appliquent immédiatement sur `hse-panel` via `data-theme` et CSS custom properties
- Bouton "Réinitialiser"

**Règles de rendu :**
- Toute la logique de thème est dans `custom.view.js` — `hse_panel.js` ne fait qu'appliquer `data-theme`
- Les préférences sont sauvegardées dans le store HA via l'API (pas localStorage)

---

### Onglet 6 — `cards` (Génération de cartes)

**Rôle :** générateur de cartes Lovelace YAML pour les appareils du catalogue.

**Ce qu'il doit afficher :**
- Liste des appareils disponibles avec checkbox de sélection
- Options de configuration : type de carte (gauge, entity, mini-graph, custom:power-flow-card), affichage coût on/off, période d'affichage
- Zone de prévisualisation du YAML généré (éditeur de code read-only avec coloration syntaxique)
- Bouton "Copier dans le presse-papier"
- Bouton "Télécharger en .yaml"

**Règles de rendu :**
- Le YAML est généré via `yamlComposer.js` de V2 (conservé)
- La liste d'appareils est chargée une fois dans `mount()` depuis le store catalogue
- Pas d'appel API à chaque sélection — le YAML est généré localement en JS

**Source de données :**
- Catalogue en mémoire (chargé au boot)
- `yamlComposer.js` pour la génération

---

### Onglet 7 — `migration` (Migration capteurs)

**Rôle :** assistant de migration d'anciens capteurs `home_suivi_elec` vers `hse`.

**Ce qu'il doit afficher :**
- Détection automatique des anciennes entités `sensor.home_suivi_elec_*`
- Mapping proposé vers les nouvelles entités `sensor.hse_*`
- Validation du mapping par l'utilisateur avant application
- Rapport post-migration (succès / erreurs)
- Bouton "Nettoyer les anciens capteurs" (appel `migration_cleanup.py`)

**Règles de rendu :**
- La migration est un wizard en 3 étapes : Détection → Validation → Application
- Chaque étape est un sous-état du module, pas un changement d'onglet
- Les données de migration ne sont jamais perdues si l'utilisateur change d'onglet pendant le wizard (persistées dans le store)

**Source de données :**
- `GET /api/hse/migration/export` → `migration_export.py`
- `POST /api/hse/migration/apply` → nouveau endpoint V3

---

### Onglet 8 — `costs` (Analyse de coûts)

**Rôle :** analyse détaillée des coûts par appareil et par période, avec comparaison et historique.

**Ce qu'il doit afficher :**
- Tableau complet des coûts par appareil : puissance live (W), énergie jour/semaine/mois/année (kWh), coût HT et TTC pour chaque période
- Ligne de total agrégé en bas du tableau
- Filtre par période affichée (jour / semaine / mois / année)
- Graphique de répartition des coûts (camembert ou barres, top 10 appareils)
- Historique des coûts sur les 12 derniers mois (via `history_analytics.py` de V1)
- Export CSV des données affichées
- Comparaison mois/mois ou semaine/semaine (bouton "Comparer")

**Règles de rendu — correction du bug de régression V2 :**
- Le tableau est construit une fois dans `mount()`. `update_hass()` ne déclenche PAS de re-render
- Les données du tableau viennent UNIQUEMENT du backend (`GET /api/hse/costs`) via polling
- Le polling est géré par `live.service.js` — pas par l'onglet lui-même
- Un flag `_is_rendering` protège contre les appels concurrents
- Les données reçues sont comparées par `JSON.stringify` avant toute mise à jour DOM — si identiques, aucune modification

**Source de données :**
- `GET /api/hse/costs` → `shared_cost_engine.py` + `costs_compare.py`
- `GET /api/hse/history` → `history_analytics.py` (réintégré de V1)
- Polling toutes les 60s (les coûts ne changent pas à la seconde)

---

## 4. Règles de sécurité V3

### Token HA obligatoire

Tout endpoint HSE V3 doit hériter de `HomeAssistantView` et valider le token :

```python
class HseBaseView(HomeAssistantView):
    requires_auth = True  # ← OBLIGATOIRE sur tous les endpoints V3
```

Côté frontend, chaque appel :
```javascript
fetch('/api/hse/...', {
  headers: {
    'Authorization': `Bearer ${hass.auth.data.access_token}`,
    'Content-Type': 'application/json',
  }
})
```

### Ce qui est supprimé en V3
- `proxy_api.py` de V1 — supprimé
- Toute logique d'authentification custom
- `require_admin=False` uniquement pour les lectures ; mutations = `require_admin=True` ou vérification du rôle utilisateur HA

### Validation des inputs
- Tout POST/PATCH valide les données via `catalogue_schema.py` (étendu si besoin)
- Les entity_id reçus du frontend sont vérifiés dans `hass.states` avant tout traitement
- Aucune eval/exec de contenu utilisateur

---

## 5. Règles de rendering frontend V3 (anti-régression)

Les bugs de V2 viennent de l'absence de ces règles. Elles sont **non-négociables** en V3.

### Règle R1 — Séparation montage / mise à jour
```
mount(container, ctx)  → construit le DOM, initialise les données, déclenche le premier fetch
update_hass(hass)      → MET À JOUR hass dans le contexte local UNIQUEMENT
                         ne reconstruit JAMAIS le DOM
                         ne redéclenche PAS de fetch sauf si explicitement nécessaire
unmount()              → annule tous les timers, toutes les subscriptions
```

### Règle R2 — Protection contre les re-renders concurrents
```javascript
// Chaque onglet qui fait un fetch asynchrone DOIT avoir ce pattern :
if (this._fetching) return;  // protection re-entrance
this._fetching = true;
try {
  const data = await fetch(...);
  if (!this._mounted) return;  // vérification que l'onglet est encore actif
  this._render(data);
} finally {
  this._fetching = false;
}
```

### Règle R3 — Égalité des données avant render
```javascript
const new_sig = JSON.stringify(data);
if (new_sig === this._last_sig) return;  // données identiques → pas de render
this._last_sig = new_sig;
this._render(data);
```

### Règle R4 — Pas de localStorage
Tout état persistant frontend passe par un appel `PATCH /api/hse/user_prefs` ou est reconstruit depuis HA au boot. Plus de `localStorage`.

### Règle R5 — Skeleton systématique
Tout onglet qui attend des données asynchrones affiche un skeleton loader (via `.skeleton` CSS de V2) pendant le fetch initial.

---

## 6. Structure de fichiers cible V3

```
custom_components/hse/              # domaine HA conservé : hse
├── __init__.py                     # léger : bootstrap, enregistrement panel + API
├── manifest.json                   # version: 3.0.0
├── const.py                        # constantes
├── config_flow.py                  # config HA UI (simplifié — pas d'auth custom)
├── time_utils.py
├── repairs.py
│
├── catalogue_manager.py            # V2 conservé
├── catalogue_schema.py             # V2 conservé + validations étendues
├── catalogue_store.py              # V2 conservé
├── catalogue_defaults.py           # V2 conservé
│
├── meta_schema.py                  # V2 conservé
├── meta_store.py                   # V2 conservé
├── meta_sync.py                    # V2 conservé
│
├── shared_cost_engine.py           # V2 conservé INTACT
├── scan_engine.py                  # V2 conservé
├── history_analytics.py            # V1 réintégré
├── sensor_quality_scorer.py        # V1 réintégré
├── energy_export.py                # V1 réintégré
│
├── api/
│   ├── unified_api.py              # V2 étendu
│   └── views/
│       ├── ping.py
│       ├── dashboard_overview.py
│       ├── catalogue_get.py
│       ├── catalogue_refresh.py
│       ├── catalogue_item_triage.py
│       ├── catalogue_triage_bulk.py
│       ├── catalogue_reference_total.py
│       ├── costs_compare.py
│       ├── diagnostic_check.py
│       ├── entities_scan.py
│       ├── history.py              # NOUVEAU — wraps history_analytics.py
│       ├── migration_export.py
│       ├── migration_apply.py      # NOUVEAU
│       ├── settings_pricing.py
│       ├── meta.py
│       ├── meta_sync_apply.py
│       ├── meta_sync_preview.py
│       ├── user_prefs.py           # NOUVEAU — remplace localStorage
│       └── frontend_manifest.py
│
└── web_static/
    ├── panel/
    │   ├── hse_panel.html
    │   ├── hse_panel.js            # V2 conservé + fix localStorage → user_prefs API
    │   ├── style.hse.panel.css
    │   └── features/
    │       ├── overview/           # V2 + règles R1-R5
    │       ├── diagnostic/         # V2 + règles R1-R5
    │       ├── scan/               # V2 + qualité scorer V1
    │       ├── config/             # V2 + validation frontend
    │       ├── custom/             # V2 conservé
    │       ├── cards/              # V2 conservé
    │       ├── migration/          # V2 + wizard 3 étapes
    │       └── costs/              # V2 entièrement réécrit (règles R1-R5 + historique V1)
    └── shared/
        ├── ui/dom.js
        ├── ui/table.js
        ├── hse.store.js
        ├── hse.fetch.js            # MODIFIÉ : inject Authorization header automatiquement
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

## 7. Plan de développement V3

### Phase 1 — Fondations sécurisées (priorité absolue)
1. Créer `manifest.json` v3.0.0 avec domaine `hse`
2. Créer `__init__.py` léger (bootstrap uniquement)
3. Copier `shared_cost_engine.py`, `scan_engine.py`, `catalogue_*.py`, `meta_*.py` depuis V2
4. Modifier `hse.fetch.js` : injection automatique du token HA dans tous les appels
5. Modifier `unified_api.py` : forcer `requires_auth = True` sur tous les endpoints
6. Tester : `GET /api/hse/ping` avec et sans token → doit rejeter les requêtes sans token

### Phase 2 — Onglets stables (anti-régression rendering)
7. Implémenter les règles R1-R5 dans un module `hse_tab_base.js` partagé
8. Réécrire `costs.view.js` selon les règles R1-R5
9. Réécrire `overview.view.js` selon les règles R1-R5
10. Corriger `hse_panel.js` : remplacer localStorage par `user_prefs` API

### Phase 3 — Réintégration fonctionnalités V1
11. Réintégrer `history_analytics.py` + créer endpoint `GET /api/hse/history`
12. Réintégrer `sensor_quality_scorer.py` + l'utiliser dans l'onglet Scan
13. Réintégrer `energy_export.py` + bouton Export CSV dans l'onglet Costs
14. Compléter l'onglet Migration avec le wizard 3 étapes

### Phase 4 — Polish UX
15. Migrer les thèmes visuels de V1 (richesse visuelle) vers les tokens CSS de V2
16. Skeletons loaders sur tous les onglets
17. États vides et erreurs designés (pas de messages génériques)
18. Test complet sur HA 2024+ avec token utilisateur standard et admin

---

## 8. Ce qu'il NE faut PAS réintroduire de V1

| Fichier V1 | Raison d'exclusion |
|---|---|
| `proxy_api.py` | Contourne la sécurité HA |
| `apply_audit_phase1.py`, `apply_phase2_themes.py` | Scripts de migration internes — pas dans le composant livré |
| `audit_css.py`, `audit_css_vars.py`, `hse_css_audit.py` | Outils de développement — dossier `tools/` séparé |
| `fix_css_wcag_overrides.py`, `fix_js_hardcoded_colors.py` | Idem |
| `fix_json_datetime.py`, `fix_json_datetime_v2.py` | Idem |
| `debug_json_sets.py`, `detect_local_debug_standalone.py` | Debug |
| `sensor.py.backup` | Backup — utiliser git |
| `hse_antidup_audit.py`, `hse_debug_tool.py` | Outils dev — dossier séparé |
| `manage_selection_views.py` | Architecture monolithique Python → HTML — remplacé par JS modulaire |

---

## 9. Résumé décisionnel

| Décision | Choix V3 |
|---|---|
| Authentification | Token HA natif (`hass.auth.data.access_token`) — **aucune auth custom** |
| Architecture backend | V2 modulaire (conservée) + modules V1 réintégrés |
| Architecture frontend | V2 mount-once (conservée) + règles R1-R5 |
| Moteur de coût | `shared_cost_engine.py` V2 (intact) |
| Thèmes | Tokens CSS V2 + richesse visuelle V1 |
| Historique | `history_analytics.py` V1 réintégré |
| Scoring capteurs | `sensor_quality_scorer.py` V1 réintégré |
| Export | `energy_export.py` V1 réintégré |
| localStorage | Supprimé → `user_prefs` API |
| Rendering | Règles R1-R5 obligatoires sur chaque onglet |
| Domaine HA | `hse` (V2) |
