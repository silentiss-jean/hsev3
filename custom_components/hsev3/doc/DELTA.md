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
| Nommage fichiers frontend | Séparateur `_` partout : `hse_fetch.js`, `hse_store.js`, `hse_tab_base.js`, etc. (`hse_panel.js` inchangé) | DELTA-006 — 2026-04-08 |
| Polling onglets "action" | ZÉRO polling auto sur config/scan/migration/cards/custom — refresh sur action utilisateur uniquement | Session 2026-04-08 |
| Polling onglets "lecture" | Polling autorisé (overview/costs/diagnostic) mais **suspendu si onglet inactif** (`unmount` cancel) | Session 2026-04-08 |
| Dossier HACS | `custom_components/hse/` (avec `s`) — correction effectuée dans le repo | DELTA-004 — 2026-04-08 |
| Source repo V2 | `https://github.com/silentiss-jean/hse.git` — lecture directe autorisée pour `catalogue/`, `meta/`, `engine/cost.py` | DELTA-007 — 2026-04-08 |
| Migration : cible | **Hypothèse A** — le wizard ajoute les `entity_id` V1 au catalogue V3, sans renommage ni `utility_meter` | DELTA-008 — 2026-04-08 |
| Capteur de référence | Stocké dans `storage/manager.py` (live, sans restart) — **pas dans `options_flow`** | DELTA-009 — 2026-04-08 |
| `frontend_manifest.py` | **Conservé** — expose version, liste onglets actifs, feature flags (ex: Migration si V1 détectée) | DELTA-010 — 2026-04-08 |

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
[FAIT] DELTA-006
[FAIT] DELTA-007
[FAIT] DELTA-008
[FAIT] DELTA-009
[FAIT] DELTA-010
```

---

## Écarts actifs

### [DELTA-004] 🔴 DOC_AHEAD — Backend Python V3
- **Doc concernée** : `hse_v3_synthese.md` §3, §9 + `10_api_contrat.md`
- **Ce que la doc dit** : structure en sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/`
- **État du code** : aucun code backend V3 produit
- **Impact** : tous les endpoints consommés par le frontend n'existent pas
- **Séquence de résolution** :
  - Bloc 1 — Squelette : `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` ← **PROCHAIN**
  - Bloc 2 — Data : `storage/manager.py` + `meta/` + capteur référence dans storage (DELTA-009 ✅)
  - Bloc 3 — Moteurs : `engine/cost.py` (source : `silentiss-jean/hse` ✅) + `engine/calculation.py` + `engine/group_totals.py` + `engine/analytics.py`
  - Bloc 4 — Views API : toutes les views `api/views/` avec `HseBaseView` — migration = Hypothèse A (DELTA-008 ✅)
- **Bloquant pour** : tout
- **Dépendances bloquantes** : aucune — toutes les questions préalables sont tranchées ✅

---

### [DELTA-002] 🔴 DOC_AHEAD — Fichier `hse_fetch.js` et injection token
- **Doc concernée** : `00_methode_front_commune.md` §5, `09_squelette_hse_tab_base.md`
- **Ce que la doc dit** : tous les appels HTTP passent par `hseFetch` injecté dans `ctx`, token via `window.__hseToken`
- **État du code** : fichier non créé, shell non écrit
- **Nommage acté** : `hse_fetch.js` (séparateur `_` — DELTA-006 ✅). La doc `00_methode_front_commune.md` et `hse_v3_synthese.md` §3.2 doivent être patchées pour remplacer `hse.fetch.js` → `hse_fetch.js` au moment du COMMIT de ce delta.
- **Impact** : aucun onglet ne peut faire de fetch sans ce fichier
- **Bloquant pour** : tous les onglets
- **Dépendances bloquantes** : DELTA-004 Bloc 1 doit être résolu en premier

---

### [DELTA-003] 🔴 DOC_AHEAD — Structure des 8 onglets (views JS)
- **Doc concernée** : `01_onglet_overview.md` à `08_onglet_costs.md`
- **Ce que la doc dit** : 8 fichiers `*_view.js` avec contrat `mount / update_hass / unmount` (nommage `_`)
- **État du code** : aucun fichier `_view.js` n'existe encore
- **Note** : ne pas commencer avant que DELTA-002 et DELTA-004 Bloc 4 soient résolus
- **Impact** : tout le frontend est à créer
- **Bloquant pour** : tout le frontend

---

## Historique des alignements

| ID | Fermé le | Description |
|---|---|---|
| DELTA-010 | 2026-04-08 | `frontend_manifest.py` conservé — expose version, onglets actifs, feature flags |
| DELTA-009 | 2026-04-08 | Capteur de référence → `storage/manager.py` (live, sans restart HA) |
| DELTA-008 | 2026-04-08 | Migration : Hypothèse A — wizard ajoute `entity_id` V1 au catalogue V3, pas de `utility_meter` |
| DELTA-007 | 2026-04-08 | Source repo V2 confirmée : `https://github.com/silentiss-jean/hse.git` |
| DELTA-006 | 2026-04-08 | Nommage frontend : séparateur `_` partout (`hse_fetch.js`, `hse_store.js`, `hse_tab_base.js`) |
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
