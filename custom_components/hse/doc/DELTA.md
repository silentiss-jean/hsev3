# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 17:00 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## ✅ Aucun écart actif

---

## Historique des écarts fermés

| ID | Titre | Résolution | Date |
|----|-------|------------|------|
| DELTA-001 | … | … | … |
| DELTA-051 | hse_panel.js — bureau virtuel macOS iframe vide | Correctif `visibilitychange` appliqué dans `hse_panel.js` (`connectedCallback` + `disconnectedCallback`) | 2026-05-16 |
| DELTA-052 | hse_shell.js — 8 onglets, navigation | Commité, validation humaine en attente | 2026-05-16 |
| DELTA-053 | scan_view.js — groupement par `integration_domain` | F3 commité — groupement sur domain technique, `integration_label` en sous-titre | 2026-05-16 |
| DELTA-054 | Onglet Détection — capteurs non affichés | Diagnostic : capteurs déjà catalogués (comportement correct). Seul Tuya restait dans l'inbox. | 2026-05-16 |
| DELTA-055 | Groupe `"integration"` dans le catalogue (artefact pre-DELTA-053) | Patch backend `catalogue.py` : résolution live de `integration_domain` via `config_entry_id` quand valeur stockée est `"integration"`. Patch frontend : libellés lisibles (`utility_meter` → "Compteurs HA", `integration` → "Helpers HA"). | 2026-05-16 |

---

## État du repo — Carte V3

### Backend Python

| Fichier | Statut | Notes |
|---------|--------|-------|
| `__init__.py` | ✅ | Enregistrement des vues API |
| `const.py` | ✅ | Constantes |
| `storage/manager.py` | ✅ | 4 stores HA natifs |
| `catalogue/schema.py` | ✅ | Schéma items |
| `catalogue/scan_engine.py` | ✅ | Détection entités énergie/puissance |
| `sensors/quality_scorer.py` | ✅ | Score qualité |
| `api/views/scan.py` | ✅ | GET/POST /api/hse/scan |
| `api/views/catalogue.py` | ✅ | DELTA-055 appliqué |
| `api/views/costs.py` | ✅ | Backend dispo |
| `api/views/overview.py` | ✅ | Backend dispo |
| `api/views/diagnostic.py` | ✅ | Backend dispo |
| `api/views/migration.py` | ✅ | Backend dispo |

### Frontend JS

| Fichier | Statut | Notes |
|---------|--------|-------|
| `hse_panel.js` | ✅ | Correctif bureau virtuel macOS inclus |
| `hse_shell.js` | 🟡 | Commité — validation humaine en attente |
| `scan_view.js` | ✅ | DELTA-053 F3 + DELTA-055 appliqués |
| `overview_view.js` | ❌ | À coder (étape 2) |
| `config_view.js` | ❌ | À coder (étape 3) |
| `costs_view.js` | ❌ | À coder (étape 4) |
| `diagnostic_view.js` | ❌ | À coder (étape 5) |
| `migration_view.js` | ❌ | À coder (étape 6) |
| `cards_view.js` | ❌ | À coder (étape 7) |

### Prochaine action

Après validation humaine de `hse_shell.js` (étape 1) → coder `overview_view.js`.
