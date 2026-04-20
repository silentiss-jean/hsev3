/**
 * scan_view.js — Onglet Détection HSE V3
 *
 * DELTA-052 étape 4 — rev F1+F2
 * Endpoints :
 *   GET  /api/hse/scan                   → inbox entités non triées
 *   POST /api/hse/scan                   → re-scan (F1 — corrigé)
 *   POST /api/hse/catalogue/triage       → select | ignore | reset (unitaire)
 *   POST /api/hse/catalogue/triage/bulk  → triage en masse
 *   GET  /api/hse/catalogue              → entités déjà triées (bas de page)
 *
 * Règles V3 :
 *   R1 — mount() construit le DOM une fois
 *   R2 — flag _fetching par fetch
 *   R3 — signature JSON.stringify avant _render()
 *   R4 — zéro localStorage
 *   R5 — skeleton avant le premier fetch
 */

const CSS = `
.hse-scan {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Toolbar ─────────────────────────────────────────────────────── */
.hse-scan__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hse-scan__search {
  flex: 1 1 220px;
  padding: 8px 12px;
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 8px;
  background: var(--hse-bg, #fff);
  color: inherit;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: border-color 180ms;
}
.hse-scan__search:focus { border-color: var(--hse-accent, #2563eb); }
.hse-scan__filter {
  padding: 8px 12px;
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 8px;
  background: var(--hse-bg, #fff);
  color: inherit;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
.hse-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 180ms, background 180ms;
  white-space: nowrap;
}
.hse-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.hse-btn--primary {
  background: var(--hse-accent, #2563eb);
  color: #fff;
}
.hse-btn--primary:hover:not(:disabled) { opacity: 0.88; }
.hse-btn--ghost {
  background: transparent;
  border-color: var(--hse-border, #e5e7eb);
  color: inherit;
}
.hse-btn--ghost:hover:not(:disabled) { background: var(--hse-surface, #f3f4f6); }
.hse-btn--danger {
  background: rgba(239,68,68,0.10);
  color: #dc2626;
  border-color: rgba(239,68,68,0.25);
}
.hse-btn--danger:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.hse-btn--sm {
  padding: 4px 10px;
  font-size: 0.78rem;
}

/* ── Section header ──────────────────────────────────────────────── */
.hse-scan__section-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.hse-scan__section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--hse-text, #111);
}
.hse-scan__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--hse-accent, #2563eb);
  color: #fff;
  min-width: 20px;
  justify-content: center;
}
.hse-scan__badge--neutral {
  background: var(--hse-surface, #f3f4f6);
  color: var(--hse-text-muted, #6b7280);
  border: 1px solid var(--hse-border, #e5e7eb);
}

/* ── Bulk bar ────────────────────────────────────────────────────── */
.hse-scan__bulk-bar {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--hse-surface, #f3f4f6);
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 10px;
  font-size: 0.85rem;
  flex-wrap: wrap;
}
.hse-scan__bulk-bar.visible { display: flex; }
.hse-scan__bulk-label { flex: 1; color: var(--hse-text-muted, #6b7280); }

/* ── Groupes intégration (F2) ────────────────────────────────────── */
.hse-scan__groups { display: flex; flex-direction: column; gap: 10px; }

.hse-scan__group {
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  background: var(--hse-bg, #fff);
}
.hse-scan__group-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  background: var(--hse-surface, #f9fafb);
  border-bottom: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
}
.hse-scan__group[open] .hse-scan__group-summary {
  border-bottom-color: var(--hse-border, #e5e7eb);
}
.hse-scan__group-summary::-webkit-details-marker { display: none; }
.hse-scan__group-arrow {
  font-size: 0.7rem;
  color: var(--hse-text-muted, #6b7280);
  transition: transform 180ms;
  margin-right: 2px;
}
.hse-scan__group[open] .hse-scan__group-arrow { transform: rotate(90deg); }
.hse-scan__group-name {
  flex: 1;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--hse-text, #111);
}
.hse-scan__group-chips { display: flex; gap: 4px; }
.hse-scan__chip {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--hse-surface, #f3f4f6);
  border: 1px solid var(--hse-border, #e5e7eb);
  color: var(--hse-text-muted, #6b7280);
}
.hse-scan__chip--energy { background: rgba(37,99,235,0.08); color: #1d4ed8; border-color: rgba(37,99,235,0.2); }
.hse-scan__chip--power  { background: rgba(234,179,8,0.10);  color: #b45309; border-color: rgba(234,179,8,0.25); }
.hse-scan__group-body { padding: 0; }

/* ── Table ───────────────────────────────────────────────────────── */
.hse-scan__table-wrap {
  overflow-x: auto;
}
table.hse-scan__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.hse-scan__table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--hse-text-muted, #6b7280);
  border-bottom: 1px solid var(--hse-border, #e5e7eb);
  white-space: nowrap;
  background: var(--hse-surface, #f9fafb);
}
.hse-scan__table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--hse-border, #e5e7eb);
  vertical-align: middle;
}
.hse-scan__table tr:last-child td { border-bottom: none; }
.hse-scan__table tr:hover td { background: var(--hse-surface, #f9fafb); }
.hse-scan__table tr.selected td { background: rgba(37,99,235,0.04); }

.hse-scan__entity-id {
  font-size: 0.78rem;
  color: var(--hse-text-muted, #6b7280);
  font-family: monospace;
}
.hse-scan__device {
  font-size: 0.78rem;
  color: var(--hse-text-muted, #6b7280);
}

/* quality score */
.hse-scan__score {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.hse-scan__score--high   { background: rgba(34,197,94,0.12); color: #16a34a; }
.hse-scan__score--medium { background: rgba(234,179,8,0.12);  color: #b45309; }
.hse-scan__score--low    { background: rgba(239,68,68,0.12);  color: #dc2626; }

/* status badges (catalogue) */
.hse-scan__status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.hse-scan__status--selected { background: rgba(34,197,94,0.12); color: #16a34a; }
.hse-scan__status--ignored  { background: rgba(156,163,175,0.18); color: #6b7280; }
.hse-scan__status--pending  { background: rgba(234,179,8,0.12);  color: #b45309; }

.hse-scan__actions { display: flex; gap: 6px; flex-wrap: nowrap; }

/* ── Catalogue table wrapper (avec bordure) ──────────────────────── */
.hse-scan__cat-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 12px;
  background: var(--hse-bg, #fff);
}
.hse-scan__cat-table-wrap table.hse-scan__table th:first-child { border-radius: 12px 0 0 0; }
.hse-scan__cat-table-wrap table.hse-scan__table th:last-child  { border-radius: 0 12px 0 0; }

/* ── Pagination ──────────────────────────────────────────────────── */
.hse-scan__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--hse-text-muted, #6b7280);
  flex-wrap: wrap;
}
.hse-scan__pager-btns { display: flex; gap: 6px; }

/* ── Empty ───────────────────────────────────────────────────────── */
.hse-scan__empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--hse-text-muted, #6b7280);
}
.hse-scan__empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
.hse-scan__empty p { font-size: 0.875rem; }

/* ── Error / Info ────────────────────────────────────────────────── */
.hse-error {
  color: #dc2626;
  background: rgba(239,68,68,0.10);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
}
.hse-info {
  background: var(--hse-surface, #f9fafb);
  border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.875rem;
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

/* ── Divider ─────────────────────────────────────────────────────── */
.hse-scan__divider {
  border: none;
  border-top: 1px solid var(--hse-border, #e5e7eb);
  margin: 4px 0;
}
`;

const PER_PAGE = 25;
const CATALOGUE_PER_PAGE = 50;

export class ScanView {
  constructor() {
    this._el          = null;
    this._ctx         = null;
    this._abort       = null;

    /* inbox state */
    this._fetching    = false;
    this._scanData    = null;
    this._scanSig     = null;
    this._scanPage    = 1;
    this._scanQ       = '';
    this._scanDomain  = '';
    this._scanTimer   = null;
    this._selected    = new Set();

    /* catalogue state */
    this._catFetching = false;
    this._catData     = null;
    this._catSig      = null;
    this._catPage     = 1;
    this._catStatus   = 'all';
  }

  /* ── Lifecycle ───────────────────────────────────────────────────── */

  mount(el, ctx) {
    this._el  = el;
    this._ctx = ctx;
    this._abort = new AbortController();
    this._injectCSS();
    this._buildDOM();
    this._loadScan();
    this._loadCatalogue();
  }

  unmount() {
    clearTimeout(this._scanTimer);
    if (this._abort) this._abort.abort();
    this._abort = null;
    this._el    = null;
    this._ctx   = null;
  }

  /* ── CSS ─────────────────────────────────────────────────────────── */

  _injectCSS() {
    if (document.getElementById('hse-scan-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-scan-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── DOM (R1 — construit une fois) ───────────────────────────────── */

  _buildDOM() {
    this._el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'hse-scan';
    root.innerHTML = `
      <!-- Toolbar -->
      <div class="hse-scan__toolbar">
        <input class="hse-scan__search" type="search" placeholder="Rechercher une entité…" aria-label="Rechercher" />
        <select class="hse-scan__filter" aria-label="Filtrer par domaine">
          <option value="">Tous les domaines</option>
        </select>
        <button class="hse-btn hse-btn--ghost" id="hse-rescan-btn" aria-label="Relancer le scan">↻ Re-scanner</button>
      </div>

      <!-- Bulk action bar -->
      <div class="hse-scan__bulk-bar" id="hse-bulk-bar" role="toolbar" aria-label="Actions groupées">
        <span class="hse-scan__bulk-label" id="hse-bulk-label">0 sélectionné(s)</span>
        <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-bulk-select">✓ Sélectionner tout</button>
        <button class="hse-btn hse-btn--danger  hse-btn--sm" id="hse-bulk-ignore">✕ Ignorer tout</button>
        <button class="hse-btn hse-btn--ghost   hse-btn--sm" id="hse-bulk-cancel">Annuler</button>
      </div>

      <!-- Section : Inbox -->
      <div>
        <div class="hse-scan__section-header">
          <span class="hse-scan__section-title">Entités détectées</span>
          <span class="hse-scan__badge" id="hse-scan-badge">…</span>
        </div>
        <div id="hse-scan-body"><div class="hse-skeleton"></div></div>
        <div class="hse-scan__pager" id="hse-scan-pager" style="display:none"></div>
      </div>

      <hr class="hse-scan__divider" />

      <!-- Section : Catalogue -->
      <div>
        <div class="hse-scan__section-header">
          <span class="hse-scan__section-title">Entités cataloguées</span>
          <span class="hse-scan__badge hse-scan__badge--neutral" id="hse-cat-badge">…</span>
          <select class="hse-scan__filter" id="hse-cat-status-filter" aria-label="Filtrer par statut" style="margin-left:auto">
            <option value="all">Tous</option>
            <option value="selected">Sélectionnées</option>
            <option value="ignored">Ignorées</option>
            <option value="pending">En attente</option>
          </select>
        </div>
        <div id="hse-cat-body"><div class="hse-skeleton"></div></div>
        <div class="hse-scan__pager" id="hse-cat-pager" style="display:none"></div>
      </div>
    `;
    this._el.appendChild(root);
    this._bindEvents(root);
  }

  _bindEvents(root) {
    /* search (debounce 350ms) */
    const search = root.querySelector('.hse-scan__search');
    let debounce;
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this._scanQ    = search.value.trim();
        this._scanPage = 1;
        this._selected.clear();
        this._loadScan();
      }, 350);
    });

    /* domain filter */
    const domainFilter = root.querySelector('.hse-scan__filter');
    domainFilter.addEventListener('change', () => {
      this._scanDomain = domainFilter.value;
      this._scanPage   = 1;
      this._selected.clear();
      this._loadScan();
    });

    /* re-scan */
    root.querySelector('#hse-rescan-btn').addEventListener('click', () => this._triggerRescan());

    /* bulk bar */
    root.querySelector('#hse-bulk-select').addEventListener('click', () => this._bulkAction('select'));
    root.querySelector('#hse-bulk-ignore').addEventListener('click', () => this._bulkAction('ignore'));
    root.querySelector('#hse-bulk-cancel').addEventListener('click', () => {
      this._selected.clear();
      this._updateBulkBar();
      this._renderScanRows();
    });

    /* catalogue status filter */
    root.querySelector('#hse-cat-status-filter').addEventListener('change', e => {
      this._catStatus = e.target.value;
      this._catPage   = 1;
      this._loadCatalogue();
    });
  }

  /* ── Fetch : inbox scan ──────────────────────────────────────────── */

  async _loadScan() {
    if (this._fetching) return;           /* R2 */
    this._fetching = true;

    const params = new URLSearchParams({ page: this._scanPage, per_page: PER_PAGE });
    if (this._scanQ)      params.set('q',      this._scanQ);
    if (this._scanDomain) params.set('domain', this._scanDomain);

    try {
      const r = await this._ctx.hseFetch(`/api/hse/scan?${params}`,
        { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      const sig = JSON.stringify(data);   /* R3 */
      if (sig === this._scanSig) return;
      this._scanSig  = sig;
      this._scanData = data;

      this._renderScan();
      this._populateDomainFilter(data.items);
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setScanBody(`<div class="hse-error">Erreur chargement scan — ${e.message}</div>`);
    } finally {
      this._fetching = false;
    }
  }

  /* ── Fetch : catalogue ───────────────────────────────────────────── */

  async _loadCatalogue() {
    if (this._catFetching) return;        /* R2 */
    this._catFetching = true;

    const params = new URLSearchParams({
      status:   this._catStatus,
      page:     this._catPage,
      per_page: CATALOGUE_PER_PAGE,
    });

    try {
      const r = await this._ctx.hseFetch(`/api/hse/catalogue?${params}`,
        { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      const sig = JSON.stringify(data);   /* R3 */
      if (sig === this._catSig) return;
      this._catSig  = sig;
      this._catData = data;

      this._renderCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Erreur chargement catalogue — ${e.message}</div>`);
    } finally {
      this._catFetching = false;
    }
  }

  /* ── Re-scan (F1 — POST /api/hse/scan) ──────────────────────────── */

  async _triggerRescan() {
    const btn = this._el?.querySelector('#hse-rescan-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '⟳ Scan en cours…';
    try {
      /* F1 : URL corrigée — POST /api/hse/scan (plus /catalogue/refresh) */
      const r = await this._ctx.hseFetch('/api/hse/scan', {
        method: 'POST',
        signal: this._abort?.signal,
      });
      if (r.status === 409) {
        btn.textContent = '⚠ Scan déjà en cours';
        setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Re-scanner'; }, 3000);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      /* Le POST retourne directement les résultats — on les injecte */
      const data = await r.json();
      this._scanSig  = JSON.stringify(data);
      this._scanData = data;
      this._scanPage = 1;
      this._selected.clear();
      this._renderScan();
      this._populateDomainFilter(data.items);

      /* Recharge aussi le catalogue (les items triés peuvent avoir changé) */
      this._catSig = null;
      this._loadCatalogue();

      btn.textContent = '✓ Scan terminé';
      setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Re-scanner'; }, 2500);
    } catch (e) {
      if (e.name === 'AbortError') return;
      btn.textContent = '⚠ Erreur';
      setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Re-scanner'; }, 3000);
    }
  }

  /* ── Triage unitaire ─────────────────────────────────────────────── */

  async _triage(entityId, action) {
    const btn = this._el?.querySelector(`[data-triage-id="${CSS.escape(entityId)}"][data-triage-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entity_id: entityId, action }),
        signal:  this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._scanSig = null;
      this._catSig  = null;
      this._selected.delete(entityId);
      await Promise.all([this._loadScan(), this._loadCatalogue()]);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = action === 'select' ? '✓' : action === 'ignore' ? '✕' : '↺'; }
      this._setScanBody(`<div class="hse-error">Triage échoué — ${e.message}</div>`);
    }
  }

  /* ── Bulk triage ─────────────────────────────────────────────────── */

  async _bulkAction(action) {
    if (!this._selected.size) return;
    const items = Array.from(this._selected).map(id => ({ entity_id: id, action }));
    const bar   = this._el?.querySelector('#hse-bulk-bar');
    if (bar) bar.style.opacity = '0.5';

    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items }),
        signal:  this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._selected.clear();
      this._scanSig = null;
      this._catSig  = null;
      await Promise.all([this._loadScan(), this._loadCatalogue()]);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (bar) bar.style.opacity = '1';
      this._setScanBody(`<div class="hse-error">Triage groupé échoué — ${e.message}</div>`);
    } finally {
      this._updateBulkBar();
    }
  }

  /* ── Render : inbox (F2 — groupement par intégration) ────────────── */

  _renderScan() {
    const d = this._scanData;
    if (!d) return;

    const badge = this._el?.querySelector('#hse-scan-badge');
    if (badge) badge.textContent = d.total ?? 0;

    const pager = this._el?.querySelector('#hse-scan-pager');

    if (!d.items?.length) {
      this._setScanBody(`
        <div class="hse-scan__empty">
          <div class="hse-scan__empty-icon">🔍</div>
          <p>Aucune entité non triée${this._scanQ ? ` pour « ${this._scanQ} »` : ''}.</p>
        </div>`);
      if (pager) pager.style.display = 'none';
      return;
    }

    /* F2 — grouper par integration */
    const groups = this._groupByIntegration(d.items);
    const html   = this._buildGroupsHTML(groups);
    this._setScanBody(html);
    this._bindScanRows();

    /* Pagination globale (toujours utile si > 1 page) */
    this._renderScanPager(d);
    this._updateBulkBar();
  }

  /* F2 — groupement par intégration (inspiré V2 scan.view.js) */
  _groupByIntegration(items) {
    const map = new Map();
    for (const item of items) {
      const key = item.integration || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const groups = [];
    for (const [integration, list] of map) {
      const energy = list.filter(i => i.kind === 'energy' || !i.kind).length;
      const power  = list.filter(i => i.kind === 'power').length;
      groups.push({ integration, items: list, energy, power });
    }
    /* trier : plus grand nombre d'abord, puis alpha */
    groups.sort((a, b) =>
      (b.items.length - a.items.length) || a.integration.localeCompare(b.integration)
    );
    return groups;
  }

  _buildGroupsHTML(groups) {
    if (!groups.length) return '';
    /* Auto-ouvrir si un seul groupe */
    const autoOpen = groups.length === 1;
    const parts = groups.map(g => {
      const chipEnergy = g.energy  ? `<span class="hse-scan__chip hse-scan__chip--energy">⚡ ${g.energy} energy</span>` : '';
      const chipPower  = g.power   ? `<span class="hse-scan__chip hse-scan__chip--power">⚙ ${g.power} power</span>` : '';
      const chipTotal  = `<span class="hse-scan__chip">${g.items.length} entité${g.items.length > 1 ? 's' : ''}</span>`;
      const rows = g.items.map(item => {
        const score      = this._scoreClass(item.quality_score);
        const scoreLabel = item.quality_score >= 75 ? 'Bon' : item.quality_score >= 40 ? 'Moyen' : 'Faible';
        const sel        = this._selected.has(item.entity_id);
        return `
        <tr data-entity-id="${this._esc(item.entity_id)}" class="${sel ? 'selected' : ''}">
          <td><input type="checkbox" class="hse-scan__cb" aria-label="Sélectionner" ${sel ? 'checked' : ''} /></td>
          <td>
            <div>${this._esc(item.name ?? item.entity_id)}</div>
            <div class="hse-scan__entity-id">${this._esc(item.entity_id)}</div>
          </td>
          <td>${this._esc(item.domain ?? '—')}</td>
          <td class="hse-scan__device">${this._esc(item.device ?? '—')}</td>
          <td><span class="hse-scan__score hse-scan__score--${score}">${item.quality_score ?? '?'}% ${scoreLabel}</span></td>
          <td class="hse-scan__actions">
            <button class="hse-btn hse-btn--primary hse-btn--sm"
              data-triage-id="${this._esc(item.entity_id)}" data-triage-action="select">✓ Utiliser</button>
            <button class="hse-btn hse-btn--ghost hse-btn--sm"
              data-triage-id="${this._esc(item.entity_id)}" data-triage-action="ignore">✕ Ignorer</button>
          </td>
        </tr>`;
      }).join('');

      return `
      <details class="hse-scan__group" ${autoOpen ? 'open' : ''}>
        <summary class="hse-scan__group-summary">
          <span class="hse-scan__group-arrow">▶</span>
          <span class="hse-scan__group-name">${this._esc(g.integration)}</span>
          <div class="hse-scan__group-chips">${chipTotal}${chipEnergy}${chipPower}</div>
        </summary>
        <div class="hse-scan__group-body">
          <div class="hse-scan__table-wrap">
            <table class="hse-scan__table" role="grid">
              <thead><tr>
                <th style="width:36px"><input type="checkbox" class="hse-scan__cb-group" aria-label="Tout sélectionner ce groupe" data-group="${this._esc(g.integration)}" /></th>
                <th>Entité</th><th>Domaine</th><th>Appareil</th><th>Qualité</th><th>Actions</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </details>`;
    }).join('');

    return `<div class="hse-scan__groups">${parts}</div>`;
  }

  _renderScanRows() {
    const rows = this._el?.querySelectorAll('.hse-scan__table tr[data-entity-id]');
    rows?.forEach(row => {
      const id  = row.dataset.entityId;
      const cb  = row.querySelector('.hse-scan__cb');
      const sel = this._selected.has(id);
      row.classList.toggle('selected', sel);
      if (cb) cb.checked = sel;
    });
  }

  _bindScanRows() {
    const body = this._el?.querySelector('#hse-scan-body');
    if (!body) return;

    /* Checkboxes de groupe */
    body.querySelectorAll('.hse-scan__cb-group').forEach(cbg => {
      cbg.addEventListener('change', () => {
        const grp  = cbg.dataset.group;
        const rows = cbg.closest('table')?.querySelectorAll('tr[data-entity-id]');
        rows?.forEach(row => {
          const id = row.dataset.entityId;
          cbg.checked ? this._selected.add(id) : this._selected.delete(id);
        });
        this._updateBulkBar();
        this._renderScanRows();
      });
    });

    /* Checkboxes individuelles */
    body.querySelectorAll('.hse-scan__cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const row = cb.closest('tr[data-entity-id]');
        if (!row) return;
        const id = row.dataset.entityId;
        cb.checked ? this._selected.add(id) : this._selected.delete(id);
        row.classList.toggle('selected', cb.checked);
        this._updateBulkBar();
      });
    });

    /* Boutons triage unitaire */
    body.querySelectorAll('[data-triage-id]').forEach(btn => {
      btn.addEventListener('click', () =>
        this._triage(btn.dataset.triageId, btn.dataset.triageAction));
    });
  }

  _renderScanPager(d) {
    const pager = this._el?.querySelector('#hse-scan-pager');
    if (!pager) return;
    const totalPages = Math.ceil(d.total / d.per_page) || 1;
    if (totalPages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `
      <span>${d.total} entité(s) — page ${d.page} / ${totalPages}</span>
      <div class="hse-scan__pager-btns">
        <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-scan-prev"
          ${d.page <= 1 ? 'disabled' : ''}>← Préc.</button>
        <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-scan-next"
          ${d.page >= totalPages ? 'disabled' : ''}>Suiv. →</button>
      </div>`;
    pager.querySelector('#hse-scan-prev')?.addEventListener('click', () => {
      this._scanPage--; this._selected.clear(); this._loadScan();
    });
    pager.querySelector('#hse-scan-next')?.addEventListener('click', () => {
      this._scanPage++; this._selected.clear(); this._loadScan();
    });
  }

  /* ── Render : catalogue ──────────────────────────────────────────── */

  _renderCatalogue() {
    const d = this._catData;
    if (!d) return;

    const badge = this._el?.querySelector('#hse-cat-badge');
    if (badge) badge.textContent = d.total ?? 0;

    if (!d.items?.length) {
      this._setCatBody(`
        <div class="hse-scan__empty">
          <div class="hse-scan__empty-icon">📭</div>
          <p>Aucune entité cataloguée${this._catStatus !== 'all' ? ` avec le statut « ${this._catStatus} »` : ''}.</p>
        </div>`);
      const pager = this._el?.querySelector('#hse-cat-pager');
      if (pager) pager.style.display = 'none';
      return;
    }

    this._setCatBody(this._buildCatTable(d.items));
    this._bindCatRows();
    this._renderCatPager(d);
  }

  _buildCatTable(items) {
    const rows = items.map(item => {
      const score      = this._scoreClass(item.quality_score);
      const statusCls  = `hse-scan__status--${item.status ?? 'pending'}`;
      const statusLbl  = item.status === 'selected' ? 'Actif'
                       : item.status === 'ignored'  ? 'Ignoré' : 'En attente';
      return `
      <tr data-entity-id="${this._esc(item.entity_id)}">
        <td>
          <div>${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-scan__entity-id">${this._esc(item.entity_id)}</div>
        </td>
        <td>${this._esc(item.room ?? '—')}</td>
        <td>${this._esc(item.type ?? '—')}</td>
        <td><span class="hse-scan__status ${statusCls}">${statusLbl}</span></td>
        <td><span class="hse-scan__score hse-scan__score--${score}">${item.quality_score ?? '?'}%</span></td>
        <td class="hse-scan__actions">
          ${item.status !== 'selected' ? `<button class="hse-btn hse-btn--primary hse-btn--sm" data-cat-id="${this._esc(item.entity_id)}" data-cat-action="select">✓ Activer</button>` : ''}
          ${item.status !== 'ignored'  ? `<button class="hse-btn hse-btn--ghost hse-btn--sm"   data-cat-id="${this._esc(item.entity_id)}" data-cat-action="ignore">✕ Ignorer</button>` : ''}
          <button class="hse-btn hse-btn--ghost hse-btn--sm" data-cat-id="${this._esc(item.entity_id)}" data-cat-action="reset">↺ Reset</button>
        </td>
      </tr>`;
    }).join('');

    return `
    <div class="hse-scan__cat-table-wrap">
      <table class="hse-scan__table" role="grid">
        <thead><tr>
          <th>Entité</th>
          <th>Pièce</th>
          <th>Type</th>
          <th>Statut</th>
          <th>Qualité</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  _bindCatRows() {
    const wrap = this._el?.querySelector('#hse-cat-body .hse-scan__cat-table-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('[data-cat-id]').forEach(btn => {
      btn.addEventListener('click', () =>
        this._triageCat(btn.dataset.catId, btn.dataset.catAction));
    });
  }

  async _triageCat(entityId, action) {
    const btn = this._el?.querySelector(`[data-cat-id="${CSS.escape(entityId)}"][data-cat-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entity_id: entityId, action }),
        signal:  this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._scanSig = null;
      this._catSig  = null;
      await Promise.all([this._loadScan(), this._loadCatalogue()]);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) btn.disabled = false;
    }
  }

  _renderCatPager(d) {
    const pager = this._el?.querySelector('#hse-cat-pager');
    if (!pager) return;
    const totalPages = Math.ceil(d.total / d.per_page) || 1;
    if (totalPages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `
      <span>${d.total} entité(s) — page ${d.page} / ${totalPages}</span>
      <div class="hse-scan__pager-btns">
        <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cat-prev"
          ${d.page <= 1 ? 'disabled' : ''}>← Préc.</button>
        <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cat-next"
          ${d.page >= totalPages ? 'disabled' : ''}>Suiv. →</button>
      </div>`;
    pager.querySelector('#hse-cat-prev')?.addEventListener('click', () => {
      this._catPage--; this._loadCatalogue();
    });
    pager.querySelector('#hse-cat-next')?.addEventListener('click', () => {
      this._catPage++; this._loadCatalogue();
    });
  }

  /* ── Bulk bar update ─────────────────────────────────────────────── */

  _updateBulkBar() {
    const bar   = this._el?.querySelector('#hse-bulk-bar');
    const label = this._el?.querySelector('#hse-bulk-label');
    if (!bar) return;
    const count = this._selected.size;
    bar.classList.toggle('visible', count > 0);
    if (label) label.textContent = `${count} sélectionné(s)`;
  }

  /* ── Domain filter population ────────────────────────────────────── */

  _populateDomainFilter(items) {
    const sel = this._el?.querySelector('.hse-scan__filter');
    if (!sel) return;
    const current = sel.value;
    const domains = [...new Set((items ?? []).map(i => i.domain).filter(Boolean))].sort();
    const opts = ['<option value="">Tous les domaines</option>',
      ...domains.map(d => `<option value="${this._esc(d)}" ${d === current ? 'selected' : ''}>${this._esc(d)}</option>`)
    ];
    sel.innerHTML = opts.join('');
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */

  _setScanBody(html) {
    const el = this._el?.querySelector('#hse-scan-body');
    if (el) el.innerHTML = html;
  }

  _setCatBody(html) {
    const el = this._el?.querySelector('#hse-cat-body');
    if (el) el.innerHTML = html;
  }

  _scoreClass(score) {
    if (score == null) return 'medium';
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  _esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

export default ScanView;
