# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-17 14:17 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.
>
> ⚠️ Ce fichier est tenu à jour exclusivement par l'IA. Toute désynchronisation est un bug doc à corriger immédiatement.

---

## Écarts actifs

### DELTA-058 — `PATCH/DELETE /api/hse/catalogue/{entity_id}` manquants
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Moyenne
- **Contexte** : `04_onglet_config.md` prévoit édition inline et suppression individuelle. Ces routes n'existent pas dans `catalogue.py`.
- **Impact front** : `config_view.js` utilise le contournement `POST /api/hse/catalogue/triage` (sémantique différente, fonctionnellement acceptable V1).
- **Solution proposée** : Ajouter dans `catalogue.py` :
  - `PATCH /api/hse/catalogue/{entity_id}` → modifie `display_name`, `room`, `type`
  - `DELETE /api/hse/catalogue/{entity_id}` → supprime l'item
- **Décision** : ⏳ En attente — `config_view.js` committé avec contournement. Routes backend dans second commit.

---

### DELTA-059 — `POST /api/hse/meta` (création manuelle pièce/type) manquant
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Faible
- **Contexte** : `meta.py` n'expose qu'un `GET` + `sync/preview` + `sync/apply`. Pas de création manuelle.
- **Impact front** : Sous-section B de `config_view.js` est en lecture seule. Bouton "Créer" grisé + note "Bientôt disponible" déjà intégré.
- **Solution proposée** : Ajouter `POST /api/hse/meta` avec body `{action: "create_room"|"create_type", name: string}`.
- **Décision** : ⏳ En attente.

---

### DELTA-062 — `cards_view.js` absent — crash onglet
- **Statut** : `EN_DISCUSSION` 🟠
- **Priorité** : **Basse** (non bloquant, usage confort)
- **Symptôme** : Onglet "Cartes YAML" → `Failed to fetch dynamically imported module: /hse-static/features/cards/cards_view.js` — fichier inexistant.
- **Solution proposée** : Créer un stub minimal puis implémenter `yamlComposer.js` + vue complète.
- **Décision** : ⏳ À traiter après `overview_view.js` + `costs_view.js`.

---

### DELTA-051-PANEL — `hse_panel.js` bureau virtuel macOS
- **Statut** : `EN_DISCUSSION`
- **Priorité** : **Basse** (edge case macOS uniquement, non bloquant)
- **Symptôme** : Au retour d'un bureau virtuel macOS, l'iframe peut se retrouver vide.
- **Correctif prévu** : `visibilitychange` + reload conditionnel de l'iframe dans `connectedCallback`/`disconnectedCallback`.
- **Décision** : ⏳ Non prioritaire — à traiter après les onglets métier.

---

## Historique des écarts fermés

| ID | Titre | Résolution | Date |
|----|-------|------------|------|
| DELTA-063 | `config_view.js` — Refonte UI (screenshots V1 reçus) | **Résolu** — Sous-onglet A : layout groupes collapse par `integration_domain`, bloc ⭐ référence (`GET/PUT /api/hse/settings/pricing` → `reference_entity_id`), bloc ✨ sélection auto (logique frontend `quality_score` + `triage/bulk`), icônes type ⚡🔋, stars qualité. Sous-onglet B : fix `room.name` (objet `{id,name}`), `entity_id` affiché. Sous-onglet C : inchangé. Contournements DELTA-058/059 maintenus. Vérifié en place dans `config_view.js` (SHA `f00803d`). | 2026-05-17 |
| DELTA-064 | Audit code avant refonte `config_view.js` — 3 questions bloquantes | **Résolu** — Q1 : sélection auto = logique frontend via `triage/bulk` + `quality_score`. Q2 : `reference_entity_id` exposé dans `settings.py` ([`36cd1d1`](https://github.com/silentiss-jean/hsev3/commit/36cd1d171fa815558989df8469aa4811028ef264)). Q3 : `rooms` retourné `[{id,name}]` dans `meta.py` ([`830d00b`](https://github.com/silentiss-jean/hsev3/commit/830d00bb72c73612ce0fd69f926c728d9767d48d)). | 2026-05-17 |
| DELTA-054 | Onglet Détection : capteurs non affichés par intégration | **Faux positif** — vérifié sur capture d'écran : tplink / tuya / tapo / Helpers HA / Compteurs HA affichés correctement. 106 entités cataloguées. Résolu par DELTA-053/055/056. | 2026-05-16 |
| DELTA-001 | … | … | … |
| INC-07 | `history.py` suppositement absent | **Faux positif** — `HseHistoryView` existe dans `costs.py`. | 2026-05-16 |
| DELTA-060 | `HseMigrationView` importé mais inexistant — ImportError | Import supprimé de `__init__.py`. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-061 | `HseMetaSyncPreviewView` + `HseMetaSyncApplyView` non enregistrées | Import + `register_view` ajoutés. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-052 | `hse_shell.js` — 8 onglets, navigation | Committé + validé. | 2026-05-16 |
| DELTA-053 | `scan_view.js` — groupement par `integration_domain` | F3 committé. | 2026-05-16 |
| DELTA-055 | Groupe `"integration"` dans le catalogue | Patch backend + frontend committé. | 2026-05-16 |
| DELTA-056 | Onglet Détection — 2 bugs dans `scan_view.js` | Corrigés (reset `_scanSig`/`_catSig` + `_attrVal()`). | 2026-05-16 |
| DELTA-057 | `scan_view.js` — `customElements.define` parasite | Ligne supprimée, stubs ajoutés. | 2026-05-16 |
| DELTA-CONF-01 | `config_view.js` — onglet Configuration | Implémenté — 3 sous-onglets : Appareils / Pièces & Types / Tarification. Contournements DELTA-058/059 intégrés. | 2026-05-16 |

---

## État du repo — Carte V3

### Backend Python

| Fichier | Statut | Notes |
|---------|--------|-------|
| `__init__.py` | ✅ | DELTA-060 + DELTA-061 corrigés |
| `const.py` | ✅ | |
| `storage/manager.py` | ✅ | |
| `catalogue/scan_engine.py` | ✅ | `integration_domain` rempli — vérifié via JSON retourné |
| `api/views/scan.py` | ✅ | GET/POST /api/hse/scan |
| `api/views/catalogue.py` | ✅ | GET/POST — PATCH/DELETE ⏳ (DELTA-058) |
| `api/views/meta.py` | ✅ | GET + sync — rooms format `[{id,name}]` (DELTA-064 Q3) — POST création ⏳ (DELTA-059) |
| `api/views/settings.py` | ✅ | GET/PUT incl. `reference_entity_id` (DELTA-064 Q2) |
| `api/views/costs.py` | ✅ | GET /api/hse/costs + /history + /export |
| `api/views/overview.py` | ✅ | |
| `api/views/diagnostic.py` | ✅ | |
| `api/views/migration.py` | ✅ | |
| `api/views/user_prefs.py` | ✅ | |

### Frontend JS

| Fichier | Statut | Notes |
|---------|--------|-------|
| `hse_panel.js` | ✅ | Bureau virtuel macOS : DELTA-051-PANEL ouvert, priorité basse |
| `hse_shell.js` | ✅ | 8 onglets, navigation, validé |
| `scan_view.js` | ✅ | Groupement par intégration fonctionnel — validé capture d'écran |
| `config_view.js` | ✅ | **DELTA-063 résolu** — A : groupes collapse + ⭐ référence + ✨ auto + icônes + stars. B : fix room.name + entity_id. C : inchangé. |
| `overview_view.js` | 🟡 | Stub — priorité 1 (prochain) |
| `costs_view.js` | 🟡 | Stub — priorité 2 |
| `diagnostic_view.js` | 🟡 | Stub — priorité 3 |
| `migration_view.js` | 🟡 | Stub — priorité 4 |
| `cards_view.js` | ❌ | Absent — crash onglet (DELTA-062, priorité basse) |

### Prochaine action

1. 🟡 **Valider `config_view.js`** en prod (tester sous-onglets A + B)
2. 🟡 **Implémenter `overview_view.js`** — GET /api/hse/overview
3. 🟡 **Implémenter `costs_view.js`** — GET /api/hse/costs
