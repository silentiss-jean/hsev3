# Frontend — Personnalisation (Custom)

> Spécifications techniques de `custom_view.js` — Thème, préférences UI, réglages panel

---

## Mission

Centraliser les préférences visuelles et comportementales du panel : thème clair/sombre/auto, glassmorphisme, fond dynamique, période par défaut overview/coûts, onglet actif persistant.

---

## Fichier

```
custom_components/hse/web_static/panel/features/custom/custom_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/hse/user_prefs` | GET | Lit préférences persistantes |
| `/api/hse/user_prefs` | PATCH | Met à jour préférences (merge partiel) |

---

## Structure données (`GET/PATCH /api/hse/user_prefs`)

```typescript
interface UserPrefs {
  active_tab: string;                 // "overview" | "diagnostic" | "scan" | "config" | "costs" | "migration" | "cards" | "custom"
  overview_period: 'day' | 'week' | 'month' | 'year';  // défaut: "day"
  costs_period: 'day' | 'week' | 'month' | 'year';     // défaut: "month"
  theme: 'default' | 'light' | 'dark' | 'auto';        // défaut: "default"
  glassmorphism: boolean;             // défaut: false
  dynamic_bg: boolean;                // défaut: false
}
```

**Défauts serveur** (si absent) : voir ci-dessus.

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois. `_render()` patch `textContent`/attributs. |
| **R2** | Flag `_prefsFetching` GET, `_saveFetching` PATCH. |
| **R3** | Signature prefs comparée. |
| **R4** | **Zéro `localStorage`** — tout via `/api/hse/user_prefs` (source unique). |
| **R5** | Skeleton formulaire avant fetch. |

---

## États UX

| État | Affichage |
|------|-----------|
| **Chargement** | Skeleton tous contrôles |
| **Prêt** | Form complet : selects thème/périodes, toggles glass/bg, aperçu temps réel |
| **Sauvegarde** | Bouton ⏳ "Enregistrement…", toast succès/erreur |
| **Erreur load** | Form avec défauts + toast erreur |
| **Erreur save** | Toast erreur, valeurs locales conservées |

---

## Layout DOM

```html
<div class="hse-custom">
  <div class="hse-custom__section">
    <h3>🎨 Thème & Apparence</h3>
    <div class="hse-custom__field">
      <label for="hse-pref-theme">Thème</label>
      <select id="hse-pref-theme">
        <option value="default">Défaut (HA)</option>
        <option value="light">Clair</option>
        <option value="dark">Sombre</option>
        <option value="auto">Auto (système)</option>
      </select>
    </div>
    <div class="hse-custom__field hse-custom__toggle">
      <label><input type="checkbox" id="hse-pref-glass"> Glassmorphisme (flou arrière-plan)</label>
    </div>
    <div class="hse-custom__field hse-custom__toggle">
      <label><input type="checkbox" id="hse-pref-dynbg"> Fond dynamique (animé)</label>
    </div>
    <div class="hse-custom__preview" id="hse-custom-preview">
      <!-- Aperçu live des réglages -->
    </div>
  </div>

  <div class="hse-custom__section">
    <h3>📊 Périodes par défaut</h3>
    <div class="hse-custom__field">
      <label for="hse-pref-overview-period">Overview</label>
      <select id="hse-pref-overview-period">
        <option value="day">Jour</option>
        <option value="week">Semaine</option>
        <option value="month">Mois</option>
        <option value="year">Année</option>
      </select>
    </div>
    <div class="hse-custom__field">
      <label for="hse-pref-costs-period">Coûts</label>
      <select id="hse-pref-costs-period">
        <option value="day">Jour</option>
        <option value="week">Semaine</option>
        <option value="month">Mois</option>
        <option value="year">Année</option>
      </select>
    </div>
  </div>

  <div class="hse-custom__actions">
    <button id="hse-custom-save" class="hse-btn hse-btn--primary">💾 Sauvegarder</button>
  </div>
</div>
```

---

## Aperçu temps réel (preview)

```javascript
_updatePreview() {
  const theme = this._els.theme.value;
  const glass = this._els.glass.checked;
  const dynbg = this._els.dynbg.checked;

  // Applique sur zone preview uniquement
  const preview = this._els.preview;
  preview.dataset.theme = theme;
  preview.dataset.glass = glass;
  preview.dataset.dynbg = dynbg;

  // CSS variables dans .hse-custom__preview { ... }
  // --hse-bg, --hse-surface, --hse-border, --hse-accent
}
```

---

## Sauvegarde (PATCH merge)

```javascript
async _save() {
  this._saveFetching = true;
  this._els.save.disabled = true;
  this._els.save.textContent = '⏳ Enregistrement…';

  const patch = {
    active_tab: this._ctx.activeTab,  // géré par shell
    overview_period: this._els.overviewPeriod.value,
    costs_period: this._els.costsPeriod.value,
    theme: this._els.theme.value,
    glassmorphism: this._els.glass.checked,
    dynamic_bg: this._els.dynbg.checked,
  };

  try {
    const r = await this._ctx.hseFetch('/api/hse/user_prefs', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    const saved = await r.json();      // objet COMPLET retourné
    this._applyTheme(saved);           // applique globalement
    this._ctx.toast('Préférences sauvegardées');
  } catch (e) {
    this._ctx.toast(`Erreur : ${escHtml(e.message)}`, 'error');
  } finally {
    this._saveFetching = false;
    this._els.save.disabled = false;
    this._els.save.textContent = '💾 Sauvegarder';
  }
}
```

---

## Application thème global (répercussion sur shell)

```javascript
_applyTheme(prefs) {
  const root = document.documentElement;
  root.dataset.hseTheme = prefs.theme;
  root.dataset.hseGlass = prefs.glassmorphism;
  root.dataset.hseDynBg = prefs.dynamic_bg;

  // Le shell (hse_shell.js) lit ces data-attributes au mount/tab switch
  // et applique les classes CSS sur <body> ou <html>
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.toast`, `ctx.activeTab`

---

## Definition of Done

- [x] Form complet : thème (4 options), glassmorphism, dynamic_bg, 2 périodes
- [x] Aperçu live dans zone preview
- [x] GET `/user_prefs` au mount → pré-remplissage
- [x] PATCH `/user_prefs` merge partiel → objet complet retourné
- [x] `_applyTheme()` répercute sur `documentElement` (shell + panel)
- [x] Toast succès/erreur
- [x] Skeleton formulaire (R5)
- [x] Flags `_prefsFetching` / `_saveFetching` (R2)
- [x] Signature prefs (R3)
- [x] **Zéro localStorage** — tout backend (R4) ✅