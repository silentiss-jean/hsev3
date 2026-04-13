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
6. **Aucun écart actif** — doc et code alignés au 2026-04-13

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🗂️ Carte du repo — état réel au 2026-04-13

> Mise à jour à chaque commit ajoutant ou supprimant un fichier.
> ✅ = fichier présent et conforme | 🔴 = manquant ou stub (voir écart DELTA-0XX)

```
hsev3/
├── README.md                                    ✅
├── .gitignore                                   ✅
├── analyse.md                                   ✅
├── analyse0.md                                  ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    ├── __init__.py                              ✅
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    │
    ├── translations/
    │   ├── fr.json                              ✅
    │   └── en.json                              ✅
    │
    ├── api/
    │   ├── __init__.py                          ✅
    │   ├── base.py                              ✅
    │   └── views/
    │       ├── __init__.py                      ✅
    │       ├── ping.py                          ✅
    │       ├── catalogue.py                     ✅ (DELTA-025 — 2026-04-13)
    │       ├── costs.py                         ✅ (DELTA-024 — 2026-04-13)
    │       ├── diagnostic.py                    ✅ (DELTA-026 — 2026-04-13)
    │       ├── frontend_manifest.py             ✅
    │       ├── meta.py                          ✅
    │       ├── migration.py                     ✅
    │       ├── overview.py                      ✅ (DELTA-023 — 2026-04-13)
    │       ├── scan.py                          ✅ (DELTA-025 — 2026-04-13)
    │       ├── settings.py                      ✅
    │       └── user_prefs.py                    ✅
    │
    ├── catalogue/
    │   ├── __init__.py                          ✅
    │   ├── defaults.py                          ✅
    │   ├── manager.py                           ✅
    │   ├── scan_engine.py                       ✅
    │   └── schema.py                            ✅
    │
    ├── meta/
    │   ├── __init__.py                          ✅
    │   ├── assignments.py                       ✅
    │   ├── schema.py                            ✅
    │   ├── store.py                             ✅
    │   └── sync.py                              ✅
    │
    ├── storage/
    │   ├── __init__.py                          ✅
    │   └── manager.py                           ✅
    │
    ├── engine/
    │   ├── __init__.py                          ✅
    │   ├── cost.py                              ✅
    │   ├── calculation.py                       ✅
    │   ├── group_totals.py                      ✅
    │   ├── analytics.py                         ✅ (entity seul — global non implémenté, documenté)
    │   └── period_stats.py                      ✅ (DELTA-022 — 2026-04-13)
    │
    ├── sensors/
    │   ├── __init__.py                          ✅
    │   ├── quality_scorer.py                    ✅
    │   ├── sync_manager.py                      ✅
    │   └── name_fixer.py                        ✅
    │
    ├── web_static/panel/
    │   ├── hse_panel.html                       ✅
    │   ├── hse_panel.js                         ✅
    │   ├── style.hse.panel.css                  ✅
    │   ├── shared/
    │   │   ├── hse_fetch.js                     ✅
    │   │   ├── hse_store.js                     ✅
    │   │   ├── hse_shell.js                     ✅
    │   │   ├── ui/
    │   │   │   ├── dom.js                       ✅
    │   │   │   └── table.js                     ✅
    │   │   └── styles/
    │   │       ├── hse_tokens.shadow.css        ✅
    │   │       ├── hse_themes.shadow.css        ✅
    │   │       ├── hse_alias.v2.css             ✅
    │   │       └── tokens.css                   ✅
    │   └── features/
    │       ├── overview/overview_view.js        ✅
    │       ├── diagnostic/diagnostic_view.js    ✅
    │       ├── scan/scan_view.js                ✅
    │       ├── config/config_view.js            ✅ (DELTA-026 — 2026-04-13)
    │       ├── custom/custom_view.js            ✅
    │       ├── cards/cards_view.js              ✅
    │       ├── migration/migration_view.js      ✅
    │       └── costs/costs_view.js              ✅
    │
    └── doc/
        ├── DELTA.md                             ✅ (ce fichier)
        ├── 00_methode_front_commune.md          ✅
        ├── 01_onglet_overview.md                ✅
        ├── 02_onglet_diagnostic.md              ✅
        ├── 03_onglet_scan.md                    ✅
        ├── 04_onglet_config.md                  ✅
        ├── 05_onglet_custom.md                  ✅
        ├── 06_onglet_cards.md                   ✅
        ├── 07_onglet_migration.md               ✅
        ├── 08_onglet_costs.md                   ✅
        ├── 09_squelette_hse_tab_base.md         ✅
        ├── 10_api_contrat.md                    ✅
        └── hse_v3_synthese.md                   ✅
```

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
| `hse_panel.js` | **RÉÉCRITURE complète** V3 — import `hse_shell.js` + `customPanelInfo` | DELTA-011 — 2026-04-10 |
| Rôle `hse_shell.js` | Custom element `<hse-panel>` + bootstrap + routing onglets | DELTA-011 — 2026-04-10 |
| Rôle `hse_panel.js` | Point d'entrée HA : `customPanelInfo` + `import hse_shell.js` | DELTA-011 — 2026-04-10 |
| URL statiques | `/hse-static/` → `web_static/panel/` | DELTA-011 — 2026-04-10 |
| Panel module_url | `/hse-static/hse_panel.js` | DELTA-011 — 2026-04-10 |
| Translations | `fr.json` + `en.json` — config_flow + options_flow + issues | DELTA-012 — 2026-04-10 |
| History + Export views | `HseHistoryView` + `HseExportView` dans `costs.py` (pas de fichiers séparés) | DELTA-015 — 2026-04-10 |
| Shared UI/CSS | `shared/ui/dom.js`, `table.js` — ES modules (migration V2 IIFE→ES) | DELTA-016 — 2026-04-10 |
| Shared styles | `hse_tokens.shadow.css`, `hse_themes.shadow.css`, `hse_alias.v2.css`, `tokens.css` | DELTA-016 — 2026-04-10 |
| `repairs.py` | Adapté V2→V3 — lecture via `HseStorageManager`, appel au démarrage (non bloquant) | DELTA-013 — 2026-04-10 |
| `services.yaml` | 8 services déclarés (catalogue_refresh, meta_sync, export_data, migrate_cleanup, reset_*, set_*) | DELTA-014 — 2026-04-10 |
| 8 `*_view.js` | Présents et vérifiés — audit fichier par fichier confirmé | DELTA-017 — 2026-04-10 |
| `.DS_Store` | Supprimé du repo + `.gitignore` ajouté à la racine | DELTA-018 — 2026-04-10 |
| Nom fichier `hse_fetch.js` | Correction doc : séparateur `_` (pas `.`) confirmé dans `00_methode_front_commune.md` §5 | DELTA-019 — 2026-04-10 |
| Stubs `week/month/year` + distinction REST vs service HA | Notes ajoutées dans `10_api_contrat.md` (§overview + §catalogue/refresh + §history) | DELTA-020 — 2026-04-10 |
| Nature chantier API Phases 2–3 | Modules V2 portés, pas réinventés — audit complet réalisé le 2026-04-12 | DELTA-021 — 2026-04-12 |
| Calcul énergie par période | `engine/period_stats.py` créé — `async_energy_for_period` + `async_total_energy_for_period` | DELTA-022 — 2026-04-13 |
| `overview.py` — périodes + by_type | Branché sur `period_stats` + `totals_by_type` — today_kwh/eur aussi corrigé | DELTA-023 — 2026-04-13 |
| `costs.py` — énergie période + historique | `HseCostsView` branché `async_energy_for_period`. `HseHistoryView` branché `async_history_12months` + `cost_eur` enrichissement `eur_ttc`. | DELTA-024 — 2026-04-13 |
| `quality_score` entier 0-100 | `scan.py` + `catalogue.py` : `score_item()` appelé dans les deux fichiers — déjà présent dans le code, DELTA.md était désynchronisé | DELTA-025 — 2026-04-13 |
| `diagnostic.py` friendly_name + config checkbox | `diagnostic.py` : friendly_name HA live + TODO repairs. `config_view.js` : cfg-check-all handler | DELTA-026 — 2026-04-13 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `CODE_MANQUANT` | Fichier ou fonction absent — bloque l'onglet |
| 🟡 | `CODE_INCORRECT` | Fichier présent mais retourne une valeur fausse |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Écarts actifs

> **Aucun écart actif.** Doc et code parfaitement alignés au 2026-04-13.

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-026 | 2026-04-13 | `diagnostic.py` : friendly_name HA live + TODO repairs. `config_view.js` : cfg-check-all handler. |
| DELTA-025 | 2026-04-13 | `scan.py` + `catalogue.py` : `score_item()` déjà présent dans le code — DELTA.md était désynchronisé. |
| DELTA-024 | 2026-04-13 | `costs.py` : `HseCostsView` branché `async_energy_for_period` (period réelle). `HseHistoryView` branché `async_history_12months` + enrichissement `eur_ttc` via `cost_eur`. |
| DELTA-023 | 2026-04-13 | `overview.py` branché sur `period_stats` (day/week/month/year) + `totals_by_type`. `today_kwh/eur` aussi corrigé. |
| DELTA-022 | 2026-04-13 | `engine/period_stats.py` créé — `async_energy_for_period` + `async_total_energy_for_period`. |
| DELTA-021 | 2026-04-12 | Audit exhaustif réalisé — 5 défauts identifiés → DELTA-022 à 026 ouverts. |
| DELTA-020 | 2026-04-10 | `10_api_contrat.md` : notes stubs + distinction REST vs service HA. |
| DELTA-019 | 2026-04-10 | `hse_fetch.js` (séparateur `_`) confirmé. |
| DELTA-018 | 2026-04-10 | `.DS_Store` supprimé + `.gitignore` ajouté. |
| DELTA-017 | 2026-04-10 | 8 `*_view.js` — tous présents. |
| DELTA-016 | 2026-04-10 | Shared frontend — `dom.js` + `table.js` + 4 CSS. |
| DELTA-015 | 2026-04-10 | `HseHistoryView` + `HseExportView` dans `costs.py`. |
| DELTA-014 | 2026-04-10 | `services.yaml` — 8 services. |
| DELTA-013 | 2026-04-10 | `repairs.py` adapté V2→V3. |
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `en.json`. |
| DELTA-011 | 2026-04-10 | `hse_panel.html` + `hse_panel.js` (réécriture V3). |
| DELTA-003 | 2026-04-09 | 8 dossiers views JS créés. |
| DELTA-002 | 2026-04-09 | Shell JS — `hse_fetch.js` + `hse_store.js` + `hse_shell.js`. |
| DELTA-004 Bloc 4 | 2026-04-09 | Toutes les views `api/views/`. |
| DELTA-004 Bloc 3 | 2026-04-09 | `engine/` (5 modules). |
| DELTA-004 Bloc 2 | 2026-04-09 | `storage/`, `catalogue/`, `meta/`, `options_flow.py`. |
| DELTA-004 Bloc 1 | 2026-04-09 | `manifest.json` + `__init__.py` + `api/base.py` + ping. |
| DELTA-010 | 2026-04-08 | `frontend_manifest.py` conservé. |
| DELTA-009 | 2026-04-08 | Capteur référence → `storage/manager.py`. |
| DELTA-008 | 2026-04-08 | Migration : Hypothèse A. |
| DELTA-007 | 2026-04-08 | Source repo V2. |
| DELTA-006 | 2026-04-08 | Nommage frontend : séparateur `_`. |
| DELTA-005 | 2026-04-08 | `10_api_contrat.md` rédigé. |
| DELTA-001 | 2026-04-08 | Payload `user_prefs` défini. |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
