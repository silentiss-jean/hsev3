# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 18:30 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## Écarts actifs

### DELTA-054 — Onglet Détection : capteurs non affichés par intégration
- **Statut** : `EN_DISCUSSION` 🔴
- **Priorité** : Haute (bloquante utilisateur)
- **Contexte** : L'onglet Détection (`scan_view.js`) est commité et le backend (`scan_engine.py`) semble sain, mais les capteurs ne s'affichent toujours pas groupés par intégration.
- **Symptôme** : onglet Détection vide ou sans groupes, en dépit de DELTA-056/057 fermés.
- **Hypothèses en cours** :
  | # | Hypothèse | Proba | Comment vérifier |
  |---|-----------|-------|------------------|
  | H1 | `hse_shell.js` ne monte pas `ScanView` correctement | 🔴 Haute | Console JS iframe → chercher erreur 404/SyntaxError sur `scan_view.js` |
  | H2 | Chemin `import()` dynamique ≠ path servi par HA (`/hse-static/...`) | 🔴 Haute | Network tab → chercher requête 404 vers `scan_view.js` |
  | H3 | HA non redémarré depuis DELTA-056/057 | 🟡 Moyenne | Appeler `GET /api/hse/scan` directement — items avec `integration_domain` non-`"unknown"` ? |
  | H4 | `scan_engine.py` retourne 0 candidats | 🟢 Faible | Même appel — `total` vaut 0 ? |
- **Prochaine action** : fournir logs console iframe + réponse JSON brute de `GET /api/hse/scan` → diagnostic précis → COMMIT.

---

### DELTA-058 — `PATCH/DELETE /api/hse/catalogue/{entity_id}` manquants
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Moyenne
- **Contexte** : `04_onglet_config.md` prévoit édition inline et suppression individuelle. Ces routes n'existent pas dans `catalogue.py`.
- **Impact front** : `config_view.js` utilise le contournement `POST /api/hse/catalogue/triage` (sémantique différente, fonctionnellement acceptable V1).
- **Solution proposée** : Ajouter dans `catalogue.py` :
  - `PATCH /api/hse/catalogue/{entity_id}` → modifie `display_name`, `room`, `type`
  - `DELETE /api/hse/catalogue/{entity_id}` → supprime l'item
- **Décision** : ⏳ En attente — `config_view.js` commité avec contournement. Routes backend dans second commit.

---

### DELTA-059 — `POST /api/hse/meta` (création manuelle pièce/type) manquant
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Faible
- **Contexte** : `meta.py` n'expose qu'un `GET` + `sync/preview` + `sync/apply`. Pas de création manuelle.
- **Impact front** : Sous-section B de `config_view.js` est en lecture seule. Bouton "Créer" grisé + note "Bientôt disponible" déjà intégré.
- **Solution proposée** : Ajouter `POST /api/hse/meta` avec body `{action: "create_room"|"create_type", name: string}`.
- **Décision** : ⏳ En attente — sera implémenté après DELTA-054.

---

### DELTA-062 — `cards_view.js` : Failed to fetch dynamically imported module
- **Statut** : `EN_DISCUSSION` 🟠
- **Priorité** : **Basse** (usage confort, non bloquant)
- **Symptôme** : Onglet "Cartes YAML" affiche `Failed to fetch dynamically imported module: http://…/hse-static/features/cards/cards_view.js` — le fichier n'existe pas encore.
- **Impact** : Onglet crashé à l'ouverture. Les autres onglets ne sont pas affectés.
- **Solution proposée** : Créer un stub `cards_view.js` minimal (message "En développement") pour supprimer l'erreur, puis implémenter `yamlComposer.js` + vue complète.
- **Décision** : ⏳ Basse priorité — à traiter après DELTA-054 + `overview_view.js` + `costs_view.js`.

---

## Historique des écarts fermés

| ID | Titre | Résolution | Date |
|----|-------|------------|------|
| DELTA-001 | … | … | … |
| INC-07 | `history.py` supposément absent | **Faux positif** — `HseHistoryView` existe dans `costs.py`. | 2026-05-16 |
| DELTA-060 | `HseMigrationView` importé mais inexistant — ImportError | Import supprimé de `__init__.py`. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-061 | `HseMetaSyncPreviewView` + `HseMetaSyncApplyView` non enregistrées | Import + `register_view` ajoutés. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-051 | `hse_panel.js` — bureau virtuel macOS iframe vide | Correctif `visibilitychange` appliqué | 2026-05-16 |
| DELTA-052 | `hse_shell.js` — 8 onglets, navigation | Commité, validation humaine en attente | 2026-05-16 |
| DELTA-053 | `scan_view.js` — groupement par `integration_domain` | F3 commité | 2026-05-16 |
| DELTA-055 | Groupe `"integration"` dans le catalogue | Patch backend + frontend | 2026-05-16 |
| DELTA-056 | Onglet Détection — 2 bugs dans `scan_view.js` | Corrigés | 2026-05-16 |
| DELTA-057 | `scan_view.js` — `customElements.define` parasite | Ligne supprimée, stubs ajoutés | 2026-05-16 |
| **DELTA-CONF-01** | `config_view.js` — onglet Configuration | **Implémenté** — 3 sous-onglets : Appareils / Pièces & Types / Tarification. Contournements DELTA-058/059 intégrés. Commit [`2795a…`](https://github.com/silentiss-jean/hsev3) | 2026-05-16 |

---

## État du repo — Carte V3

### Backend Python

| Fichier | Statut | Notes |
|---------|--------|-------|
| `__init__.py` | ✅ | DELTA-060 + DELTA-061 corrigés |
| `const.py` | ✅ | |
| `storage/manager.py` | ✅ | |
| `catalogue/scan_engine.py` | ✅ | |
| `api/views/scan.py` | ✅ | GET/POST /api/hse/scan |
| `api/views/catalogue.py` | ✅ | GET/POST — PATCH/DELETE ⏳ (DELTA-058) |
| `api/views/meta.py` | ✅ | GET + sync — POST création ⏳ (DELTA-059) |
| `api/views/settings.py` | ✅ | GET/PUT /api/hse/settings/pricing |
| `api/views/costs.py` | ✅ | GET /api/hse/costs + /history + /export |
| `api/views/overview.py` | ✅ | |
| `api/views/diagnostic.py` | ✅ | |
| `api/views/migration.py` | ✅ | |
| `api/views/user_prefs.py` | ✅ | |

### Frontend JS

| Fichier | Statut | Notes |
|---------|--------|-------|
| `hse_panel.js` | ✅ | Correctif bureau virtuel macOS |
| `hse_shell.js` | 🟡 | Commité — validation humaine en attente |
| `scan_view.js` | 🟡 | Commité — DELTA-054 toujours ouvert (capteurs non affichés) |
| `config_view.js` | ✅ | **Commité** — 3 sous-onglets, R1-R5, contournements DELTA-058/059 |
| `overview_view.js` | 🟡 | Stub — à implémenter (priorité 1 après DELTA-054) |
| `costs_view.js` | 🟡 | Stub — à implémenter (priorité 2) |
| `diagnostic_view.js` | 🟡 | Stub — à implémenter (priorité 3) |
| `migration_view.js` | 🟡 | Stub — à implémenter (priorité 4) |
| `cards_view.js` | ❌ | Absent — crash onglet (DELTA-062, priorité basse) |

### Prochaine action

1. 🔴 **DELTA-054** — Résoudre l'affichage des capteurs dans l'onglet Détection (fournir logs console + JSON `GET /api/hse/scan`)
2. 🟢 Redémarrer HA + tester `config_view.js` (3 sous-onglets)
3. 🟡 Implémenter `overview_view.js`
