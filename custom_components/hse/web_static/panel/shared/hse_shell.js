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
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  font-size: 0.95rem;
  color: #1f2937;
  background: #f7f9ff;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Nav onglets */
#hse-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
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
  color: #1f2937;
  opacity: 0.6;
  transition: opacity 180ms, border-color 180ms;
  white-space: nowrap;
  font-family: inherit;
}
.hse-tab:hover { opacity: 1; }
.hse-tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

/* Zone de contenu */
#hse-view {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
  background: #f7f9ff;
}

/* Skeleton */
@keyframes hse-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.hse-skeleton {
  background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: hse-shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
  min-height: 120px;
  width: 100%;
}
@media (prefers-reduced-motion: reduce) { .hse-skeleton { animation: none; } }

/* États */
.hse-error {
  color: #dc2626;
  background: rgba(239,68,68,0.10);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
}
.hse-info {
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body          { background: #111827; color: #e0e0e0; }
  #hse-nav      { background: #1f2937; border-bottom-color: rgba(255,255,255,0.08); }
  .hse-tab      { color: #e0e0e0; }
  #hse-view     { background: #111827; }
  .hse-skeleton { background: linear-gradient(90deg,#2a2a2a 25%,#383838 50%,#2a2a2a 75%); background-size:200% 100%; }
  .hse-info     { background: #1f2937; border-color: rgba(255,255,255,0.08); color: #e0e0e0; }
}
`;

/* ── Classe principale ───────────────────────────────────────────────────── */
export class HseShell {
  constructor() {
    this._root        = null;
    this._nav         = null;
    this._view        = null;
    this._activeTab   = 'overview';
    this._activeView  = null;
    this._manifest    = null;
    this._fetching    = false;
  }

  /* Point d'entrée appelé par hse_panel.html */
  async mount(root) {
    this._root = root;
    this._injectCSS();
    this._buildDOM();
    await this._bootstrap();
  }

  /* ── CSS global ───────────────────────────────────────────────────────── */
  _injectCSS() {
    if (document.getElementById('hse-shell-css')) return;
    const style = document.createElement('style');
    style.id = 'hse-shell-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ── DOM statique ─────────────────────────────────────────────────────── */
  _buildDOM() {
    /* Nav */
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

    /* Zone de vue */
    const view = document.createElement('div');
    view.id = 'hse-view';
    view.setAttribute('role', 'tabpanel');

    this._root.appendChild(nav);
    this._root.appendChild(view);
    this._nav  = nav;
    this._view = view;

    /* R5 — skeleton immédiat */
    this._showSkeleton();
  }

  /* ── Bootstrap : ping + manifest ─────────────────────────────────────── */
  async _bootstrap() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      /* ping — vérifie que le backend répond */
      const pingResp = await hseFetch('/api/hse/ping');
      if (!pingResp.ok) throw new Error(`ping HTTP ${pingResp.status}`);

      /* manifest */
      const mResp = await hseFetch('/api/hse/frontend_manifest');
      if (!mResp.ok) throw new Error(`frontend_manifest HTTP ${mResp.status}`);
      this._manifest = await mResp.json();
    } catch (e) {
      console.error('[HSE] bootstrap error', e);
      this._showError(`Impossible de joindre le backend HSE — ${e.message}`);
      return;
    } finally {
      this._fetching = false;
    }
    this._activateTab(this._activeTab);
  }

  /* ── Routing ──────────────────────────────────────────────────────────── */
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
      if (this._activeTab !== tabId) return; /* navigation rapide */

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
    try { this._activeView.unmount(); } catch (e) { /* silencieux */ }
    this._activeView = null;
  }

  /* ── Helpers DOM ──────────────────────────────────────────────────────── */
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
    };
  }
}

export default HseShell;
