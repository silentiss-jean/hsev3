# HSE V3 — Squelette `hse_tab_base.js`

> Classe de base à étendre par tous les onglets.
> Implémente les règles R1–R5 une seule fois pour ne pas les répéter dans chaque view.

---

## Fichier : `web_static/panel/shared/hse_tab_base.js`

```javascript
/**
 * HseTabBase — Classe de base pour tous les onglets HSE V3.
 *
 * Implémente les règles de rendering R1 à R5 :
 *   R1 - Séparation mount / update_hass / unmount
 *   R2 - Protection re-entrance (_fetching)
 *   R3 - Signature JSON avant render (_lastSig)
 *   R4 - Zéro localStorage (contrat architectural)
 *   R5 - Skeleton systématique avant le premier fetch
 */
export class HseTabBase {
  constructor() {
    /** @type {boolean} */
    this._mounted   = false;
    /** @type {boolean} — R2 */
    this._fetching  = false;
    /** @type {string|null} — R3 */
    this._lastSig   = null;
    /** @type {number|null} — timer polling */
    this._timer     = null;
    /** @type {AbortController|null} */
    this._abortCtl  = null;
    /** @type {object|null} — hass HA */
    this._hass      = null;
    /** @type {object|null} — ctx injecté par le shell */
    this._ctx       = null;
    /** @type {HTMLElement|null} */
    this._root      = null;
  }

  // ─────────────────────────────────────────────────────────
  // Contrat public (à NE PAS surcharger sauf cas exceptionnel)
  // ─────────────────────────────────────────────────────────

  /**
   * R1 — Montage. Construit le DOM une seule fois.
   * @param {HTMLElement} container
   * @param {{ hass: object, hseFetch: function, store: object }} ctx
   */
  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    this._onMount();  // hook pour les sous-classes
  }

  /**
   * R1 — Mise à jour hass uniquement. Ne reconstruit JAMAIS le DOM.
   * @param {object} hass
   */
  update_hass(hass) {
    this._hass = hass;
    this._onHassUpdate(hass);  // hook optionnel pour les sous-classes
  }

  /**
   * R1 — Démontage. Annule tous les timers et fetch en cours.
   */
  unmount() {
    this._mounted = false;
    if (this._timer)    { clearInterval(this._timer);  this._timer    = null; }
    if (this._abortCtl) { this._abortCtl.abort();       this._abortCtl = null; }
    this._onUnmount();  // hook pour les sous-classes
  }

  // ─────────────────────────────────────────────────────────
  // Hooks à surcharger dans les sous-classes
  // ─────────────────────────────────────────────────────────

  /** Appelé dans mount() — construire le skeleton et déclencher _fetchData() */
  _onMount() {
    this._buildSkeleton();
    this._fetchData();
  }

  /** Appelé dans update_hass() — optionnel */
  _onHassUpdate(_hass) {}

  /** Appelé dans unmount() — nettoyage supplémentaire si besoin */
  _onUnmount() {}

  // ─────────────────────────────────────────────────────────
  // Helpers internes (R2, R3, R5)
  // ─────────────────────────────────────────────────────────

  /** R5 — Skeleton par défaut. Surcharger pour un skeleton spécifique. */
  _buildSkeleton() {
    this._root.innerHTML = `<div class="hse-skeleton hse-skeleton--default"></div>`;
  }

  /**
   * R2 — Fetch protégé contre la re-entrance.
   * Surcharger _getEndpoint() et _buildRequestOptions() dans les sous-classes.
   */
  async _fetchData() {
    if (this._fetching) return;
    this._fetching  = true;
    this._abortCtl  = new AbortController();
    try {
      const resp = await this._ctx.hseFetch(this._getEndpoint(), {
        ...this._buildRequestOptions(),
        signal: this._abortCtl.signal,
      });
      if (!this._mounted) return;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this._applyData(data);
    } catch (err) {
      if (!this._mounted) return;
      if (err.name !== 'AbortError') this._renderError(err);
    } finally {
      this._fetching = false;
    }
  }

  /**
   * R3 — Compare la signature JSON avant de déclencher le render.
   * @param {object} data
   */
  _applyData(data) {
    const sig = JSON.stringify(data);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  // ─────────────────────────────────────────────────────────
  // Méthodes à implémenter obligatoirement dans les sous-classes
  // ─────────────────────────────────────────────────────────

  /** @returns {string} — endpoint API de l'onglet, ex: '/api/hse/overview' */
  _getEndpoint() {
    throw new Error(`${this.constructor.name} doit implémenter _getEndpoint()`);
  }

  /** @returns {object} — options fetch supplémentaires (body, method, etc.) */
  _buildRequestOptions() { return {}; }

  /**
   * Construit ou met à jour le DOM avec les données reçues.
   * Première appel : construction complète.
   * Appels suivants : mise à jour textContent uniquement.
   * @param {object} data
   */
  _render(_data) {
    throw new Error(`${this.constructor.name} doit implémenter _render(data)`);
  }

  /** Affiche l'état d'erreur. Peut être surchargé. */
  _renderError(err) {
    this._root.innerHTML = `
      <div class="hse-state hse-state--error">
        <p>Erreur de chargement : ${err.message}</p>
        <button class="hse-btn hse-btn--secondary" data-action="retry">Réessayer</button>
      </div>`;
    this._root.querySelector('[data-action="retry"]')
      ?.addEventListener('click', () => this._fetchData());
  }

  /** Affiche l'état vide. Peut être surchargé. */
  _renderEmpty(message = 'Aucune donnée disponible.') {
    this._root.innerHTML = `<div class="hse-state hse-state--empty"><p>${message}</p></div>`;
  }

  /**
   * Démarre le polling automatique.
   * @param {number} intervalMs
   */
  _startPolling(intervalMs) {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this._fetchData(), intervalMs);
  }
}
```

---

## Exemple d'utilisation

```javascript
// features/overview/overview.view.js
import { HseTabBase } from '../../shared/hse_tab_base.js';

export class OverviewView extends HseTabBase {

  _getEndpoint() { return '/api/hse/overview'; }

  _buildSkeleton() {
    this._root.innerHTML = `
      <div class="hse-skeleton overview-skeleton">
        <div class="skeleton-block skeleton-power"></div>
        <div class="skeleton-block skeleton-kpis"></div>
        <div class="skeleton-block skeleton-top5"></div>
      </div>`;
  }

  _onMount() {
    super._onMount();             // déclenche skeleton + premier fetch
    this._startPolling(30_000);   // polling 30 s
  }

  _render(data) {
    if (!this._root.querySelector('.overview-layout')) {
      // Première fois : construire le DOM complet
      this._root.innerHTML = `
        <div class="overview-layout">
          <div class="overview-power"><span class="power-value"></span> W</div>
          <!-- ... reste du layout ... -->
        </div>`;
    }
    // Mise à jour des valeurs uniquement
    this._root.querySelector('.power-value').textContent = data.power_w;
  }
}
```

---

## Checklist d'implémentation d'un nouvel onglet

1. Créer `features/mononglet/mononglet.view.js` qui `extends HseTabBase`
2. Implémenter `_getEndpoint()` → retourner l'endpoint API
3. Implémenter `_buildSkeleton()` → skeleton spécifique à l'onglet
4. Implémenter `_render(data)` → construction DOM (1ère fois) + mise à jour `textContent`
5. Surcharger `_onMount()` si polling nécessaire (`this._startPolling(N)`)
6. Surcharger `_onUnmount()` si ressources supplémentaires à libérer
7. Vérifier la checklist du fichier `00_methode_front_commune.md`