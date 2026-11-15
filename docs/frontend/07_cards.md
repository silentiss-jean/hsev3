# Frontend — Cartes (Cards)

> Spécifications techniques de `cards_view.js` — Générateur YAML Lovelace

---

## Mission

Permettre à l'utilisateur de composer des cartes Lovelace prêtes à l'emploi pour HSE V3 : cartes consommation, coûts, top appareils, etc. Génère le YAML copiable dans `ui-lovelace.yaml`.

---

## Fichier

```
custom_components/hse/web_static/panel/features/cards/cards_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/hse/catalogue` | GET | Liste appareils pour sélecteurs dans cartes |

---

## Types de cartes supportées

| Type | Description | Entités requises |
|------|-------------|------------------|
| `consumption` | KPIs journaliers/semaine/mois | `sensor.hse_consumption_*` |
| `costs` | Coûts par période + total | `sensor.hse_cost_*` |
| `top_devices` | Top 5 consommateurs live | `sensor.hse_power_*` |
| `by_room` | Répartition par pièce | assignations meta |
| `by_type` | Répartition par type | assignations meta |
| `reference` | Comparaison capteur référence | `sensor.hse_reference_*` |

---

## Structure données catalogue (pour sélecteurs)

```typescript
// GET /api/hse/catalogue?status=selected
interface CatalogueItem {
  entity_id: string;
  name: string;
  room: string | null;
  type: string | null;
  status: 'selected';
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois. `_render()` patch sections. |
| **R2** | Flag `_catFetching` sur chargement catalogue. |
| **R3** | Signature catalogue comparée. |
| **R4** | Zéro `localStorage`. |
| **R5** | Skeleton cartes avant fetch catalogue. |

---

## États UX

| État | Affichage |
|------|-----------|
| **Chargement catalogue** | Skeleton liste cartes + sélecteurs |
| **Prêt** | Grille 6 types de cartes, chaque carte : aperçu + YAML + bouton "Copier" |
| **Catalogue vide** | Message "Aucun appareil sélectionné — allez dans Scan/Config" |
| **Copié** | Toast "YAML copié dans le presse-papiers" |

---

## Layout DOM

```html
<div class="hse-cards">
  <div class="hse-cards__header">
    <h2>🃏 Générateur de cartes Lovelace</h2>
    <p class="hse-cards__hint">Sélectionnez une carte, copiez le YAML, collez dans ui-lovelace.yaml</p>
  </div>

  <div class="hse-cards__grid" id="hse-cards-grid">
    <!-- Carte type consumption -->
    <article class="hse-card-preview" data-type="consumption">
      <div class="hse-card-preview__preview">
        <!-- Aperçu visuel (mini) -->
        <div class="hse-mini-consumption">...</div>
      </div>
      <div class="hse-card-preview__yaml">
        <pre id="hse-card-yaml-consumption">...</pre>
        <button class="hse-btn hse-btn--sm hse-btn--copy" data-target="consumption">📋 Copier YAML</button>
      </div>
    </article>
    <!-- ... 5 autres cartes ... -->
  </div>
</div>
```

---

## Génération YAML (exemple `consumption`)

```yaml
# Carte consommation HSE V3
type: vertical-stack
cards:
  - type: horizontal-stack
    cards:
      - type: sensor
        entity: sensor.hse_consumption_today_kwh
        name: "Aujourd'hui"
        icon: mdi:flash
      - type: sensor
        entity: sensor.hse_consumption_today_eur
        name: "Coût jour"
        icon: mdi:currency-eur
  - type: horizontal-stack
    cards:
      - type: sensor
        entity: sensor.hse_consumption_week_kwh
        name: "Cette semaine"
      - type: sensor
        entity: sensor.hse_consumption_week_eur
        name: "Coût semaine"
  - type: horizontal-stack
    cards:
      - type: sensor
        entity: sensor.hse_consumption_month_kwh
        name: "Ce mois"
      - type: sensor
        entity: sensor.hse_consumption_month_eur
        name: "Coût mois"
```

---

## Copie presse-papiers

```javascript
_copyYaml(type) {
  const yaml = this._els[`yaml-${type}`].textContent;
  navigator.clipboard.writeText(yaml).then(() => {
    this._ctx.toast('YAML copié !');
  }).catch(() => {
    // Fallback sélection
    const range = document.createRange();
    range.selectNode(this._els[`yaml-${type}`]);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    this._ctx.toast('YAML copié (fallback)');
  });
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.toast`

---

## Definition of Done

- [x] 6 types de cartes avec aperçu + YAML
- [x] YAML généré dynamiquement selon entités disponibles (catalogue)
- [x] Bouton "Copier" par carte → clipboard + toast
- [x] Catalogue chargé au mount (status=selected)
- [x] Skeleton grille cartes (R5)
- [x] Flag `_catFetching` (R2)
- [x] Signature catalogue (R3)
- [x] Zéro localStorage (R4)