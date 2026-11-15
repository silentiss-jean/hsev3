# Frontend — Configuration (Config)

> Spécifications techniques de `config_view.js` — Appareils, Pièces & Types, Tarification

---

## Mission

Gérer les assignations pièce/type par capteur, synchroniser avec le backend, et configurer le contrat tarifaire (prix kWh, abonnement, HP/HC).

---

## Fichier

```
custom_components/hse/web_static/panel/features/config/config_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/hse/meta` | GET | Pièces, types, assignations actuelles |
| `/api/hse/meta/sync/preview` | POST | Diff avant apply (dry-run) |
| `/api/hse/meta/sync/apply` | POST | Applique assignations |
| `/api/hse/settings/pricing` | GET | Contrat tarifaire actuel |
| `/api/hse/settings/pricing` | PUT | Met à jour contrat tarifaire |

---

## Structure données — Meta (`GET /api/hse/meta`)

```typescript
interface MetaResponse {
  rooms: Array<{ id: string; name: string }>;
  types: string[];                    // ex: ["Heating", "Water Heater", "Lighting", ...]
  assignments: Array<{
    entity_id: string;
    room: string | null;
    type: string | null;
    pending: boolean;                 // true = assignation manuelle non synchro
  }>;
}
```

---

## Structure données — Pricing (`GET/PUT /api/hse/settings/pricing`)

```typescript
interface PricingSettings {
  mode: 'flat' | 'hphc';              // Tarif unique ou Heures Pleines/Creuses
  price_ht_kwh: number;               // Prix HT/kWh
  price_ttc_kwh: number;              // Prix TTC/kWh (base)
  price_hp_ttc_kwh?: number;          // TTC HP (si hphc)
  price_hc_ttc_kwh?: number;          // TTC HC (si hphc)
  subscription_eur_month: number;     // Abonnement mensuel €
  tax_rate_pct: number;               // Taux TVA % (ex: 20)
  reference_entity_id: string | null; // Capteur référence (Linky)
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois. `_renderMeta()` / `_renderPricing()` patchent. |
| **R2** | Flags `_metaFetching`, `_pricingFetching`, `_saveFetching`. |
| **R3** | Signatures `_metaSig`, `_pricingSig` comparées. |
| **R4** | Zéro `localStorage`. |
| **R5** | Skeleton pour 3 sous-onglets avant fetches. |

---

## Sous-onglets

| ID | Label | Description |
|----|-------|-------------|
| `A` | **Appareils** | Liste capteurs avec pièce/type actuels, badges `pending` |
| `B` | **Pièces & Types** | Tableau assignations + dropdowns pièce/type par ligne + bouton 💾 |
| `C` | **Tarification** | Formulaire contrat + preview temps réel |

---

## États UX

| Sous-onglet | État | Affichage |
|-------------|------|-----------|
| **Appareils** | Chargement | Skeleton liste |
| | Données | Table : capteur | pièce | type | statut (pending=🟡) |
| **Pièces & Types** | Chargement | Skeleton tableau |
| | Données | Table editable : dropdown pièce + dropdown type par ligne |
| | Modifié (dirty) | Ligne `dirty=true` → fond jaune, bouton 💾 actif |
| | Sauvegarde | POST `/meta/sync/apply` → `_loadMeta()` refresh |
| **Tarification** | Chargement | Skeleton formulaire |
| | Données | Form complet + preview mensuelle (kWh × prix + abo) |
| | Modifié | Preview MAJ temps réel (textContent) |
| | Sauvegarde | PUT `/settings/pricing` → toast + `_loadMeta()` |

---

## Layout DOM — Pièces & Types (sous-onglet B)

```html
<div class="hse-config__table-wrapper">
  <table class="hse-table">
    <thead>
      <tr>
        <th>Capteur</th>
        <th>Pièce</th>
        <th>Type</th>
        <th style="width: 60px">Action</th>
      </tr>
    </thead>
    <tbody id="hse-config-meta-body">
      <!-- Une ligne par assignation -->
      <tr data-eid="sensor.xxx" class="{dirty? 'hse-dirty':''}">
        <td><span class="hse-config__eid">sensor.xxx</span></td>
        <td>
          <select class="hse-config__select" data-field="room">
            <option value="">—</option>
            <option value="Salon">Salon</option>...
          </select>
        </td>
        <td>
          <select class="hse-config__select" data-field="type">
            <option value="">—</option>
            <option value="Heating">Heating</option>...
          </select>
        </td>
        <td>
          <button class="hse-btn hse-btn--sm hse-btn--save" disabled>💾</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
<div class="hse-config__actions">
  <button id="hse-config-save" class="hse-btn hse-btn--primary" disabled>💾 Sauvegarder</button>
</div>
```

---

## Logique assignations (fix `_renderAssignments` → `_renderMeta`)

```javascript
// AVANT (bug v3.0.118) : _loadAssignments() appelait _renderAssignments() → undefined
// APRÈS (v3.0.119) : _loadAssignments() utilise this._metaData cache, appelle _renderMeta()

async _loadAssignments() {
  if (this._metaFetching) return;
  this._metaFetching = true;
  try {
    // Si meta déjà chargé, utiliser le cache
    if (this._metaData) {
      this._asgData = this._metaData.assignments;
      this._rooms = this._metaData.rooms;
      this._types = this._metaData.types;
      this._renderMeta();  // ← rendu unique pour A + B
      return;
    }
    // Sinon fetch complet
    const r = await this._ctx.hseFetch('/api/hse/meta');
    this._metaData = await r.json();
    this._asgData = this._metaData.assignments;
    this._rooms = this._metaData.rooms;
    this._types = this._metaData.types;
    this._renderMeta();
  } finally { this._metaFetching = false; }
}

_renderMeta() {
  // Rendu onglet A (Appareils) + onglet B (Pièces & Types)
  // Dropdowns pièce/type pré-remplis avec this._rooms / this._types
  // Bouton 💾 activé si any row.dirty
}
```

---

## Preview Tarification (côté client)

```javascript
// Calcul temps réel à chaque changement input
const monthly_kwh = this._metaData?.overview?.consumption?.month_kwh ?? 0;
let cost = 0;
if (mode === 'flat') {
  cost = monthly_kwh * price_ttc_kwh + subscription_eur_month;
} else {
  // estimation HP/HC 60/40 par défaut
  cost = monthly_kwh * 0.6 * price_hp_ttc_kwh
       + monthly_kwh * 0.4 * price_hc_ttc_kwh
       + subscription_eur_month;
}
previewEl.textContent = `${cost.toFixed(2)} € TTC / mois`;
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`, `escAttr()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.token`

---

## Definition of Done

- [x] 3 sous-onglets (A/B/C) navigation par tabs
- [x] Onglet A : liste capteurs + pièces/types actuels + badge pending
- [x] Onglet B : tableau editable dropdowns pièce/type par ligne
- [x] `_loadAssignments()` utilise cache `this._metaData` → pas de double fetch
- [x] `_renderMeta()` unique pour A + B
- [x] Ligne `dirty` → fond jaune + bouton 💾 activé
- [x] Sauvegarde → POST `/meta/sync/apply` → `_loadMeta()` refresh
- [x] Onglet C : formulaire complet pricing + preview temps réel
- [x] PUT `/settings/pricing` → toast + refresh coûts
- [x] Skeletons 3 sous-onglets (R5)
- [x] Flags `_fetching` par opération (R2)
- [x] Signatures JSON (R3)
- [x] Zéro localStorage (R4)