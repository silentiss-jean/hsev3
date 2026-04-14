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
>
> Un fichier correct en isolation peut être cassé par ce qu'un autre fichier attend de lui.
> DELTA-035 à 041 ont tous été trouvés via cette grille — jamais par la lecture isolée d'un fichier.

| # | Paire | Question à poser systématiquement |
|---|---|---|
| P1 | `services.yaml` ↔ `__init__.py` | Chaque service déclaré a-t-il un `async_register` ET un `async_remove` au unload ? |
| P2 | `translations/*.json` ↔ `*_flow.py` | Les clés `options.step.init.data.*` matchent-elles **exactement** les noms de champs du `vol.Schema` ? Les clés `config.step.*.data.*` sont-elles utilisées (form affiché) ? |
| P3 | `__init__.py` imports ↔ modules réels | Chaque `from .X import Y` : la classe/fonction `Y` existe-t-elle **sous ce nom exact** dans `X` ? |
| P4 | `const.py` constantes ↔ consommateurs | Chaque constante définie est-elle importée et utilisée ? Chaque string hardcodée dans le code a-t-elle une constante correspondante ? |
| P5 | `manifest.json` ↔ imports runtime | Les dépendances HA utilisées (`recorder`, `http`, etc.) sont-elles dans `dependencies` ou `after_dependencies` ? |

---

## 🗂️ Carte du repo — état réel au 2026-04-14

> ✅ = fichier présent et conforme | 🔴 = manquant ou stub (voir écart DELTA-0XX)

```
hsev3/
├── README.md                                    ✅
├── .gitignore                                   ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    ├── __init__.py                              ✅  (DELTA-034/035 : panel guard + 9 service handlers)
    ├── manifest.json                            ✅  (DELTA-041 : after_dependencies recorder)
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅  (9 services déclarés, tous enregistrés)
    ├── translations/fr.json + en.json           ✅  (DELTA-039 : clés options alignées schema)
    ├── api/base.py + views/* (13 views)         ✅
    ├── api/views/migration.py                   ✅  (DELTA-037 : HseMigrationView alias + DELTA-040 : LEGACY_V1_PREFIX)
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅  (DELTA-038 : default_settings() exportée)
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static/panel/shared/* (5 JS + 4 CSS) ✅
    └── web_static/panel/features/* (8 views JS) ✅
```

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` — V3 remplace V2 | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | Règle R4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — jamais localStorage | Règle R4 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Pas de `sensor.py` | Interdit — event `hse_sensors_ready` | `hse_v3_synthese.md` §2 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` : `hse_fetch.js`, etc. | DELTA-006 |
| `costs_by_entity` | Reçoit `energy_map` depuis recorder — jamais `get_energy_kwh(state)` | DELTA-029a |
| Fenêtres temporelles | `window_for_period()` depuis `time_utils` — pas de calcul inline | DELTA-029c |
| `async_scan_hass` | Définie dans `catalogue/scan_engine.py` — retourne `{"candidates": [...]}` | DELTA-032a |
| `_build_costs_data` | Logique coûts extraite de `HseCostsView` — appelable sans mock HTTP | DELTA-033d |
| Migration V2→V3 | V2 jamais en prod — `async_migrate_entry` inutile — no-action | DELTA-036 |
| Panel reload | `async_remove_panel` avant register + `try/except` — reload safe | DELTA-034 |
| Services HA | 9 handlers dans `_register_services()` + désenregistrés au unload | DELTA-035 |
| `HseMigrationView` | Classe façade dans `migration.py` — délègue GET→Export, POST→Apply | DELTA-037 |
| `default_settings()` | Fonction publique exportée depuis `storage/manager.py` | DELTA-038 |
| Clés options traduction | Noms **identiques** aux champs `vol.Schema` : `price_ttc_kwh`, `reference_entity_id` | DELTA-039 |
| `LEGACY_V1_PREFIX` | Utilisé dans `migration.py` — plus de string dupliquée | DELTA-040 |
| `recorder` dépendance | Dans `after_dependencies` de `manifest.json` | DELTA-041 |
| `CATALOGUE_REFRESH_INTERVAL_S` | Déclaré dans `const.py`, scan auto non planifié — feature future | DELTA-042 |
| `config.step.user.data.name` | Clé orpheline supprimée des JSON (config_flow sans formulaire) | DELTA-043 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée — résultats à venir |
| 🟡 | `ANOMALIE` | Anomalie trouvée pendant l'audit — correctif requis |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Écarts actifs

> **✅ Aucun écart actif.**
> Audit inter-fichiers (DELTA-037–043) entièrement fermé.
> HSE V3 est déclarée **prête pour première installation dans Home Assistant**.

---

## Phases de l'audit statique V3 (toutes ✅)

| ID | Statut | Phase | Priorité |
|---|---|---|---|
| DELTA-027 | ✅ | Phase 1 — Bootstrapping HA | 🔴 CRITIQUE |
| DELTA-028 | ✅ | Phase 2 — Sécurité & Auth | 🔴 CRITIQUE |
| DELTA-029 | ✅ | Phase 3 — Moteurs backend | 🟡 IMPORTANT |
| DELTA-030 | ✅ | Phase 4 — Contrat API ↔ Frontend | 🔴 CRITIQUE |
| DELTA-031 | ✅ | Phase 5 — Frontend logique | 🟡 IMPORTANT |
| DELTA-032 | ✅ | Phase 6 — Catalogue & Méta | 🟡 IMPORTANT |
| DELTA-033 | ✅ | Phase 7 — Cas limites & robustesse | 🟢 QUALITÉ |

---

## Anomalies hors-audit (toutes ✅)

| ID | Statut | Titre | Fichier(s) |
|---|---|---|---|
| DELTA-034 | ✅ | Panel HA doublon sur reload | `__init__.py` |
| DELTA-035 | ✅ | 9 services sans handler enregistré | `__init__.py` |
| DELTA-036 | ✅ no-action | Migration V2→V3 : `async_migrate_entry` absent | `config_flow.py` |
| DELTA-037 | ✅ | `HseMigrationView` inexistante → `ImportError` au boot | `migration.py` |
| DELTA-038 | ✅ | `default_settings()` absente → service `reset_settings` crashait | `storage/manager.py` |
| DELTA-039 | ✅ | Clés traduction options ne matchaient pas le `vol.Schema` | `fr.json` + `en.json` |
| DELTA-040 | ✅ | `LEGACY_V1_PREFIX` non utilisé dans `migration.py` | `migration.py` + `const.py` |
| DELTA-041 | ✅ | `recorder` absent de `manifest.json` | `manifest.json` |
| DELTA-042 | ✅ no-action | `CATALOGUE_REFRESH_INTERVAL_S` non planifié — feature future | `const.py` |
| DELTA-043 | ✅ | Clé `config.step.user.data.name` orpheline supprimée | `fr.json` + `en.json` |

---

## Historique complet

| ID | Fermé le | Description |
|---|---|---|
| DELTA-043 | 2026-04-14 | Clé `config.step.user.data.name` orpheline — supprimée des deux JSON |
| DELTA-042 | 2026-04-14 | `CATALOGUE_REFRESH_INTERVAL_S` non planifié — no-action, feature future |
| DELTA-041 | 2026-04-14 | `recorder` absent de `manifest.json` — ajouté dans `after_dependencies` |
| DELTA-040 | 2026-04-14 | `LEGACY_V1_PREFIX` non utilisé — importé et utilisé dans `migration.py` |
| DELTA-039 | 2026-04-14 | Clés traduction options erronées — renommées `price_ttc_kwh` + `reference_entity_id` |
| DELTA-038 | 2026-04-14 | `default_settings()` absente — exportée depuis `storage/manager.py` |
| DELTA-037 | 2026-04-14 | `HseMigrationView` inexistante — classe façade créée dans `migration.py` |
| DELTA-036 | 2026-04-14 | Migration V2→V3 — no-action : V2 jamais en prod |
| DELTA-035 | 2026-04-14 | 9 services sans handler — `_register_services()` implémentée |
| DELTA-034 | 2026-04-14 | Panel HA doublon sur reload — `async_remove_panel` + `try/except` |
| DELTA-033 | 2026-04-14 | Phase 7 Cas limites — 033b/c/d corrigés, 033a/e no-action |
| DELTA-032 | 2026-04-14 | Phase 6 Catalogue & Méta — 032a/c/d corrigés, 032b no-action |
| DELTA-031 | 2026-04-14 | Phase 5 Frontend logique — 031e/g/j corrigés, 031f/h/i no-fix |
| DELTA-030 | 2026-04-13 | Phase 4 Contrat API↔Frontend — 030c/d/e/f corrections doc |
| DELTA-029 | 2026-04-13 | Phase 3 Moteurs backend — 029a/b/c corrigés |
| DELTA-028 | 2026-04-13 | Phase 2 Sécurité & Auth — 028a/b corrigés |
| DELTA-027 | 2026-04-13 | Phase 1 Bootstrapping — 027a/b/c corrigés |
| DELTA-026 | 2026-04-13 | `diagnostic.py` + `config_view.js` |
| DELTA-025 | 2026-04-13 | `quality_score` entier — déjà présent |
| DELTA-024 | 2026-04-13 | `costs.py` — énergie période + historique |
| DELTA-023 | 2026-04-13 | `overview.py` — périodes + by_type |
| DELTA-022 | 2026-04-13 | `engine/period_stats.py` créé |
| DELTA-021 | 2026-04-12 | Audit exhaustif — 5 défauts → DELTA-022 à 026 |
| DELTA-020 | 2026-04-10 | `10_api_contrat.md` stubs + REST vs service |
| DELTA-019 | 2026-04-10 | `hse_fetch.js` séparateur `_` confirmé |
| DELTA-018 | 2026-04-10 | `.DS_Store` supprimé |
| DELTA-017 | 2026-04-10 | 8 `*_view.js` tous présents |
| DELTA-016 | 2026-04-10 | Shared frontend — dom.js + table.js + 4 CSS |
| DELTA-015 | 2026-04-10 | `HseHistoryView` + `HseExportView` dans `costs.py` |
| DELTA-014 | 2026-04-10 | `services.yaml` — 8 services |
| DELTA-013 | 2026-04-10 | `repairs.py` adapté V2→V3 |
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `en.json` |
| DELTA-011 | 2026-04-10 | `hse_panel.js` réécriture V3 |
| DELTA-003 | 2026-04-09 | 8 dossiers views JS créés |
| DELTA-002 | 2026-04-09 | Shell JS — fetch + store + shell |
| DELTA-004 Blocs 1–4 | 2026-04-09 | Tous les modules backend créés |
| DELTA-010 à 001 | 2026-04-08 | Décisions fondatrices V3 |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
