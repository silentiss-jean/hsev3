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
 *   6. CSS Shadow DOM :
 *        - hse_tokens.shadow.css + hse_themes.shadow.css + hse_components.shadow.css
 *          injectés dans le shadowRoot
 *        - Chemin statique : /hse-static/shared/styles/
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

/** Chemin de base des CSS statiques servis par HA (StaticPathConfig) */
const STYLES_BASE = '/hse-static/shared/styles';

/**
 * CSS à injecter dans le Shadow DOM.
 * Ordre obligatoire : tokens → themes → components
 * (DELTA-046 : tokens + themes ; DELTA-047 : + components)
 */
const SHADOW_CSS_FILES = [
  `${STYLES_BASE}/hse_tokens.shadow.css`,
  `${STYLES_BASE}/hse_themes.shadow.css`,
  `${STYLES_BASE}/hse_components.shadow.css`,
];

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
    /** @type {boolean} CSS shadow injectés */
    this._stylesInjected = false;
  }

  // ─── Cycle de vie HA ─────────────────────────────────────────────────────────────────────────

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

  // ─── Bootstrap ─────────────────────────────────────────────────────────────────────────────

  /**
   * Initialisation unique : token → CSS shadow → manifest + prefs → rendu.
   *
   * Mode dégradé (DELTA-031c) : si les fetches de bootstrap échouent
   * (ex. HA démarre lentement), on continue quand même avec ready=true.
   * Les stores userPrefs/frontendManifest restent null — chaque view
   * est responsable de faire son propre fetch au montage si le store est vide.
   *
   * @param {object} hass
   */
  async _bootstrap(hass) {
    // 1. Poser le token global (R4 sécurité — jamais logué)
    window.__hseToken = hass.auth.data.access_token;

    // 2. Injecter les CSS dans le Shadow DOM (DELTA-046 + DELTA-047)
    await this._injectShadowStyles();

    // 3. Charger manifest frontend + prefs en parallèle
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
        if (this.shadowRoot) {
          this.shadowRoot.host.setAttribute('data-hse-theme', prefs.theme);
        }
      }
    } catch (e) {
      // Mode dégradé : on log et on continue. Les views feront leur propre fetch.
      console.warn('[hse_shell] bootstrap fetch error — mode dégradé', e);
    }

    // 4. Marquer le shell prêt et monter l'onglet initial
    this._ready = true;
    hseStore.set('ready', true);

    this._render();
    this._activateTab(this._activeTab);

    // 5. S'abonner aux changements d'onglet depuis le store
    this._unsubTab = hseStore.subscribe('activeTab', (tabId) => {
      this._switchTab(tabId);
    });
  }

  // ─── Injection CSS Shadow DOM (DELTA-046 + DELTA-047) ─────────────────────────────────────

  /**
   * Charge hse_tokens + hse_themes + hse_components depuis le serveur statique HA
   * et les injecte dans le shadowRoot via des éléments <style>.
   *
   * Mode dégradé : si un fichier est introuvable (404 ou réseau), on log et on continue —
   * le panel s'affiche sans thème plutôt que de bloquer le démarrage.
   */
  async _injectShadowStyles() {
    if (this._stylesInjected) return;
    if (!this.shadowRoot) {
      // Le shadowRoot n'est pas encore attaché — _render() sera appelé avant _activateTab()
      // donc on injecte après _render(). Cas normal : _render() est appelé dans connectedCallback
      // avant le premier set hass, ou dans _bootstrap() si connectedCallback précède.
      this._render(); // s'assure que shadowRoot existe
    }
    if (!this.shadowRoot) {
      console.warn('[hse_shell] shadowRoot non disponible — styles non injectés');
      return;
    }

    for (const url of SHADOW_CSS_FILES) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`[hse_shell] CSS shadow introuvable (${resp.status}) : ${url}`);
          continue;
        }
        const css = await resp.text();
        const styleEl = document.createElement('style');
        styleEl.dataset.hseSource = url.split('/').pop();
        styleEl.textContent = css;
        this.shadowRoot.appendChild(styleEl);
      } catch (e) {
        console.warn(`[hse_shell] Impossible de charger le CSS shadow : ${url}`, e);
      }
    }

    this._stylesInjected = true;
  }

  // ─── Rendu shell ──────────────────────────────────────────────────────────────────────────

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
        /*
         * Fallback skeleton inline — actif uniquement si hse_components.shadow.css
         * n'est pas encore chargé (ex. 404 réseau au démarrage).
         * La définition dans hse_components.shadow.css prend le dessus une fois injectée.
         */
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

  // ─── Routing onglets ────────────────────────────────────────────────────────────────────────

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
    const panel = this._viewContainer;
    if (panel) {
      panel.id = `hse-view-${tabId}`;
      panel.setAttribute('aria-labelledby', `hse-tab-${tabId}`);
    }
  }

  // ─── Contexte injecté dans chaque view ────────────────────────────────────────────────────────────────

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
