# Frontend — Vue d'ensemble (Overview)

> Spécifications techniques de `overview_view.js` — Dashboard principal HSE V3

---

## Mission

Afficher en temps réel l'état électrique de l'installation : puissance live, consommation multi-périodes, top 5, totaux par pièce/type, comparaison avec capteur de référence.

---

## Fichier

```
custom_components/hse/web_static/panel/features/overview/overview_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Polling | Description |
|----------|---------|---------|-------------|
| `/api/hse/overview` | GET | 30 s (données complètes) + 10 s (puissance live) | Source unique de vérité |

---

## Structure des données attendue (`/api/hse/overview`)

```typescript
interface OverviewResponse {
  power_now_w: number;                    // Puissance totale instantanée (W)
  reference_sensor: {                     // Capteur de référence (Linky, etc.)
    entity_id: string;
    power_w: number | null;
    delta_w: number | null;               // power_now_w - reference
    delta_pct: number | null;             // delta / reference * 100
  } | null;
  consumption: {
    today_kwh: number; today_eur: number;
    week_kwh: number; week_eur: number;
    month_kwh: number; month_eur: number;
    year_kwh: number; year_eur: number;
  };
  top5: Array<{ entity_id: string; name: string; power_w: number; pct: number }>;
  by_room: Array<{ room: string; power_w: number; pct: number }>;
  by_type: Array<{ type: string; power_w: number; pct: number }>;
  status: { level: 'ok' | 'warning' | 'error'; message: string | null };
  generated_at: string;                   // ISO 8601
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit le DOM **une fois** (skeleton → layout complet). `_render()` ne fait que `textContent` sur refs stockées (`this._els`). |
| **R2** | Flag `this._fetching` sur `_fetchData()` — évite les races conditions. |
| **R3** | `JSON.stringify(data)` comparé à `this._lastSig` avant `_render()` — pas de re-render si inchangé. |
| **R4** | Zéro `localStorage` — préférences via `/api/hse/user_prefs`. |
| **R5** | Skeleton complet dans `_buildSkeleton()` avant premier fetch. |

---

## États UX

| État | Affichage |
|------|-----------|
| **Chargement initial** | Skeleton 4 cartes (puissance, aujourd'hui, mois) + 2 sections (conso, top5) |
| **Données disponibles** | Layout complet : header KPIs, grille 4 périodes, référence, top 5, grille pièce/type |
| **Aucun capteur actif** | Message "Aucun capteur actif" dans top5, pièces, types |
| **Erreur fetch** | Carte rouge `.hse-error` avec message + bouton "Réessayer" (via re-mount) |
| **Écart référence > 10%** | Badge orange/rouge sur carte référence (classe `positive`/`negative`) |

---

## Actions utilisateur

| Action | Effet |
|--------|-------|
| (Aucune interaction directe) | Onglet read-only — navigation vers autres onglets via shell |

---

## Layout DOM (construit une seule fois)

```html
<div class="hse-overview">
  <!-- Status global -->
  <div class="hse-overview__status hse-overview__status--{level}">
    <span>{icon}</span><span class="hse-overview__status-msg">{message}</span>
  </div>

  <!-- Header : 3 KPIs principaux -->
  <div class="hse-overview__header">
    <div class="hse-overview__card">Puissance totale → #hse-power-value</div>
    <div class="hse-overview__card">Aujourd'hui → #hse-today-kwh + #hse-today-eur</div>
    <div class="hse-overview__card">Ce mois → #hse-month-kwh + #hse-month-eur</div>
  </div>

  <!-- Grille 4 périodes -->
  <div class="hse-overview__consumption">
    <div class="hse-overview__consumption-card" id="hse-today-kwh/eur">...</div>
    <div class="hse-overview__consumption-card" id="hse-week-kwh/eur">...</div>
    <div class="hse-overview__consumption-card" id="hse-month-kwh/eur">...</div>
    <div class="hse-overview__consumption-card" id="hse-year-kwh/eur">...</div>
  </div>

  <!-- Capteur référence (optionnel) -->
  <div class="hse-overview__ref-card">
    <span class="hse-overview__ref-icon">⭐</span>
    <div class="hse-overview__ref-info">
      <div class="hse-overview__ref-title">Capteur de référence</div>
      <div class="hse-overview__ref-value" id="hse-ref-power">...</div>
      <div class="hse-overview__ref-delta {positive|negative}" id="hse-ref-delta">Δ ...</div>
    </div>
  </div>

  <!-- Top 5 -->
  <div class="hse-overview__top5" id="hse-top5-container">...</div>

  <!-- Grille Pièce / Type -->
  <div class="hse-overview__grid-2">
    <div class="hse-overview__list-card">
      <div class="hse-overview__section-title">🏠 Par pièce</div>
      <div id="hse-by-room-container">...</div>
    </div>
    <div class="hse-overview__list-card">
      <div class="hse-overview__section-title">⚡ Par type</div>
      <div id="hse-by-type-container">...</div>
    </div>
  </div>
</div>
```

---

## Mise à jour différentielle (`_render`)

1. **Première fois** (`!this._els.powerValue`) : `innerHTML` complet + stockage refs dans `this._els`
2. **Rafraîchissements** : `textContent` uniquement sur `this._els.*` — pas de reflow DOM
3. **Top 5** : reconstruit (peu d'items, acceptable)
4. **Par pièce/type** : patch `textContent` sur éléments existants par ID

---

## Polling

```javascript
// Dans mount()
this._timer = setInterval(() => this._fetchData(), 30000);

// _fetchData() appelé aussi au mount() initial
// Puissance live : même endpoint, mais seule la valeur power_now_w change significativement
```

---

## Gestion d'erreur

```javascript
_renderError(err) {
  this._el.innerHTML = `<div class="hse-error">Erreur : ${escHtml(err.message)}</div>`;
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`
- CSS inliné dans la classe (`const CSS = \`...\``)
- Contexte shell : `ctx.hseFetch`, `ctx.token`

---

## Definition of Done

- [x] `mount()` construit skeleton puis layout complet après premier fetch
- [x] `update_hass()` ne fait que `this._ctx = { ...this._ctx, hass }`
- [x] `unmount()` annule `setInterval` + `AbortController`
- [x] KPIs mis à jour via `textContent` uniquement (R1, R3)
- [x] Skeleton avant premier fetch (R5)
- [x] Signature JSON vérifiée avant render (R3)
- [x] Flag `_fetching` anti-race (R2)
- [x] Zéro localStorage (R4)