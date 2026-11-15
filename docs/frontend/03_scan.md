# Frontend — Détection (Scan)

> Spécifications techniques de `scan_view.js` — Scan entités, triage, catalogue

---

## Mission

Découvrir les capteurs energy/power non encore catalogués, les grouper par intégration technique, permettre le triage (sélectionner/ignorer/réinitialiser) en unitaire ou en masse, et afficher le catalogue existant.

---

## Fichier

```
custom_components/hse/web_static/panel/features/scan/scan_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/hse/scan` | GET | Inbox entités non triées (filtres domain, q, pagination) |
| `/api/hse/scan` | POST | Déclenche re-scan complet |
| `/api/hse/catalogue/triage` | POST | Triage unitaire : `{ entity_id, action: "select"\|"ignore"\|"reset" }` |
| `/api/hse/catalogue/triage/bulk` | POST | Triage masse : `{ items: [{ entity_id, action }] }` |
| `/api/hse/catalogue` | GET | Catalogue trié (bas de page, pagination) |

---

## Structure données — Scan (`GET /api/hse/scan`)

```typescript
interface ScanItem {
  entity_id: string;
  name: string;
  domain: string;                    // ex: "tuya", "tplink"
  device: string | null;             // device_id HA
  quality_score: number;             // 0-150
  suggested_action: 'select' | 'ignore'; // suggestion backend
  kind: 'energy' | 'power';          // FIX-2026-07-04 C8
}
interface ScanResponse { total, page, per_page, items: ScanItem[] }
```

---

## Structure données — Catalogue (`GET /api/hse/catalogue`)

```typescript
interface CatalogueItem {
  entity_id: string;
  name: string;                      // display_name HSE
  icon: string;
  room: string | null;
  type: string | null;
  status: 'selected' | 'ignored' | 'pending';
  quality_score: number;
  integration_domain: string;        // domaine technique (groupement)
  integration_label: string | null;  // label instance (sous-titre)
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois. `_renderScan()` / `_renderCatalogue()` patchent `innerHTML` sur conteneurs (listes dynamiques). |
| **R2** | Flags `_scanFetching`, `_catFetching`, `_triageFetching`. |
| **R3** | Signatures `_scanSig`, `_catSig` comparées avant render. |
| **R4** | Zéro `localStorage` — filtres persistés via `user_prefs` si besoin. |
| **R5** | Skeleton pour scan + catalogue avant fetches. |

---

## États UX

| Zone | État | Affichage |
|------|------|-----------|
| **Scan (inbox)** | Chargement | Skeleton liste groupée |
| | Vide | "Aucune entité détectée — lancez un scan" + bouton |
| | Données | Groupes par `integration_domain` (ex: "tuya", "tplink") |
| | Erreur | Carte erreur + bouton "Réessayer" |
| **Catalogue** | Chargement | Skeleton |
| | Vide | "Catalogue vide — allez dans Scan" |
| | Données | Groupes par intégration, triés, pagination |
| **Triage** | En cours | Bouton ⏳, ligne en `opacity: 0.5` |
| | Succès | MAJ badge statut, compteurs |
| | Erreur | Toast + rollback visuel |

---

## Layout DOM

```html
<div class="hse-scan">
  <!-- Toolbar -->
  <div class="hse-scan__toolbar">
    <input type="search" class="hse-scan__search" placeholder="Filtrer entités…">
    <select class="hse-scan__filter">
      <option value="all">Toutes</option>
      <option value="energy">Energy</option>
      <option value="power">Power</option>
    </select>
    <button id="hse-scan-refresh" class="hse-btn hse-btn--ghost">🔄 Re-scan</button>
  </div>

  <!-- Scan Inbox (entités non triées) -->
  <section class="hse-scan__section">
    <div class="hse-scan__section-head">
      <h2>📥 À trier (<span id="hse-scan-count">0</span>)</h2>
      <div class="hse-scan__bulk">
        <button id="hse-scan-select-all" class="hse-btn hse-btn--sm">Tout sélectionner</button>
        <button id="hse-scan-ignore-all" class="hse-btn hse-btn--sm hse-btn--ghost">Tout ignorer</button>
      </div>
    </div>
    <div id="hse-scan-container">...</div>
  </section>

  <!-- Catalogue (entités triées) -->
  <section class="hse-scan__section">
    <div class="hse-scan__section-head">
      <h2>📋 Catalogue (<span id="hse-cat-count">0</span>)</h2>
    </div>
    <div id="hse-cat-container">...</div>
    <div class="hse-scan__pager" id="hse-cat-pager">...</div>
  </section>
</div>
```

---

## Groupement par `integration_domain` (DELTA-053)

```javascript
// Avant (cassé) : groupé par integration_label → "tuya@ftoure.net"
// Après (fix) : groupé par integration_domain → "tuya"
// integration_label affiché en sous-titre si différent du domain

const groups = items.reduce((acc, item) => {
  const domain = item.integration_domain || 'unknown';
  const label = item.integration_label;
  const key = label && label !== domain ? `${domain} (${label})` : domain;
  (acc[key] ??= []).push(item);
  return acc;
}, {});
```

**Libellés HA internes (DELTA-055) :**
- `utility_meter` → "Compteurs HA"
- `integration` → "Helpers HA"

---

## Triage unitaire (boutons par ligne)

| Action | Payload POST `/catalogue/triage` | Effet visuel |
|--------|----------------------------------|--------------|
| ✅ Sélectionner | `{ entity_id, action: "select" }` | Badge → "Sélectionné" (vert) |
| 🚫 Ignorer | `{ entity_id, action: "ignore" }` | Badge → "Ignoré" (gris), ligne masquée si filtre |
| ↩️ Réinitialiser | `{ entity_id, action: "reset" }` | Retire du catalogue, revient dans Scan |

---

## Triage en masse

```javascript
// Sélection multiple via checkboxes
const items = Array.from(checkboxes).filter(c => c.checked).map(c => ({
  entity_id: c.value,
  action: 'select' // ou 'ignore'
}));
await hseFetch('/api/hse/catalogue/triage/bulk', {
  method: 'POST', body: JSON.stringify({ items })
});
```

---

## Fixes critiques (historique)

| ID | Problème | Fix |
|----|----------|-----|
| DELTA-053 | Groupement par label instance au lieu de domaine technique | Group by `integration_domain` |
| DELTA-056 fix-1 | `mount()` ne réinitialisait pas `_scanSig`/`_catSig` → pas de re-render au retour onglet | `this._scanSig = this._catSig = null;` dans `mount()` |
| DELTA-056 fix-2 | `CSS.escape()` sur constante string → TypeError silencieux | Remplacé par `this._attrVal()` dédiée |
| DELTA-057 | `customElements.define('hse-panel', HsePanel)` parasite en fin de fichier | Supprimé |
| FIX-2026-07-04 C5 | `err.message` non échappé dans error UI | `escHtml(err.message)` |
| FIX-2026-07-04 C8 | Backend ne retournait pas `kind` (energy/power) | Ajouté dans `scan.py` |

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`, `escAttr()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.token`

---

## Definition of Done

- [x] Toolbar : recherche, filtre kind, re-scan
- [x] Scan inbox groupé par `integration_domain` + sous-titre `integration_label`
- [x] Triage unitaire (3 actions) + bulk (sélectionner/ignorer tout)
- [x] Catalogue groupé même logique, pagination
- [x] `mount()` réinitialise signatures (re-render au retour)
- [x] `_attrVal()` pour data-attributes (pas `CSS.escape()`)
- [x] Skeleton scan + catalogue (R5)
- [x] Flags `_fetching` par zone (R2)
- [x] Signatures JSON (R3)
- [x] Zéro localStorage (R4)