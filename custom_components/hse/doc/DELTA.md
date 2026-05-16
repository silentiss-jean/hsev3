# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 17:47 CEST
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
| DELTA-054 | Onglet Détection — capteurs non affichés (1re occurrence) | Diagnostic : capteurs déjà catalogués (comportement correct). Seul Tuya restait dans l'inbox. | 2026-05-16 |
| DELTA-055 | Groupe `"integration"` dans le catalogue (artefact pre-DELTA-053) | Patch backend `catalogue.py` + frontend libellés lisibles. | 2026-05-16 |
| DELTA-056 | Onglet Détection — capteurs par intégration toujours non affichés | **2 bugs corrigés dans `scan_view.js`** : (1) `mount()` ne réinitialisait pas `_scanSig`/`_catSig` → R3 court-circuitait `_renderScan()` ; (2) `_triage()` appelait `CSS.escape()` sur la constante string CSS → TypeError silencieux. Fix : reset signatures + `_attrVal()`. | 2026-05-16 |
| DELTA-057 | scan_view.js — `customElements.define('hse-panel', HsePanel)` parasite en bas du fichier | Ligne copiée par erreur lors d'un patch précédent → `ReferenceError: HsePanel is not defined` au chargement du module ES. Supprimée. Stubs ajoutés pour les 5 onglets manquants (overview, config, costs, diagnostic, migration) → élimine les `TypeError: Failed to fetch dynamically imported module`. | 2026-05-16 |

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
| `scan_view.js` | ✅ | DELTA-057 : ligne parasite supprimée |
| `overview_view.js` | 🟡 | Stub présent — à implémenter (étape 2) |
| `config_view.js` | 🟡 | Stub présent — à implémenter (étape 3) |
| `costs_view.js` | 🟡 | Stub présent — à implémenter (étape 4) |
| `diagnostic_view.js` | 🟡 | Stub présent — à implémenter (étape 5) |
| `migration_view.js` | 🟡 | Stub présent — à implémenter (étape 6) |
| `cards_view.js` | ❌ | À coder (étape 7) |

### Prochaine action

Recharger HA → vérifier que l'onglet Détection affiche les capteurs sans erreur console → valider `hse_shell.js` → implémenter `overview_view.js`.
