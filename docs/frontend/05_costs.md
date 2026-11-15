# Frontend — Coûts & Historique (Costs)

> Spécifications techniques de `costs_view.js` — Coûts par appareil, historique 12 mois, export

---

## Mission

Visualiser les coûts électriques par appareil sur la période choisie, consulter l'historique mensuel/hebdomadaire, et exporter les données (CSV/JSON).

---

## Fichier

```
custom_components/hse/web_static/panel/features/costs/costs_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Polling | Description |
|----------|---------|---------|-------------|
| `/api/hse/costs` | GET | 60 s | Coûts par appareil (période paramétrable) |
| `/api/hse/history` | GET | À la demande | Historique 12 mois (mois/semaine) |
| `/api/hse/export` | GET | Déclenché user | Export CSV/JSON |

---

## Structure données — Coûts (`GET /api/hse/costs?period=month`)

```typescript
interface CostsResponse {
  period: 'day' | 'week' | 'month' | 'year';
  generated_at: string;               // ISO 8601
  total_kwh: number;
  total_ttc_eur: number;
  items: Array<{
    entity_id: string;
    name: string;
    room: string | null;
    type: string | null;
    power_w: number;                  // puissance actuelle
    energy_kwh: number;               // énergie sur la période
    cost_ht_eur: number;
    cost_ttc_eur: number;
    pct_total: number;                // % du total
  }>;
}
```

---

## Structure données — Historique (`GET /api/hse/history?granularity=month`)

```typescript
interface HistoryResponse {
  entity_id: string | null;           // null = global
  granularity: 'month' | 'week';
  points: Array<{
    label: string;                    // "2026-01" ou "2026-W01"
    kwh: number;
    eur_ttc: number;
  }>;
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois. `_renderCosts()` / `_renderHistory()` patchent. |
| **R2** | Flags `_costsFetching`, `_historyFetching`, `_exportFetching`. |
| **R3** | Signatures `_costsSig`, `_historySig` comparées. |
| **R4** | Zéro `localStorage` — période active via `user_prefs.costs_period`. |
| **R5** | Skeleton tableau coûts + zone historique avant fetches. |

---

## États UX

| Zone | État | Affichage |
|------|------|-----------|
| **Coûts** | Chargement | Skeleton lignes tableau (5 lignes shimmer) |
| | Données | Table triable : appareil | pièce | type | Puissance | Énergie | Coût HT | Coût TTC | % |
| | Total | Ligne totale en bas (bold) |
| | Erreur | Ligne erreur + bouton "Réessayer" |
| **Historique** | Chargement | Skeleton graphique/barres |
| | Données | Bar chart SVG ou tableau (selon implémentation) |
| | Sélecteur période | Tabs Jour/Semaine/Mois/Année (coûts) + Mois/Semaine (historique) |
| **Export** | En cours | Bouton ⏳ "Export…" |
| | Succès | Téléchargement auto + toast "Exporté" |
| | Erreur | Toast erreur |

---

## Layout DOM

```html
<div class="hse-costs">
  <!-- Toolbar période coûts -->
  <div class="hse-costs__toolbar">
    <div class="hse-costs__period-tabs" role="tablist">
      <button role="tab" data-period="day">Jour</button>
      <button role="tab" data-period="week" aria-selected="true">Semaine</button>
      <button role="tab" data-period="month">Mois</button>
      <button role="tab" data-period="year">Année</button>
    </div>
    <div class="hse-costs__export">
      <button id="hse-costs-export-csv" class="hse-btn hse-btn--ghost">📥 CSV</button>
      <button id="hse-costs-export-json" class="hse-btn hse-btn--ghost">📥 JSON</button>
    </div>
  </div>

  <!-- Tableau coûts -->
  <div class="hse-costs__table-wrapper">
    <table class="hse-table">
      <thead>
        <tr>
          <th>Appareil</th>
          <th>Pièce</th>
          <th>Type</th>
          <th class="num">Puissance (W)</th>
          <th class="num">Énergie (kWh)</th>
          <th class="num">Coût HT (€)</th>
          <th class="num">Coût TTC (€)</th>
          <th class="num">%</th>
        </tr>
      </thead>
      <tbody id="hse-costs-body">...</tbody>
      <tfoot id="hse-costs-total">...</tfoot>
    </table>
  </div>

  <!-- Historique -->
  <section class="hse-costs__history">
    <div class="hse-costs__history-head">
      <h2>📈 Historique</h2>
      <div class="hse-costs__granularity" role="tablist">
        <button role="tab" data-granularity="month" aria-selected="true">Mensuel</button>
        <button role="tab" data-granularity="week">Hebdo</button>
      </div>
    </div>
    <div id="hse-costs-history">...</div>
  </section>
</div>
```

---

## Mise à jour différentielle

```javascript
_renderCosts(data) {
  const sig = JSON.stringify(data);
  if (sig === this._costsSig) return;
  this._costsSig = sig;

  // Total row
  const total = data.items.reduce((a, b) => ({
    energy_kwh: a.energy_kwh + b.energy_kwh,
    cost_ht_eur: a.cost_ht_eur + b.cost_ht_eur,
    cost_ttc_eur: a.cost_ttc_eur + b.cost_ttc_eur,
  }), { energy_kwh: 0, cost_ht_eur: 0, cost_ttc_eur: 0 });

  // Patch tbody
  this._els.body.innerHTML = data.items.map(item => `
    <tr>
      <td><span class="hse-costs__name">${escHtml(item.name)}</span>
          <span class="hse-costs__eid">${escHtml(item.entity_id)}</span></td>
      <td>${escHtml(item.room ?? '—')}</td>
      <td>${escHtml(item.type ?? '—')}</td>
      <td class="num">${item.power_w.toLocaleString('fr-FR')}</td>
      <td class="num">${item.energy_kwh.toFixed(2)}</td>
      <td class="num">${item.cost_ht_eur.toFixed(2)}</td>
      <td class="num"><strong>${item.cost_ttc_eur.toFixed(2)}</strong></td>
      <td class="num">${item.pct_total.toFixed(1)}%</td>
    </tr>
  `).join('');

  // Patch tfoot
  this._els.total.innerHTML = `
    <tr>
      <td colspan="4" class="hse-costs__total-label">TOTAL</td>
      <td class="num">${total.energy_kwh.toFixed(2)}</td>
      <td class="num">${total.cost_ht_eur.toFixed(2)}</td>
      <td class="num"><strong>${total.cost_ttc_eur.toFixed(2)}</strong></td>
      <td class="num">100%</td>
    </tr>`;
}
```

---

## Export

```javascript
async _export(format) {
  this._exportFetching = true;
  try {
    const period = this._activePeriod; // day/week/month/year
    const r = await this._ctx.hseFetch(`/api/hse/export?period=${period}&format=${format}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hse-costs-${period}-${new Date().toISOString().slice(0,10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    this._ctx.toast(`Export ${format.toUpperCase()} téléchargé`);
  } catch (e) {
    this._ctx.toast(`Erreur export : ${escHtml(e.message)}`, 'error');
  } finally {
    this._exportFetching = false;
  }
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- `../../shared/ui/table.js` — `createTable()` si utilisé
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.toast`, `ctx.token`

---

## Definition of Done

- [x] Toolbar : 4 onglets période (jour/semaine/mois/année) + 2 boutons export
- [x] Tableau coûts : colonnes complètes + ligne TOTAL
- [x] Tri par colonne (click header) — optionnel
- [x] Historique : sélecteur mensuel/hebdo + visualisation
- [x] Export CSV/JSON → téléchargement auto + toast
- [x] Polling 60s sur `/costs` (période active)
- [x] Période persistée via `user_prefs.costs_period`
- [x] Skeletons coûts + historique (R5)
- [x] Flags `_fetching` par zone (R2)
- [x] Signatures JSON (R3)
- [x] Zéro localStorage (R4)