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

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` — V3 **remplace** V2 | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | `hse_v3_synthese.md` §4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — **jamais localStorage** | Règle R4 |
| Stockage `user_prefs` | `StorageManager` dans `storage/manager.py` | `hse_v3_synthese.md` §7 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Pas de `sensor.py` | Interdit — event `hse_sensors_ready` | `hse_v3_synthese.md` §2 |
| `__init__.py` | < 200 lignes, orchestration uniquement | `hse_v3_synthese.md` §3.2 |
| Fichiers statiques | `StaticPathConfig` — pas de `shutil.copytree` | `hse_v3_synthese.md` §4 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` : `hse_fetch.js`, `hse_store.js`, etc. | DELTA-006 — 2026-04-08 |
| Dossier HACS | `custom_components/hse/` | DELTA-004 — 2026-04-08 |
| Source repo V2 | `https://github.com/silentiss-jean/hse.git` | DELTA-007 — 2026-04-08 |
| Migration | Hypothèse A — ajout `entity_id` V1 au catalogue V3 | DELTA-008 — 2026-04-08 |
| Capteur référence | `storage/manager.py` (live, sans restart) | DELTA-009 — 2026-04-08 |
| `frontend_manifest.py` | Conservé — version + onglets + feature flags | DELTA-010 — 2026-04-08 |
| Polling onglets "action" | ZÉRO auto — refresh sur action uniquement | Session 2026-04-08 |
| Polling onglets "lecture" | Autorisé mais suspendu si onglet inactif | Session 2026-04-08 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `DOC_AHEAD` | Doc en avance sur le code |
| 🟡 | `CODE_AHEAD` | Code en avance sur la doc |
| ✅ | `ALIGNED` | Résolu et committé |

---

## Ordre de résolution

```
[FAIT] DELTA-005 → [BLOC 1 ✅] DELTA-004 Bloc 1 → [BLOC 2 ✅] DELTA-004 Bloc 2 → [SUIVANT] Bloc 3 → Bloc 4 → DELTA-002 → DELTA-003
[FAIT] DELTA-001
[FAIT] DELTA-006 / 007 / 008 / 009 / 010
```

---

## Écarts actifs

### [DELTA-004] 🔴 DOC_AHEAD — Backend Python V3
- **Doc concernée** : `hse_v3_synthese.md` §3 + `10_api_contrat.md`
- **Progression** :
  - ✅ Bloc 1 **TERMINÉ** — `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` (commit 2026-04-09)
  - ✅ Bloc 2 **TERMINÉ** — `storage/manager.py` + `catalogue/` + `meta/` complet + `options_flow.py` (commit 2026-04-09)
  - 🔴 Bloc 3 **EN COURS** — `engine/cost.py` (V2) + `engine/calculation.py` (V1) + `engine/group_totals.py` (V1) + `engine/analytics.py` (V1)
  - ⏳ Bloc 4 — Toutes les views `api/views/` — migration = Hypothèse A
- **Bloquant pour** : tout
- **Dépendances** : aucune — toutes les questions préalables tranchées

---

### [DELTA-002] 🔴 DOC_AHEAD — `hse_fetch.js` + injection token
- **Ce que la doc dit** : tous les appels HTTP passent par `hseFetch(ctx)`, token via `window.__hseToken`
- **État** : fichier non créé, shell non écrit
- **Note** : nommage `hse_fetch.js` (underscore) acté — doc `00_methode_front_commune.md` à patcher au COMMIT
- **Bloquant pour** : tous les onglets
- **Dépendance** : DELTA-004 Bloc 1 ✅

---

### [DELTA-003] 🔴 DOC_AHEAD — 8 onglets (views JS)
- **Ce que la doc dit** : 8 fichiers `*_view.js` avec contrat `mount / update_hass / unmount`
- **État** : aucun fichier créé
- **Bloquant pour** : tout le frontend
- **Dépendance** : DELTA-002 + DELTA-004 Bloc 4

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-004 Bloc 2 | 2026-04-09 | `storage/manager.py` + `catalogue/` + `meta/` (`store.py` + `assignments.py`) + `options_flow.py` |
| DELTA-004 Bloc 1 | 2026-04-09 | `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` |
| DELTA-010 | 2026-04-08 | `frontend_manifest.py` conservé |
| DELTA-009 | 2026-04-08 | Capteur référence → `storage/manager.py` |
| DELTA-008 | 2026-04-08 | Migration : Hypothèse A |
| DELTA-007 | 2026-04-08 | Source repo V2 : `silentiss-jean/hse` |
| DELTA-006 | 2026-04-08 | Nommage frontend : séparateur `_` |
| DELTA-005 | 2026-04-08 | `10_api_contrat.md` rédigé |
| DELTA-001 | 2026-04-08 | Payload `user_prefs` défini |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
