/**
 * costs_view.js — Onglet Analyse de Coûts HSE V3
 *
 * Affiche : tableau coûts par appareil, filtre période, export CSV/JSON
 * Endpoints : GET /api/hse/costs?period= (polling 60s), GET /api/hse/export
 * Règles V3 : R1-R5
 * FIX-2026-07-04 M2 : DOM construit une fois dans mount(), mise à jour via textContent
 * FIX-2026-07-04 C2 : annulation fetch précédent avant relance après changement période
 */

import { escHtml, escAttr } from '../../shared/hse_esc.js';

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
.hse-costs__ref { display: none; border-radius: 10px; padding: 12px 16px; border: 1px solid; font-size: 0.8rem; }
.hse-costs__ref.is-on { display: block; }
.hse-costs__ref[data-level="ok"] { border-color: rgba(74,222,128,0.25); background: rgba(74,222,128,0.06); }
.hse-costs__ref[data-level="warn"] { border-color: rgba(250,204,21,0.25); background: rgba(250,204,21,0.06); }
.hse-costs__ref[data-level="error"] { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); }
.hse-costs__ref-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.hse-costs__ref-title { font-weight: 600; color: rgba(255,255,255,0.9); }
.hse-costs__ref-badge { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
.hse-costs__ref[data-level="ok"] .hse-costs__ref-badge { background: rgba(74,222,128,0.15); color: #4ade80; }
.hse-costs__ref[data-level="warn"] .hse-costs__ref-badge { background: rgba(250,204,21,0.15); color: #facc15; }
.hse-costs__ref[data-level="error"] .hse-costs__ref-badge { background: rgba(248,113,113,0.18); color: #f87171; }
.hse-costs__ref-grid { display: flex; flex-wrap: wrap; gap: 6px 22px; }
.hse-costs__ref-item { display: flex; flex-direction: column; gap: 1px; }
.hse-costs__ref-item b { font-size: 0.92rem; font-weight: 600; color: rgba(255,255,255,0.92); }
.hse-costs__ref-item span { font-size: 0.7rem; color: rgba(255,255,255,0.45); }
.hse-costs__ref-note { margin-top: 8px; font-size: 0.74rem; color: rgba(255,255,255,0.55); }
.hse-costs__ref[data-level="error"] .hse-costs__ref-note { color: #fca5a5; }
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
    // M2: refs DOM pour patch textContent
    this._els = {};
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

    // M2: première fois → construire le DOM complet et stocker les refs
    if (!this._els.totalValue) {
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
              <span class="hse-costs__total-value" id="hse-total-value">${totalTtc.toFixed(2)} €</span>
              <span class="hse-costs__total-sub" id="hse-total-kwh">${totalKwh.toFixed(2)} kWh</span>
            </div>
          </div>
          <div id="hse-costs-ref" class="hse-costs__ref" data-level="ok"></div>
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
              <tbody id="hse-costs-tbody">
                ${items.length ? items.map(item => this._renderRow(item, totalTtc)).join('') : '<tr><td colspan="7" class="hse-empty">Aucun appareil sélectionné</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>`;
      // Stocker les refs
      this._els = {
        totalValue: this._el.querySelector('#hse-total-value'),
        totalKwh: this._el.querySelector('#hse-total-kwh'),
        tbody: this._el.querySelector('#hse-costs-tbody'),
        ref: this._el.querySelector('#hse-costs-ref'),
      };
      this._bindEvents();
    } else {
      // Mises à jour textContent uniquement
      this._els.totalValue.textContent = totalTtc.toFixed(2) + ' €';
      this._els.totalKwh.textContent = totalKwh.toFixed(2) + ' kWh';
      // Rebuild tbody (peu de lignes, OK)
      this._els.tbody.innerHTML = items.length ? items.map(item => this._renderRow(item, totalTtc)).join('') : '<tr><td colspan="7" class="hse-empty">Aucun appareil sélectionné</td></tr>';
    }

    // DELTA-067 (Q7) — réconciliation mesuré / référence Linky
    this._renderReference(data.reference);
  }

  /**
   * DELTA-067 — affiche la réconciliation entre la consommation suivie et le
   * capteur de référence (index Linky/facturable).
   *
   * Le backend envoie `reference.status` ∈ {no_reference, reference_unavailable,
   * reference_too_low, ok, tracked_exceeds_ref} et un écart SIGNÉ
   * (`delta_kwh` = référence − mesuré). Un `delta` négatif signifie que le
   * suivi dépasse la référence : c'est une erreur de mesure, pas une économie.
   */
  _renderReference(ref) {
    const box = this._els?.ref;
    if (!box) return;
    if (!ref || !ref.reference_kwh) {
      // Pas de référence configurée : on masque le bloc (rien à réconcilier).
      box.classList.remove('is-on');
      box.innerHTML = '';
      return;
    }

    const isError = ref.status === 'tracked_exceeds_ref'
      || ref.quality?.level === 'error';
    const isWarn = ref.status === 'reference_too_low' || ref.status === 'reference_unavailable';
    const level = isError ? 'error' : (isWarn ? 'warn' : 'ok');

    const LABELS = {
      ok: 'Conforme',
      tracked_exceeds_ref: 'Dépasse la référence',
      reference_too_low: 'Référence trop basse',
      reference_unavailable: 'Référence indisponible',
      no_reference: 'Aucune référence',
    };

    const nf = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : '—');
    const delta = ref.delta_kwh;
    const deltaLabel = typeof delta === 'number' && delta < 0
      ? `${delta.toFixed(1)} kWh`   // négatif : alerte
      : `${nf(delta)} kWh`;
    const deltaSign = typeof delta === 'number' ? (delta < 0 ? '−' : '+') : '';

    const notes = (ref.quality?.notes ?? []).join(', ');

    box.className = `hse-costs__ref is-on`;
    box.dataset.level = level;
    box.innerHTML = `
      <div class="hse-costs__ref-head">
        <span class="hse-costs__ref-title">Réconciliation avec la référence</span>
        <span class="hse-costs__ref-badge">${escHtml(LABELS[ref.status] ?? ref.status ?? '')}</span>
      </div>
      <div class="hse-costs__ref-grid">
        <div class="hse-costs__ref-item">
          <b>${nf(ref.reference_kwh)} kWh / ${nf(ref.reference_eur, 2)} €</b>
          <span>Référence (${escHtml(ref.entity_id ?? '')})</span>
        </div>
        <div class="hse-costs__ref-item">
          <b>${nf(ref.tracked_kwh)} kWh</b>
          <span>Consommation suivie</span>
        </div>
        <div class="hse-costs__ref-item">
          <b>${deltaSign}${deltaLabel}</b>
          <span>Écart signé (référence − suivi)</span>
        </div>
        <div class="hse-costs__ref-item">
          <b>${nf(ref.untracked_kwh)} kWh</b>
          <span>Non suivi (plancher 0)</span>
        </div>
        <div class="hse-costs__ref-item">
          <b>${nf(ref.surplus_kwh)} kWh</b>
          <span>Dépassement éventuel</span>
        </div>
        <div class="hse-costs__ref-item">
          <b>${nf(ref.coverage_pct, 0)} %</b>
          <span>Couverture du suivi</span>
        </div>
      </div>
      ${notes ? `<div class="hse-costs__ref-note">⚠ ${escHtml(notes)}</div>` : ''}
      ${level === 'error' ? '<div class="hse-costs__ref-note">⚠ Le suivi dépasse la référence de plus de 10 % : doublons, mauvaise conversion ou capteur erroné à corriger.</div>' : ''}`;
  }

  _renderRow(item, totalTtc) {
    const pct = totalTtc > 0 ? Math.round((item.cost_ttc_eur / totalTtc) * 100) : 0;
    return `
      <tr data-entity-id="${escAttr(item.entity_id)}">
        <td>
          <div class="hse-costs__name">${escHtml(item.name ?? item.entity_id)}</div>
          <div class="hse-costs__eid">${escHtml(item.entity_id)}</div>
        </td>
        <td><span class="hse-costs__room">${escHtml(item.room ?? '—')}</span></td>
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
      this._period = periodSel.value;
      // FIX-2026-07-04 C2 : annuler le fetch précédent avant de relancer
      if (this._abort) this._abort.abort();
      this._abort = new AbortController();
      this._lastSig = null;
      this._fetching = false;
      this._fetchData();
    });
    this._el?.querySelectorAll('.hse-costs__sort').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
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
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hse_export_${this._period}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      if (e.name === 'AbortError') return;
      // FIX-2026-07-04 M12 : alert() → hse-error
      this._el.innerHTML = `<div class="hse-error">Erreur export : ${escHtml(e.message)}</div>`;
    }
  }

  _renderError(err) { this._el.innerHTML = `<div class="hse-error">Erreur : ${escHtml(err.message)}</div>`; }
}