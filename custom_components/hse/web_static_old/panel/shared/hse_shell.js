/**
 * hse_shell.js — Panel HA + routing onglets HSE V3
 *
 * DELTA-050 (2026-04-16) : CSS Shadow DOM inliné directement ici.
 * Les fetch() dynamiques échouaient silencieusement (401/proxy/cache HA).
 * Solution : template literals CSS_TOKENS + CSS_THEMES + CSS_COMPONENTS
 * injectés en un seul appendChild — zéro réseau, zéro dépendance.
 */

import { hseFetch } from './hse_fetch.js';
import { hseStore } from './hse_store.js';

const TABS = [
  { id: 'overview',   label: "Vue d'ensemble" },
  { id: 'diagnostic', label: 'Diagnostic'      },
  { id: 'scan',       label: 'Détection'       },
  { id: 'config',     label: 'Configuration'   },
  { id: 'custom',     label: 'Personnalisation'},
  { id: 'cards',      label: 'Cartes YAML'     },
  { id: 'migration',  label: 'Migration'       },
  { id: 'costs',      label: 'Coûts'           },
];

const VIEWS_BASE = '../features';

/* ─────────────────────────────────────────────────────────────────────────────
   CSS TOKENS  (source : hse_tokens.shadow.css)
───────────────────────────────────────────────────────────────────────────── */
const CSS_TOKENS = `
:host {
  --hse-font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --hse-mono-font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --hse-font-tracking: 0.1px;
  --hse-font-size-title: 1.05rem;
  --hse-font-size-body: 0.95rem;
  --hse-font-size-muted: 0.86rem;
  --hse-font-weight-title: 800;
  --hse-font-weight-body: 520;
  --hse-font-weight-strong: 700;
  --hse-number-font-family: var(--hse-mono-font-family);
  --hse-value-accent-color: var(--hse-primary);
  --hse-panel-radius: var(--hse-radius-lg);
  --hse-panel-padding: 16px;
  --hse-panel-shadow: var(--hse-shadow-md);
  --hse-panel-border: 1px solid var(--hse-border);
  --hse-table-header-bg: var(--hse-gradient-header);
  --hse-table-header-color: var(--hse-on-header);
  --hse-table-header-weight: 800;
  --hse-pill-bg: var(--hse-gradient-header);
  --hse-pill-fg: var(--hse-on-header);
  --hse-kpi-bg: color-mix(in srgb, var(--hse-surface) 86%, var(--hse-bg) 14%);
  --hse-kpi-border: var(--hse-border);
  --hse-kpi-value-color: var(--hse-text);
  --hse-kpi-total-color: var(--hse-primary);
  --hse-bg: #f7f9ff;
  --hse-bg-secondary: #f3f4f6;
  --hse-surface: #ffffff;
  --hse-surface-0: #ffffff;
  --hse-surface-1: #f5f5f5;
  --hse-surface-2: #eeeeee;
  --hse-surface-raised: #ffffff;
  --hse-surface-muted: #f1f5f9;
  --hse-border: #e5e7eb;
  --hse-border-soft: #eef2f7;
  --hse-border-strong: #cbd5e1;
  --hse-divider: rgba(0,0,0,0.10);
  --hse-text: #1f2937;
  --hse-text-main: var(--hse-text);
  --hse-text-muted: #6b7280;
  --hse-text-soft: #7b8697;
  --hse-text-faint: #9e9e9e;
  --hse-text-inverse: #ffffff;
  --hse-primary: #2563eb;
  --hse-primary-dark: #1d4ed8;
  --hse-accent: #7c3aed;
  --hse-accent-hover: #6d28d9;
  --hse-accent-soft: rgba(124,58,237,0.12);
  --hse-accent-light: rgba(124,58,237,0.12);
  --hse-hover: rgba(37,99,235,0.08);
  --hse-info: #0ea5e9;
  --hse-info-dark: #0284c7;
  --hse-info-bg: rgba(14,165,233,0.12);
  --hse-success: #16a34a;
  --hse-success-dark: #15803d;
  --hse-success-bg: rgba(22,163,74,0.12);
  --hse-warning: #f59e0b;
  --hse-warning-dark: #b45309;
  --hse-warning-bg: rgba(245,158,11,0.16);
  --hse-error: #ef4444;
  --hse-error-dark: #dc2626;
  --hse-error-bg: rgba(239,68,68,0.12);
  --hse-gradient-primary: linear-gradient(135deg,rgba(37,99,235,1),rgba(124,58,237,1));
  --hse-gradient-header: linear-gradient(135deg,rgba(37,99,235,0.95),rgba(14,165,233,0.85));
  --hse-on-accent: #ffffff;
  --hse-on-header: #ffffff;
  --hse-text-on-accent: #ffffff;
  --hse-backdrop-filter: none;
  --hse-shadow-sm: 0 2px 4px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04);
  --hse-shadow-md: 0 4px 12px rgba(0,0,0,0.10),0 2px 4px rgba(0,0,0,0.06);
  --hse-shadow-lg: 0 8px 24px rgba(0,0,0,0.12),0 4px 8px rgba(0,0,0,0.08);
  --hse-transition-fast: 120ms ease;
  --hse-transition-base: 180ms ease;
  --hse-transition-slow: 320ms ease;
  --hse-radius-sm: 8px;
  --hse-radius-md: 12px;
  --hse-radius-lg: 18px;
  --hse-radius-xl: 26px;
  --hse-radius-full: 9999px;
  --hse-spacing-xs: 4px;
  --hse-spacing-sm: 8px;
  --hse-spacing-md: 16px;
  --hse-spacing-lg: 24px;
  --hse-spacing-xl: 32px;
  --hse-space-1: 4px;
  --hse-space-2: 8px;
  --hse-space-3: 12px;
  --hse-space-4: 16px;
  --hse-space-6: 24px;
  --hse-space-8: 32px;
  --hse-space-12: 48px;
  --hse-text-xs: 0.75rem;
  --hse-text-sm: 0.875rem;
  --hse-text-base: 1rem;
  --hse-text-lg: 1.125rem;
  --hse-text-xl: 1.25rem;
  --hse-text-2xl: 1.5rem;
  --hse-font-medium: 500;
  --hse-font-semibold: 600;
  --hse-font-bold: 700;
  --hse-leading-tight: 1.25;
  --hse-container-max-width: 1280px;
  --hse-badge-bg: rgba(0,0,0,0.04);
  --hse-badge-border: rgba(0,0,0,0.10);
  --hse-badge-fg: var(--hse-text);
  --hse-badge-radius: 9999px;
  --hse-badge-padding: 2px 8px;
  --hse-skeleton-base: #e0e0e0;
  --hse-skeleton-shine: #f5f5f5;
  --hse-skeleton-speed: 1.5s;
  --hse-table-border: var(--hse-border);
  --hse-table-row-hover: rgba(37,99,235,0.06);
  --hse-table-row-stripe: rgba(0,0,0,0.02);
  --hse-z-raised: 10;
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   CSS THEMES  (source : hse_themes.shadow.css)
───────────────────────────────────────────────────────────────────────────── */
const CSS_THEMES = `
@media (prefers-color-scheme: dark) {
  :host {
    --hse-bg: #111827;
    --hse-surface: #1f2937;
    --hse-surface-0: #1e1e1e;
    --hse-surface-1: #2a2a2a;
    --hse-surface-2: #333333;
    --hse-surface-raised: #252525;
    --hse-surface-muted: #374151;
    --hse-border: rgba(255,255,255,0.06);
    --hse-border-soft: rgba(255,255,255,0.04);
    --hse-border-strong: rgba(255,255,255,0.12);
    --hse-divider: rgba(255,255,255,0.08);
    --hse-text: #e0e0e0;
    --hse-text-muted: #9e9e9e;
    --hse-text-soft: #9ca3af;
    --hse-text-faint: #616161;
    --hse-shadow-sm: 0 2px 4px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.2);
    --hse-shadow-md: 0 4px 12px rgba(0,0,0,0.5),0 2px 4px rgba(0,0,0,0.3);
    --hse-shadow-lg: 0 8px 24px rgba(0,0,0,0.6),0 4px 8px rgba(0,0,0,0.4);
    --hse-skeleton-base: #2a2a2a;
    --hse-skeleton-shine: #383838;
    --hse-table-row-hover: rgba(255,255,255,0.04);
    --hse-table-row-stripe: rgba(255,255,255,0.02);
  }
}
:host([data-theme="hse-dark"]) {
  --hse-bg: #111827;
  --hse-surface: #1f2937;
  --hse-surface-0: #1e1e1e;
  --hse-surface-1: #2a2a2a;
  --hse-surface-2: #333333;
  --hse-surface-raised: #252525;
  --hse-surface-muted: #374151;
  --hse-border: rgba(255,255,255,0.06);
  --hse-divider: rgba(255,255,255,0.08);
  --hse-text: #e0e0e0;
  --hse-text-muted: #9e9e9e;
  --hse-text-faint: #616161;
  --hse-shadow-sm: 0 2px 4px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.2);
  --hse-shadow-md: 0 4px 12px rgba(0,0,0,0.5),0 2px 4px rgba(0,0,0,0.3);
  --hse-skeleton-base: #2a2a2a;
  --hse-skeleton-shine: #383838;
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   CSS COMPONENTS  (source : hse_themes.shadow.css section composants
                   + hse_components.shadow.css)
───────────────────────────────────────────────────────────────────────────── */
const CSS_COMPONENTS = `
/* Shell layout */
:host {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--hse-bg, #f7f9ff);
  font-family: var(--hse-font-family, sans-serif);
  font-size: var(--hse-font-size-body, 0.95rem);
  color: var(--hse-text, #1f2937);
  box-sizing: border-box;
}
nav.hse-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--hse-border, #e5e7eb);
  background: var(--hse-surface, #fff);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
nav.hse-tabs::-webkit-scrollbar { display: none; }
button.hse-tab {
  flex: 0 0 auto;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: var(--hse-text-sm, 0.875rem);
  color: var(--hse-text, #1f2937);
  opacity: 0.65;
  transition: opacity 180ms, border-color 180ms;
  white-space: nowrap;
  font-family: var(--hse-font-family, sans-serif);
}
button.hse-tab:hover { opacity: 1; }
button.hse-tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: var(--hse-primary, #2563eb);
  font-weight: 600;
}
.hse-view-container {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--hse-spacing-md, 16px);
  box-sizing: border-box;
  background: var(--hse-bg, #f7f9ff);
}
/* Cards */
.hse-card {
  background: var(--hse-surface-raised, #fff);
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: var(--hse-radius-lg, 18px);
  padding: var(--hse-space-4, 16px);
  box-shadow: var(--hse-shadow-sm);
  box-sizing: border-box;
  transition: box-shadow 120ms ease, border-color 120ms ease;
}
.hse-card:hover {
  box-shadow: var(--hse-shadow-md);
}
/* Grilles */
.hse-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--hse-space-4,16px); }
.hse-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--hse-space-4,16px); }
.hse-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--hse-space-4,16px); }
@media (max-width:900px) {
  .hse-grid-4 { grid-template-columns:repeat(2,1fr); }
  .hse-grid-3 { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:560px) {
  .hse-grid-4,.hse-grid-3,.hse-grid-2 { grid-template-columns:1fr; }
}
/* Typo utilitaires */
.hse-label {
  display: block;
  font-size: var(--hse-text-xs,0.75rem);
  font-weight: 600;
  color: var(--hse-text-muted,#6b7280);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--hse-space-1,4px);
}
.hse-value-large {
  display: block;
  font-size: var(--hse-text-2xl,1.5rem);
  font-weight: 700;
  color: var(--hse-text,#1f2937);
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}
.hse-muted {
  color: var(--hse-text-muted,#6b7280);
  font-size: var(--hse-text-sm,0.875rem);
}
/* Badges */
.hse-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--hse-space-1,4px);
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: var(--hse-text-xs,0.75rem);
  font-weight: 600;
  white-space: nowrap;
  background: var(--hse-accent-light,rgba(124,58,237,0.12));
  color: var(--hse-accent,#7c3aed);
}
.hse-badge[data-level="ok"]      { background:var(--hse-success-bg,rgba(22,163,74,0.12));   color:var(--hse-success,#16a34a); }
.hse-badge[data-level="warning"] { background:var(--hse-warning-bg,rgba(245,158,11,0.16)); color:var(--hse-warning-dark,#b45309); }
.hse-badge[data-level="error"]   { background:var(--hse-error-bg,rgba(239,68,68,0.12));    color:var(--hse-error-dark,#dc2626); }
.hse-badge[data-level="info"]    { background:var(--hse-info-bg,rgba(14,165,233,0.12));    color:var(--hse-info-dark,#0284c7); }
/* Boutons */
.hse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hse-space-2,8px);
  padding: var(--hse-space-2,8px) var(--hse-space-4,16px);
  border: 1px solid transparent;
  border-radius: var(--hse-radius-md,12px);
  font-size: var(--hse-text-sm,0.875rem);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  user-select: none;
  text-decoration: none;
  font-family: inherit;
}
.hse-btn:focus-visible { outline:2px solid var(--hse-accent,#7c3aed); outline-offset:2px; }
.hse-btn-primary  { background:var(--hse-primary,#2563eb); color:#fff; }
.hse-btn-primary:hover { background:var(--hse-primary-dark,#1d4ed8); box-shadow:var(--hse-shadow-sm); }
.hse-btn-secondary { background:var(--hse-surface-1,#f5f5f5); border-color:var(--hse-border,#e5e7eb); color:var(--hse-text,#1f2937); }
.hse-btn-secondary:hover { background:var(--hse-surface-2,#eeeeee); }
.hse-btn-ghost { background:transparent; border-color:var(--hse-border,#e5e7eb); color:var(--hse-text-muted,#6b7280); }
.hse-btn-ghost:hover { background:var(--hse-accent-light,rgba(124,58,237,0.12)); color:var(--hse-accent,#7c3aed); }
.hse-btn:disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
/* Inputs */
.hse-input,.hse-select {
  display:block; width:100%;
  padding:var(--hse-space-2,8px) var(--hse-space-3,12px);
  background:var(--hse-surface-0,#fff);
  border:1px solid var(--hse-border,#e5e7eb);
  border-radius:var(--hse-radius-md,12px);
  font-size:var(--hse-text-base,1rem);
  color:var(--hse-text,#1f2937);
  transition:border-color 120ms ease,box-shadow 120ms ease;
  font-family:inherit;
}
.hse-input:focus,.hse-select:focus {
  outline:none;
  border-color:var(--hse-accent,#7c3aed);
  box-shadow:0 0 0 3px var(--hse-accent-light,rgba(124,58,237,0.12));
}
/* Tableau */
.hse-table { width:100%; border-collapse:collapse; font-size:var(--hse-text-sm,0.875rem); font-family:inherit; }
.hse-table thead th {
  background:var(--hse-table-header-bg,var(--hse-gradient-header));
  padding:var(--hse-space-2,8px) var(--hse-space-3,12px);
  text-align:left;
  font-weight:700;
  font-size:var(--hse-text-xs,0.75rem);
  text-transform:uppercase;
  letter-spacing:0.05em;
  color:var(--hse-table-header-color,#fff);
  border-bottom:2px solid var(--hse-divider,rgba(0,0,0,0.1));
  white-space:nowrap;
  user-select:none;
}
.hse-table thead th.sortable { cursor:pointer; }
.hse-table thead th.sortable:hover { color:var(--hse-accent-light,rgba(124,58,237,0.8)); }
.hse-table tbody tr { border-bottom:1px solid var(--hse-table-border,var(--hse-border)); transition:background 120ms ease; }
.hse-table tbody tr:hover { background:var(--hse-table-row-hover,rgba(37,99,235,0.06)); }
.hse-table tbody tr:nth-child(even) { background:var(--hse-table-row-stripe,rgba(0,0,0,0.02)); }
.hse-table tbody tr:nth-child(even):hover { background:var(--hse-table-row-hover,rgba(37,99,235,0.06)); }
.hse-table td { padding:var(--hse-space-2,8px) var(--hse-space-3,12px); color:var(--hse-text,#1f2937); vertical-align:middle; }
.hse-table .tabnum,.hse-table td.num,.hse-table th.num { text-align:right; font-variant-numeric:tabular-nums; font-feature-settings:"tnum"; }
/* Toolbar */
.hse-toolbar { display:flex; align-items:center; gap:var(--hse-space-3,12px); flex-wrap:wrap; padding:var(--hse-space-3,12px) 0; margin-bottom:var(--hse-space-2,8px); }
/* Table wrapper */
.hse-table-wrapper { position:relative; overflow-x:auto; border:1px solid var(--hse-border,#e5e7eb); border-radius:var(--hse-radius-lg,18px); background:var(--hse-surface-raised,#fff); }
.hse-table-footer { display:flex; align-items:center; justify-content:center; gap:var(--hse-space-3,12px); padding:var(--hse-space-3,12px) var(--hse-space-4,16px); border-top:1px solid var(--hse-divider,rgba(0,0,0,0.1)); background:var(--hse-surface-1,#f5f5f5); border-radius:0 0 var(--hse-radius-lg,18px) var(--hse-radius-lg,18px); }
.hse-pager-info { font-size:var(--hse-text-sm,0.875rem); color:var(--hse-text-muted,#6b7280); min-width:6ch; text-align:center; }
/* États */
.hse-error { color:var(--hse-error-dark,#dc2626); background:var(--hse-error-bg,rgba(239,68,68,0.12)); border:1px solid rgba(239,68,68,0.3); border-radius:var(--hse-radius-md,12px); padding:var(--hse-space-3,12px) var(--hse-space-4,16px); font-size:var(--hse-text-sm,0.875rem); }
.hse-empty { text-align:center; color:var(--hse-text-faint,#9e9e9e); padding:var(--hse-space-8,32px) var(--hse-space-4,16px); font-size:var(--hse-text-sm,0.875rem); }
.hse-table-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--hse-space-12,48px) var(--hse-space-4,16px); color:var(--hse-text-faint,#9e9e9e); gap:var(--hse-space-3,12px); }
.hse-table-empty p { margin:0; font-size:var(--hse-text-sm,0.875rem); }
/* Skeleton */
@keyframes hse-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.hse-skeleton {
  background:linear-gradient(90deg,var(--hse-skeleton-base,#e0e0e0) 25%,var(--hse-skeleton-shine,#f5f5f5) 50%,var(--hse-skeleton-base,#e0e0e0) 75%);
  background-size:200% 100%;
  animation:hse-shimmer var(--hse-skeleton-speed,1.5s) ease-in-out infinite;
  border-radius:var(--hse-radius-md,12px);
  min-height:120px;
}
.hse-skeleton-line { min-height:1em; height:1em; margin-bottom:var(--hse-space-2,8px); }
.hse-skeleton-line:last-child { width:60%; }
@media (prefers-reduced-motion:reduce) { .hse-skeleton { animation:none; } }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM ELEMENT
───────────────────────────────────────────────────────────────────────────── */

class HsePanel extends HTMLElement {
  constructor() {
    super();
    this._hass        = null;
    this._activeTab   = 'overview';
    this._activeView  = null;
    this._viewContainer = null;
    this._unsubTab    = null;
    this._ready       = false;
  }

  set hass(hass) {
    const firstSet = !this._hass;
    this._hass = hass;
    if (firstSet) { this._bootstrap(hass); return; }
    if (this._ready && this._activeView) {
      try { this._activeView.update_hass(hass); } catch(e) { console.error('[hse_shell] update_hass', e); }
    }
  }

  connectedCallback() { this._render(); }

  disconnectedCallback() {
    this._dismountActiveView();
    if (this._unsubTab) { this._unsubTab(); this._unsubTab = null; }
  }

  async _bootstrap(hass) {
    window.__hseToken = hass.auth.data.access_token;
    try {
      const [mR, pR] = await Promise.all([
        hseFetch('/api/hse/frontend_manifest'),
        hseFetch('/api/hse/user_prefs'),
      ]);
      hseStore.set('frontendManifest', await mR.json());
      const prefs = await pR.json();
      hseStore.set('userPrefs', prefs);
      if (prefs?.theme && this.shadowRoot) {
        this.shadowRoot.host.setAttribute('data-hse-theme', prefs.theme);
      }
    } catch(e) {
      console.warn('[hse_shell] bootstrap fetch error — mode dégradé', e);
    }
    this._ready = true;
    hseStore.set('ready', true);
    this._render();
    this._activateTab(this._activeTab);
    this._unsubTab = hseStore.subscribe('activeTab', (id) => this._switchTab(id));
  }

  _render() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' });

    /* Injection CSS inline — DELTA-050 */
    const style = document.createElement('style');
    style.textContent = CSS_TOKENS + CSS_THEMES + CSS_COMPONENTS;
    this.shadowRoot.appendChild(style);

    const nav = document.createElement('nav');
    nav.className = 'hse-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Onglets HSE');
    TABS.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'hse-tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-tab', t.id);
      btn.setAttribute('aria-selected', t.id === this._activeTab ? 'true' : 'false');
      btn.setAttribute('aria-controls', `hse-view-${t.id}`);
      btn.setAttribute('id', `hse-tab-${t.id}`);
      btn.textContent = t.label;
      nav.appendChild(btn);
    });
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) hseStore.set('activeTab', btn.dataset.tab);
    });

    const vc = document.createElement('div');
    vc.className = 'hse-view-container';
    vc.id = `hse-view-${this._activeTab}`;
    vc.setAttribute('role', 'tabpanel');
    vc.setAttribute('aria-labelledby', `hse-tab-${this._activeTab}`);

    this.shadowRoot.appendChild(nav);
    this.shadowRoot.appendChild(vc);
    this._viewContainer = vc;
  }

  _switchTab(tabId) {
    if (tabId === this._activeTab) return;
    this._dismountActiveView();
    this._activeTab = tabId;
    this._updateTabIndicator(tabId);
    this._activateTab(tabId);
  }

  async _activateTab(tabId) {
    if (!this._viewContainer) return;
    this._viewContainer.innerHTML = '<div class="hse-skeleton"></div>';
    try {
      const mod = await import(`${VIEWS_BASE}/${tabId}/${tabId}_view.js`);
      const ViewClass = mod.default ?? mod[Object.keys(mod)[0]];
      if (typeof ViewClass !== 'function') throw new Error(`${tabId}_view.js : pas de classe exportée`);
      if (this._activeTab !== tabId) return;
      this._viewContainer.innerHTML = '';
      this._activeView = new ViewClass();
      this._activeView.mount(this._viewContainer, this._buildCtx());
    } catch(e) {
      console.error(`[hse_shell] chargement ${tabId}_view.js`, e);
      this._viewContainer.innerHTML = `<p class="hse-error">Erreur : ${e.message}</p>`;
    }
  }

  _dismountActiveView() {
    if (!this._activeView) return;
    try { this._activeView.unmount(); } catch(e) { console.error('[hse_shell] unmount', e); }
    this._activeView = null;
  }

  _updateTabIndicator(tabId) {
    if (!this.shadowRoot || !this._viewContainer) return;
    this.shadowRoot.querySelectorAll('[data-tab]').forEach(btn => {
      btn.setAttribute('aria-selected', btn.dataset.tab === tabId ? 'true' : 'false');
    });
    this._viewContainer.id = `hse-view-${tabId}`;
    this._viewContainer.setAttribute('aria-labelledby', `hse-tab-${tabId}`);
  }

  _buildCtx() {
    return { hass: this._hass, hseFetch, store: hseStore };
  }
}

if (!customElements.get('hse-panel')) {
  customElements.define('hse-panel', HsePanel);
}
