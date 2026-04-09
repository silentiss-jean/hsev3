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
- Sujet du jour : [ex: implémentation overview.view.js]
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
│   │   ├── api/                     ← ✅ Bloc 1
│   │   │   ├── __init__.py
│   │   │   ├── base.py              ← HseBaseView (requires_auth=True, cors_allowed=False)
│   │   │   └── views/
│   │   │       ├── __init__.py
│   │   │       └── ping.py          ← GET /api/hse/ping ✅ Bloc 1
│   │   │       ← (autres views : ⏳ Blocs 3 & 4 — voir DELTA-004)
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
│   │   │   └── manager.py           ← StorageManager V1 épuré
│   │   │
│   │   ├── engine/                  ← ⏳ Bloc 3 (pas encore créé)
│   │   │   ← cost.py, calculation.py, group_totals.py, analytics.py
│   │   │
│   │   ├── sensors/                 ← ⏳ Bloc 3 (pas encore créé)
│   │   │   ← quality_scorer.py, sync_manager.py, name_fixer.py
│   │   │
│   │   ├── translations/            ← ⏳ (pas encore créé)
│   │   │   ← fr.json, en.json
│   │   │
│   │   ├── web_static/              ← ⏳ Phase 5 (pas encore créé)
│   │   │   └── panel/
│   │   │       ├── hse_panel.html
│   │   │       ├── hse_panel.js
│   │   │       ├── style.hse.panel.css
│   │   │       ├── features/
│   │   │       │   ├── overview/
│   │   │       │   ├── diagnostic/
│   │   │       │   ├── scan/
│   │   │       │   ├── config/
│   │   │       │   ├── custom/
│   │   │       │   ├── cards/
│   │   │       │   ├── migration/
│   │   │       │   └── costs/
│   │   │       └── shared/
│   │   │           ├── hse_fetch.js ← ⏳ DELTA-002
│   │   │           ├── hse_store.js
│   │   │           ├── core/
│   │   │           └── styles/
│   │   │
│   │   └── doc/                     ← 📚 Documentation IA (miroir de hsev3/doc)
│   │       ├── DELTA.md             ← 🔴 écarts doc/code actifs
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
| Bloc 2 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` | 🔴 EN COURS |
| Bloc 3 | `engine/` + `sensors/` | ⏳ À faire |
| Bloc 4 | Toutes les views `api/views/` | ⏳ À faire |

---

## Workflow doc ↔ code

Voir `custom_components/hse/doc/DELTA.md` pour l'état d'alignement en temps réel.

| Phase | Action |
|---|---|
| Discussion en cours | Ajouter ligne `EN_DISCUSSION` dans DELTA.md |
| Décision prise, pas encore codée | Passer à `DOC_AHEAD` ou `CODE_AHEAD` |
| Doc + code committés ensemble | Supprimer la ligne de DELTA.md |

**Règle d'or : si DELTA.md est vide → doc et code sont alignés.**
