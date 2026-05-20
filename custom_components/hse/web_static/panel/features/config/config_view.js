/**
 * config_view.js — Onglet Configuration HSE V3
 * CORRIGÉ DELTA-065 : champs tarification remappés sur clés backend réelles
 */

const CSS = `
.hse-cfg { display:flex; flex-direction:column; gap:16px; }
.hse-cfg__tabs { display:flex; gap:4px; border-bottom:2px solid rgba(255,255,255,0.08); margin-bottom:4px; }
.hse-cfg__tab { padding:8px 16px; font-size:0.875rem; font-family:inherit; font-weight:500; background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.5); border-bottom:2px solid transparent; margin-bottom:-2px; transition:color 180ms, border-color 180ms; }
.hse-cfg__tab:hover { color:rgba(255,255,255,0.85); }
.hse-cfg__tab.active { color:#e879f9; border-bottom-color:#e879f9; }
.hse-cfg__panel { display:none; }
.hse-cfg__panel.active { display:block; }
.hse-btn { padding:7px 14px; border-radius:6px; border:1px solid transparent; font-size:0.82rem; font-family:inherit; cursor:pointer; transition:opacity 150ms,background 150ms; white-space:nowrap; }
.hse-btn:disabled { opacity:0.38; cursor:not-allowed; }
.hse-btn--primary { background:#e879f9; color:#000; font-weight:600; }
.hse-btn--primary:hover:not(:disabled) { opacity:0.85; }
.hse-btn--ghost { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); }
.hse-btn--ghost:hover:not(:disabled) { background:rgba(255,255,255,0.12); }
.hse-btn--danger { background:rgba(239,68,68,0.12); color:#f87171; border-color:rgba(239,68,68,0.25); }
.hse-btn--danger:hover:not(:disabled) { background:rgba(239,68,68,0.2); }
.hse-btn--sm { padding:3px 9px; font-size:0.76rem; }
.hse-cfg__ref-block, .hse-cfg__auto-block { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:10px; margin-bottom:10px; font-size:0.82rem; }
.hse-cfg__ref-block { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); }
.hse-cfg__auto-block { background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.22); }
.hse-cfg__ref-icon { font-size:1.1rem; flex-shrink:0; }
.hse-cfg__ref-label { flex:1; color:rgba(255,255,255,0.7); }
.hse-cfg__ref-select { flex:1 1 240px; min-width:180px; padding:5px 10px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); font-size:0.82rem; font-family:inherit; outline:none; transition:border-color 150ms; }
.hse-cfg__ref-select:focus { border-color:#f59e0b; }
.hse-cfg__ref-status { font-size:0.75rem; color:rgba(255,255,255,0.35); margin-left:4px; }
.hse-cfg__toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
.hse-cfg__search { flex:1 1 200px; padding:7px 12px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:inherit; font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 150ms; }
.hse-cfg__search:focus { border-color:#e879f9; }
.hse-cfg__search::placeholder { color:rgba(255,255,255,0.3); }
.hse-cfg__filter { padding:7px 12px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:inherit; font-size:0.875rem; font-family:inherit; cursor:pointer; outline:none; }
.hse-cfg__bulk { display:none; align-items:center; gap:8px; flex-wrap:wrap; padding:7px 12px; background:rgba(232,121,249,0.08); border:1px solid rgba(232,121,249,0.2); border-radius:8px; font-size:0.82rem; margin-bottom:8px; }
.hse-cfg__bulk.visible { display:flex; }
.hse-cfg__bulk-label { flex:1; color:rgba(255,255,255,0.6); }
.hse-cfg__groups { display:flex; flex-direction:column; gap:8px; }
.hse-cfg__group { border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; background:rgba(255,255,255,0.02); }
.hse-cfg__group-head { display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(255,255,255,0.05); cursor:pointer; user-select:none; transition:background 150ms; }
.hse-cfg__group-head:hover { background:rgba(255,255,255,0.08); }
.hse-cfg__group-arrow { font-size:0.7rem; color:rgba(255,255,255,0.4); transition:transform 200ms; flex-shrink:0; }
.hse-cfg__group.open .hse-cfg__group-arrow { transform:rotate(90deg); }
.hse-cfg__group-name { font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.85); }
.hse-cfg__group-count { margin-left:4px; font-size:0.72rem; font-weight:600; padding:1px 6px; border-radius:999px; background:rgba(232,121,249,0.15); color:#e879f9; }
.hse-cfg__group-summary { margin-left:auto; display:flex; gap:6px; align-items:center; font-size:0.72rem; color:rgba(255,255,255,0.4); }
.hse-cfg__group-selall { display:flex; gap:6px; padding:6px 12px; border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; align-items:center; }
.hse-cfg__group-body { display:none; }
.hse-cfg__group.open .hse-cfg__group-body { display:block; }
.hse-cfg__sensor-row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 120ms; }
.hse-cfg__sensor-row:last-child { border-bottom:none; }
.hse-cfg__sensor-row:hover { background:rgba(255,255,255,0.04); }
.hse-cfg__sensor-row.selected { background:rgba(232,121,249,0.05); }
.hse-cfg__sensor-info { flex:1; min-width:0; }
.hse-cfg__sensor-name { font-size:0.875rem; color:rgba(255,255,255,0.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-eid { font-size:0.72rem; color:rgba(255,255,255,0.35); font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-meta { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
.hse-cfg__sensor-actions { display:flex; gap:4px; flex-shrink:0; flex-wrap:nowrap; }
.hse-cfg__type-icon { font-size:0.9rem; flex-shrink:0; }
.hse-cfg__badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px; font-size:0.7rem; font-weight:600; white-space:nowrap; }
.hse-cfg__badge--selected { background:rgba(34,197,94,0.15); color:#4ade80; }
.hse-cfg__badge--ignored { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); }
.hse-cfg__badge--pending { background:rgba(234,179,8,0.12); color:#facc15; }
.hse-cfg__badge--normal { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); }
.hse-cfg__quality { display:inline-flex; align-items:center; gap:3px; font-size:0.7rem; color:rgba(255,255,255,0.4); }
.hse-cfg__quality-level { font-size:0.68rem; font-weight:600; padding:1px 5px; border-radius:4px; }
.hse-cfg__quality-level--BON { background:rgba(34,197,94,0.18); color:#4ade80; }
.hse-cfg__quality-level--ACCEPTABLE{ background:rgba(234,179,8,0.15); color:#facc15; }
.hse-cfg__quality-level--MOYEN { background:rgba(249,115,22,0.15); color:#fb923c; }
.hse-cfg__quality-level--MAUVAIS { background:rgba(239,68,68,0.15); color:#f87171; }
.hse-cfg__stars { color:#f59e0b; font-size:0.72rem; }
.hse-cfg__score { font-size:0.68rem; color:rgba(255,255,255,0.3); }
.hse-cfg__diff-banner { display:none; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); border-radius:10px; font-size:0.875rem; margin-bottom:12px; }
.hse-cfg__diff-banner.visible { display:flex; }
.hse-cfg__diff-msg { flex:1; }
.hse-cfg__pricing-wrap { display:flex; flex-direction:column; gap:20px; max-width:860px; }
.hse-cfg__pricing-info { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:8px; font-size:0.82rem; color:rgba(255,255,255,0.7); }
.hse-cfg__pricing-section { border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; }
.hse-cfg__pricing-section-title { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(255,255,255,0.04); font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.7); border-bottom:1px solid rgba(255,255,255,0.06); }
.hse-cfg__pricing-body { padding:14px; display:flex; flex-direction:column; gap:14px; }
.hse-cfg__field { display:flex; flex-direction:column; gap:5px; }
.hse-cfg__field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:560px){ .hse-cfg__field-row { grid-template-columns:1fr; } }
.hse-cfg__label { font-size:0.8rem; font-weight:500; color:rgba(255,255,255,0.6); }
.hse-cfg__input, .hse-cfg__select { padding:7px 11px; border:1px solid rgba(255,255,255,0.1); border-radius:6px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 150ms; width:100%; }
.hse-cfg__input:focus, .hse-cfg__select:focus { border-color:#e879f9; }
.hse-cfg__input::placeholder { color:rgba(255,255,255,0.2); }
.hse-cfg__input-ttc { padding:7px 11px; border:1px solid rgba(255,255,255,0.06); border-radius:6px; background:rgba(255,255,255,0.02); color:rgba(255,255,255,0.5); font-size:0.875rem; font-family:inherit; width:100%; cursor:default; user-select:none; }
.hse-cfg__input-ttc-label { font-size:0.8rem; font-weight:500; color:rgba(255,255,255,0.35); }
.hse-cfg__hp-hc { display:none; flex-direction:column; gap:14px; }
.hse-cfg__hp-hc.visible { display:flex; }
.hse-cfg__time-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:560px){ .hse-cfg__time-row { grid-template-columns:1fr; } }
.hse-cfg__preview { padding:12px 16px; background:rgba(232,121,249,0.06); border:1px solid rgba(232,121,249,0.15); border-radius:10px; font-size:0.875rem; display:flex; align-items:center; gap:8px; }
.hse-cfg__preview-label { flex:1; color:rgba(255,255,255,0.6); }
.hse-cfg__preview-value { font-size:1.1rem; font-weight:700; color:#e879f9; }
.hse-cfg__save-row { display:flex; align-items:center; gap:10px; }
.hse-cfg__save-status { font-size:0.8rem; color:rgba(255,255,255,0.4); }
.hse-cfg__grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:600px){ .hse-cfg__grid { grid-template-columns:1fr; } }
.hse-cfg__card { border:1px solid rgba(255,255,255,0.08); border-radius:10px; background:rgba(255,255,255,0.02); overflow:hidden; }
.hse-cfg__card-head { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.875rem; font-weight:600; }
.hse-cfg__list { padding:0; margin:0; list-style:none; }
.hse-cfg__list li { display:flex; align-items:baseline; justify-content:space-between; padding:7px 14px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.875rem; gap:8px; }
.hse-cfg__list li:last-child { border-bottom:none; }
.hse-cfg__list-eid { font-size:0.7rem; color:rgba(255,255,255,0.3); font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px; }
@keyframes hse-shimmer { 0% { background-position:-200% 0; } 100% { background-position: 200% 0; } }
.hse-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite; border-radius:10px; min-height:120px; width:100%; }
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error { color:#f87171; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:0.875rem; }
.hse-empty { text-align:center; padding:48px 16px; color:rgba(255,255,255,0.35); }
.hse-empty-icon { font-size:2.5rem; margin-bottom:12px; }
.hse-empty p { font-size:0.875rem; }
.hse-cfg__note { font-size:0.78rem; color:rgba(255,255,255,0.35); padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.07); }
`;

const CATALOGUE_PER_PAGE = 200;
const TYPE_ICON = { energy:'⚡', power:'🔋', gas:'🔥', water:'💧', temperature:'🌡️' };

export class ConfigView {
  constructor() {
    this._el = null; this._ctx = null; this._abort = null; this._mounted = false; this._activeTab = 'appareils';
    this._catFetching = false; this._catData = null; this._catSig = null; this._catPage = 1;
    this._catStatus = 'all'; this._catQ = ''; this._selected = new Set(); this._openGroups = new Set();
    this._refEntityId = null; this._refSaving = false; this._autoSelecting = false;
    this._metaFetching = false; this._metaData = null; this._metaSig = null; this._diffApplying = false;
    this._pricingFetching = false; this._pricingData = null; this._pricingSig = null; this._pricingSaving = false;
  }

  mount(el, ctx) {
    this._el = el; this._ctx = ctx; this._abort = new AbortController();
    this._mounted = true; this._injectCSS(); this._buildDOM();
    this._loadCatalogue(); this._loadReference();
  }
  update_hass(hass) { this._ctx = { ...this._ctx, hass }; }
  unmount() {
    this._mounted = false;
    if (this._abort) this._abort.abort();
    this._abort = null; this._el = null; this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-cfg-css')) return;
    const s = document.createElement('style'); s.id = 'hse-cfg-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    this._el.innerHTML = '';
    const root = document.createElement('div'); root.className = 'hse-cfg';
    root.innerHTML = `
      <div class="hse-cfg__tabs" role="tablist">
        <button class="hse-cfg__tab active" data-tab="appareils" role="tab" aria-selected="true">Appareils</button>
        <button class="hse-cfg__tab" data-tab="meta" role="tab" aria-selected="false">Pièces &amp; Types</button>
        <button class="hse-cfg__tab" data-tab="pricing" role="tab" aria-selected="false">Tarification</button>
      </div>
      <div class="hse-cfg__panel active" id="hse-cfg-panel-appareils" role="tabpanel">
        <div class="hse-cfg__ref-block">
          <span class="hse-cfg__ref-icon">⭐</span>
          <span class="hse-cfg__ref-label">Capteur de référence (ex : Linky) :</span>
          <select id="hse-cfg-ref-select" class="hse-cfg__ref-select"><option value="">— Aucun —</option></select>
          <button id="hse-cfg-ref-save" class="hse-btn hse-btn--primary hse-btn--sm">Enregistrer</button>
          <span id="hse-cfg-ref-status" class="hse-cfg__ref-status"></span>
        </div>
        <div class="hse-cfg__auto-block">
          <span class="hse-cfg__ref-icon">✨</span>
          <span class="hse-cfg__ref-label">Sélection automatique intelligente</span>
          <button id="hse-cfg-auto-btn" class="hse-btn hse-btn--primary hse-btn--sm">🚀 Lancer</button>
          <span id="hse-cfg-auto-status" class="hse-cfg__ref-status"></span>
        </div>
        <div class="hse-cfg__toolbar">
          <input class="hse-cfg__search" placeholder="Rechercher un appareil…" />
          <select id="hse-cfg-status-filter" class="hse-cfg__filter">
            <option value="all">Tous</option><option value="selected">Sélectionnés</option><option value="ignored">Ignorés</option><option value="pending">En attente</option>
          </select>
          <button id="hse-cfg-refresh-btn" class="hse-btn hse-btn--ghost hse-btn--sm">🔄 Rafraîchir</button>
        </div>
        <div id="hse-cfg-bulk" class="hse-cfg__bulk">
          <span id="hse-cfg-bulk-label" class="hse-cfg__bulk-label">0 sélectionné(s)</span>
          <button id="hse-cfg-bulk-activate" class="hse-btn hse-btn--primary hse-btn--sm">✓ Activer</button>
          <button id="hse-cfg-bulk-ignore" class="hse-btn hse-btn--danger hse-btn--sm">✕ Ignorer</button>
          <button id="hse-cfg-bulk-cancel" class="hse-btn hse-btn--ghost hse-btn--sm">Annuler</button>
        </div>
        <div id="hse-cfg-cat-body"><div class="hse-skeleton"></div></div>
        <div id="hse-cfg-cat-pager" style="display:none;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.8rem;color:rgba(255,255,255,0.4);"></div>
      </div>
      <div class="hse-cfg__panel" id="hse-cfg-panel-meta" role="tabpanel">
        <div id="hse-cfg-diff-banner" class="hse-cfg__diff-banner">
          <span id="hse-cfg-diff-msg" class="hse-cfg__diff-msg"></span>
          <button id="hse-cfg-diff-apply" class="hse-btn hse-btn--primary hse-btn--sm">Appliquer</button>
          <button id="hse-cfg-diff-dismiss" class="hse-btn hse-btn--ghost hse-btn--sm">Ignorer</button>
        </div>
        <div id="hse-cfg-meta-body"><div class="hse-skeleton"></div></div>
        <p class="hse-cfg__note">ℹ️ La création manuelle de pièces et types sera disponible prochainement (DELTA-059).</p>
      </div>
      <div class="hse-cfg__panel" id="hse-cfg-panel-pricing" role="tabpanel">
        <div id="hse-cfg-pricing-body"><div class="hse-skeleton"></div></div>
      </div>`;
    this._el.appendChild(root);
    this._bindTabs(root); this._bindAppareilsEvents(root); this._bindMetaEvents(root);
  }

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
        if (tab === 'meta' && !this._metaData) { this._loadMeta(); this._loadDiffPreview(); }
        if (tab === 'pricing' && !this._pricingData) this._loadPricing();
      });
    });
  }

  async _loadReference() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      this._refEntityId = data.reference_entity_id ?? null;
      this._populateRefSelect();
    } catch (e) {}
  }

  _populateRefSelect() {
    const sel = this._el?.querySelector('#hse-cfg-ref-select');
    if (!sel) return;
    const items = this._catData?.items ?? [];
    const current = this._refEntityId;
    const eids = items.filter(i => i.status === 'selected').map(i => i.entity_id);
    if (current && !eids.includes(current)) eids.unshift(current);
    sel.innerHTML = '<option value="">— Aucun —</option>';
    eids.forEach(eid => {
      const item = items.find(i => i.entity_id === eid);
      const label = item ? `${item.name ?? eid} (${eid})` : eid;
      const opt = document.createElement('option');
      opt.value = eid; opt.textContent = label;
      if (eid === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async _saveReference() {
    if (this._refSaving) return;
    const sel = this._el?.querySelector('#hse-cfg-ref-select');
    const status = this._el?.querySelector('#hse-cfg-ref-status');
    const btn = this._el?.querySelector('#hse-cfg-ref-save');
    if (!sel) return;
    this._refSaving = true;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    if (status) status.textContent = '';
    const val = sel.value || null;
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ reference_entity_id: val }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._refEntityId = val;
      if (status) { status.textContent = '✓ Enregistré'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = '⚠ Erreur';
    } finally {
      this._refSaving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
    }
  }

  async _autoSelect() {
    if (this._autoSelecting) return;
    this._autoSelecting = true;
    const btn = this._el?.querySelector('#hse-cfg-auto-btn');
    const status = this._el?.querySelector('#hse-cfg-auto-status');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    if (status) status.textContent = '';
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue?status=pending&per_page=200', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const pending = (data.items ?? []).filter(i => i.status === 'pending');
      if (!pending.length) {
        if (status) { status.textContent = 'Aucun capteur en attente.'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
        return;
      }
      const sorted = [...pending].sort((a,b) => (b.quality_score??0) - (a.quality_score??0));
      const items = sorted.map(i => ({ entity_id: i.entity_id, action: 'select' }));
      const r2 = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items }), signal: this._abort?.signal,
      });
      if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
      const res = await r2.json();
      if (status) {
        status.textContent = `✓ ${res.processed ?? items.length} capteur(s) activé(s)`;
        setTimeout(() => { if (status) status.textContent = ''; }, 4000);
      }
      this._catSig = null; await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = '⚠ Erreur';
    } finally {
      this._autoSelecting = false;
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Lancer'; }
    }
  }

  _bindAppareilsEvents(root) {
    let deb;
    root.querySelector('.hse-cfg__search').addEventListener('input', e => {
      clearTimeout(deb);
      deb = setTimeout(() => { this._catQ = e.target.value.trim(); this._catPage = 1; this._catSig = null; this._loadCatalogue(); }, 350);
    });
    root.querySelector('#hse-cfg-status-filter').addEventListener('change', e => {
      this._catStatus = e.target.value; this._catPage = 1; this._catSig = null; this._loadCatalogue();
    });
    root.querySelector('#hse-cfg-refresh-btn').addEventListener('click', () => { this._catSig = null; this._loadCatalogue(); });
    root.querySelector('#hse-cfg-bulk-activate').addEventListener('click', () => this._bulkAction('select'));
    root.querySelector('#hse-cfg-bulk-ignore').addEventListener('click', () => this._bulkAction('ignore'));
    root.querySelector('#hse-cfg-bulk-cancel').addEventListener('click', () => { this._selected.clear(); this._updateBulkBar(); });
    root.querySelector('#hse-cfg-ref-save').addEventListener('click', () => this._saveReference());
    root.querySelector('#hse-cfg-auto-btn').addEventListener('click', () => this._autoSelect());
  }

  async _loadCatalogue() {
    if (this._catFetching) return;
    this._catFetching = true;
    const params = new URLSearchParams({ status: this._catStatus, page: this._catPage, per_page: CATALOGUE_PER_PAGE });
    if (this._catQ) params.set('q', this._catQ);
    try {
      const r = await this._ctx.hseFetch(`/api/hse/catalogue?${params}`, { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._catSig) return;
      this._catSig = sig; this._catData = data;
      this._renderCatalogue(); this._populateRefSelect();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Erreur catalogue — ${e.message}</div>`);
    } finally { this._catFetching = false; }
  }

  _renderCatalogue() {
    const d = this._catData; if (!d) return;
    const items = d.items ?? [];
    if (!items.length) { this._setCatBody(`<div class="hse-empty"><div class="hse-empty-icon">📦</div><p>Aucun appareil catalogué.</p></div>`); return; }
    const groups = {};
    for (const item of items) {
      const key = item.integration_domain ?? item.integration ?? 'inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    if (this._openGroups.size === 0) Object.keys(groups).forEach(k => this._openGroups.add(k));
    const html = Object.entries(groups).sort(([a],[b]) => a.localeCompare(b))
      .map(([integ, gItems]) => this._renderGroup(integ, gItems)).join('');
    this._setCatBody(`<div class="hse-cfg__groups">${html}</div>`);
    this._bindGroupEvents(); this._renderCatPager(d);
  }

  _renderGroup(integ, items) {
    const isOpen = this._openGroups.has(integ);
    const selCount = items.filter(i => i.status === 'selected').length;
    const rows = items.map(item => this._renderSensorRow(item)).join('');
    return `
      <div class="hse-cfg__group ${isOpen ? 'open' : ''}" data-group="${this._attrVal(integ)}">
        <div class="hse-cfg__group-head">
          <span class="hse-cfg__group-arrow">▶</span>
          <span class="hse-cfg__group-name">${this._esc(integ)}</span>
          <span class="hse-cfg__group-count">${items.length}</span>
          <span class="hse-cfg__group-summary">${selCount} actif${selCount>1?'s':''}/ ${items.length}</span>
        </div>
        <div class="hse-cfg__group-selall">
          <button class="hse-btn hse-btn--sm hse-btn--ghost" data-grp-sel="${this._attrVal(integ)}" data-grp-action="select_all">Tout sélectionner</button>
          <button class="hse-btn hse-btn--sm hse-btn--ghost" data-grp-sel="${this._attrVal(integ)}" data-grp-action="deselect_all">Tout désélectionner</button>
        </div>
        <div class="hse-cfg__group-body">${rows}</div>
      </div>`;
  }

  _renderSensorRow(item) {
    const sel = this._selected.has(item.entity_id);
    const statusCls = `hse-cfg__badge--${item.status ?? 'pending'}`;
    const statusLbl = { selected:'Sélectionné', ignored:'Ignoré', pending:'En attente' }[item.status] ?? (item.status ?? 'En attente');
    const quality = this._renderQuality(item);
    const typeKey = (item.type ?? '').toLowerCase();
    const typeIcon = TYPE_ICON[typeKey] ?? '❓';
    return `
      <div class="hse-cfg__sensor-row ${sel ? 'selected' : ''}" data-eid="${this._attrVal(item.entity_id)}">
        <input type="checkbox" class="hse-cfg__cb" data-cb-eid="${this._attrVal(item.entity_id)}" ${sel ? 'checked' : ''} />
        <span class="hse-cfg__type-icon">${typeIcon}</span>
        <div class="hse-cfg__sensor-info">
          <div class="hse-cfg__sensor-name">${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-cfg__sensor-eid">${this._esc(item.entity_id)}</div>
        </div>
        <div class="hse-cfg__sensor-meta">${quality}<span class="hse-cfg__badge ${statusCls}">${statusLbl}</span></div>
        <div class="hse-cfg__sensor-actions">
          ${item.status !== 'selected' ? `<button class="hse-btn hse-btn--sm hse-btn--primary" data-triage-id="${this._attrVal(item.entity_id)}" data-triage-action="select">✓ Activer</button>` : ''}
          ${item.status !== 'ignored' ? `<button class="hse-btn hse-btn--sm hse-btn--ghost" data-triage-id="${this._attrVal(item.entity_id)}" data-triage-action="ignore">✕ Ignorer</button>` : ''}
        </div>
      </div>`;
  }

  _renderQuality(item) {
    const score = item.quality_score ?? item.score ?? null;
    const level = item.quality_level ?? item.quality ?? null;
    if (score === null && level === null) return '';
    const stars = score !== null ? this._scoreToStars(score) : '';
    const lvlCls = level ? `hse-cfg__quality-level--${level}` : '';
    const lvlLbl = level ? `<span class="hse-cfg__quality-level ${lvlCls}">${level}</span>` : '';
    const scoreStr = score !== null ? `<span class="hse-cfg__score">${score}/150</span>` : '';
    return `${lvlLbl}<span class="hse-cfg__stars">${stars}</span>${scoreStr}`;
  }

  _scoreToStars(score) {
    const n = Math.round((score / 150) * 5);
    return '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0, 5-n));
  }

  _bindGroupEvents() {
    const body = this._el?.querySelector('#hse-cfg-cat-body');
    if (!body) return;
    body.querySelectorAll('.hse-cfg__group-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const grp = head.closest('.hse-cfg__group');
        const key = grp.dataset.group;
        const open = grp.classList.toggle('open');
        open ? this._openGroups.add(key) : this._openGroups.delete(key);
      });
    });
    body.querySelectorAll('[data-grp-sel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.dataset.grpSel;
        const action = btn.dataset.grpAction;
        const items = (this._catData?.items ?? []).filter(i => (i.integration_domain ?? i.integration ?? 'inconnu') === grp);
        items.forEach(i => action === 'select_all' ? this._selected.add(i.entity_id) : this._selected.delete(i.entity_id));
        items.forEach(i => {
          const esc = CSS.escape ? CSS.escape(i.entity_id) : i.entity_id;
          const row = body.querySelector(`[data-eid="${esc}"]`);
          const cb = body.querySelector(`[data-cb-eid="${esc}"]`);
          if (cb) cb.checked = action === 'select_all';
          if (row) row.classList.toggle('selected', action === 'select_all');
        });
        this._updateBulkBar();
      });
    });
    body.querySelectorAll('.hse-cfg__cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const eid = cb.dataset.cbEid;
        if (!eid) return;
        cb.checked ? this._selected.add(eid) : this._selected.delete(eid);
        const row = cb.closest('.hse-cfg__sensor-row');
        if (row) row.classList.toggle('selected', cb.checked);
        this._updateBulkBar();
      });
    });
    body.querySelectorAll('[data-triage-id]').forEach(btn => {
      btn.addEventListener('click', () => this._triage(btn.dataset.triageId, btn.dataset.triageAction));
    });
  }

  _updateBulkBar() {
    const bar = this._el?.querySelector('#hse-cfg-bulk');
    const label = this._el?.querySelector('#hse-cfg-bulk-label');
    if (!bar) return;
    const n = this._selected.size;
    bar.classList.toggle('visible', n > 0);
    if (label) label.textContent = `${n} sélectionné${n > 1 ? 's' : ''}`;
  }

  async _triage(entityId, action) {
    const btn = this._el?.querySelector(`[data-triage-id="${this._attrVal(entityId)}"][data-triage-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: entityId, action }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._catSig = null; this._selected.delete(entityId); this._updateBulkBar();
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = action === 'select' ? '✓ Activer' : action === 'ignore' ? '✕ Ignorer' : '↺'; }
    }
  }

  async _bulkAction(action) {
    if (!this._selected.size) return;
    const items = Array.from(this._selected).map(id => ({ entity_id: id, action }));
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._selected.clear(); this._catSig = null;
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
    } finally { this._updateBulkBar(); }
  }

  _renderCatPager(d) {
    const pager = this._el?.querySelector('#hse-cfg-cat-pager');
    if (!pager) return;
    const total = d.total ?? 0;
    const totalPages = Math.ceil(total / CATALOGUE_PER_PAGE);
    if (totalPages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `
      <button id="hse-cfg-prev" class="hse-btn hse-btn--ghost hse-btn--sm" ${this._catPage <= 1 ? 'disabled' : ''}>← Précédent</button>
      <span>Page ${this._catPage} / ${totalPages} — ${total} appareils</span>
      <button id="hse-cfg-next" class="hse-btn hse-btn--ghost hse-btn--sm" ${this._catPage >= totalPages ? 'disabled' : ''}>Suivant →</button>`;
    pager.querySelector('#hse-cfg-prev')?.addEventListener('click', () => { this._catPage--; this._catSig=null; this._loadCatalogue(); });
    pager.querySelector('#hse-cfg-next')?.addEventListener('click', () => { this._catPage++; this._catSig=null; this._loadCatalogue(); });
  }

  _setCatBody(html) { const el = this._el?.querySelector('#hse-cfg-cat-body'); if (el) el.innerHTML = html; }

  _bindMetaEvents(root) {
    root.querySelector('#hse-cfg-diff-apply')?.addEventListener('click', () => this._applyDiff());
    root.querySelector('#hse-cfg-diff-dismiss')?.addEventListener('click', () => {
      this._el?.querySelector('#hse-cfg-diff-banner')?.classList.remove('visible');
    });
  }

  async _loadMeta() {
    if (this._metaFetching) return;
    this._metaFetching = true;
    this._setMetaBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._metaSig) return;
      this._metaSig = sig; this._metaData = data;
      this._renderMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setMetaBody(`<div class="hse-error">Erreur méta — ${e.message}</div>`);
    } finally { this._metaFetching = false; }
  }

  async _loadDiffPreview() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/preview', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({}), signal: this._abort?.signal,
      });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      const count = (data.to_add?.length ?? 0) + (data.to_update?.length ?? 0);
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      const msg = this._el?.querySelector('#hse-cfg-diff-msg');
      if (!banner || !msg) return;
      if (count > 0) { msg.textContent = `${count} changement${count>1?'s':''} détecté${count>1?'s':''} entre HA et le catalogue.`; banner.classList.add('visible'); }
      else { banner.classList.remove('visible'); }
    } catch (e) {}
  }

  async _applyDiff() {
    if (this._diffApplying) return;
    this._diffApplying = true;
    const btn = this._el?.querySelector('#hse-cfg-diff-apply');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/apply', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({}), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._el?.querySelector('#hse-cfg-diff-banner')?.classList.remove('visible');
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      const msg = this._el?.querySelector('#hse-cfg-diff-msg');
      if (msg) msg.textContent = `Erreur : ${e.message}`;
      if (btn) { btn.disabled = false; btn.textContent = 'Appliquer'; }
    } finally { this._diffApplying = false; }
  }

  _renderMeta() {
    const d = this._metaData; if (!d) return;
    const rooms = d.rooms ?? [];
    const types = d.types ?? [];
    const renderRooms = (items) => {
      if (!items.length) return `<li>Aucune pièce.</li>`;
      return items.map(r => {
        const name = r.name ?? r.id ?? '?';
        const id = r.id ?? '';
        return `<li><span>${this._esc(name)}</span><span class="hse-cfg__list-eid">${this._esc(id)}</span></li>`;
      }).join('');
    };
    const renderTypes = (items) => {
      if (!items.length) return `<li>Aucun type.</li>`;
      return items.map(t => {
        const icon = TYPE_ICON[t?.toLowerCase()] ?? '';
        return `<li><span>${icon} ${this._esc(t ?? '?')}</span></li>`;
      }).join('');
    };
    this._setMetaBody(`
      <div class="hse-cfg__grid">
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">Pièces (${rooms.length})</div>
          <ul class="hse-cfg__list">${renderRooms(rooms)}</ul>
        </div>
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">Types d'appareils (${types.length})</div>
          <ul class="hse-cfg__list">${renderTypes(types)}</ul>
        </div>
      </div>`);
  }

  _setMetaBody(html) { const el = this._el?.querySelector('#hse-cfg-meta-body'); if (el) el.innerHTML = html; }

  async _loadPricing() {
    if (this._pricingFetching) return;
    this._pricingFetching = true;
    this._setPricingBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._pricingSig) return;
      this._pricingSig = sig; this._pricingData = data;
      this._renderPricing();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setPricingBody(`<div class="hse-error">Erreur tarification — ${e.message}</div>`);
    } finally { this._pricingFetching = false; }
  }

  _renderPricing() {
    const d = this._pricingData ?? {};
    // DELTA-065 FIX : utiliser les clés backend réelles
    const mode = d.mode ?? 'flat';
    const isHphc = mode === 'hphc';
    const taxRate = d.tax_rate_pct ?? 20;
    const priceHtKwh = d.price_ht_kwh ?? 0;
    const priceTtcKwh = d.price_ttc_kwh ?? 0.25;
    const priceHpTtc = d.price_hp_ttc_kwh ?? 0;
    const priceHcTtc = d.price_hc_ttc_kwh ?? 0;
    const subscription = d.subscription_eur_month ?? 0;

    this._setPricingBody(`
      <div class="hse-cfg__pricing-wrap">
        <div class="hse-cfg__pricing-info">📅 Les modifications seront appliquées après sauvegarde.</div>
        <form id="hse-cfg-pricing-form">
          <div class="hse-cfg__pricing-section">
            <div class="hse-cfg__pricing-section-title">⚙️ Configuration Tarifaire</div>
            <div class="hse-cfg__pricing-body">
              <div class="hse-cfg__field">
                <label class="hse-cfg__label">Type de contrat</label>
                <select id="hse-cfg-mode" name="mode" class="hse-cfg__select">
                  <option value="flat" ${!isHphc ? 'selected' : ''}>Forfait simple (base)</option>
                  <option value="hphc" ${isHphc ? 'selected' : ''}>Heures Pleines / Heures Creuses</option>
                </select>
              </div>
              <div class="hse-cfg__field-row">
                <div class="hse-cfg__field">
                  <label class="hse-cfg__label">Abonnement mensuel (€ TTC)</label>
                  <input id="hse-cfg-subscription" name="subscription_eur_month" type="number" step="0.01" class="hse-cfg__input" value="${subscription}" placeholder="0.00" />
                </div>
                <div class="hse-cfg__field">
                  <label class="hse-cfg__label">Taux de TVA (%)</label>
                  <input id="hse-cfg-tax-rate" name="tax_rate_pct" type="number" step="0.1" class="hse-cfg__input" value="${taxRate}" placeholder="20.0" />
                </div>
              </div>
              <div id="hse-cfg-base-fields" style="${isHphc ? 'display:none' : ''}">
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label">Prix HT kWh (€)</label>
                    <input id="hse-cfg-price-ht" name="price_ht_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${priceHtKwh}" placeholder="0.0000" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label">Prix TTC kWh (€)</label>
                    <div class="hse-cfg__input-ttc" id="hse-cfg-price-ttc-display">${priceTtcKwh > 0 ? priceTtcKwh.toFixed(4) : '—'}</div>
                  </div>
                </div>
              </div>
              <div id="hse-cfg-hphc-fields" class="hse-cfg__hp-hc ${isHphc ? 'visible' : ''}">
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label">Prix HP TTC kWh (€)</label>
                    <input id="hse-cfg-price-hp" name="price_hp_ttc_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${priceHpTtc}" placeholder="0.0000" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label">Prix HC TTC kWh (€)</label>
                    <input id="hse-cfg-price-hc" name="price_hc_ttc_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${priceHcTtc}" placeholder="0.0000" />
                  </div>
                </div>
              </div>
              <div class="hse-cfg__preview">
                <span class="hse-cfg__preview-label">Estimation mensuelle (abonnement inclus)</span>
                <span class="hse-cfg__preview-value" id="hse-cfg-preview-val">—</span>
              </div>
              <div class="hse-cfg__save-row">
                <button type="submit" id="hse-cfg-save-btn" class="hse-btn hse-btn--primary">Sauvegarder</button>
                <span id="hse-cfg-save-status" class="hse-cfg__save-status"></span>
              </div>
            </div>
          </div>
        </form>
      </div>`);
    this._bindPricingForm();
    this._updatePricingPreview();
  }

  _bindPricingForm() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;
    const modeSel = form.querySelector('#hse-cfg-mode');
    const hphcFields = form.querySelector('#hse-cfg-hphc-fields');
    const baseFields = form.querySelector('#hse-cfg-base-fields');
    modeSel?.addEventListener('change', () => {
      const hphc = modeSel.value === 'hphc';
      hphcFields?.classList.toggle('visible', hphc);
      if (baseFields) baseFields.style.display = hphc ? 'none' : '';
      this._updatePricingPreview();
    });
    form.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => this._updatePricingPreview()));
    form.addEventListener('submit', async e => { e.preventDefault(); await this._savePricing(form); });
  }

  _updatePricingPreview() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;
    const tax = parseFloat(form.querySelector('#hse-cfg-tax-rate')?.value) || 20;
    const mult = 1 + tax / 100;
    const sub = parseFloat(form.querySelector('#hse-cfg-subscription')?.value) || 0;
    const mode = form.querySelector('#hse-cfg-mode')?.value ?? 'flat';
    const priceHt = parseFloat(form.querySelector('#hse-cfg-price-ht')?.value) || 0;
    const ttcDisplay = form.querySelector('#hse-cfg-price-ttc-display');
    if (ttcDisplay) ttcDisplay.textContent = priceHt > 0 ? (priceHt * mult).toFixed(4) : '—';
    const val = this._el?.querySelector('#hse-cfg-preview-val');
    if (!val) return;
    let priceKwh = 0;
    if (mode === 'hphc') priceKwh = parseFloat(form.querySelector('#hse-cfg-price-hp')?.value) || 0;
    else priceKwh = priceHt * mult;
    const estimateKwh = 500;
    const total = (estimateKwh * priceKwh) + sub;
    val.textContent = total > 0 ? `${total.toFixed(2)} €/mois` : '—';
  }

  async _savePricing(form) {
    if (this._pricingSaving) return;
    this._pricingSaving = true;
    const btn = form.querySelector('#hse-cfg-save-btn');
    const status = form.querySelector('#hse-cfg-save-status');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    if (status) status.textContent = '';
    const payload = {
      mode: form.querySelector('#hse-cfg-mode')?.value || 'flat',
      subscription_eur_month: parseFloat(form.querySelector('#hse-cfg-subscription')?.value) || 0,
      tax_rate_pct: parseFloat(form.querySelector('#hse-cfg-tax-rate')?.value) || 20,
    };
    if (payload.mode === 'flat') {
      payload.price_ht_kwh = parseFloat(form.querySelector('#hse-cfg-price-ht')?.value) || 0;
      payload.price_ttc_kwh = payload.price_ht_kwh * (1 + payload.tax_rate_pct / 100);
    } else {
      payload.price_hp_ttc_kwh = parseFloat(form.querySelector('#hse-cfg-price-hp')?.value) || 0;
      payload.price_hc_ttc_kwh = parseFloat(form.querySelector('#hse-cfg-price-hc')?.value) || 0;
    }
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._pricingSig = null;
      if (status) { status.textContent = '✓ Enregistré'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = `⚠ Erreur : ${e.message}`;
    } finally {
      this._pricingSaving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Sauvegarder'; }
    }
  }

  _setPricingBody(html) { const el = this._el?.querySelector('#hse-cfg-pricing-body'); if (el) el.innerHTML = html; }

  _attrVal(str) { if (str == null) return ''; return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  _esc(str) { if (str == null) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
}
