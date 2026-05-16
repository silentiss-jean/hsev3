/**
 * config_view.js — Onglet Configuration HSE V3
 *
 * 3 sous-onglets :
 *   A — Appareils       : liste catalogue, triage individuel, bulk, refresh
 *   B — Pièces & Types  : GET /api/hse/meta + sync/preview + sync/apply
 *                         Création manuelle : bouton grisé (DELTA-059 non implémenté)
 *   C — Tarification    : GET/PUT /api/hse/settings/pricing + prévisualisation live
 *
 * Contraintes DELTA actives :
 *   DELTA-058 : PATCH/DELETE catalogue absents → contournement POST /catalogue/triage
 *   DELTA-059 : POST /api/hse/meta absent     → bouton "Créer" grisé + tooltip
 *
 * Règles V3 :
 *   R1 — mount() construit le DOM une fois
 *   R2 — flag _fetching par fetch
 *   R3 — signature JSON avant _render()
 *   R4 — zéro localStorage
 *   R5 — skeleton avant le premier fetch
 */

const CSS = `
/* ── Layout ───────────────────────────────────────────────────────── */
.hse-cfg { display:flex; flex-direction:column; gap:20px; }

/* ── Sub-tabs ─────────────────────────────────────────────────────── */
.hse-cfg__tabs {
  display:flex; gap:4px;
  border-bottom:2px solid var(--hse-border,#e5e7eb);
  margin-bottom:4px;
}
.hse-cfg__tab {
  padding:8px 16px;
  font-size:0.875rem; font-family:inherit; font-weight:500;
  background:none; border:none; cursor:pointer;
  color:var(--hse-text-muted,#6b7280);
  border-bottom:2px solid transparent; margin-bottom:-2px;
  transition:color 180ms, border-color 180ms;
}
.hse-cfg__tab:hover  { color:var(--hse-text,#111); }
.hse-cfg__tab.active { color:var(--hse-accent,#2563eb); border-bottom-color:var(--hse-accent,#2563eb); }
.hse-cfg__panel { display:none; }
.hse-cfg__panel.active { display:block; }

/* ── Buttons ──────────────────────────────────────────────────────── */
.hse-btn {
  padding:8px 14px; border-radius:8px; border:1px solid transparent;
  font-size:0.875rem; font-family:inherit; cursor:pointer;
  transition:opacity 180ms,background 180ms; white-space:nowrap;
}
.hse-btn:disabled { opacity:0.45; cursor:not-allowed; }
.hse-btn--primary { background:var(--hse-accent,#2563eb); color:#fff; }
.hse-btn--primary:hover:not(:disabled) { opacity:0.88; }
.hse-btn--ghost   { background:transparent; border-color:var(--hse-border,#e5e7eb); color:inherit; }
.hse-btn--ghost:hover:not(:disabled)   { background:var(--hse-surface,#f3f4f6); }
.hse-btn--danger  { background:rgba(239,68,68,0.10); color:#dc2626; border-color:rgba(239,68,68,0.25); }
.hse-btn--danger:hover:not(:disabled)  { background:rgba(239,68,68,0.18); }
.hse-btn--sm { padding:4px 10px; font-size:0.78rem; }
.hse-btn--disabled-note { opacity:0.45; cursor:not-allowed; position:relative; }

/* ── Toolbar ──────────────────────────────────────────────────────── */
.hse-cfg__toolbar {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;
}
.hse-cfg__search {
  flex:1 1 220px; padding:8px 12px;
  border:1px solid var(--hse-border,#e5e7eb); border-radius:8px;
  background:var(--hse-bg,#fff); color:inherit;
  font-size:0.875rem; font-family:inherit; outline:none;
  transition:border-color 180ms;
}
.hse-cfg__search:focus { border-color:var(--hse-accent,#2563eb); }
.hse-cfg__filter {
  padding:8px 12px; border:1px solid var(--hse-border,#e5e7eb); border-radius:8px;
  background:var(--hse-bg,#fff); color:inherit;
  font-size:0.875rem; font-family:inherit; cursor:pointer; outline:none;
}

/* ── Bulk bar ─────────────────────────────────────────────────────── */
.hse-cfg__bulk {
  display:none; align-items:center; gap:8px; flex-wrap:wrap;
  padding:8px 12px; background:var(--hse-surface,#f3f4f6);
  border:1px solid var(--hse-border,#e5e7eb); border-radius:10px;
  font-size:0.85rem; margin-bottom:8px;
}
.hse-cfg__bulk.visible { display:flex; }
.hse-cfg__bulk-label { flex:1; color:var(--hse-text-muted,#6b7280); }

/* ── Table ────────────────────────────────────────────────────────── */
.hse-cfg__table-wrap { overflow-x:auto; border:1px solid var(--hse-border,#e5e7eb); border-radius:12px; }
table.hse-cfg__table { width:100%; border-collapse:collapse; font-size:0.875rem; }
.hse-cfg__table th {
  padding:10px 12px; text-align:left; font-weight:600; font-size:0.78rem;
  text-transform:uppercase; letter-spacing:0.04em;
  color:var(--hse-text-muted,#6b7280); border-bottom:1px solid var(--hse-border,#e5e7eb);
  white-space:nowrap; background:var(--hse-surface,#f9fafb);
}
.hse-cfg__table td {
  padding:10px 12px; border-bottom:1px solid var(--hse-border,#e5e7eb); vertical-align:middle;
}
.hse-cfg__table tr:last-child td { border-bottom:none; }
.hse-cfg__table tr:hover td { background:var(--hse-surface,#f9fafb); }
.hse-cfg__table tr.selected td { background:rgba(37,99,235,0.04); }
.hse-cfg__entity-id { font-size:0.78rem; color:var(--hse-text-muted,#6b7280); font-family:monospace; }
.hse-cfg__actions { display:flex; gap:6px; flex-wrap:nowrap; }

/* ── Status badges ────────────────────────────────────────────────── */
.hse-cfg__badge {
  display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px;
  font-size:0.72rem; font-weight:600;
}
.hse-cfg__badge--selected { background:rgba(34,197,94,0.12); color:#16a34a; }
.hse-cfg__badge--ignored  { background:rgba(156,163,175,0.18); color:#6b7280; }
.hse-cfg__badge--pending  { background:rgba(234,179,8,0.12); color:#b45309; }

/* ── Diff bandeau ─────────────────────────────────────────────────── */
.hse-cfg__diff-banner {
  display:none; align-items:center; gap:10px; flex-wrap:wrap;
  padding:10px 14px; background:rgba(37,99,235,0.06);
  border:1px solid rgba(37,99,235,0.2); border-radius:10px;
  font-size:0.875rem; margin-bottom:12px;
}
.hse-cfg__diff-banner.visible { display:flex; }
.hse-cfg__diff-msg { flex:1; }

/* ── Pricing form ─────────────────────────────────────────────────── */
.hse-cfg__form { display:flex; flex-direction:column; gap:16px; max-width:560px; }
.hse-cfg__field { display:flex; flex-direction:column; gap:6px; }
.hse-cfg__label { font-size:0.875rem; font-weight:500; color:var(--hse-text,#111); }
.hse-cfg__input, .hse-cfg__select {
  padding:8px 12px; border:1px solid var(--hse-border,#e5e7eb); border-radius:8px;
  background:var(--hse-bg,#fff); color:inherit; font-size:0.875rem; font-family:inherit;
  outline:none; transition:border-color 180ms; width:100%;
}
.hse-cfg__input:focus, .hse-cfg__select:focus { border-color:var(--hse-accent,#2563eb); }
.hse-cfg__hp-hc { display:none; flex-direction:column; gap:12px; }
.hse-cfg__hp-hc.visible { display:flex; }
.hse-cfg__preview {
  background:var(--hse-surface,#f3f4f6); border:1px solid var(--hse-border,#e5e7eb);
  border-radius:10px; padding:12px 16px; font-size:0.875rem;
}
.hse-cfg__preview-value { font-size:1.15rem; font-weight:700; color:var(--hse-accent,#2563eb); }
.hse-cfg__save-row { display:flex; align-items:center; gap:10px; }
.hse-cfg__save-status { font-size:0.82rem; color:var(--hse-text-muted,#6b7280); }

/* ── Rooms/types grid ─────────────────────────────────────────────── */
.hse-cfg__grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:600px){ .hse-cfg__grid { grid-template-columns:1fr; } }
.hse-cfg__card {
  border:1px solid var(--hse-border,#e5e7eb); border-radius:12px;
  background:var(--hse-bg,#fff); overflow:hidden;
}
.hse-cfg__card-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; background:var(--hse-surface,#f9fafb);
  border-bottom:1px solid var(--hse-border,#e5e7eb);
  font-size:0.875rem; font-weight:600;
}
.hse-cfg__list { padding:0; margin:0; list-style:none; }
.hse-cfg__list li {
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 14px; border-bottom:1px solid var(--hse-border,#e5e7eb);
  font-size:0.875rem;
}
.hse-cfg__list li:last-child { border-bottom:none; }

/* ── Skeleton / error / empty ─────────────────────────────────────── */
@keyframes hse-shimmer {
  0%   { background-position:-200% 0; }
  100% { background-position: 200% 0; }
}
.hse-skeleton {
  background:linear-gradient(90deg,rgba(128,128,128,0.14) 25%,rgba(128,128,128,0.22) 50%,rgba(128,128,128,0.14) 75%);
  background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite;
  border-radius:12px; min-height:120px; width:100%;
}
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error {
  color:#dc2626; background:rgba(239,68,68,0.10);
  border:1px solid rgba(239,68,68,0.25); border-radius:12px;
  padding:12px 16px; font-size:0.875rem;
}
.hse-empty {
  text-align:center; padding:48px 16px; color:var(--hse-text-muted,#6b7280);
}
.hse-empty-icon { font-size:2.5rem; margin-bottom:12px; }
.hse-empty p { font-size:0.875rem; }
.hse-cfg__note {
  font-size:0.8rem; color:var(--hse-text-muted,#6b7280);
  padding:6px 10px; background:var(--hse-surface,#f3f4f6);
  border-radius:8px; border:1px solid var(--hse-border,#e5e7eb);
}
`;

// ── Constantes ────────────────────────────────────────────────────────────────
const CATALOGUE_PER_PAGE = 50;

export class ConfigView {
  constructor() {
    this._el         = null;
    this._ctx        = null;
    this._abort      = null;
    this._mounted    = false;

    // Onglet actif : 'appareils' | 'meta' | 'pricing'
    this._activeTab  = 'appareils';

    // --- Appareils ---
    this._catFetching = false;
    this._catData     = null;
    this._catSig      = null;
    this._catPage     = 1;
    this._catStatus   = 'all';
    this._catQ        = '';
    this._selected    = new Set();

    // --- Meta (pièces & types) ---
    this._metaFetching = false;
    this._metaData     = null;
    this._metaSig      = null;
    this._diffData     = null;
    this._diffApplying = false;

    // --- Pricing ---
    this._pricingFetching = false;
    this._pricingData     = null;
    this._pricingSig      = null;
    this._pricingSaving   = false;
  }

  // ── Cycle de vie ────────────────────────────────────────────────────────────

  mount(el, ctx) {
    this._el      = el;
    this._ctx     = ctx;
    this._abort   = new AbortController();
    this._mounted = true;
    this._injectCSS();
    this._buildDOM();
    this._loadCatalogue();
  }

  update_hass(hass) {
    this._ctx = { ...this._ctx, hass };
  }

  unmount() {
    this._mounted = false;
    if (this._abort) this._abort.abort();
    this._abort = null;
    this._el    = null;
    this._ctx   = null;
  }

  // ── Injection CSS ────────────────────────────────────────────────────────────

  _injectCSS() {
    if (document.getElementById('hse-cfg-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-cfg-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Construction DOM (R1 — une seule fois) ───────────────────────────────────

  _buildDOM() {
    this._el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'hse-cfg';
    root.innerHTML = `
      <!-- Sub-tabs -->
      <div class="hse-cfg__tabs" role="tablist">
        <button class="hse-cfg__tab active" data-tab="appareils" role="tab" aria-selected="true">Appareils</button>
        <button class="hse-cfg__tab"        data-tab="meta"      role="tab" aria-selected="false">Pi\u00e8ces &amp; Types</button>
        <button class="hse-cfg__tab"        data-tab="pricing"   role="tab" aria-selected="false">Tarification</button>
      </div>

      <!-- Panel A — Appareils -->
      <div class="hse-cfg__panel active" id="hse-cfg-panel-appareils" role="tabpanel">
        <div class="hse-cfg__toolbar">
          <input class="hse-cfg__search" type="search" placeholder="Rechercher\u2026" aria-label="Rechercher" />
          <select class="hse-cfg__filter" id="hse-cfg-status-filter" aria-label="Filtrer par statut">
            <option value="all">Tous</option>
            <option value="selected">S\u00e9lectionn\u00e9s</option>
            <option value="ignored">Ignor\u00e9s</option>
            <option value="pending">En attente</option>
          </select>
          <button class="hse-btn hse-btn--ghost" id="hse-cfg-refresh-btn">\u21bb Actualiser</button>
        </div>
        <div class="hse-cfg__bulk" id="hse-cfg-bulk">
          <span class="hse-cfg__bulk-label" id="hse-cfg-bulk-label">0 s\u00e9lectionn\u00e9(s)</span>
          <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-cfg-bulk-activate">\u2713 Activer</button>
          <button class="hse-btn hse-btn--danger  hse-btn--sm" id="hse-cfg-bulk-ignore">\u2715 Ignorer</button>
          <button class="hse-btn hse-btn--ghost   hse-btn--sm" id="hse-cfg-bulk-cancel">Annuler</button>
        </div>
        <div id="hse-cfg-cat-body"><div class="hse-skeleton"></div></div>
        <div class="hse-cfg__toolbar" id="hse-cfg-cat-pager" style="display:none;margin-top:8px"></div>
      </div>

      <!-- Panel B — Pièces & Types -->
      <div class="hse-cfg__panel" id="hse-cfg-panel-meta" role="tabpanel">
        <div class="hse-cfg__diff-banner" id="hse-cfg-diff-banner">
          <span class="hse-cfg__diff-msg" id="hse-cfg-diff-msg"></span>
          <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-cfg-diff-apply">Appliquer</button>
          <button class="hse-btn hse-btn--ghost   hse-btn--sm" id="hse-cfg-diff-dismiss">Ignorer</button>
        </div>
        <div id="hse-cfg-meta-body"><div class="hse-skeleton"></div></div>
        <p class="hse-cfg__note" style="margin-top:12px">\u2139\ufe0f La cr\u00e9ation manuelle de pi\u00e8ces et de types sera disponible prochainement (DELTA-059).</p>
      </div>

      <!-- Panel C — Tarification -->
      <div class="hse-cfg__panel" id="hse-cfg-panel-pricing" role="tabpanel">
        <div id="hse-cfg-pricing-body"><div class="hse-skeleton"></div></div>
      </div>
    `;
    this._el.appendChild(root);
    this._bindTabs(root);
    this._bindAppareilsEvents(root);
    this._bindMetaEvents(root);
  }

  // ── Navigation sous-onglets ──────────────────────────────────────────────────

  _bindTabs(root) {
    root.querySelectorAll('.hse-cfg__tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === this._activeTab) return;
        this._activeTab = tab;
        root.querySelectorAll('.hse-cfg__tab').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
          b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
        });
        root.querySelectorAll('.hse-cfg__panel').forEach(p => {
          p.classList.toggle('active', p.id === `hse-cfg-panel-${tab}`);
        });
        // Lazy-load au premier clic
        if (tab === 'meta'    && !this._metaData)    { this._loadMeta(); this._loadDiffPreview(); }
        if (tab === 'pricing' && !this._pricingData) this._loadPricing();
      });
    });
  }

  // ── PANEL A — Appareils ──────────────────────────────────────────────────────

  _bindAppareilsEvents(root) {
    const search = root.querySelector('.hse-cfg__search');
    let deb;
    search.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        this._catQ    = search.value.trim();
        this._catPage = 1;
        this._selected.clear();
        this._catSig = null;
        this._loadCatalogue();
      }, 350);
    });
    root.querySelector('#hse-cfg-status-filter').addEventListener('change', e => {
      this._catStatus = e.target.value;
      this._catPage   = 1;
      this._catSig    = null;
      this._loadCatalogue();
    });
    root.querySelector('#hse-cfg-refresh-btn').addEventListener('click', () => {
      this._catSig = null;
      this._loadCatalogue();
    });
    root.querySelector('#hse-cfg-bulk-activate').addEventListener('click', () => this._bulkAction('select'));
    root.querySelector('#hse-cfg-bulk-ignore').addEventListener('click',   () => this._bulkAction('ignore'));
    root.querySelector('#hse-cfg-bulk-cancel').addEventListener('click',   () => {
      this._selected.clear();
      this._updateBulkBar();
    });
  }

  async _loadCatalogue() {
    if (this._catFetching) return;          // R2
    this._catFetching = true;
    const params = new URLSearchParams({ status: this._catStatus, page: this._catPage, per_page: CATALOGUE_PER_PAGE });
    if (this._catQ) params.set('q', this._catQ);
    try {
      const r = await this._ctx.hseFetch(`/api/hse/catalogue?${params}`, { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);     // R3
      if (sig === this._catSig) return;
      this._catSig  = sig;
      this._catData = data;
      this._renderCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Erreur catalogue \u2014 ${e.message}</div>`);
    } finally {
      this._catFetching = false;
    }
  }

  _renderCatalogue() {
    const d = this._catData;
    if (!d) return;
    if (!d.items?.length) {
      this._setCatBody(`<div class="hse-empty"><div class="hse-empty-icon">\ud83d\udce6</div><p>Aucun appareil catalogu\u00e9${this._catStatus !== 'all' ? ` avec statut \u00ab\u00a0${this._catStatus}\u00a0\u00bb` : ''}.</p><p style="margin-top:8px"><button class="hse-btn hse-btn--ghost" onclick="this.closest('.hse-cfg__panel')?.dispatchEvent(new CustomEvent('hse-go-scan',{bubbles:true}))">\u2192 Aller dans D\u00e9tection</button></p></div>`);
      this._renderCatPager(d);
      return;
    }
    const rows = d.items.map(item => {
      const statusCls = `hse-cfg__badge--${item.status ?? 'pending'}`;
      const statusLbl = { selected:'S\u00e9lectionn\u00e9', ignored:'Ignor\u00e9', pending:'En attente' }[item.status] ?? item.status;
      const sel = this._selected.has(item.entity_id);
      return `<tr data-entity-id="${this._esc(item.entity_id)}" class="${sel ? 'selected' : ''}">
        <td><input type="checkbox" class="hse-cfg__cb" aria-label="S\u00e9lectionner" ${sel ? 'checked' : ''} /></td>
        <td><div>${this._esc(item.name ?? item.entity_id)}</div><div class="hse-cfg__entity-id">${this._esc(item.entity_id)}</div></td>
        <td>${this._esc(item.integration_domain ?? item.integration ?? '\u2014')}</td>
        <td><span class="hse-cfg__badge ${statusCls}">${statusLbl}</span></td>
        <td class="hse-cfg__actions">
          ${item.status !== 'selected' ? `<button class="hse-btn hse-btn--primary hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="select">\u2713 Activer</button>` : ''}
          ${item.status !== 'ignored'  ? `<button class="hse-btn hse-btn--ghost   hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="ignore">\u2715 Ignorer</button>` : ''}
          <button class="hse-btn hse-btn--ghost hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="reset">\u21ba Remettre</button>
        </td>
      </tr>`;
    }).join('');
    this._setCatBody(`
      <div class="hse-cfg__table-wrap">
        <table class="hse-cfg__table" role="grid">
          <thead><tr>
            <th style="width:36px"><input type="checkbox" id="hse-cfg-cb-all" aria-label="Tout s\u00e9lectionner" /></th>
            <th>Appareil</th><th>Int\u00e9gration</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`);
    this._bindCatRows();
    this._renderCatPager(d);
  }

  _bindCatRows() {
    const body = this._el?.querySelector('#hse-cfg-cat-body');
    if (!body) return;
    body.querySelectorAll('[data-triage-id]').forEach(btn => {
      btn.addEventListener('click', () => this._triage(btn.dataset.triageId, btn.dataset.triageAction));
    });
    body.querySelectorAll('.hse-cfg__cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const row = cb.closest('tr');
        const eid = row?.dataset.entityId;
        if (!eid) return;
        cb.checked ? this._selected.add(eid) : this._selected.delete(eid);
        row?.classList.toggle('selected', cb.checked);
        this._updateBulkBar();
      });
    });
    body.querySelector('#hse-cfg-cb-all')?.addEventListener('change', e => {
      body.querySelectorAll('.hse-cfg__cb').forEach(cb => {
        const row = cb.closest('tr');
        const eid = row?.dataset.entityId;
        if (!eid) return;
        cb.checked = e.target.checked;
        e.target.checked ? this._selected.add(eid) : this._selected.delete(eid);
        row?.classList.toggle('selected', cb.checked);
      });
      this._updateBulkBar();
    });
  }

  _updateBulkBar() {
    const bar   = this._el?.querySelector('#hse-cfg-bulk');
    const label = this._el?.querySelector('#hse-cfg-bulk-label');
    if (!bar) return;
    const n = this._selected.size;
    bar.classList.toggle('visible', n > 0);
    if (label) label.textContent = `${n}\u00a0s\u00e9lectionn\u00e9${n > 1 ? 's' : ''}`;
  }

  async _triage(entityId, action) {
    const btn = this._el?.querySelector(`[data-triage-id="${this._attrVal(entityId)}"][data-triage-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: entityId, action }),
        signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._catSig = null;
      this._selected.delete(entityId);
      this._updateBulkBar();
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = action === 'select' ? '\u2713 Activer' : action === 'ignore' ? '\u2715 Ignorer' : '\u21ba Remettre'; }
      this._setCatBody(`<div class="hse-error">Triage \u00e9chou\u00e9 \u2014 ${e.message}</div>`);
    }
  }

  async _bulkAction(action) {
    if (!this._selected.size) return;
    const items = Array.from(this._selected).map(id => ({ entity_id: id, action }));
    const bar = this._el?.querySelector('#hse-cfg-bulk');
    if (bar) bar.style.opacity = '0.5';
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._selected.clear();
      this._catSig = null;
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Triage group\u00e9 \u00e9chou\u00e9 \u2014 ${e.message}</div>`);
    } finally {
      if (bar) bar.style.opacity = '1';
      this._updateBulkBar();
    }
  }

  _renderCatPager(d) {
    const pager = this._el?.querySelector('#hse-cfg-cat-pager');
    if (!pager) return;
    const totalPages = Math.ceil((d.total ?? 0) / CATALOGUE_PER_PAGE);
    if (totalPages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `<span>Page ${this._catPage} / ${totalPages} \u2014 ${d.total} appareil${d.total > 1 ? 's' : ''}</span><div style="display:flex;gap:6px"><button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-prev" ${this._catPage <= 1 ? 'disabled' : ''}>&larr;</button><button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-next" ${this._catPage >= totalPages ? 'disabled' : ''}>&rarr;</button></div>`;
    pager.querySelector('#hse-cfg-prev')?.addEventListener('click', () => { this._catPage--; this._catSig=null; this._loadCatalogue(); });
    pager.querySelector('#hse-cfg-next')?.addEventListener('click', () => { this._catPage++; this._catSig=null; this._loadCatalogue(); });
  }

  _setCatBody(html) {
    const el = this._el?.querySelector('#hse-cfg-cat-body');
    if (el) el.innerHTML = html;
  }

  // ── PANEL B — Pièces & Types ─────────────────────────────────────────────────

  _bindMetaEvents(root) {
    root.querySelector('#hse-cfg-diff-apply')?.addEventListener('click',   () => this._applyDiff());
    root.querySelector('#hse-cfg-diff-dismiss')?.addEventListener('click', () => {
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      if (banner) banner.classList.remove('visible');
    });
  }

  async _loadMeta() {
    if (this._metaFetching) return;          // R2
    this._metaFetching = true;
    this._setMetaBody('<div class="hse-skeleton"></div>'); // R5
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);      // R3
      if (sig === this._metaSig) return;
      this._metaSig  = sig;
      this._metaData = data;
      this._renderMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setMetaBody(`<div class="hse-error">Erreur m\u00e9ta \u2014 ${e.message}</div>`);
    } finally {
      this._metaFetching = false;
    }
  }

  async _loadDiffPreview() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/preview', { signal: this._abort?.signal });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      this._diffData = data;
      const count = data.changes?.length ?? 0;
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      const msg    = this._el?.querySelector('#hse-cfg-diff-msg');
      if (!banner || !msg) return;
      if (count > 0) {
        msg.textContent = `${count} changement${count > 1 ? 's' : ''} d\u00e9tect\u00e9${count > 1 ? 's' : ''} entre HA et le catalogue.`;
        banner.classList.add('visible');
      } else {
        banner.classList.remove('visible');
      }
    } catch (e) { /* non-bloquant */ }
  }

  async _applyDiff() {
    if (this._diffApplying) return;
    this._diffApplying = true;
    const btn = this._el?.querySelector('#hse-cfg-diff-apply');
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/apply', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({}), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      if (banner) banner.classList.remove('visible');
      this._metaSig = null;
      await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      const msg = this._el?.querySelector('#hse-cfg-diff-msg');
      if (msg) msg.textContent = `Erreur : ${e.message}`;
      if (btn) { btn.disabled = false; btn.textContent = 'Appliquer'; }
    } finally {
      this._diffApplying = false;
    }
  }

  _renderMeta() {
    const d = this._metaData;
    if (!d) return;
    const rooms = d.rooms ?? [];
    const types = d.device_types ?? [];

    const renderList = (items, labelKey) => {
      if (!items.length) return '<li style="padding:12px 14px;color:var(--hse-text-muted,#6b7280);font-size:0.875rem">Aucun \u00e9l\u00e9ment.</li>';
      return items.map(item => `<li><span>${this._esc(item[labelKey] ?? item.id ?? item.name ?? '?')}</span></li>`).join('');
    };

    this._setMetaBody(`
      <div class="hse-cfg__grid">
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">
            <span>Pi\u00e8ces <span style="font-weight:400;color:var(--hse-text-muted,#6b7280);font-size:0.8rem">(${rooms.length})</span></span>
          </div>
          <ul class="hse-cfg__list">${renderList(rooms, 'name')}</ul>
        </div>
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">
            <span>Types d&apos;appareils <span style="font-weight:400;color:var(--hse-text-muted,#6b7280);font-size:0.8rem">(${types.length})</span></span>
          </div>
          <ul class="hse-cfg__list">${renderList(types, 'name')}</ul>
        </div>
      </div>
    `);
  }

  _setMetaBody(html) {
    const el = this._el?.querySelector('#hse-cfg-meta-body');
    if (el) el.innerHTML = html;
  }

  // ── PANEL C — Tarification ───────────────────────────────────────────────────

  async _loadPricing() {
    if (this._pricingFetching) return;       // R2
    this._pricingFetching = true;
    this._setPricingBody('<div class="hse-skeleton"></div>'); // R5
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);      // R3
      if (sig === this._pricingSig) return;
      this._pricingSig  = sig;
      this._pricingData = data;
      this._renderPricing();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setPricingBody(`<div class="hse-error">Erreur tarification \u2014 ${e.message}</div>`);
    } finally {
      this._pricingFetching = false;
    }
  }

  _renderPricing() {
    const d = this._pricingData ?? {};
    const contract = d.contract_type ?? 'base';
    this._setPricingBody(`
      <form class="hse-cfg__form" id="hse-cfg-pricing-form" novalidate>
        <div class="hse-cfg__field">
          <label class="hse-cfg__label" for="hse-cfg-contract-type">Type de contrat</label>
          <select class="hse-cfg__select" id="hse-cfg-contract-type" name="contract_type">
            <option value="base" ${contract === 'base' ? 'selected' : ''}>Tarif de base (heures pleines)</option>
            <option value="hphc" ${contract === 'hphc' ? 'selected' : ''}>Heures Pleines / Heures Creuses (HP-HC)</option>
          </select>
        </div>

        <div class="hse-cfg__field">
          <label class="hse-cfg__label" for="hse-cfg-price-ht">Prix HT (\u20ac/kWh)</label>
          <input class="hse-cfg__input" type="number" id="hse-cfg-price-ht" name="price_ht" step="0.0001" min="0" value="${d.price_ht ?? ''}" placeholder="ex: 0.1140" />
        </div>

        <div class="hse-cfg__field">
          <label class="hse-cfg__label" for="hse-cfg-tax-rate">Taxes (%, ex: 20)</label>
          <input class="hse-cfg__input" type="number" id="hse-cfg-tax-rate" name="tax_rate" step="0.1" min="0" max="100" value="${d.tax_rate ?? '20'}" placeholder="20" />
        </div>

        <div class="hse-cfg__hp-hc ${contract === 'hphc' ? 'visible' : ''}" id="hse-cfg-hphc-fields">
          <div class="hse-cfg__field">
            <label class="hse-cfg__label" for="hse-cfg-price-hp">Prix HP HT (\u20ac/kWh)</label>
            <input class="hse-cfg__input" type="number" id="hse-cfg-price-hp" name="price_hp" step="0.0001" min="0" value="${d.price_hp ?? ''}" placeholder="ex: 0.1276" />
          </div>
          <div class="hse-cfg__field">
            <label class="hse-cfg__label" for="hse-cfg-price-hc">Prix HC HT (\u20ac/kWh)</label>
            <input class="hse-cfg__input" type="number" id="hse-cfg-price-hc" name="price_hc" step="0.0001" min="0" value="${d.price_hc ?? ''}" placeholder="ex: 0.0901" />
          </div>
        </div>

        <div class="hse-cfg__field">
          <label class="hse-cfg__label" for="hse-cfg-subscription">Abonnement TTC (\u20ac/mois)</label>
          <input class="hse-cfg__input" type="number" id="hse-cfg-subscription" name="subscription_monthly" step="0.01" min="0" value="${d.subscription_monthly ?? ''}" placeholder="ex: 12.50" />
        </div>

        <div class="hse-cfg__field">
          <label class="hse-cfg__label" for="hse-cfg-estimate">Consommation estim\u00e9e (kWh/mois)</label>
          <input class="hse-cfg__input" type="number" id="hse-cfg-estimate" name="monthly_kwh_estimate" step="1" min="0" value="${d.monthly_kwh_estimate ?? ''}" placeholder="ex: 300" />
        </div>

        <div class="hse-cfg__preview" id="hse-cfg-price-preview">
          Co\u00fbt mensuel estim\u00e9 : <span class="hse-cfg__preview-value" id="hse-cfg-preview-val">\u2014</span>
        </div>

        <div class="hse-cfg__save-row">
          <button type="submit" class="hse-btn hse-btn--primary" id="hse-cfg-save-btn">Enregistrer</button>
          <span class="hse-cfg__save-status" id="hse-cfg-save-status"></span>
        </div>
      </form>
    `);
    this._bindPricingForm();
    this._updatePricingPreview();
  }

  _bindPricingForm() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;

    // HP-HC toggle
    const contractSel = form.querySelector('#hse-cfg-contract-type');
    const hphcFields  = form.querySelector('#hse-cfg-hphc-fields');
    contractSel?.addEventListener('change', () => {
      hphcFields?.classList.toggle('visible', contractSel.value === 'hphc');
      this._updatePricingPreview();
    });

    // Live preview sur tout changement numérique
    form.querySelectorAll('input[type=number]').forEach(inp => {
      inp.addEventListener('input', () => this._updatePricingPreview());
    });

    // Submit
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await this._savePricing(form);
    });
  }

  _updatePricingPreview() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    const val  = this._el?.querySelector('#hse-cfg-preview-val');
    if (!form || !val) return;
    const contract  = form.querySelector('#hse-cfg-contract-type')?.value ?? 'base';
    const priceHt   = parseFloat(form.querySelector('#hse-cfg-price-ht')?.value) || 0;
    const taxRate   = parseFloat(form.querySelector('#hse-cfg-tax-rate')?.value) || 20;
    const sub       = parseFloat(form.querySelector('#hse-cfg-subscription')?.value) || 0;
    const kwh       = parseFloat(form.querySelector('#hse-cfg-estimate')?.value) || 0;
    const priceTtc  = priceHt * (1 + taxRate / 100);
    const total     = (kwh * priceTtc) + sub;
    val.textContent = kwh > 0 || sub > 0 ? `${total.toFixed(2)}\u00a0\u20ac/mois` : '\u2014';
  }

  async _savePricing(form) {
    if (this._pricingSaving) return;
    this._pricingSaving = true;
    const btn    = form.querySelector('#hse-cfg-save-btn');
    const status = form.querySelector('#hse-cfg-save-status');
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    if (status) status.textContent = '';
    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) payload[k] = v === '' ? null : (isNaN(v) ? v : parseFloat(v));
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._pricingSig = null; // invalide pour forcer reload si on revient
      if (status) { status.textContent = '\u2713 Enregistr\u00e9'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = `\u26a0 Erreur : ${e.message}`;
    } finally {
      this._pricingSaving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
    }
  }

  _setPricingBody(html) {
    const el = this._el?.querySelector('#hse-cfg-pricing-body');
    if (el) el.innerHTML = html;
  }

  // ── Utilitaires ──────────────────────────────────────────────────────────────

  _attrVal(str) {
    if (str == null) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
