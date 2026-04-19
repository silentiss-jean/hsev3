/**
 * hse_shell.js — Shell principal HSE V3
 *
 * DELTA-052 étape 1 — réécriture complète.
 * Architecture : classe HseShell instanciée par hse_panel.html
 * (plus de Custom Element Shadow DOM ici — l'iframe est gérée par hse_panel.js)
 *
 * Contrat :
 *   new HseShell().mount(rootEl)  → démarre le shell
 *   Le token est déjà dans window.__hseToken à ce stade.
 *
 * Règles V3 :
 *   R1 — mount() construit le DOM une fois. Pas de re-render DOM.
 *   R2 — flag _fetching par fetch (anti race condition)
 *   R3 — signature JSON.stringify avant _render() (anti re-render inutile)
 *   R4 — zéro localStorage
 *   R5 — skeleton posé avant le premier fetch
 */

import { hseFetch } from './hse_fetch.js';

/* ── Onglets ─────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',    label: "Vue d'ensemble" },
  { id: 'diagnostic',  label: 'Diagnostic'      },
  { id: 'scan',        label: 'Détection'       },
  { id: 'config',      label: 'Configuration'   },
  { id: 'costs',       label: 'Coûts'           },
  { id: 'migration',   label: 'Migration'       },
  { id: 'cards',       label: 'Cartes YAML'     },
  { id: 'custom',      label: 'Personnalisation'},
];

/* ── CSS global (inliné — zéro fetch CSS au runtime) ─────────────────────── */
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 0.95rem;
  color: var(--hse-text, #1f2937);
  background: var(--hse-bg, #f7f9ff);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#hse-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--hse-border, #e5e7eb);
  background: var(--hse-surface, #fff);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
#hse-nav::-webkit-scrollbar { display: none; }

.hse-tab {
  flex: 0 0 auto;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: inherit;
  opacity: 0.68;
  transition: opacity 180ms, border-color 180ms, color 180ms;
  white-space: nowrap;
  font-family: inherit;
}
.hse-tab:hover { opacity: 1; }
.hse-tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: var(--hse-accent, #2563eb);
  color: var(--hse-accent, #2563eb);
  font-weight: 600;
}

#hse-view {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
  background: var(--hse-bg, #f7f9ff);
}

@keyframes hse-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.hse-skeleton {
  background: linear-gradient(90deg, rgba(128,128,128,0.14) 25%, rgba(128,128,128,0.22) 50%, rgba(128,128,128,0.14) 75%);
  background-size: 200% 100%;
  animation: hse-shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
  min-height: 120px;
  width: 100%;
}
@media (prefers-reduced-motion: reduce) { .hse-skeleton { animation: none; } }

.hse-error {
  color: #dc2626;
  background: rgba(239,68,68,0.10);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
}
.hse-info {
  color: inherit;
  background: var(--hse-surface, #fff);
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
}
`;

export class HseShell {
  constructor() {
    this._root        = null;
    this._nav         = null;
    this._view        = null;
    this._activeTab   = 'overview';
    this._activeView  = null;
    this._manifest    = null;
    this._userPrefs   = null;
    this._fetching    = false;
  }

  async mount(root) {
    this._root = root;
    this._injectCSS();
    this._buildDOM();
    await this._bootstrap();
  }

  _injectCSS() {
    if (document.getElementById('hse-shell-css')) return;
    const style = document.createElement('style');
    style.id = 'hse-shell-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _buildDOM() {
    const nav = document.createElement('nav');
    nav.id = 'hse-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Onglets HSE');

    TABS.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'hse-tab';
      btn.setAttribute('role', 'tab');
      btn.dataset.tab = t.id;
      btn.setAttribute('aria-selected', t.id === this._activeTab ? 'true' : 'false');
      btn.textContent = t.label;
      nav.appendChild(btn);
    });

    nav.addEventListener('click', e => {
      const btn = e.target.closest('[data-tab]');
      if (btn && btn.dataset.tab !== this._activeTab) {
        this._switchTab(btn.dataset.tab);
      }
    });

    const view = document.createElement('div');
    view.id = 'hse-view';
    view.setAttribute('role', 'tabpanel');

    this._root.appendChild(nav);
    this._root.appendChild(view);
    this._nav  = nav;
    this._view = view;

    this._showSkeleton();
  }

  async _bootstrap() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const pingResp = await hseFetch('/api/hse/ping');
      if (!pingResp.ok) throw new Error(`ping HTTP ${pingResp.status}`);

      const mResp = await hseFetch('/api/hse/frontend_manifest');
      if (!mResp.ok) throw new Error(`frontend_manifest HTTP ${mResp.status}`);
      this._manifest = await mResp.json();

      const prefsResp = await hseFetch('/api/hse/user_prefs');
      if (!prefsResp.ok) throw new Error(`user_prefs HTTP ${prefsResp.status}`);
      this._userPrefs = await prefsResp.json();

      this._applyPrefs(this._userPrefs);
      if (this._userPrefs?.active_tab && TABS.some(t => t.id === this._userPrefs.active_tab)) {
        this._activeTab = this._userPrefs.active_tab;
      }
    } catch (e) {
      console.error('[HSE] bootstrap error', e);
      this._showError(`Impossible de joindre le backend HSE — ${e.message}`);
      return;
    } finally {
      this._fetching = false;
    }
    this._activateTab(this._activeTab);
  }

  _applyPrefs(prefs = {}) {
    const html = document.documentElement;
    if (prefs.theme) {
      html.setAttribute('data-theme', prefs.theme);
    }
    html.setAttribute('data-glass', prefs.glassmorphism ? 'true' : 'false');
    html.setAttribute('data-dynamic-bg', prefs.dynamic_bg ? 'true' : 'false');
  }

  _switchTab(tabId) {
    this._activeTab = tabId;
    this._nav.querySelectorAll('[data-tab]').forEach(btn => {
      btn.setAttribute('aria-selected', btn.dataset.tab === tabId ? 'true' : 'false');
    });
    this._activateTab(tabId);
  }

  async _activateTab(tabId) {
    this._dismountView();
    this._showSkeleton();

    try {
      const url = `/hse-static/features/${tabId}/${tabId}_view.js`;
      const mod = await import(url);
      const ViewClass = mod.default ?? mod[Object.keys(mod)[0]];
      if (typeof ViewClass !== 'function') throw new Error(`${tabId}_view.js : pas de classe exportée`);
      if (this._activeTab !== tabId) return;

      this._view.innerHTML = '';
      this._activeView = new ViewClass();
      this._activeView.mount(this._view, this._buildCtx());
    } catch (e) {
      console.error(`[HSE] chargement ${tabId}_view.js`, e);
      this._showError(`Onglet « ${tabId} » indisponible — ${e.message}`);
    }
  }

  _dismountView() {
    if (!this._activeView) return;
    try { this._activeView.unmount(); } catch (e) {}
    this._activeView = null;
  }

  _showSkeleton() {
    this._view.innerHTML = '<div class="hse-skeleton"></div>';
  }

  _showError(msg) {
    this._view.innerHTML = `<div class="hse-error">${msg}</div>`;
  }

  _buildCtx() {
    return {
      token:      window.__hseToken,
      hseFetch,
      manifest:   this._manifest,
      userPrefs:  this._userPrefs,
      applyPrefs: (prefs) => {
        this._userPrefs = { ...(this._userPrefs || {}), ...(prefs || {}) };
        this._applyPrefs(this._userPrefs);
      },
    };
  }
}

export default HseShell;
