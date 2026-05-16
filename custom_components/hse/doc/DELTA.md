# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 18:17 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## Écarts actifs

### DELTA-060 — `HseMigrationView` importé dans `__init__.py` mais n'existe pas dans `migration.py`
- **Statut** : `BLOQUANT`
- **Priorité** : 🔴 Critique — empêche le démarrage de HA (ImportError)
- **Contexte** : `__init__.py` ligne 28 importe `HseMigrationView` depuis `migration.py`. Ce symbole n'existe pas — `migration.py` n'exporte que `HseMigrationExportView` et `HseMigrationApplyView`.
- **Symptôme** : `ImportError: cannot import name 'HseMigrationView'` → intégration HSE ne démarre pas.
- **Solution** : Supprimer `HseMigrationView` de l'import dans `__init__.py`. La liste `register_view` ne la contient pas déjà — seul l'import est à corriger.
- **Fichier à modifier** : `custom_components/hse/__init__.py` ligne 28
  ```python
  # AVANT (cassé)
  from .api.views.migration import HseMigrationView, HseMigrationExportView, HseMigrationApplyView
  # APRÈS (correct)
  from .api.views.migration import HseMigrationExportView, HseMigrationApplyView
  ```
- **Décision** : ⏳ En attente de feu vert pour commit.

---

### DELTA-061 — `HseMetaSyncPreviewView` et `HseMetaSyncApplyView` non enregistrées dans `register_view`
- **Statut** : `EN_DISCUSSION`
- **Priorité** : 🟡 Moyenne — les routes `/api/hse/meta/sync/preview` et `/api/hse/meta/sync/apply` sont définies dans `meta.py` et exportées dans `api/views/__init__.py`, mais **ne sont pas passées à `hass.http.register_view`** dans `__init__.py`.
- **Symptôme** : appels à `/api/hse/meta/sync/preview` ou `/api/hse/meta/sync/apply` retournent 404.
- **Impact front** : `config_view.js` sous-section B (sync pièces/types) ne fonctionnera pas sans ce correctif.
- **Solution** : Ajouter dans la liste `register_view` de `__init__.py` :
  ```python
  from .api.views.meta import HseMetaView, HseMetaSyncPreviewView, HseMetaSyncApplyView
  # ...
  HseMetaSyncPreviewView(hass),
  HseMetaSyncApplyView(hass),
  ```
- **Décision** : ⏳ En attente — peut être commité en même temps que DELTA-060.

---

### DELTA-058 — `PATCH/DELETE /api/hse/catalogue/{entity_id}` manquants
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Moyenne
- **Contexte** : `04_onglet_config.md` (sous-section A) prévoit l'édition inline du nom et la suppression individuelle d'un item du catalogue via `PATCH` et `DELETE`. Ces deux routes n'existent pas dans `catalogue.py`.
- **Impact front** : `config_view.js` ne peut pas implémenter l'édition/suppression individuelle tant que ces routes sont absentes. **Contournement temporaire** : utiliser `POST /api/hse/catalogue/triage` avec `action: ignore` pour "désactiver" un item (sémantique différente mais fonctionnellement acceptable pour la V1 de l'onglet).
- **Solution proposée** : Ajouter dans `catalogue.py` :
  - `PATCH /api/hse/catalogue/{entity_id}` → modifie `display_name`, `room`, `type` d'un item
  - `DELETE /api/hse/catalogue/{entity_id}` → supprime l'item du store
- **Décision** : ⏳ En attente — coder `config_view.js` avec le contournement triage, puis implémenter les routes PATCH/DELETE dans un second commit.

---

### DELTA-059 — `POST /api/hse/meta` (création manuelle pièce/type) manquant
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Faible
- **Contexte** : `04_onglet_config.md` (sous-section B) prévoit la création manuelle de pièces et de types via `POST /api/hse/meta`. `meta.py` n'expose qu'un `GET` + les routes `sync/preview` et `sync/apply`.
- **Impact front** : La sous-section B de `config_view.js` sera en lecture seule pour les pièces/types (affichage + sync uniquement). La création manuelle est bloquée.
- **Solution proposée** : Ajouter `POST /api/hse/meta` dans `meta.py` avec body `{action: "create_room"|"create_type", name: string}`.
- **Décision** : ⏳ En attente — implémenter `config_view.js` sans création manuelle. Ajouter un bouton "Créer" grisé avec tooltip "Bientôt disponible".

---

## Historique des écarts fermés

| ID | Titre | Résolution | Date |
|----|-------|------------|------|
| DELTA-001 | … | … | … |
| INC-07 | `history.py` supposément absent | **Faux positif** — `HseHistoryView` (`GET /api/hse/history`) existe dans `costs.py`, exportée dans `api/views/__init__.py` et enregistrée dans `register_view`. Aucune action requise. | 2026-05-16 |
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
| `__init__.py` | 🔴 | **DELTA-060** : ImportError `HseMigrationView` — **DELTA-061** : MetaSync views non enregistrées |
| `const.py` | ✅ | Constantes |
| `storage/manager.py` | ✅ | 4 stores HA natifs |
| `catalogue/schema.py` | ✅ | Schéma items |
| `catalogue/scan_engine.py` | ✅ | Détection entités énergie/puissance |
| `sensors/quality_scorer.py` | ✅ | Score qualité |
| `api/views/scan.py` | ✅ | GET/POST /api/hse/scan |
| `api/views/catalogue.py` | ✅ | DELTA-055 appliqué — PATCH/DELETE manquants (DELTA-058) |
| `api/views/meta.py` | ✅ | GET + sync/preview + sync/apply — POST création manquant (DELTA-059) |
| `api/views/settings.py` | ✅ | GET/PUT /api/hse/settings/pricing |
| `api/views/costs.py` | ✅ | GET /api/hse/costs + GET /api/hse/history + GET /api/hse/export |
| `api/views/overview.py` | ✅ | Backend dispo |
| `api/views/diagnostic.py` | ✅ | Backend dispo |
| `api/views/migration.py` | ✅ | HseMigrationExportView + HseMigrationApplyView — pas de HseMigrationView (voir DELTA-060) |

### Frontend JS

| Fichier | Statut | Notes |
|---------|--------|-------|
| `hse_panel.js` | ✅ | Correctif bureau virtuel macOS inclus |
| `hse_shell.js` | 🟡 | Commité — validation humaine en attente |
| `scan_view.js` | ✅ | DELTA-057 : ligne parasite supprimée |
| `overview_view.js` | 🟡 | Stub présent — à implémenter (étape 2) |
| `config_view.js` | 🟡 | Stub présent — **en cours** (étape 3) — contraintes DELTA-058 + DELTA-059 |
| `costs_view.js` | 🟡 | Stub présent — à implémenter (étape 4) |
| `diagnostic_view.js` | 🟡 | Stub présent — à implémenter (étape 5) |
| `migration_view.js` | 🟡 | Stub présent — à implémenter (étape 6) |
| `cards_view.js` | ❌ | À coder (étape 7) |

### Prochaine action

**Priorité absolue : corriger DELTA-060 + DELTA-061 dans `__init__.py`** avant tout autre commit frontend.
Sans ce correctif, HA ne démarre pas l'intégration HSE → tous les onglets sont en erreur.
