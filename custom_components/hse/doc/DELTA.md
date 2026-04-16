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
3. **Proposer de fermer** un écart quand la solution est validée — **mais attendre la confirmation humaine avant de passer à ✅**
4. **Distinguer** les deux modes de travail :
   - **EXPLORATION** → on réfléchit, rien n'est écrit, on ajoute une ligne `EN_DISCUSSION` si la discussion dure
   - **COMMIT** → décision prise, on pousse le patch code + doc → statut passe à `CORRECTIF_DEPLOYÉ` (pas encore `ALIGNED`)
5. **Ne jamais passer à `✅ ALIGNED`** sans que l'humain ait explicitement confirmé que le correctif fonctionne
6. **Vérifier la 🗂️ Carte du repo** ci-dessous pour connaître l'état réel de chaque fichier

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🔒 Règle permanente — Cohérence inter-fichiers

| # | Paire | Question à poser systématiquement |
|---|---|---|
| P1 | `services.yaml` ↔ `__init__.py` | Chaque service déclaré a-t-il un `async_register` ET un `async_remove` au unload ? |
| P2 | `translations/*.json` ↔ `*_flow.py` | Les clés `options.step.init.data.*` matchent-elles **exactement** les noms de champs du `vol.Schema` ? |
| P3 | `__init__.py` imports ↔ modules réels | Chaque `from .X import Y` : la classe/fonction `Y` existe-t-elle **sous ce nom exact** dans `X` ? |
| P4 | `const.py` constantes ↔ consommateurs | Chaque constante définie est-elle importée et utilisée ? |
| P5 | `manifest.json` ↔ imports runtime | Les dépendances HA utilisées sont-elles dans `after_dependencies` ? |

---

## 🗂️ Carte du repo — état réel au 2026-04-16

```
hsev3/
├── README.md                                    ✅
├── hse_v3_synthese.md                           ✅
└── custom_components/hse/
    ├── __init__.py                              ✅  (backend stable)
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅
    ├── api/base.py + views/* (13 views)         ✅
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static/panel/                        🔴  ABANDON — DELTA-052 : tout le front est à recoder
    └── doc/                                     ✅
```

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | Règle R4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — jamais localStorage | Règle R4 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT, ne pas toucher | `hse_v3_synthese.md` §7 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| CSS Shadow DOM | **Inliné dans `hse_shell.js`** — zéro fetch runtime (décision DELTA-050) | `hse_shell.js` |
| **Front à refaire** | **Refonte complète page par page** — décision 2026-04-16 | DELTA-052 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | Réflexion en cours, rien de commité |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée, résultats à venir |
| 🟡 | `CORRECTIF_DEPLOYÉ` | Patch commité — **en attente de validation humaine** |
| ⭐ | `ABANDON` | Écart abandonné — problème noyé dans une refonte plus large |
| ✅ | `ALIGNED` | Fermé — **uniquement après confirmation humaine** |

---

## Écarts actifs

| ID | Statut | Titre | Fichier(s) | Prochaine action |
|---|---|---|---|---|
| DELTA-052 | 🔴 `AUDIT_EN_COURS` | **REFONTE COMPLÈTE DU FRONT** — recoder toutes les pages JS une par une | `web_static/panel/` — tout | Voir section DELTA-052 ci-dessous |

---

## 🔴 DELTA-052 — Refonte complète du frontend (ouvert 2026-04-16)

### Contexte

Le front existant (`web_static/panel/`) a accumulé trop de dette :
- Shadow DOM sans style malgré plusieurs tentatives de correctif
- CSS inliné non appliqué (fond noir persistant)
- Architecture de chargement fragile (imports dynamiques échouent silencieusement)
- Impossible de debugger incrémentalement sans casser autre chose

**Décision 2026-04-16 :** on efface et on repart de zéro, page par page.
Chaque page est construite + testée contre le backend réel avant de passer à la suivante.

### Contraintes non négociables (hse_v3_synthese.md + 00_methode_front_commune.md)

- **R1** — `mount()` construit le DOM une fois. `update_hass()` ne touche jamais le DOM. `unmount()` nettoie tout.
- **R2** — Flag `_fetching` sur chaque fetch (anti race condition)
- **R3** — Signature `JSON.stringify` avant tout `_render()` (anti re-render inutile)
- **R4** — Zéro `localStorage` — tout passe par `PATCH /api/hse/user_prefs`
- **R5** — Skeleton `.hse-skeleton` posé dans `mount()` avant le premier fetch
- Tous les appels HTTP via `ctx.hseFetch` (jamais `fetch` direct)
- CSS Shadow DOM **inliné dans `hse_shell.js`** (pas de fichiers CSS chargés au runtime)
- Vanilla JS uniquement — zéro framework

### Ordre de reconstruction recommandé

| Ordre | Page | Endpoint(s) testé(s) | Statut |
|---|---|---|---|
| 1 | `hse_shell.js` | `/api/hse/ping`, `/api/hse/frontend_manifest` | ❓ À faire |
| 2 | `overview` | `/api/hse/overview` | ❓ À faire |
| 3 | `diagnostic` | `/api/hse/diagnostic` | ❓ À faire |
| 4 | `scan` | `/api/hse/scan` | ❓ À faire |
| 5 | `config` | `/api/hse/settings` | ❓ À faire |
| 6 | `costs` | `/api/hse/costs`, `/api/hse/history`, `/api/hse/export` | ❓ À faire |
| 7 | `migration` | `/api/hse/migration`, `/api/hse/migration/export`, `/api/hse/migration/apply` | ❓ À faire |
| 8 | `cards` | `/api/hse/catalogue` | ❓ À faire |
| 9 | `custom` | `/api/hse/user_prefs` | ❓ À faire |

### Règles de session pour l'IA

- **Démarrer par `hse_shell.js`** — le shell doit fonctionner avant de coder quoi que ce soit d'autre
- **Une page à la fois** — ne pas passer à la suivante avant que la précédente soit validée par l'humain
- **Tester le backend** à chaque étape : si un endpoint ne répond pas correctement, ouvrir un écart DELTA séparé dans la section "Backend à corriger" ci-dessous
- **Mode COMMIT uniquement** : pas d'EXPLORATION sans page complète à tester
- Le CSS reste **inliné dans `hse_shell.js`** — les fichiers `/styles/*.css` sont conservés comme documentation uniquement

### Backend à corriger (ouvert au fil des tests)

| ID | Endpoint | Problème | Statut |
|---|---|---|---|
| *(vide — à compléter lors des tests)* | | | |

---

## Écarts abandonnés (2026-04-16)

Tous les écarts suivants sont abandonnés car noyés dans DELTA-052 (refonte complète du front).

| ID | Titre original | Raison de l'abandon |
|---|---|---|
| DELTA-045 | `HseSettingsView` → `HseSettingsPricingView` | Front à recoder — problème de nommage irrelevant avec la refonte |
| DELTA-046 | CSS Shadow DOM non injecté | Absorbé par DELTA-052 |
| DELTA-047 | `hse_components.shadow.css` manquant | Absorbé par DELTA-052 |
| DELTA-048 | Fond noir résiduel | Absorbé par DELTA-052 |
| DELTA-049 | Guard navigation rapide | Absorbé par DELTA-052 |
| DELTA-050 | CSS inliné dans `hse_shell.js` | Absorbé par DELTA-052 — la décision d'inliner reste valide |
| DELTA-051 | `HseMigrationExportView` + `HseMigrationApplyView` non enregistrées | `__init__.py` corrigé, backend OK — sera vérifié lors du test de l'onglet migration |

---

## Phases de l'audit statique V3 (toutes ✅)

| ID | Statut | Phase |
|---|---|---|
| DELTA-027 | ✅ | Phase 1 — Bootstrapping HA |
| DELTA-028 | ✅ | Phase 2 — Sécurité & Auth |
| DELTA-029 | ✅ | Phase 3 — Moteurs backend |
| DELTA-030 | ✅ | Phase 4 — Contrat API ↔ Frontend |
| DELTA-031 | ✅ | Phase 5 — Frontend logique |
| DELTA-032 | ✅ | Phase 6 — Catalogue & Méta |
| DELTA-033 | ✅ | Phase 7 — Cas limites & robustesse |

---

## Anomalies hors-audit (fermées ✅)

| ID | Titre | Fichier(s) |
|---|---|---|
| DELTA-034 | Panel HA doublon sur reload | `__init__.py` |
| DELTA-035 | 9 services sans handler | `__init__.py` |
| DELTA-036 | Migration V2→V3 no-action | `config_flow.py` |
| DELTA-037 | `HseMigrationView` inexistante | `migration.py` |
| DELTA-038 | `default_settings()` absente | `storage/manager.py` |
| DELTA-039 | Clés traduction options erronées | `fr.json` + `en.json` |
| DELTA-040 | `LEGACY_V1_PREFIX` non utilisé | `migration.py` + `const.py` |
| DELTA-041 | `recorder` absent de `manifest.json` | `manifest.json` |
| DELTA-042 | `CATALOGUE_REFRESH_INTERVAL_S` non planifié | `const.py` |
| DELTA-043 | Clé `config.step.user.data.name` orpheline | `fr.json` + `en.json` |
| DELTA-044 | `default_catalogue()` + `default_meta()` absentes | `storage/manager.py` |

---

## Workflow rapide

```
Début de session  : lire DELTA.md → identifier les écarts actifs
EXPLORATION      : pas de commit → statut EN_DISCUSSION si > 1 tour
COMMIT           : patch code + doc → statut CORRECTIF_DEPLOYÉ
Validation human : "ok ça marche" → statut ALIGNED (✅) + historique
```
