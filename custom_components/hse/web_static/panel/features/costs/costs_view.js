/**
 * costs_view.js — Onglet Analyse de Coûts HSE V3
 *
 * Affiche : tableau coûts par appareil, filtre période, export CSV/JSON
 * Endpoints : GET /api/hse/costs?period= (polling 60s), GET /api/hse/export
 * Règles V3 : R1-R5
 */

const CSS = `
.hse-costs { display: flex; flex-direction: column; gap: 20px; }
.hse-costs__toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hse-costs__period { padding: 8px 12px; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; background: rgba(255,255,255,0.05); color: inherit; font-size: 0.875rem; font-family: inherit; cursor: pointer; outline: none; }
.hse-costs__total-box { margin-left: auto; display: flex; align-items: baseline; gap: 12px; padding: 10px 16px; background: rgba(232,121,249,0.06); border: 1px solid rgba(232,121,249,0.15); border-radius: 10px; }
.hse-costs__total-label { font-size: 0.78rem; color: rgba(255,255,255,0.5); }
.hse-costs__total-value { font-size: 1.25rem; font-weight: 700; color: #e879f9; }
.hse-costs__total-sub { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
.hse-costs__table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
table.hse-costs__table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.hse-costs__table th { padding: 10px 12px; text-align: left; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; background: rgba(255,255,255,0.03); cursor: pointer; user-select: none; }
.hse-costs__table th:hover { color: rgba(255,255,255,0.8); }
.hse-costs__table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
.hse-costs__table tr:last-child td { border-bottom: none; }
.hse-costs__table tr:hover td { background: rgba(255,255,255,0.02); }
.hse-costs__name { font-weight: 500; color: rgba(255,255,255,0.9); }
.hse-costs__eid { font-size: 0.72rem; color: rgba(255,255,255,0.35); font-family: monospace; }
.hse-costs__room { font-size: 0.78rem; color: rgba(255,255,255,0.5); }
.hse-costs__power { font-weight: 600; color: #facc15; }
.hse-costs__energy { color: rgba(255,255,255,0.8); }
.hse-costs__cost { font-weight: 600; color: #4ade80; }
.hse-costs__cost-ht { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
.hse-costs__pct { display: inline-flex; align-items: center; gap: 6px; }
.hse-costs__pct-bar { width: 40px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.hse-costs__pct-bar-fill { height: 100%; background: #e879f9; border-radius: 2px; }
.hse-costs__pct-value { font-size: 0.78rem; color: rgba(255,255,255,0.5); min-width: 36px; text-align: right; }
.hse-costs__sort::after { content: ' ⇅'; opacity: 0.3; font-size: 0.7rem; }
.hse-costs__sort.asc::after { content: ' ↑'; opacity: 1; }
.hse-costs__sort.desc::after { content: ' ↓'; opacity: 1; }
.hse-costs__export { display: flex; gap: 8px; align-items: center; }
@keyframes hse-shimmer { 0% { background-position:-200% 0; } 100% { background-position: 200% 0; } }
.hse-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite; border-radius:10px; min-height:120px; width:100%; }
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error { color:#f87171; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:0.875rem; }
.hse-empty { text-align:center; padding:48px 16px; color:rgba(255,255,255,0.35); }
`;

const POLLING_INTERVAL = 60000;
const PERIODS = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export class CostsView {
  constructor() {
    this._el = null; this._ctx = null; this._abort = null;
    this._mounted = false; this._fetching = false;
    this._lastSig = null; this._timer = null; this._data = null;
    this._period = 'month'; this._sortCol = 'cost_ttc_eur'; this._sortDir = 'desc';
  }

  mount(el, ctx) {
    this._el = el; this._ctx = ctx; this._abort = new AbortController();
    this._mounted = true; this._injectCSS(); this._buildSkeleton();
    this._fetchData(); this._timer = setInterval(() => this._fetchData(), POLLING_INTERVAL);
  }

  update_hass(hass) { this._ctx = { ...this._ctx, hass }; }

  unmount() {
    this._mounted = false;
    if (this._timer) clearInterval(this._timer);
    if (this._abort) this._abort.abort();
    this._abort = null; this._el = null; this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-costs-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-costs-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildSkeleton() {
    this._el.innerHTML = `
      <div class="hse-costs">
        <div class="hse-skeleton" style="min-height:48px"></div>
        <div class="hse-skeleton" style="min-height:300px"></div>
      </div>`;
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const r = await this._ctx.hseFetch(`/api/hse/costs?period=${this._period}`, { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._lastSig) return;
      this._lastSig = sig; this._data = data;
      this._render(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._renderError(e);
    } finally { this._fetching = false; }
  }

  _render(data) {
    const items = this._getSortedItems(data.items ?? []);
    const totalKwh = data.total_kwh ?? 0;
    const totalTtc = data.total_ttc_eur ?? 0;

    this._el.innerHTML = `
      <div class="hse-costs">
        <div class="hse-costs__toolbar">
          <select id="hse-costs-period" class="hse-costs__period">
            ${PERIODS.map(p => `<option value="${p.value}" ${p.value === this._period ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <div class="hse-costs__export">
            <button id="hse-costs-export-csv" class="hse-btn hse-btn--ghost hse-btn--sm">📥 CSV</button>
            <button id="hse-costs-export-json" class="hse-btn hse-btn--ghost hse-btn--sm">📥 JSON</button>
          </div>
          <div class="hse-costs__total-box">
            <span class="hse-costs__total-label">Total période</span>
            <span class="hse-costs__total-value">${totalTtc.toFixed(2)} €</span>
            <span class="hse-costs__total-sub">${totalKwh.toFixed(2)} kWh</span>
          </div>
        </div>
        <div class="hse-costs__table-wrap">
          <table class="hse-costs__table">
            <thead>
              <tr>
                <th>Appareil</th>
                <th>Pièce</th>
                <th class="hse-costs__sort ${this._sortCol === 'power_w' ? this._sortDir : ''}" data-sort="power_w">Puissance</th>
                <th class="hse-costs__sort ${this._sortCol === 'energy_kwh' ? this._sortDir : ''}" data-sort="energy_kwh">Énergie</th>
                <th class="hse-costs__sort ${this._sortCol === 'cost_ht_eur' ? this._sortDir : ''}" data-sort="cost_ht_eur">Coût HT</th>
                <th class="hse-costs__sort ${this._sortCol === 'cost_ttc_eur' ? this._sortDir : ''}" data-sort="cost_ttc_eur">Coût TTC</th>
                <th>% Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map(item => this._renderRow(item, totalTtc)).join('') : '<tr><td colspan="7" class="hse-empty">Aucun appareil sélectionné</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    this._bindEvents();
  }

  _renderRow(item, totalTtc) {
    const pct = totalTtc > 0 ? Math.round((item.cost_ttc_eur / totalTtc) * 100) : 0;
    return `
      <tr data-entity-id="${this._attrVal(item.entity_id)}">
        <td>
          <div class="hse-costs__name">${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-costs__eid">${this._esc(item.entity_id)}</div>
        </td>
        <td><span class="hse-costs__room">${this._esc(item.room ?? '—')}</span></td>
        <td><span class="hse-costs__power">${item.power_w} W</span></td>
        <td><span class="hse-costs__energy">${item.energy_kwh.toFixed(3)} kWh</span></td>
        <td><span class="hse-costs__cost-ht">${item.cost_ht_eur.toFixed(2)} €</span></td>
        <td><span class="hse-costs__cost">${item.cost_ttc_eur.toFixed(2)} €</span></td>
        <td>
          <div class="hse-costs__pct">
            <div class="hse-costs__pct-bar"><div class="hse-costs__pct-bar-fill" style="width:${pct}%"></div></div>
            <span class="hse-costs__pct-value">${pct}%</span>
          </div>
        </td>
      </tr>`;
  }

  _getSortedItems(items) {
    return [...items].sort((a, b) => {
      const va = a[this._sortCol] ?? 0; const vb = b[this._sortCol] ?? 0;
      if (this._sortDir === 'asc') return va - vb;
      return vb - va;
    });
  }

  _bindEvents() {
    const periodSel = this._el?.querySelector('#hse-costs-period');
    periodSel?.addEventListener('change', () => {
      this._period = periodSel.value; this._lastSig = null; this._fetchData();
    });
    this._el?.querySelectorAll('.hse-costs__sort').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (this._sortCol === col) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortCol = col; this._sortDir = 'desc'; }
        this._render(this._data);
      });
    });
    this._el?.querySelector('#hse-costs-export-csv')?.addEventListener('click', () => this._export('csv'));
    this._el?.querySelector('#hse-costs-export-json')?.addEventListener('click', () => this._export('json'));
  }

  async _export(format) {
    try {
      const r = await this._ctx.hseFetch(`/api/hse/export?period=${this._period}&format=${format}`, { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hse_export_${this._period}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      if (e.name === 'AbortError') return;
      alert(`Erreur export : ${e.message}`);
    }
  }

  _renderError(err) { this._el.innerHTML = `<div class="hse-error">Erreur : ${err.message}</div>`; }

  _attrVal(str) { if (str == null) return ''; return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  _esc(str) { if (str == null) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
}
