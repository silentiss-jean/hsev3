# 🏗️ Architecture HSE V3

## Stack
- **Backend** : Home Assistant custom integration, Python
- **Frontend** : Vanilla JS (aucun framework), shadow DOM
- **Domaine HA** : `hse`
- **HACS path** : `custom_components/hse/`

## Arbre du repo
```
hsev3/
├── custom_components/hse/
│   ├── __init__.py          ← Orchestration (< 200 lignes)
│   ├── manifest.json        ← version 3.0.0, domain: hse
│   ├── api/views/           ← 11 vues, 19 classes
│   ├── catalogue/           ← Scan + manager + schema
│   ├── meta/                ← Pièces, types, assignations
│   ├── storage/             ← Persistance HA store
│   ├── engine/              ← Calculs coût, groupes, analytics
│   ├── sensors/             ← Quality scorer, sync, name fixer
│   ├── web_static/panel/    ← Frontend JS + CSS
│   │   ├── hse_panel.html/js
│   │   ├── shared/          ← fetch, store, shell, ui, styles
│   │   └── features/        ← Une vue par onglet
│   └── doc/                 ← Documentation IA (DELTA.md, etc.)
```

## Onglets frontend (8)
| Onglet | Fichier | Statut |
|--------|---------|--------|
| Aperçu | `overview_view.js` | ✅ Implémenté |
| Détection | `scan_view.js` | ✅ Validé |
| Configuration | `config_view.js` | ✅ A✅ B✅ C✅ |
| Coûts | `costs_view.js` | ✅ Implémenté |
| Diagnostic | `diagnostic_view.js` | 🟡 Stub |
| Migration | `migration_view.js` | 🟡 Stub |
| Personnalisation | `custom_view.js` | 🟡 Stub |
| Cartes YAML | `cards_view.js` | 🟡 Stub (DELTA-062) |

## Dépendances critiques
```
overview_view.js → /api/hse/overview → catalogue + settings tarif
costs_view.js   → /api/hse/costs    → settings tarif
config_view.js  → /api/hse/settings → DELTA-065 FERMÉ ✅
```
