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
├── analyse.md                                   ✅
├── analyse0.md                                  ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    │
    ├── __init__.py                              ✅ (panel registration + toutes les views)
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── services.yaml                            🔴 DELTA-014
    ├── repairs.py                               🔴 DELTA-013
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
    │       ├── costs.py                         ✅
    │       ├── diagnostic.py                    ✅
    │       ├── frontend_manifest.py             ✅
    │       ├── meta.py                          ✅
    │       ├── migration.py                     ✅
    │       ├── overview.py                      ✅
    │       ├── scan.py                          ✅
    │       ├── settings.py                      ✅
    │       ├── user_prefs.py                    ✅
    │       ├── history.py                       🔴 DELTA-015
    │       └── export_api.py                    🔴 DELTA-015
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
    │   │   │   ├── dom.js                       🔴 DELTA-016
    │   │   │   └── table.js                     🔴 DELTA-016
    │   │   └── styles/
    │   │       ├── hse_tokens.shadow.css         🔴 DELTA-016
    │   │       ├── hse_themes.shadow.css         🔴 DELTA-016
    │   │       ├── hse_alias.v2.css             🔴 DELTA-016
    │   │       └── tokens.css                   🔴 DELTA-016
    │   └── features/
    │       ├── overview/overview_view.js         ✅
    │       ├── diagnostic/diagnostic_view.js     ✅
    │       ├── scan/scan_view.js                 ✅
    │       ├── config/config_view.js             ✅
    │       ├── custom/custom_view.js             ✅
    │       ├── cards/cards_view.js               ✅
    │       ├── migration/migration_view.js       ✅
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

### Comptage rapide

| Catégorie | ✅ Présents | 🔴 Manquants |
|---|---|---|
| Backend Python | 30 | 4 (services.yaml, repairs.py, history.py, export_api.py) |
| Frontend JS/CSS | 14 | 6 (2 ui/ + 4 styles/) |
| Translations | 2 | 0 |
| Documentation | 13 | 0 |
| **Total** | **59** | **10** |

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
[FAIT] DELTA-011 ✅ 2026-04-10
[FAIT] DELTA-012 ✅ 2026-04-10

→ En cours : DELTA-016 → DELTA-015 → DELTA-013 → DELTA-014
```

---

## Écarts actifs

### 🔴 DELTA-013 — `repairs.py` manquant
**Statut :** `DOC_AHEAD`
**Ouvert le :** 2026-04-09
**Fichier manquant** (prévu §3.2, source V2) :
- `repairs.py`

**Impact :** HA Repairs natif non actif — les alertes capteurs ne remontent pas dans l'UI HA.
**Source :** `repairs.py` V2 à adapter au domaine `hse` (vérifier qu'il n'a pas de bugs connus avant récup).

---

### 🔴 DELTA-014 — `services.yaml` manquant
**Statut :** `DOC_AHEAD`
**Ouvert le :** 2026-04-09
**Fichier manquant** (prévu §3.2 + §7, source V1) :
- `services.yaml`

**Impact :** Les 9 services HA ne sont pas déclarés (generate_local_data, migrate_cleanup, export_data, etc.) — non appelables depuis les automations HA.
**Source :** Extraire de `__init__.py` V1.

---

### 🔴 DELTA-015 — Views API manquantes
**Statut :** `DOC_AHEAD`
**Ouvert le :** 2026-04-09
**Fichiers manquants** (prévus §3.2 Phase 4) :
- `api/views/history.py` — `GET /api/hse/history` (wraps `engine/analytics.py`) — **requis par onglet Costs**
- `api/views/export_api.py` — export CSV/JSON — **requis par onglet Costs bouton export**

**Impact :** Onglet `costs` non fonctionnel (historique 12 mois + export CSV manquants).

---

### 🔴 DELTA-016 — Fichiers shared frontend manquants
**Statut :** `DOC_AHEAD`
**Ouvert le :** 2026-04-09
**Fichiers manquants** (prévus §3.2 Phase 5) :

*Utilitaires JS :*
- `web_static/panel/shared/ui/dom.js`
- `web_static/panel/shared/ui/table.js`

*Styles CSS :*
- `web_static/panel/shared/styles/hse_tokens.shadow.css`
- `web_static/panel/shared/styles/hse_themes.shadow.css`
- `web_static/panel/shared/styles/hse_alias.v2.css`
- `web_static/panel/shared/styles/tokens.css`

**Impact :** Les `*_view.js` existants ne peuvent pas importer les utilitaires DOM/table ni appliquer les tokens CSS. Rendering dégradé ou cassé.
**Source :** V2 existant à migrer (vérifier présence de localStorage avant tout import).

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `translations/en.json` — config_flow + options_flow + issues |
| DELTA-011 | 2026-04-10 | `hse_panel.html` + `hse_panel.js` (réécriture V3) + `style.hse.panel.css` + `__init__.py` panel registration |
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
