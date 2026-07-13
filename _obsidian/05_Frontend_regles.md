# ⚙️ Frontend — Règles & Contrat R1-R5

## Contrat obligatoire (toute vue)

| Règle | Description |
|-------|-------------|
| **R1** | `mount()` construit le DOM **une seule fois** |
| **R1** | `update_hass()` ne reconstruit **jamais** le DOM |
| **R1** | `unmount()` nettoie timers + AbortController |
| **R2** | Flag `_fetching` sur chaque fetch (pas de double call) |
| **R3** | `JSON.stringify` signature avant `_render()` (skip si identique) |
| **R4** | Zéro `localStorage` — tout passe par `hse_store.js` |
| **R5** | Skeleton systématique (pas de blanc au chargement) |

## Règles de codage

- **Mapper les clés backend explicitement** : si le backend retourne `price_ht_kwh`, le frontend lit `data.price_ht_kwh` — pas de supposition
- **Gestion d'erreur UX** : état erreur avec message lisible, pas juste `console.error`
- **Polling** : `overview_view.js` = 30s, `costs_view.js` = 60s
- **AbortController** sur chaque fetch, nettoyé dans `unmount()`

## Structure type d'une vue
```js
class HseXxxView {
  constructor(hass, shadowRoot) { this._hass = hass; this._root = shadowRoot; }
  mount()        { /* DOM une fois, lance polling */ }
  update_hass(h) { this._hass = h; /* PAS de DOM */ }
  unmount()      { /* clearInterval + abort */ }
  _fetch()       { /* guard _fetching, AbortController */ }
  _render(data)  { /* signature check R3, puis DOM update */ }
}
```

## Shared disponibles
| Module | Usage |
|--------|-------|
| `hse_fetch.js` | `hseFetch(hass, path)` → fetch authentifié |
| `hse_store.js` | Store global partagé entre vues |
| `hse_shell.js` | Navigation 8 onglets |
| `shared/ui/dom.js` | Helpers DOM |
| `shared/ui/table.js` | Rendu tableau |
