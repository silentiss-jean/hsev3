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
| Chemin fichiers statiques | `web_static/panel/shared/` (Option B) | DELTA-002 — 2026-04-09 |
| Chemin views frontend | `web_static/panel/features/<id>/<id>_view.js` | DELTA-003 — 2026-04-09 |

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
[FAIT] DELTA-005 → [BLOC 1 ✅] → [BLOC 2 ✅] → [BLOC 3 ✅] → [BLOC 4 ✅] → [DELTA-002 ✅] → [DELTA-003 ✅]
[FAIT] DELTA-001
[FAIT] DELTA-006 / 007 / 008 / 009 / 010

→ Section "Écarts actifs" vide = doc et code alignés ✅
```

---

## Écarts actifs

> ✅ **Aucun écart actif.** Doc et code sont parfaitement alignés.

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-003 | 2026-04-09 | 8 views JS — `web_static/panel/features/<id>/<id>_view.js` — R1–R5 sur chaque view |
| DELTA-002 | 2026-04-09 | Shell JS — `hse_fetch.js` + `hse_store.js` + `hse_shell.js` dans `web_static/panel/shared/` |
| DELTA-004 Bloc 4 | 2026-04-09 | Toutes les views `api/views/` — 19 classes, 11 fichiers |
| DELTA-004 Bloc 3 | 2026-04-09 | `engine/__init__.py` + `cost.py` (V2 INTACT) + `calculation.py` + `group_totals.py` + `analytics.py` |
| DELTA-004 Bloc 2 | 2026-04-09 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` |
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
