# Documentation Frontend — Index

> Vue d'ensemble des 8 onglets du panel HSE V3

---

## Onglets

| # | Onglet | Fichier | Endpoint principal | Description |
|---|--------|---------|-------------------|-------------|
| 01 | **Overview** | `01_overview.md` | `GET /api/hse/overview` | Tableau de bord live : puissance, conso, top5, par pièce/type |
| 02 | **Diagnostic** | `02_diagnostic.md` | `GET/POST /api/hse/diagnostic` | Score fiabilité, santé capteurs, alertes Repairs |
| 03 | **Scan** | `03_scan.md` | `GET/POST /api/hse/scan`, `GET/POST /api/hse/catalogue` | Détection appareils, triage select/ignore/reset |
| 04 | **Config** | `04_config.md` | `GET/POST /api/hse/meta*`, `GET/PUT /api/hse/settings/pricing` | Pièces/types, assignations, tarification |
| 05 | **Coûts** | `05_costs.md` | `GET /api/hse/costs`, `/history`, `/export` | Coûts multi-périodes, historique, export CSV/JSON |
| 06 | **Migration** | `06_migration.md` | `GET/POST /api/hse/migration/*` | Assistant V1→V3 : détection, mapping, nettoyage |
| 07 | **Cartes** | `07_cards.md` | `GET /api/hse/catalogue` | Générateur YAML Lovelace (6 types cartes) |
| 08 | **Personnalisation** | `08_custom.md` | `GET/PATCH /api/hse/user_prefs` | Thème, périodes défaut, glassmorphisme, fond dynamique |

---

## Règles transverses (tous les onglets)

| Règle | Description |
|-------|-------------|
| **R1** | `mount()` = construction DOM **une seule fois** ; `_render()` = patch ciblé (`textContent`, `setAttribute`, `classList`) |
| **R2** | Flag `_fetching` / `_saveFetching` sur **chaque** appel réseau → désactive boutons, spinner |
| **R3** | Signature de réponse (hash JSON) comparée → **zéro re-render** si inchangé |
| **R4** | **Zéro `localStorage`** — tout état persistant via API (`/api/hse/user_prefs`, `/api/hse/meta`, etc.) |
| **R5** | Skeleton UI affiché **avant** premier fetch → pas de flash vide |

---

## Architecture commune

```
┌─────────────────────────────────────┐
│ hse_shell.js (router + tabs)        │
├─────────────────────────────────────┤
│ feature/<tab>/<tab>_view.js         │  ← 1 fichier par onglet
│   ├── mount(ctx)                    │
│   ├── _loadData()                   │
│   ├── _render() / _renderStep()     │
│   └── _bindEvents()                 │
├─────────────────────────────────────┤
│ shared/                             │
│   ├── hse_fetch.js    (API client)  │
│   ├── hse_esc.js      (XSS safe)    │
│   └── hse_tabs.js     (navigation)  │
└─────────────────────────────────────┘
```

---

## Contexte `ctx` injecté par `hse_shell.js`

```typescript
interface HseContext {
  hseFetch: (path: string, init?: RequestInit) => Promise<Response>;
  toast: (msg: string, type?: 'info'|'error'|'success') => void;
  activeTab: string;              // onglet courant
  setActiveTab: (tab: string) => void;
}
```

---

## CSS — Variables partagées

```css
:root {
  --hse-bg: var(--ha-card-background, #fff);
  --hse-surface: var(--ha-card-background, #fff);
  --hse-border: var(--divider-color, #e0e0e0);
  --hse-text: var(--primary-text-color, #212121);
  --hse-muted: var(--secondary-text-color, #757575);
  --hse-accent: var(--primary-color, #03a9f4);
  --hse-accent-hover: var(--primary-color, #0288d1);
  --hse-danger: #d32f2f;
  --hse-success: #388e3c;
  --hse-warning: #f57c00;
  --hse-radius: 8px;
  --hse-shadow: 0 2px 8px rgba(0,0,0,.08);
}
```

---

## Definition of Done (global frontend)

- [x] 8 onglets documentés avec endpoints, data structures, états UX, layout DOM, logique clé
- [x] Règles R1-R5 respectées et vérifiées par onglet
- [x] Architecture commune décrite
- [x] Contexte `ctx` et CSS variables documentés