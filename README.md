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
>
> 🔴 **Fichiers marqués `ÉCART DELTA-0XX` = non encore créés — voir DELTA.md pour le détail.**

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
│   │   ├── config_flow.py           ✅
│   │   ├── options_flow.py          ← capteur référence + tarif €/kWh ✅ Bloc 2
│   │   ├── const.py                 ✅
│   │   ├── time_utils.py            ✅
│   │   ├── services.yaml            ← 9 services HA 🔴 MANQUANT (ÉCART DELTA-014)
│   │   ├── repairs.py               ← HA Repairs natif 🔴 MANQUANT (ÉCART DELTA-013)
│   │   ├── translations/
│   │   │   ├── fr.json              ← 🔴 MANQUANT — BLOQUANT HACS (ÉCART DELTA-012)
│   │   │   └── en.json              ← 🔴 MANQUANT — BLOQUANT HACS (ÉCART DELTA-012)
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
│   │   │       ├── user_prefs.py    ← GET/PATCH /api/hse/user_prefs ✅ Bloc 4
│   │   │       ├── history.py       ← GET /api/hse/history 🔴 MANQUANT (ÉCART DELTA-015)
│   │   │       └── export_api.py    ← export CSV/JSON 🔴 MANQUANT (ÉCART DELTA-015)
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
│   │   ├── web_static/
│   │   │   └── panel/
│   │   │       ├── hse_panel.html       ← point d'entrée HTML 🔴 MANQUANT (ÉCART DELTA-011)
│   │   │       ├── hse_panel.js         ← déclaration panel HA 🔴 RÉÉCRITURE (ÉCART DELTA-011)
│   │   │       │                          ⚠️ Ne PAS récupérer V2 — buggé
│   │   │       ├── style.hse.panel.css  ← CSS global hors shadow DOM 🔴 MANQUANT (ÉCART DELTA-011)
│   │   │       ├── shared/
│   │   │       │   ├── hse_fetch.js     ← client HTTP, inject Bearer auto ✅ DELTA-002
│   │   │       │   ├── hse_store.js     ← store réactif partagé ✅ DELTA-002
│   │   │       │   ├── hse_shell.js     ← custom element <hse-panel> + routing ✅ DELTA-002
│   │   │       │   ├── ui/
│   │   │       │   │   ├── dom.js           ← utilitaires DOM 🔴 MANQUANT (ÉCART DELTA-016)
│   │   │       │   │   └── table.js         ← utilitaires tableau 🔴 MANQUANT (ÉCART DELTA-016)
│   │   │       │   └── styles/
│   │   │       │       ├── hse_tokens.shadow.css  ← 🔴 MANQUANT (ÉCART DELTA-016)
│   │   │       │       ├── hse_themes.shadow.css  ← 🔴 MANQUANT (ÉCART DELTA-016)
│   │   │       │       ├── hse_alias.v2.css       ← 🔴 MANQUANT (ÉCART DELTA-016)
│   │   │       │       └── tokens.css             ← 🔴 MANQUANT (ÉCART DELTA-016)
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
│   │       ├── DELTA.md             ← 🔴 6 écarts actifs (DELTA-011 à 016)
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

## Avancement global

### Backend Python V3 (DELTA-004)

| Bloc | Contenu | Statut |
|---|---|---|
| Bloc 1 | `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 2 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 3 | `engine/` + `sensors/` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 4 | Toutes les views `api/views/` (11 fichiers, 19 classes) | ✅ TERMINÉ — 2026-04-09 |

### Frontend JS (DELTA-002 & DELTA-003)

| Tâche | Contenu | Statut |
|---|---|---|
| DELTA-002 | `hse_fetch.js` + `hse_store.js` + `hse_shell.js` | ✅ TERMINÉ — 2026-04-09 |
| DELTA-003 | 8 views JS `features/<id>/<id>_view.js` | ✅ TERMINÉ — 2026-04-09 |

### Écarts actifs — DELTA.md

| ID | Titre | Bloquant | Statut |
|---|---|---|---|
| DELTA-011 | Panel HA — `hse_panel.html` + `hse_panel.js` (réécriture) + `style.hse.panel.css` | ✅ OUI — rien ne s'affiche | 🔴 À faire |
| DELTA-012 | Translations — `fr.json` + `en.json` | ✅ OUI — HACS refuse | 🔴 À faire |
| DELTA-013 | `repairs.py` | Non | 🔴 À faire |
| DELTA-014 | `services.yaml` | Non | 🔴 À faire |
| DELTA-015 | `api/views/history.py` + `api/views/export_api.py` | Onglet Costs | 🔴 À faire |
| DELTA-016 | `shared/ui/dom.js` + `table.js` + 4 CSS tokens/themes | Rendering | 🔴 À faire |

> Voir `custom_components/hse/doc/DELTA.md` pour le détail complet de chaque écart.

---

## Workflow doc ↔ code

| Phase | Action |
|---|---|
| Discussion en cours | Ajouter ligne `EN_DISCUSSION` dans DELTA.md |
| Décision prise, pas encore codée | Passer à `DOC_AHEAD` ou `CODE_AHEAD` |
| Doc + code committés ensemble | Supprimer la ligne de DELTA.md |

**Règle d'or : si DELTA.md est vide → doc et code sont alignés.**
