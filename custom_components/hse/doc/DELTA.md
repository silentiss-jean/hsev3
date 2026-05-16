# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 17:00 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## 🟠 Écarts actifs

### DELTA-056 — Onglet Détection : capteurs par intégration non affichés
| Champ | Valeur |
|-------|--------|
| **Statut** | EN_DISCUSSION |
| **Fichier(s) concerné(s)** | `scan_view.js`, potentiellement `hse_shell.js` |
| **Symptôme** | L'onglet Détection ne liste pas les capteurs groupés par intégration — l'affichage est vide ou incorrect |
| **Hypothèses prioritaires** | H1 : `hse_shell.js` ne monte pas `ScanView` (erreur 404 ou SyntaxError sur l'import dynamique) — H2 : chemin `/hse-static/…` incorrect dans l'`import()` dynamique — H3 : HA pas redémarré depuis DELTA-053 — H4 : `scan_engine.py` retourne 0 candidats |
| **Diagnostic demandé** | (1) Console JS de l'iframe → chercher erreur 404 ou SyntaxError — (2) Réponse JSON brute de `GET /api/hse/scan` → vérifier `total` et présence de `integration_domain` |
| **Règle** | Aucun patch `scan_view.js` ou `hse_shell.js` avant confirmation de l'hypothèse retenue |

---

## Historique des écarts fermés

| ID | Titre | Résolution | Date |
|----|-------|------------|------|
| DELTA-001 | … | … | … |
| DELTA-051 | hse_panel.js — bureau virtuel macOS iframe vide | Correctif `visibilitychange` appliqué dans `hse_panel.js` (`connectedCallback` + `disconnectedCallback`) | 2026-05-16 |
| DELTA-052 | hse_shell.js — 8 onglets, navigation | Commité, validation humaine en attente | 2026-05-16 |
| DELTA-053 | scan_view.js — groupement par `integration_domain` | F3 commité — groupement sur domain technique, `integration_label` en sous-titre | 2026-05-16 |
| DELTA-054 | Onglet Détection — capteurs non affichés (première occurrence) | Diagnostic : capteurs déjà catalogués (comportement correct). Seul Tuya restait dans l'inbox. | 2026-05-16 |
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
| `scan_view.js` | 🟠 | DELTA-053/055 appliqués — **DELTA-056 ouvert** (affichage capteurs KO) |
| `overview_view.js` | ❌ | Bloqué DELTA-056 |
| `config_view.js` | ❌ | Bloqué DELTA-056 |
| `costs_view.js` | ❌ | Bloqué DELTA-056 |
| `diagnostic_view.js` | ❌ | Bloqué DELTA-056 |
| `migration_view.js` | ❌ | Bloqué DELTA-056 |
| `cards_view.js` | ❌ | Bloqué DELTA-056 |

### Prochaine action

**DELTA-056 EN_DISCUSSION** — fournir les logs console iframe + JSON brut `GET /api/hse/scan` pour identifier l'hypothèse (H1–H4) avant tout commit.
