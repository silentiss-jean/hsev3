# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 18:02 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## Écarts actifs

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
| `api/views/catalogue.py` | ✅ | DELTA-055 appliqué — PATCH/DELETE manquants (DELTA-058) |
| `api/views/meta.py` | ✅ | GET + sync/preview + sync/apply — POST création manquant (DELTA-059) |
| `api/views/settings.py` | ✅ | GET/PUT /api/hse/settings/pricing |
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
| `config_view.js` | 🟡 | Stub présent — **en cours** (étape 3) — contraintes DELTA-058 + DELTA-059 |
| `costs_view.js` | 🟡 | Stub présent — à implémenter (étape 4) |
| `diagnostic_view.js` | 🟡 | Stub présent — à implémenter (étape 5) |
| `migration_view.js` | 🟡 | Stub présent — à implémenter (étape 6) |
| `cards_view.js` | ❌ | À coder (étape 7) |

### Prochaine action

Implémenter `config_view.js` avec les contournements DELTA-058/059 documentés ci-dessus, puis coder les routes PATCH/DELETE/POST-meta dans un second commit.
