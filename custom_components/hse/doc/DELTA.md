# DELTA.md — Écarts doc/code actifs HSE V3

> Mis à jour : 2026-05-16 20:45 CEST
>
> **Règle** : aucun patch ne doit contredire un écart EN_DISCUSSION.
> Fermer un écart = écrire la solution ici avant de commiter.

---

## Écarts actifs

### DELTA-054 — Onglet Détection : capteurs non affichés par intégration
- **Statut** : `EN_DISCUSSION` 🔴
- **Priorité** : Haute (bloquante utilisateur)

#### Diagnostic code lu (2026-05-16 20:45)

**`hse_panel.html`** importe `hse_shell.js` depuis `/hse-static/shared/hse_shell.js`.  
HA sert `/hse-static/` → `custom_components/hse/web_static/panel/` (mapping statique).  
Le fichier est bien à `web_static/panel/shared/hse_shell.js` — **le chemin est correct**.

**`hse_shell.js`** — `_activateTab('scan')` construit l'URL :
```js
const url = `/hse-static/features/${tabId}/${tabId}_view.js`;
// → /hse-static/features/scan/scan_view.js
```
Correspondance disque : `web_static/panel/features/scan/scan_view.js` ✅ — **le fichier existe**.

**`scan_view.js`** — `_groupByIntegration()` groupe sur `item.integration_domain || item.integration || 'unknown'`.  
Si tous les items ont `integration_domain = null` ou absent, tout tombe dans le groupe `'unknown'` → affiché, mais sans label lisible.

**`_loadScan()`** appelle `this._ctx.hseFetch(...)`.  
**`_buildCtx()`** dans `hse_shell.js` expose `hseFetch` importé depuis `./hse_fetch.js`.  
`ScanView` reçoit `ctx.hseFetch` et l'appelle correctement.

#### Causes probables identifiées (par ordre de probabilité)

| # | Cause | Probabilité | Preuve code |
|---|-------|-------------|-------------|
| **C1** | `scan_engine.py` ne remplit pas `integration_domain` → le champ est `null` / absent → groupe `"unknown"` affiché mais invisible (pas de label, pas de chip) | 🔴 **Très haute** | `_groupByIntegration()` fallback sur `'unknown'` silencieux |
| **C2** | `/api/hse/scan` retourne `items: []` (total=0) — aucune entité éligible détectée | 🟡 Moyenne | `_renderScan()` affiche empty state si `!d.items?.length` |
| **C3** | Erreur HTTP (`/api/hse/scan` → 401/404/500) | 🟡 Moyenne | Catch → affiche `hse-error` visible dans l'onglet |
| **C4** | `hse_shell.js` `_bootstrap()` échoue (ping/manifest/user_prefs) → `_activateTab` jamais appelé | 🟢 Faible | Afficherait l'erreur dans `#hse-view` |

#### Solution à implémenter selon C1 (la plus probable)

Si `scan_engine.py` ne fournit pas `integration_domain`, ajouter dans le fallback de `_groupByIntegration()` une détection par préfixe d'`entity_id` :
```js
// Fallback : déduire l'intégration du préfixe de l'entity_id
function guessDomain(item) {
  if (item.integration_domain) return item.integration_domain;
  if (item.integration) return item.integration;
  // ex: "sensor.tuya_plug_1" → "tuya"
  const id = item.entity_id || '';
  const parts = id.split('.');
  if (parts.length >= 2) {
    const name = parts[1];
    // Patterns courants
    for (const known of ['tuya', 'tplink', 'shelly', 'esphome', 'zha', 'zwave', 'hue', 'tasmota']) {
      if (name.startsWith(known)) return known;
    }
  }
  return 'unknown';
}
```
**Mais** : solution fragile — la vraie correction est dans `scan_engine.py` pour garantir `integration_domain` toujours rempli.

#### Prochaine action (COMMIT)

1. **Vérifier** `GET /api/hse/scan` en direct → regarder si `integration_domain` est présent dans les items  
2. **Si absent** → patch `scan_engine.py` pour remplir le champ  
3. **Si présent mais groupe vide** → ajouter un `console.log` temporaire dans `_groupByIntegration()` pour voir ce qui arrive  
4. **Si total=0** → vérifier les filtres de `scan_engine.py` (critères `energy`/`power`)

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
| **DELTA-CONF-01** | `config_view.js` — onglet Configuration | **Implémenté** — 3 sous-onglets : Appareils / Pièces & Types / Tarification. Contournements DELTA-058/059 intégrés. | 2026-05-16 |

---

## État du repo — Carte V3

### Backend Python

| Fichier | Statut | Notes |
|---------|--------|-------|
| `__init__.py` | ✅ | DELTA-060 + DELTA-061 corrigés |
| `const.py` | ✅ | |
| `storage/manager.py` | ✅ | |
| `catalogue/scan_engine.py` | ⚠️ | Suspect DELTA-054 C1 — `integration_domain` peut-être absent |
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
| `hse_panel.js` | ✅ | Correctif bureau virtuel macOS inclus |
| `hse_shell.js` | 🟡 | Commité — flux `_activateTab` → `import()` → `mount()` vérifié ✅ |
| `scan_view.js` | 🟡 | Commité — DELTA-054 ouvert : groupement fonctionnel si `integration_domain` rempli |
| `config_view.js` | ✅ | Commité — 3 sous-onglets, R1-R5, contournements DELTA-058/059 |
| `overview_view.js` | 🟡 | Stub — à implémenter (priorité 1 après DELTA-054) |
| `costs_view.js` | 🟡 | Stub — à implémenter (priorité 2) |
| `diagnostic_view.js` | 🟡 | Stub — à implémenter (priorité 3) |
| `migration_view.js` | 🟡 | Stub — à implémenter (priorité 4) |
| `cards_view.js` | ❌ | Absent — crash onglet (DELTA-062, priorité basse) |

### Prochaine action

1. 🔴 **DELTA-054** — Appeler `GET /api/hse/scan` en direct et regarder si `integration_domain` est rempli dans les items JSON
2. 🔴 Si `integration_domain` absent → patch `scan_engine.py` → COMMIT
3. 🟡 Implémenter `overview_view.js` (après DELTA-054 fermé)
