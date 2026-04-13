/**
 * hse_shell.js — Panel HA + routing onglets HSE V3
 *
 * Contrat (DELTA-002, hse_v3_synthese.md §3.2 + §5, 00_methode_front_commune.md §2) :
 *
 * Responsabilités :
 *   1. Définir le custom element <hse-panel> enregistré auprès de HA
 *   2. Bootstrap : poser window.__hseToken depuis hass.auth.data.access_token
 *   3. Charger le frontend manifest + user_prefs au démarrage
 *   4. Routing onglets :
 *        - activation  → mount(container, ctx)
 *        - désactivation → unmount()
 *        - chaque update HA → update_hass(hass) sur l'onglet actif uniquement
 *   5. Polling :
 *        - onglets "action" (scan, migration, config) → ZÉRO polling auto
 *        - onglets "lecture" (overview, costs, diagnostic) → suspendu si onglet inactif
 *
 * Dépendances :
 *   - hse_fetch.js  (hseFetch)
 *   - hse_store.js  (hseStore)
 *   - features/*_view.js  (chargés dynamiquement)
 */

import { hseFetch } from './hse_fetch.js';
import { hseStore } from './hse_store.js';

/** Onglets déclarés — ordre = ordre d'affichage dans la nav */
const TABS = [
  { id: 'overview',    label: 'Vue d\'ensemble', icon: 'mdi:home-lightning-bolt', type: 'lecture' },
  { id: 'diagnostic',  label: 'Diagnostic',      icon: 'mdi:stethoscope',         type: 'lecture' },
  { id: 'scan',        label: 'Détection',        icon: 'mdi:radar',               type: 'action'  },
  { id: 'config',      label: 'Configuration',    icon: 'mdi:cog-outline',         type: 'action'  },
  { id: 'custom',      label: 'Personnalisation', icon: 'mdi:palette-outline',     type: 'action'  },
  { id: 'cards',       label: 'Cartes YAML',      icon: 'mdi:card-multiple',       type: 'action'  },
  { id: 'migration',   label: 'Migration',        icon: 'mdi:swap-horizontal',     type: 'action'  },
  { id: 'costs',       label: 'Coûts',            icon: 'mdi:currency-eur',        type: 'lecture' },
];

/** Chemin de base des views — relatif à ce fichier */
const VIEWS_BASE = '../features';

class HsePanel extends HTMLElement {
  constructor() {
    super();
    /** @type {object|null} Objet hass HA courant */
    this._hass = null;
    /** @type {string} Onglet actif */
    this._activeTab = 'overview';
    /** @type {object|null} Instance de la view active */
    this._activeView = null;
    /** @type {HTMLElement|null} Conteneur de la view active */
    this._viewContainer = null;
    /** @type {Function|null} Désabonnement du store */
    this._unsubTab = null;
    /** @type {boolean} Bootstrap terminé */
    this._ready = false;
  }

  // ─── Cycle de vie HA ────────────────────────────────────────────────────────

  /**
   * HA injecte hass à chaque changement d'état.
   * Setter standard du protocole panel HA.
   */
  set hass(hass) {
    const firstSet = !this._hass;
    this._hass = hass;

    // Bootstrap au premier set
    if (firstSet) {
      this._bootstrap(hass);
      return;
    }

    // Propager à la view active uniquement
    if (this._ready && this._activeView) {
      try { this._activeView.update_hass(hass); } catch (e) {
        console.error('[hse_shell] update_hass error', e);
      }
    }
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    this._dismountActiveView();
    if (this._unsubTab) { this._unsubTab(); this._unsubTab = null; }
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────

  /**
   * Initialisation unique : token → manifest → prefs → rendu.
   * ready=true et _activateTab ne sont appelés que si les fetches réussissent
   * ou après le fallback gracieux (DELTA-031c).
   * @param {object} hass
   */
  async _bootstrap(hass) {
    // 1. Poser le token global (R4 sécurité — jamais logué)
    window.__hseToken = hass.auth.data.access_token;

    // 2. Charger manifest frontend + prefs en parallèle
    try {
      const [manifestResp, prefsResp] = await Promise.all([
        hseFetch('/api/hse/frontend_manifest'),
        hseFetch('/api/hse/user_prefs'),
      ]);
      const manifest = await manifestResp.json();
      const prefs    = await prefsResp.json();

      hseStore.set('frontendManifest', manifest);
      hseStore.set('userPrefs', prefs);

      // Appliquer le thème depuis les prefs
      if (prefs?.theme) {
        document.documentElement.setAttribute('data-hse-theme', prefs.theme);
      }
    } catch (e) {
      // Erreur réseau au boot : on log et on continue en mode dégradé.
      // Les views feront leurs propres fetches au montage (DELTA-031c).
      console.warn('[hse_shell] bootstrap fetch error — mode dégradé', e);
    }

    // 3. Marquer le shell prêt et monter l'onglet initial
    //    (qu'il y ait eu erreur ou non — les views gèrent leur propre état)
    this._ready = true;
    hseStore.set('ready', true);

    this._render();
    this._activateTab(this._activeTab);

    // 4. S'abonner aux changements d'onglet depuis le store
    this._unsubTab = hseStore.subscribe('activeTab', (tabId) => {
      this._switchTab(tabId);
    });
  }

  // ─── Rendu shell ────────────────────────────────────────────────────────────

  _render() {
    if (this.shadowRoot) return; // déjà rendu
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        nav.hse-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          overflow-x: auto;
        }
        button.hse-tab {
          flex: 0 0 auto;
          padding: 12px 20px;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--primary-text-color, #212121);
          opacity: 0.7;
          transition: opacity 180ms, border-color 180ms;
          white-space: nowrap;
        }
        button.hse-tab:hover { opacity: 1; }
        button.hse-tab[aria-selected="true"] {
          opacity: 1;
          border-bottom-color: var(--primary-color, #03a9f4);
          font-weight: 600;
        }
        .hse-view-container {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 16px;
          box-sizing: border-box;
        }
        /* Skeleton générique */
        .hse-skeleton {
          background: linear-gradient(
            90deg,
            var(--secondary-background-color, #f5f5f5) 25%,
            var(--divider-color, #e0e0e0) 50%,
            var(--secondary-background-color, #f5f5f5) 75%
          );
          background-size: 200% 100%;
          animation: hse-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
          min-height: 120px;
        }
        @keyframes hse-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hse-skeleton { animation: none; }
        }
      </style>

      <nav class="hse-tabs" role="tablist" aria-label="Onglets HSE">
        ${TABS.map((t) => `
          <button
            class="hse-tab"
            role="tab"
            data-tab="${t.id}"
            aria-selected="${t.id === this._activeTab}"
            aria-controls="hse-view-${t.id}"
            id="hse-tab-${t.id}"
          >${t.label}</button>
        `).join('')}
      </nav>

      <div
        class="hse-view-container"
        id="hse-view-${this._activeTab}"
        role="tabpanel"
        aria-labelledby="hse-tab-${this._activeTab}"
      ></div>
    `;

    this._viewContainer = this.shadowRoot.querySelector('.hse-view-container');

    // Écouter les clics sur les onglets
    this.shadowRoot.querySelector('nav.hse-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      hseStore.set('activeTab', btn.dataset.tab);
    });
  }

  // ─── Routing onglets ────────────────────────────────────────────────────────

  /**
   * Appelé par le subscriber du store.
   * @param {string} tabId
   */
  _switchTab(tabId) {
    if (tabId === this._activeTab) return;
    this._dismountActiveView();
    this._activeTab = tabId;
    this._updateTabIndicator(tabId);
    this._activateTab(tabId);
  }

  /**
   * Instancie et monte la view de l'onglet demandé.
   * Chargement dynamique du module `features/<id>/<id>_view.js`.
   * @param {string} tabId
   */
  async _activateTab(tabId) {
    if (!this._viewContainer) return;

    // Skeleton immédiat pendant le chargement du module
    this._viewContainer.innerHTML = '<div class="hse-skeleton"></div>';

    try {
      const module = await import(`${VIEWS_BASE}/${tabId}/${tabId}_view.js`);
      const ViewClass = module.default ?? module[Object.keys(module)[0]];

      if (typeof ViewClass !== 'function') {
        throw new Error(`Module ${tabId}_view.js n'exporte pas de classe`);
      }

      // Vérifier qu'on est toujours sur le bon onglet (navigation rapide)
      if (this._activeTab !== tabId) return;

      this._viewContainer.innerHTML = '';
      this._activeView = new ViewClass();

      const ctx = this._buildCtx();
      this._activeView.mount(this._viewContainer, ctx);
    } catch (e) {
      console.error(`[hse_shell] Impossible de charger ${tabId}_view.js`, e);
      this._viewContainer.innerHTML = `
        <p class="hse-error" style="color:var(--error-color,#b00020);padding:16px">
          Erreur de chargement de l'onglet « ${tabId} » : ${e.message}
        </p>
      `;
    }
  }

  /**
   * Démonte la view active proprement.
   */
  _dismountActiveView() {
    if (!this._activeView) return;
    try { this._activeView.unmount(); } catch (e) {
      console.error('[hse_shell] unmount error', e);
    }
    this._activeView = null;
  }

  /**
   * Met à jour l'indicateur visuel de l'onglet actif.
   * @param {string} tabId
   */
  _updateTabIndicator(tabId) {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('[data-tab]').forEach((btn) => {
      const active = btn.dataset.tab === tabId;
      btn.setAttribute('aria-selected', String(active));
    });
    // Mettre à jour aria-labelledby du panel
    const panel = this._viewContainer;
    if (panel) {
      panel.id = `hse-view-${tabId}`;
      panel.setAttribute('aria-labelledby', `hse-tab-${tabId}`);
    }
  }

  // ─── Contexte injecté dans chaque view ──────────────────────────────────────

  /**
   * Construit le ctx passé à mount().
   * @returns {{ hass: object, hseFetch: Function, store: object }}
   */
  _buildCtx() {
    return {
      hass:     this._hass,
      hseFetch,
      store:    hseStore,
    };
  }
}

// Enregistrement du custom element HA
if (!customElements.get('hse-panel')) {
  customElements.define('hse-panel', HsePanel);
}
