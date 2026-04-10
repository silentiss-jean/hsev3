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

## 🗂️ Carte du repo — état réel au 2026-04-10

> Mise à jour à chaque commit ajoutant ou supprimant un fichier.
> ✅ = fichier présent et conforme | 🔴 = manquant (voir écart DELTA-0XX)

```
hsev3/
├── README.md                                    ✅
├── .gitignore                                   ✅ DELTA-018 fermé 2026-04-10
├── analyse.md                                   ✅
├── analyse0.md                                  ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    ├── __init__.py                              ✅ (panel + vues + repairs au démarrage)
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅ DELTA-013 fermé 2026-04-10
    ├── services.yaml                            ✅ DELTA-014 fermé 2026-04-10
    │
    ├── translations/
    │   ├── fr.json                              ✅ DELTA-012 fermé 2026-04-10
    │   └── en.json                              ✅ DELTA-012 fermé 2026-04-10
    │
    ├── api/
    │   ├── __init__.py                          ✅
    │   ├── base.py                              ✅
    │   └── views/
    │       ├── __init__.py                      ✅
    │       ├── ping.py                          ✅
    │       ├── catalogue.py                     ✅
    │       ├── costs.py                         ✅ (HseCostsView + HseHistoryView + HseExportView)
    │       ├── diagnostic.py                    ✅
    │       ├── frontend_manifest.py             ✅
    │       ├── meta.py                          ✅
    │       ├── migration.py                     ✅
    │       ├── overview.py                      ✅
    │       ├── scan.py                          ✅
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
    │   └── analytics.py                         ✅
    │
    ├── sensors/
    │   ├── __init__.py                          ✅
    │   ├── quality_scorer.py                    ✅
    │   ├── sync_manager.py                      ✅
    │   └── name_fixer.py                        ✅
    │
    ├── web_static/panel/
    │   ├── hse_panel.html                       ✅ DELTA-011 fermé 2026-04-10
    │   ├── hse_panel.js                         ✅ DELTA-011 fermé 2026-04-10
    │   ├── style.hse.panel.css                  ✅ DELTA-011 fermé 2026-04-10
    │   ├── shared/
    │   │   ├── hse_fetch.js                     ✅
    │   │   ├── hse_store.js                     ✅
    │   │   ├── hse_shell.js                     ✅
    │   │   ├── ui/
    │   │   │   ├── dom.js                       ✅ DELTA-016 fermé 2026-04-10
    │   │   │   └── table.js                     ✅ DELTA-016 fermé 2026-04-10
    │   │   └── styles/
    │   │       ├── hse_tokens.shadow.css        ✅ DELTA-016 fermé 2026-04-10
    │   │       ├── hse_themes.shadow.css        ✅ DELTA-016 fermé 2026-04-10
    │   │       ├── hse_alias.v2.css             ✅ DELTA-016 fermé 2026-04-10
    │   │       └── tokens.css                   ✅ DELTA-016 fermé 2026-04-10
    │   └── features/
    │       ├── overview/overview_view.js        ✅ DELTA-017 fermé 2026-04-10
    │       ├── diagnostic/diagnostic_view.js    ✅ DELTA-017 fermé 2026-04-10
    │       ├── scan/scan_view.js                ✅ DELTA-017 fermé 2026-04-10
    │       ├── config/config_view.js            ✅ DELTA-017 fermé 2026-04-10
    │       ├── custom/custom_view.js            ✅ DELTA-017 fermé 2026-04-10
    │       ├── cards/cards_view.js              ✅ DELTA-017 fermé 2026-04-10
    │       ├── migration/migration_view.js      ✅ DELTA-017 fermé 2026-04-10
    │       └── costs/costs_view.js              ✅ DELTA-017 fermé 2026-04-10
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

### Comptage rapide

| Catégorie | ✅ Présents | 🔴 Manquants |
|---|---|---|
| Backend Python | 34 | 0 |
| Frontend JS/CSS — shell + shared | 12 | 0 |
| Frontend JS — views onglets | 8 | 0 |
| Translations | 2 | 0 |
| Documentation | 13 | 0 |
| **Total** | **69** | **0** |

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
| Nature du chantier API Phase 2–3 | Modules V2 à **réorganiser**, pas à réinventer — voir DELTA-021 | DELTA-021 — 2026-04-10 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `DOC_AHEAD` | Doc en avance sur le code |
| 🟡 | `CODE_AHEAD` | Code en avance sur la doc |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Ordre de résolution

```
[FAIT] DELTA-005 → [BLOC 1 ✅] → [BLOC 2 ✅] → [BLOC 3 ✅] → [BLOC 4 ✅] → [DELTA-002 ✅] → [DELTA-003 ✅]
[FAIT] DELTA-001
[FAIT] DELTA-006 / 007 / 008 / 009 / 010
[FAIT] DELTA-011 ✅ 2026-04-10
[FAIT] DELTA-012 ✅ 2026-04-10
[FAIT] DELTA-013 ✅ 2026-04-10
[FAIT] DELTA-014 ✅ 2026-04-10
[FAIT] DELTA-015 ✅ 2026-04-10
[FAIT] DELTA-016 ✅ 2026-04-10
[FAIT] DELTA-017 ✅ 2026-04-10 — audit réel : 8 views JS présentes et vérifiées
[FAIT] DELTA-018 ✅ 2026-04-10 — .DS_Store supprimé + .gitignore ajouté
[FAIT] DELTA-019 ✅ 2026-04-10 — hse.fetch.js → hse_fetch.js dans 00_methode_front_commune.md §5
[FAIT] DELTA-020 ✅ 2026-04-10 — stubs week/month/year + distinction REST vs service HA dans 10_api_contrat.md

[EN COURS] DELTA-021 🟠 2026-04-10 — chantier API : nature réelle des phases 2 et 3
```

---

## Écarts actifs

### 🟠 DELTA-021 — `EN_DISCUSSION` — Nature réelle du chantier API (Phases 2 et 3)

**Ouvert le :** 2026-04-10  
**Source :** Relecture comparée de `analyse.md`, `analyse0.md` et `hse_v3_synthese.md`  
**Priorité :** HAUTE — touche la stratégie de développement des phases restantes

#### Problème identifié

La `hse_v3_synthese.md` (§9 Plan de développement, Phases 2 et 3) présente les modules backend comme un **travail de création**, alors qu'ils existaient déjà en V2 (`hse`) et **fonctionnaient**.

La confusion vient du fait que les deux analyses (`analyse.md` et `analyse0.md`) ont été produites sur les **repos V1 et V2 d'origine**, non sur `hsev3`. La synthèse a fusionné les deux plans sans distinguer :
- ce qui était **déjà fait en V2** (et doit être porté/réorganisé)
- ce qui est **vraiment nouveau en V3** (fichiers créés ex nihilo)

#### Ce qui était déjà fonctionnel en V2 (repo `silentiss-jean/hse`)

| Module | Fichier V2 | Statut V2 | Action V3 |
|---|---|---|---|
| Moteur de coût | `shared_cost_engine.py` | ✅ Fonctionnel, testé | Portage → `engine/cost.py` INTACT |
| Catalogue scan | `catalogue_manager.py` + `scan_engine.py` | ✅ Fonctionnel | Portage → `catalogue/` |
| Catalogue stockage | `catalogue_store.py` + `catalogue_schema.py` | ✅ Fonctionnel | Portage → `catalogue/` |
| Meta rooms/types | `meta_store.py` + `meta_sync.py` | ✅ Fonctionnel | Portage → `meta/` |
| API REST 30+ endpoints | `api/unified_api.py` | ✅ Fonctionnel | Refactorisé en `api/views/*.py` |
| Repairs HA natif | `repairs.py` | ✅ Fonctionnel | Portage + adaptation storage |
| Translations | `translations/fr.json` + `en.json` | ✅ Présents | Portés tels quels |
| Auth sécurité | `requires_auth = True` | ✅ Déjà en V2 | **Non à réinventer** |

> **Conséquence directe :** Le plan de développement V3 "Phase 2 — Meta, Storage, Options" et "Phase 3 — Moteurs métier" décrivent en réalité des **portages et réorganisations structurelles**, pas des réécritures. L'IA qui travaillera sur ces phases doit partir du code V2 existant, pas d'une feuille blanche.

#### Ce qui est réellement nouveau en V3 (n'existait ni en V1 ni en V2)

| Fichier | Raison d'être nouveau |
|---|---|
| `api/base.py` (`HseBaseView`) | Classe de base explicite — V2 répétait `requires_auth` partout |
| `api/views/user_prefs.py` | Remplace `localStorage` — concept nouveau V3 |
| `api/views/migration_apply.py` | Étape 3 du wizard migration — absent des deux versions |
| `meta/assignments.py` | Logique d'assignation capteur→pièce/type extraite de `meta_sync.py` |
| `storage/manager.py` (V3) | Unification Storage V1 épuré + adaptation V2 |
| `hse_tab_base.js` (si créé) | Module JS des règles R1–R5 — nouveau contrat |
| `hse_fetch.js` (modifié) | Injection token HA centralisée — V2 le faisait inline |

#### Ce qui vient de V1 et doit être **réintégré** (absent de V2)

| Fichier V1 | Module V3 cible | Statut |
|---|---|---|
| `history_analytics.py` | `engine/analytics.py` | À porter depuis V1 |
| `calculation_engine.py` | `engine/calculation.py` | À porter depuis V1 |
| `group_totals.py` | `engine/group_totals.py` | À porter depuis V1 |
| `sensor_quality_scorer.py` | `sensors/quality_scorer.py` | À porter depuis V1 |
| `sensor_sync_manager.py` (épuré) | `sensors/sync_manager.py` | À porter depuis V1, épuré |
| `sensor_name_fixer.py` | `sensors/name_fixer.py` | À porter depuis V1 |
| `storage_manager.py` (épuré) | `storage/manager.py` | À porter depuis V1, épuré |
| `options_flow.py` (complet) | `options_flow.py` | À porter depuis V1 |
| Services HA (dans `__init__.py` V1) | `services.yaml` | Extraits et déclarés |
| `energy_export.py` + `export.py` | `api/views/costs.py` (`HseExportView`) | À porter depuis V1 |

#### Consigne pour l'IA qui traitera ce DELTA

> **Ne jamais réécrire de zéro ce qui vient de V2.**
> Toujours commencer par lire le fichier source V2 dans `https://github.com/silentiss-jean/hse` avant de générer un équivalent V3.
> Pour les portages V1, lire le fichier source V1 dans `https://github.com/silentiss-jean/home_suivi_elec`.
> Le travail est : lire → adapter (structure + sécurité + storage) → intégrer. Pas réécrire.

#### Questions ouvertes (à trancher avant fermeture)

1. **Les fichiers backend de `hsev3` (`engine/`, `catalogue/`, `meta/`, etc.) ont-ils été portés depuis V2, ou sont-ils des stubs vides ?** → Vérifier le contenu réel de chaque fichier (pas juste la présence).
2. **`hse_v3_synthese.md` doit-il être amendé** pour corriger la description des phases 2 et 3, ou est-ce suffisant de l'indiquer ici ?
3. **`analyse.md` et `analyse0.md` décrivent une architecture cible**, pas l'état du code. La synthèse doit-elle l'indiquer explicitement en entête ?

#### Prochaine action recommandée

```
MODE : EXPLORATION → vérification du contenu réel des fichiers backend hsev3
TÂCHE : lire 3-5 fichiers backend clés (engine/cost.py, catalogue/manager.py, meta/sync.py)
        et vérifier s'ils sont des portages complets ou des stubs
RÉSULTAT : si stubs → ouvrir DELTA-022 "contenu backend incomplet"
           si portages complets → fermer DELTA-021 et amender hse_v3_synthese.md
```

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-020 | 2026-04-10 | `10_api_contrat.md` : note stubs `0.0` sur `week/month/year` (§overview) + note distinction `POST /catalogue/refresh` REST vs service HA `hse.catalogue_refresh` + note stub `points: []` sur `/history` |
| DELTA-019 | 2026-04-10 | `00_methode_front_commune.md` §5 : `hse.fetch.js` → `hse_fetch.js` (séparateur `_` conforme DELTA-006) + note explicative ajoutée |
| DELTA-018 | 2026-04-10 | `.DS_Store` supprimé du repo + `.gitignore` ajouté à la racine |
| DELTA-017 | 2026-04-10 | 8 `*_view.js` — audit réel confirmé : tous présents (overview, diagnostic, scan, config, custom, cards, migration, costs) |
| DELTA-016 | 2026-04-10 | Shared frontend — `shared/ui/dom.js` + `table.js` (ES modules) + 4 fichiers CSS |
| DELTA-015 | 2026-04-10 | `HseHistoryView` + `HseExportView` — classes dans `costs.py`, enregistrement ajouté dans `__init__.py` |
| DELTA-014 | 2026-04-10 | `services.yaml` — 8 services déclarés : catalogue_refresh, meta_sync, export_data, migrate_cleanup, reset_catalogue, reset_settings, reset_meta, set_entity_assignment, set_triage_policy |
| DELTA-013 | 2026-04-10 | `repairs.py` — adaptation V2→V3 (lecture via `HseStorageManager`), appel non bloquant au démarrage dans `__init__.py` |
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `translations/en.json` — config_flow + options_flow + issues |
| DELTA-011 | 2026-04-10 | `hse_panel.html` + `hse_panel.js` (réécriture V3) + `style.hse.panel.css` + panel registration |
| DELTA-003 | 2026-04-09 | 8 dossiers views JS créés — `web_static/panel/features/<id>/` |
| DELTA-002 | 2026-04-09 | Shell JS — `hse_fetch.js` + `hse_store.js` + `hse_shell.js` |
| DELTA-004 Bloc 4 | 2026-04-09 | Toutes les views `api/views/` — 19 classes, 11 fichiers |
| DELTA-004 Bloc 3 | 2026-04-09 | `engine/__init__.py` + `cost.py` + `calculation.py` + `group_totals.py` + `analytics.py` |
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
