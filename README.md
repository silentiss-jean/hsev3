# HSE V3 — Home Suivi Élec (version 3)

Custom integration Home Assistant pour le suivi de consommation électrique.

---

## 🚀 Brief de démarrage — à coller en début de chaque thread IA

```
Repo : https://github.com/silentiss-jean/hsev3
Stack : Home Assistant custom integration, Python backend, JS frontend (vanilla, pas de framework)
Domaine HA : hse

Avant toute chose, lis ces fichiers dans l'ordre :
1. custom_components/hse/doc/DELTA.md             → écarts doc/code actifs (priorité absolue)
2. custom_components/hse/doc/00_methode_front_commune.md → contrat frontend V3
3. hse_v3_synthese.md                              → synthèse architecture V3

Règles pour l'IA :
- Ne jamais proposer de code ou de doc qui contredit un écart non résolu dans DELTA.md
- Signaler explicitement si une demande entre en collision avec un écart EN_DISCUSSION
- Proposer de fermer un écart dans DELTA.md dès que la solution est validée
- Toujours distinguer : mode EXPLORATION (on réfléchit) vs mode COMMIT (on génère le patch final)
```

---

```
## 🧵 État courant de la session (à mettre à jour si thread long)
- Sujet du jour : [ex: implémentation overview_view.js]
- Décisions prises : [ex: polling 30s endpoint unique, pas de double fetch]
- Prochaine étape : [ex: générer le patch _render()]
```

---

## Structure du repo

> ⚠️ Le dossier HACS installé est `custom_components/hse/` (domaine `hse`, DELTA-004 acté).
> `custom_components/hsev3/` ne contient que la documentation miroir.

```
hsev3/
├── README.md                        ← ce fichier + brief IA
├── analyse.md                       ← analyse V1/V2 (frontend)
├── analyse0.md                      ← analyse V1/V2 (backend)
├── hse_v3_synthese.md               ← synthèse des deux analyses → base V3
│
├── custom_components/
│   │
│   ├── hse/                         ← 🟢 DOSSIER HACS (domaine: hse)
│   │   ├── __init__.py              ← orchestration < 200 lignes ✅ Bloc 1
│   │   ├── manifest.json            ← version: 3.0.0, domain: hse ✅ Bloc 1
│   │   ├── config_flow.py
│   │   ├── options_flow.py          ← capteur référence + tarif €/kWh ✅ Bloc 2
│   │   ├── const.py
│   │   ├── time_utils.py
│   │   │
│   │   ├── api/                     ← ✅ Blocs 1 & 4
│   │   │   ├── __init__.py
│   │   │   ├── base.py              ← HseBaseView (requires_auth=True, cors_allowed=False)
│   │   │   └── views/
│   │   │       ├── __init__.py      ← enregistrement de toutes les routes
│   │   │       ├── ping.py          ← GET /api/hse/ping ✅ Bloc 1
│   │   │       ├── catalogue.py     ← GET/PATCH /api/hse/catalogue ✅ Bloc 4
│   │   │       ├── costs.py         ← GET /api/hse/costs ✅ Bloc 4
│   │   │       ├── diagnostic.py    ← GET /api/hse/diagnostic ✅ Bloc 4
│   │   │       ├── frontend_manifest.py ← GET /api/hse/frontend_manifest ✅ Bloc 4
│   │   │       ├── meta.py          ← GET/PATCH /api/hse/meta ✅ Bloc 4
│   │   │       ├── migration.py     ← GET/POST /api/hse/migration ✅ Bloc 4
│   │   │       ├── overview.py      ← GET /api/hse/overview ✅ Bloc 4
│   │   │       ├── scan.py          ← POST /api/hse/scan ✅ Bloc 4
│   │   │       ├── settings.py      ← GET/PATCH /api/hse/settings ✅ Bloc 4
│   │   │       └── user_prefs.py    ← GET/PATCH /api/hse/user_prefs ✅ Bloc 4
│   │   │
│   │   ├── catalogue/               ← ✅ Bloc 2 (V2 conservé)
│   │   │   ├── __init__.py
│   │   │   ├── defaults.py
│   │   │   ├── manager.py
│   │   │   ├── scan_engine.py
│   │   │   └── schema.py
│   │   │
│   │   ├── meta/                    ← ✅ Bloc 2 (V2 conservé)
│   │   │   ├── __init__.py
│   │   │   ├── assignments.py
│   │   │   ├── schema.py
│   │   │   ├── store.py
│   │   │   └── sync.py
│   │   │
│   │   ├── storage/                 ← ✅ Bloc 2
│   │   │   ├── __init__.py
│   │   │   └── manager.py           ← StorageManager V1 épuré + user_prefs
│   │   │
│   │   ├── engine/                  ← ✅ Bloc 3
│   │   │   ├── __init__.py
│   │   │   ├── cost.py              ← shared_cost_engine V2 INTACT
│   │   │   ├── calculation.py
│   │   │   ├── group_totals.py
│   │   │   └── analytics.py
│   │   │
│   │   ├── sensors/                 ← ✅ Bloc 3
│   │   │   ├── __init__.py
│   │   │   ├── quality_scorer.py
│   │   │   ├── sync_manager.py
│   │   │   └── name_fixer.py
│   │   │
│   │   ├── web_static/              ← ✅ DELTA-002 & DELTA-003
│   │   │   └── panel/
│   │   │       ├── shared/
│   │   │       │   ├── hse_fetch.js ← client HTTP, inject Bearer auto ✅ DELTA-002
│   │   │       │   ├── hse_store.js ← store réactif partagé ✅ DELTA-002
│   │   │       │   └── hse_shell.js ← shell panel + routing onglets ✅ DELTA-002
│   │   │       └── features/
│   │   │           ├── overview/
│   │   │           │   └── overview_view.js     ✅ DELTA-003
│   │   │           ├── diagnostic/
│   │   │           │   └── diagnostic_view.js   ✅ DELTA-003
│   │   │           ├── scan/
│   │   │           │   └── scan_view.js         ✅ DELTA-003
│   │   │           ├── config/
│   │   │           │   └── config_view.js       ✅ DELTA-003
│   │   │           ├── custom/
│   │   │           │   └── custom_view.js       ✅ DELTA-003
│   │   │           ├── cards/
│   │   │           │   └── cards_view.js        ✅ DELTA-003
│   │   │           ├── migration/
│   │   │           │   └── migration_view.js    ✅ DELTA-003
│   │   │           └── costs/
│   │   │               └── costs_view.js        ✅ DELTA-003
│   │   │
│   │   └── doc/                     ← 📚 Documentation IA (source de vérité)
│   │       ├── DELTA.md             ← ✅ Aucun écart actif
│   │       ├── 00_methode_front_commune.md
│   │       ├── 01_onglet_overview.md
│   │       ├── 02_onglet_diagnostic.md
│   │       ├── 03_onglet_scan.md
│   │       ├── 04_onglet_config.md
│   │       ├── 05_onglet_custom.md
│   │       ├── 06_onglet_cards.md
│   │       ├── 07_onglet_migration.md
│   │       ├── 08_onglet_costs.md
│   │       ├── 09_squelette_hse_tab_base.md
│   │       ├── 10_api_contrat.md
│   │       └── hse_v3_synthese.md
│   │
│   └── hsev3/                       ← 📚 Documentation miroir uniquement
│       └── doc/                     ←  (mêmes fichiers que custom_components/hse/doc/)
│
```

---

## Avancement DELTA-004 (backend Python V3)

| Bloc | Contenu | Statut |
|---|---|---|
| Bloc 1 | `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 2 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 3 | `engine/` + `sensors/` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 4 | Toutes les views `api/views/` (11 fichiers, 19 classes) | ✅ TERMINÉ — 2026-04-09 |

## Avancement Frontend (DELTA-002 & DELTA-003)

| Tâche | Contenu | Statut |
|---|---|---|
| DELTA-002 | `hse_fetch.js` + `hse_store.js` + `hse_shell.js` dans `web_static/panel/shared/` | ✅ TERMINÉ — 2026-04-09 |
| DELTA-003 | 8 views JS dans `web_static/panel/features/<id>/<id>_view.js` | ✅ TERMINÉ — 2026-04-09 |

> **DELTA.md = vide** → doc et code parfaitement alignés ✅

---

## Workflow doc ↔ code

Voir `custom_components/hse/doc/DELTA.md` pour l'état d'alignement en temps réel.

| Phase | Action |
|---|---|
| Discussion en cours | Ajouter ligne `EN_DISCUSSION` dans DELTA.md |
| Décision prise, pas encore codée | Passer à `DOC_AHEAD` ou `CODE_AHEAD` |
| Doc + code committés ensemble | Supprimer la ligne de DELTA.md |

**Règle d'or : si DELTA.md est vide → doc et code sont alignés.**
