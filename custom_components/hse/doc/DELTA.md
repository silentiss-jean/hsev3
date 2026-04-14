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
   - **COMMIT** → décision prise, on génère le patch doc + patch code en même temps → on ferme la ligne dans ce fichier
5. **Vérifier la 🗂️ Carte du repo** ci-dessous pour connaître l'état réel de chaque fichier

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🔒 Règle permanente — Cohérence inter-fichiers (ajoutée 2026-04-14)

> **Tout audit ou génération de code doit vérifier ces 5 paires de cohérence en plus de l'analyse intra-fichier.**

| # | Paire | Question à poser systématiquement |
|---|---|---|
| P1 | `services.yaml` ↔ `__init__.py` | Chaque service déclaré a-t-il un `async_register` ET un `async_remove` au unload ? |
| P2 | `translations/*.json` ↔ `*_flow.py` | Les clés `options.step.init.data.*` matchent-elles **exactement** les noms de champs du `vol.Schema` ? |
| P3 | `__init__.py` imports ↔ modules réels | Chaque `from .X import Y` : la classe/fonction `Y` existe-t-elle **sous ce nom exact** dans `X` ? |
| P4 | `const.py` constantes ↔ consommateurs | Chaque constante définie est-elle importée et utilisée ? |
| P5 | `manifest.json` ↔ imports runtime | Les dépendances HA utilisées sont-elles dans `after_dependencies` ? |

> **Règle complémentaire P3 — issue de DELTA-045** : toute classe view importée dans `__init__.py`
> doit être vérifiée par son **nom exact** dans le fichier source.
> Le pattern `HseXxxView` dans le fichier source peut différer du nom utilisé dans `__init__.py`
> si la classe a été renommée ou spécialisée (ex: `HseSettingsView` → `HseSettingsPricingView`).
> Vérifier systématiquement la concordance nom import ↔ nom class défini.

---

## 🗂️ Carte du repo — état réel au 2026-04-14

```
hsev3/
├── README.md                                    ✅
├── hse_v3_synthese.md                           ✅
└── custom_components/hse/
    ├── __init__.py                              ✅  (DELTA-034/035/045 : panel guard + 9 services + nom view settings)
    ├── manifest.json                            ✅  (DELTA-041)
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅  (DELTA-039/043)
    ├── api/base.py + views/* (13 views)         ✅
    ├── api/views/settings.py                    ✅  classe = HseSettingsPricingView
    ├── api/views/migration.py                   ✅  (DELTA-037/040)
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅  (DELTA-038/044)
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static/panel/shared/* (5 JS + 4 CSS) ✅
    └── web_static/panel/features/* (8 views JS) ✅
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
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` | DELTA-006 |
| `costs_by_entity` | Lit `energy_map` depuis recorder | DELTA-029a |
| `async_scan_hass` | Dans `catalogue/scan_engine.py` | DELTA-032a |
| `_build_costs_data` | Extraite de `HseCostsView` | DELTA-033d |
| Migration V2→V3 | No-action | DELTA-036 |
| Panel reload | `async_remove_panel` + `try/except` | DELTA-034 |
| Services HA | 9 handlers dans `_register_services()` | DELTA-035 |
| `HseMigrationView` | Façade dans `migration.py` | DELTA-037 |
| `default_settings()` | Exportée depuis `storage/manager.py` | DELTA-038 |
| Clés options traduction | Noms identiques aux champs `vol.Schema` | DELTA-039 |
| `LEGACY_V1_PREFIX` | Utilisé dans `migration.py` | DELTA-040 |
| `recorder` dépendance | Dans `after_dependencies` | DELTA-041 |
| `CATALOGUE_REFRESH_INTERVAL_S` | Non planifié — feature future | DELTA-042 |
| `config.step.user.data.name` | Clé orpheline supprimée | DELTA-043 |
| `default_catalogue()` / `default_meta()` | Proxies dans `storage/manager.py` | DELTA-044 |
| Classe settings view | `HseSettingsPricingView` (pas `HseSettingsView`) | DELTA-045 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée |
| 🟡 | `ANOMALIE` | Anomalie trouvée, correctif requis |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Écarts actifs

> **✅ Aucun écart actif.**
> DELTA-045 fermé en prod suite au premier boot HA (ImportError sur `HseSettingsView`).
> HSE V3 est déclarée **prête pour redémarrage HA**.

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

## Anomalies hors-audit (toutes ✅)

| ID | Statut | Titre | Fichier(s) |
|---|---|---|---|
| DELTA-034 | ✅ | Panel HA doublon sur reload | `__init__.py` |
| DELTA-035 | ✅ | 9 services sans handler | `__init__.py` |
| DELTA-036 | ✅ no-action | Migration V2→V3 | `config_flow.py` |
| DELTA-037 | ✅ | `HseMigrationView` inexistante | `migration.py` |
| DELTA-038 | ✅ | `default_settings()` absente | `storage/manager.py` |
| DELTA-039 | ✅ | Clés traduction options erronées | `fr.json` + `en.json` |
| DELTA-040 | ✅ | `LEGACY_V1_PREFIX` non utilisé | `migration.py` + `const.py` |
| DELTA-041 | ✅ | `recorder` absent de `manifest.json` | `manifest.json` |
| DELTA-042 | ✅ no-action | `CATALOGUE_REFRESH_INTERVAL_S` non planifié | `const.py` |
| DELTA-043 | ✅ | Clé `config.step.user.data.name` orpheline | `fr.json` + `en.json` |
| DELTA-044 | ✅ | `default_catalogue()` + `default_meta()` absentes | `storage/manager.py` |
| DELTA-045 | ✅ | `HseSettingsView` → `HseSettingsPricingView` | `__init__.py` |

---

## Historique complet

| ID | Fermé le | Description |
|---|---|---|
| DELTA-045 | 2026-04-14 | `HseSettingsView` renommé en `HseSettingsPricingView` dans `__init__.py` — détecté au 1er boot HA |
| DELTA-044 | 2026-04-14 | `default_catalogue()` + `default_meta()` manquantes dans `manager.py` |
| DELTA-043 | 2026-04-14 | Clé `config.step.user.data.name` orpheline supprimée |
| DELTA-042 | 2026-04-14 | `CATALOGUE_REFRESH_INTERVAL_S` non planifié — no-action |
| DELTA-041 | 2026-04-14 | `recorder` absent de `manifest.json` |
| DELTA-040 | 2026-04-14 | `LEGACY_V1_PREFIX` non utilisé |
| DELTA-039 | 2026-04-14 | Clés traduction options erronées |
| DELTA-038 | 2026-04-14 | `default_settings()` absente |
| DELTA-037 | 2026-04-14 | `HseMigrationView` inexistante |
| DELTA-036 | 2026-04-14 | Migration V2→V3 — no-action |
| DELTA-035 | 2026-04-14 | 9 services sans handler |
| DELTA-034 | 2026-04-14 | Panel HA doublon sur reload |
| DELTA-033 | 2026-04-14 | Phase 7 Cas limites |
| DELTA-032 | 2026-04-14 | Phase 6 Catalogue & Méta |
| DELTA-031 | 2026-04-14 | Phase 5 Frontend logique |
| DELTA-030 | 2026-04-13 | Phase 4 Contrat API↔Frontend |
| DELTA-029 | 2026-04-13 | Phase 3 Moteurs backend |
| DELTA-028 | 2026-04-13 | Phase 2 Sécurité & Auth |
| DELTA-027 | 2026-04-13 | Phase 1 Bootstrapping |
| DELTA-001 à 026 | 2026-04-08—13 | Décisions fondatrices V3 |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
