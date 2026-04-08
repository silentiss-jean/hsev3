# HSE V3 — DELTA.md

> Référence d'alignement entre la documentation et le code.
> **Ce fichier est la première chose à lire avant chaque session de développement.**
>
> **Règle d'or : si ce fichier est vide (section "Écarts actifs" sans ligne) → doc et code sont parfaitement alignés.**

---

## 🧠 INSTRUCTION IA (lire systématiquement)

Si tu lis ce fichier, tu dois :
1. **Signaler** tous les écarts `EN_DISCUSSION` ou `DOC_AHEAD` ou `CODE_AHEAD` liés au sujet de la demande
2. **Ne jamais générer** de code ou de doc qui contredit un écart non résolu sans le signaler explicitement
3. **Proposer de fermer** un écart quand la solution est validée dans le thread
4. **Distinguer** les deux modes de travail :
   - **EXPLORATION** → on réfléchit, rien n'est écrit, on ajoute une ligne `EN_DISCUSSION` si la discussion dure
   - **COMMIT** → décision prise, on génère le patch doc + patch code + on ferme la ligne dans ce fichier

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

> ⚠️ **`hse_v3_synthese.md` contient les décisions définitives issues des deux analyses (analyse0.md + analyse.md).**
> Avant de poser une question sur un choix architectural, vérifier d'abord dans ce fichier.
> Les sujets couverts : domaine HA, structure dossiers, nommage API, token auth, persistance préférences,
> moteurs métier, sources de fichiers V1/V2, fichiers exclus de V3, plan de phases, checklist pré-commit.

---

## 📋 Index des décisions tranchées

> Résumé rapide des choix définitifs. Source complète : `hse_v3_synthese.md`.

| Sujet | Décision | Fichier source |
|---|---|---|
| Domaine HA | `hse` — V3 **remplace** V2, pas coexistence | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | `hse_v3_synthese.md` §4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — **jamais localStorage** | Règle R4 |
| Stockage `user_prefs` | `StorageManager` dans `storage/manager.py` (Store HA natif) | `hse_v3_synthese.md` §7 |
| Valeurs par défaut `user_prefs` | `active_tab: "overview"`, `*_period: "day"/"month"`, `theme: "default"`, booleans `false` | `hse_v3_synthese.md` §6 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — **INTACT, ne pas modifier** | `hse_v3_synthese.md` §7 |
| Pas de `sensor.py` | Interdit — pattern `hse_sensors_ready` event à la place | `hse_v3_synthese.md` §2 |
| `__init__.py` | < 200 lignes, orchestration uniquement | `hse_v3_synthese.md` §3.2 |
| Fichiers statiques | `StaticPathConfig` — pas de `shutil.copytree` | `hse_v3_synthese.md` §4 |
| `proxy_api.py` | **Supprimé définitivement** | `hse_v3_synthese.md` §8 |
| Format erreur API | HA natif : code HTTP + `{"message": "..."}` | `10_api_contrat.md` |
| Merge `PATCH` | Partiel pour `user_prefs`, complet pour tous les autres | `10_api_contrat.md` règle 9 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` sur tous les endpoints | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Install V3 | Désinstall manuelle complète V2 avant install V3 (helpers + dossier + config entry) | Session 2026-04-08 |
| Frontend V3 | Réécriture **from scratch** — zéro récupération du code V2 frontend | Session 2026-04-08 |
| Nommage fichiers frontend | Séparateur `_` partout (`hse_fetch.js`, `hse_store.js`, etc.) | Session 2026-04-08 |
| Polling onglets "action" | ZÉRO polling auto sur config/scan/migration/cards/custom — refresh sur action utilisateur uniquement | Session 2026-04-08 |
| Polling onglets "lecture" | Polling autorisé (overview/costs/diagnostic) mais **suspendu si onglet inactif** (`unmount` cancel) | Session 2026-04-08 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | Évolution en cours de discussion dans un thread, rien de figé |
| 🔴 | `DOC_AHEAD` | La doc décrit quelque chose qui n'est pas encore codé |
| 🟡 | `CODE_AHEAD` | Le code a évolué mais la doc n'est pas mise à jour |
| ✅ | `ALIGNED` | Résolu et committé — à déplacer dans l'historique puis supprimer |

---

## Ordre de résolution décidé (session 2026-04-08)

Stratégie retenue : **backend-first**.

```
[FAIT] DELTA-005  →  DELTA-004 (blocs 1→2→3→4)  →  DELTA-002  →  DELTA-003
[FAIT] DELTA-001     (code backend)                  (hse_fetch)   (views JS)
```

---

## Écarts actifs

### [DELTA-004] 🔴 DOC_AHEAD — Backend Python V3
- **Doc concernée** : `hse_v3_synthese.md` §3, §9 + `10_api_contrat.md`
- **Ce que la doc dit** : structure en sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/`
- **État du code** : aucun code backend V3 produit
- **Impact** : tous les endpoints consommés par le frontend n'existent pas
- **Séquence de résolution** :
  - Bloc 1 — Squelette : `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping`
  - Bloc 2 — Data : `storage/manager.py` + `meta/` + `options_flow.py`
  - Bloc 3 — Moteurs : `engine/cost.py` + `engine/calculation.py` + `engine/group_totals.py` + `engine/analytics.py`
  - Bloc 4 — Views API : toutes les views `api/views/` avec `HseBaseView` (shape défini dans `10_api_contrat.md`)
- **Bloquant pour** : tout
- **Dépendance** : Bloc 3 attend réponse DELTA-007 (lien repo V2 pour `shared_cost_engine.py`)

---

### [DELTA-002] 🔴 DOC_AHEAD — Fichier `hse_fetch.js` et injection token
- **Doc concernée** : `00_methode_front_commune.md` §5, `09_squelette_hse_tab_base.md`
- **Ce que la doc dit** : tous les appels HTTP passent par `hseFetch` injecté dans `ctx`, token via `window.__hseToken`
- **État du code** : fichier non créé, shell non écrit
- **Note** : renommé `hse_fetch.js` (séparateur `_` — décision session 2026-04-08). Doc à mettre à jour au moment du COMMIT.
- **Impact** : aucun onglet ne peut faire de fetch sans ce fichier
- **Bloquant pour** : tous les onglets

---

### [DELTA-003] 🔴 DOC_AHEAD — Structure des 8 onglets (views JS)
- **Doc concernée** : `01_onglet_overview.md` à `08_onglet_costs.md`
- **Ce que la doc dit** : 8 fichiers `*.view.js` avec contrat `mount / update_hass / unmount`
- **État du code** : aucun fichier `view.js` n'existe encore
- **Note** : ne pas commencer avant que DELTA-002 et DELTA-004 Bloc 4 soient résolus
- **Impact** : tout le frontend est à créer
- **Bloquant pour** : tout le frontend

---

### [DELTA-006] 🟠 EN_DISCUSSION — Nommage fichiers frontend (`.` → `_`)
- **Sujet** : la doc et la synthèse utilisent `hse.fetch.js`, `hse.store.js` — décision prise d'utiliser `_` à la place
- **Décision prise** : séparateur `_` partout (`hse_fetch.js`, `hse_store.js`, `hse_panel.js` inchangé)
- **En attente** : patch doc sur `00_methode_front_commune.md` + `hse_v3_synthese.md` §3.2 pour refléter les nouveaux noms
- **À faire au COMMIT de DELTA-002** : corriger tous les noms dans la doc en même temps que la création du fichier

---

### [DELTA-007] 🟠 EN_DISCUSSION — Sources fichiers V2 (`engine/cost.py`, `catalogue/`, `meta/`)
- **Sujet** : `shared_cost_engine.py`, `catalogue/` et `meta/` sont marqués "V2 conservé intact" mais leur source exacte n'est pas accessible dans ce repo
- **Question ouverte** : quel est le lien/nom du repo V2 sur GitHub pour lecture directe des fichiers sources ?
- **Impact** : DELTA-004 Bloc 3 ne peut pas démarrer sans ces fichiers
- **Bloquant pour** : DELTA-004 Bloc 3

---

### [DELTA-008] 🟠 EN_DISCUSSION — Onglet Migration : cible du mapping
- **Sujet** : si V3 n'émet pas de `sensor.py`, que signifie "migrer `sensor.home_suivi_elec_*`" ?
- **Hypothèse A** : le wizard détecte les anciens capteurs V1 et les ajoute au **catalogue V3** avec leur `entity_id` — pas de renommage d'entité
- **Hypothèse B** : le wizard propose de recréer des **helpers `utility_meter`** pointant vers les capteurs physiques avec nommage `hse_*`
- **Question** : Hypothèse A ou B ?
- **Impact** : spec onglet 7 (`07_onglet_migration.md`) + views `migration_export.py` / `migration_apply.py`
- **Bloquant pour** : DELTA-004 Bloc 4 (views migration) + DELTA-003 onglet 7

---

### [DELTA-009] 🟠 EN_DISCUSSION — `options_flow.py` : stockage du capteur de référence
- **Sujet** : le capteur de référence est optionnel, configurable post-détection, choisi par l'utilisateur
- **Question ouverte** : stocké dans la **config entry** (options_flow HA natif, nécessite restart) ou dans **`storage/manager.py`** (modifiable live via API, sans restart) ?
- **Impact** : `options_flow.py` + `storage/manager.py` + endpoint `settings_pricing.py` ou nouveau endpoint dédié
- **Bloquant pour** : DELTA-004 Bloc 2

---

### [DELTA-010] 🟠 EN_DISCUSSION — `frontend_manifest.py` : utilité à confirmer
- **Sujet** : view listée dans la structure V3 mais jamais décrite dans aucun document
- **Usage probable** : exposer au panel la liste des onglets actifs, version, feature flags (ex: désactiver onglet Migration si V1 non détectée)
- **Question** : à conserver ou supprimer de la liste des views ?
- **Impact** : si supprimé → retirer de `hse_v3_synthese.md` §3.2 + `10_api_contrat.md`
- **Bloquant pour** : rien (peut attendre)

---

## Historique des alignements

| ID | Fermé le | Description |
|---|---|---|
| DELTA-005 | 2026-04-08 | `10_api_contrat.md` rédigé — fiches compactes, format erreur HA natif, 22 endpoints définis |
| DELTA-001 | 2026-04-08 | Payload `user_prefs` défini dans `10_api_contrat.md` (champs + valeurs valides + merge partiel) |

---

## Workflow rapide

```
Début de session
  → Lire DELTA.md
  → Identifier les écarts liés au travail du jour

Pendant la discussion (EXPLORATION)
  → Ajouter ligne EN_DISCUSSION si la discussion dure > 1 échange
  → Ne rien committer

Décision prise (COMMIT)
  → Générer patch doc si besoin → DOC_AHEAD jusqu'au commit code
  → Générer patch code si besoin → CODE_AHEAD jusqu'au commit doc
  → Committer doc + code ensemble
  → Supprimer la ligne de DELTA.md (ou déplacer dans Historique)

Fin de session
  → DELTA.md reflète exactement l'état réel
```
