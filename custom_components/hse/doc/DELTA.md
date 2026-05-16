# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 21:22 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.
>
> ⚠️ Ce fichier est tenu à jour exclusivement par l'IA. Toute désynchronisation est un bug doc à corriger immédiatement.

---

## Écarts actifs

### DELTA-064 — Audit code avant refonte `config_view.js` — 3 questions bloquantes
- **Statut** : `A_AUDITER` 🔍
- **Priorité** : **Haute** — bloque DELTA-063
- **Contexte** : Screenshots V1 reçus (9 captures). La refonte `config_view.js` est prête à être spécifiée mais 3 questions nécessitent une vérification dans le code backend avant de commiter quoi que ce soit.
- **Questions à résoudre par lecture du code** :

  **Q1 — Sélection automatique intelligente**
  La V1 avait un bouton `✨ Lancer la sélection automatique` qui analysait tous les capteurs et sélectionnait les meilleurs selon des critères (Energy > Power, score qualité, pas de doublons, physique > virtuel).
  → Existe-t-il une route backend pour ça ? Chercher dans `catalogue.py` et `scan_engine.py` : un mode `auto`, une action `best`, ou un `POST /api/hse/catalogue/triage/bulk` avec payload spécial.
  → **Fichiers à lire** : `api/views/catalogue.py`, `catalogue/scan_engine.py`

  **Q2 — Capteur de référence (étoile ⭐)**
  La V1 permettait de désigner un capteur de référence externe (ex: Linky/Zlinky) avec un dropdown et un bouton Sauvegarder.
  → Où est stocké `reference_sensor_id` ? Dans `settings.py` ? Dans `storage/manager.py` ?
  → Quelle route pour lire/écrire ce champ ?
  → **Fichiers à lire** : `api/views/settings.py`, `storage/manager.py`

  **Q3 — Bug Pièces & Types : `name` affiché `?`**
  Le sous-onglet Pièces & Types affiche `?` pour toutes les pièces (12 pièces, 0 types).
  → Quelle est la structure JSON exacte retournée par `GET /api/hse/meta` ?
  → La clé est-elle `name`, `label`, `display_name`, ou autre ?
  → **Fichiers à lire** : `api/views/meta.py`, `storage/manager.py`

- **Action IA** : Lire les fichiers listés, répondre aux 3 questions, puis passer en mode COMMIT sur DELTA-063.
- **Décision** : ⏳ En attente d'audit — NE PAS commiter `config_view.js` avant.

---

### DELTA-063 — `config_view.js` — Refonte UI (screenshots V1 reçus)
- **Statut** : `BLOQUÉ_PAR_DELTA-064`
- **Priorité** : Moyenne
- **Contexte** : Screenshots V1 reçus (9 captures, 2026-05-16 21:17). Analyse faite.
- **Ce qui est prévu** (à confirmer après audit DELTA-064) :
  - **Sous-onglet Appareils** : layout 2 colonnes (Sélectionnés | Ignorés/Alternatives), groupes par intégration collapse/expand avec compteur bubble, rows avec badge intégration + icône type ⚡/🔋 + qualité stars + badge Summary, bloc capteur de référence ⭐, bloc sélection automatique ✨
  - **Sous-onglet Pièces & Types** : corriger bug `?` (Q3), afficher `entity_id` HA sous le nom
  - **Sous-onglet Tarification** : labels en gras, bouton Enregistrer plus visible, layout conforme V1
- **Blocage** : DELTA-064 doit être résolu (Q1 + Q2 + Q3) avant tout patch.

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
| DELTA-054 | Onglet Détection : capteurs non affichés par intégration | **Faux positif** — vérifié sur capture d'écran : tplink / tuya / tapo / Helpers HA / Compteurs HA affichés correctement. 106 entités cataloguées. Résolu par DELTA-053/055/056. | 2026-05-16 |
| DELTA-001 | … | … | … |
| INC-07 | `history.py` supposément absent | **Faux positif** — `HseHistoryView` existe dans `costs.py`. | 2026-05-16 |
| DELTA-060 | `HseMigrationView` importé mais inexistant — ImportError | Import supprimé de `__init__.py`. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-061 | `HseMetaSyncPreviewView` + `HseMetaSyncApplyView` non enregistrées | Import + `register_view` ajoutés. Commit [`18c2d50`](https://github.com/silentiss-jean/hsev3/commit/18c2d50462ebe826ffe3a1f185066b4a283b0b53) | 2026-05-16 |
| DELTA-052 | `hse_shell.js` — 8 onglets, navigation | Commité + validé. | 2026-05-16 |
| DELTA-053 | `scan_view.js` — groupement par `integration_domain` | F3 commité. | 2026-05-16 |
| DELTA-055 | Groupe `"integration"` dans le catalogue | Patch backend + frontend commité. | 2026-05-16 |
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
| `hse_panel.js` | ✅ | Bureau virtuel macOS : DELTA-051-PANEL ouvert, priorité basse |
| `hse_shell.js` | ✅ | 8 onglets, navigation, validé |
| `scan_view.js` | ✅ | Groupement par intégration fonctionnel — validé capture d'écran |
| `config_view.js` | 🔴 | Fonctionnel mais UI à refondre — bloqué DELTA-064 (audit) |
| `overview_view.js` | 🟡 | Stub — priorité 2 (après déblocage DELTA-064) |
| `costs_view.js` | 🟡 | Stub — priorité 3 |
| `diagnostic_view.js` | 🟡 | Stub — priorité 4 |
| `migration_view.js` | 🟡 | Stub — priorité 5 |
| `cards_view.js` | ❌ | Absent — crash onglet (DELTA-062, priorité basse) |

### Prochaine action

1. 🔍 **DELTA-064** — Audit `catalogue.py` + `scan_engine.py` + `settings.py` + `meta.py` + `manager.py` → répondre Q1/Q2/Q3
2. 🔴 **DELTA-063** — Refonte `config_view.js` (débloqué après DELTA-064)
3. 🟡 **Implémenter `overview_view.js`** — GET /api/hse/overview
4. 🟡 **Implémenter `costs_view.js`** — GET /api/hse/costs
