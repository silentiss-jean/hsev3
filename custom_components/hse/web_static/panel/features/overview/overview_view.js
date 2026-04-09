/**
 * overview_view.js — Onglet 1 : Vue d'ensemble (live)
 *
 * Endpoints : GET /api/hse/overview  (polling 30s, suspendu si unmount)
 * Polling : type LECTURE — 30s auto, annulé dans unmount()
 * Règles R1–R5 respectées (00_methode_front_commune.md)
 */

export class OverviewView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._timer    = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
  }

  // ─── Cycle de vie ──────────────────────────────────────────────────────────

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    this._buildSkeleton();
    this._fetchData();
    // Polling 30s — type lecture
    this._timer = setInterval(() => this._fetchData(), 30_000);
  }

  update_hass(hass) {
    this._hass = hass; // R1 — pas de DOM
  }

  unmount() {
    this._mounted = false;
    if (this._timer)    { clearInterval(this._timer);   this._timer    = null; }
    if (this._abortCtl) { this._abortCtl.abort();        this._abortCtl = null; }
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async _fetchData() {
    if (!this._mounted) return;
    if (this._fetching) return;  // R2
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch('/api/hse/overview', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const data = await resp.json();
      this._applyData(data);
    } catch (e) {
      if (e.name !== 'AbortError') this._renderError(e);
    } finally {
      this._fetching = false;
    }
  }

  _applyData(data) {
    const sig = JSON.stringify(data);  // R3
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  _buildSkeleton() {  // R5
    this._root.innerHTML = `
      <div class="hse-overview">
        <div class="hse-skeleton" style="height:80px;border-radius:8px;margin-bottom:12px"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
          ${Array(4).fill('<div class="hse-skeleton" style="height:64px;border-radius:8px"></div>').join('')}
        </div>
        <div class="hse-skeleton" style="height:160px;border-radius:8px"></div>
      </div>`;
  }

  _render(data) {
    // Première fois : construire le DOM complet
    if (!this._root.querySelector('.hse-overview-root')) {
      this._root.innerHTML = this._buildHTML(data);
      return;
    }
    // Mises à jour suivantes : textContent uniquement (R1 — pas de innerHTML)
    this._root.querySelector('.ov-power-now').textContent     = `${data.power_now_w} W`;
    this._root.querySelector('.ov-today-kwh').textContent     = `${data.consumption.today_kwh} kWh`;
    this._root.querySelector('.ov-today-eur').textContent     = `${data.consumption.today_eur} €`;
    this._root.querySelector('.ov-month-kwh').textContent     = `${data.consumption.month_kwh} kWh`;
    this._root.querySelector('.ov-month-eur').textContent     = `${data.consumption.month_eur} €`;
    this._root.querySelector('.ov-status-badge').textContent  = data.status.message ?? data.status.level;
    this._root.querySelector('.ov-status-badge').dataset.level = data.status.level;
    // Top 5
    const top5 = this._root.querySelectorAll('.ov-top5-row');
    (data.top5 ?? []).forEach((item, i) => {
      if (!top5[i]) return;
      top5[i].querySelector('.ov-top5-name').textContent  = item.name;
      top5[i].querySelector('.ov-top5-power').textContent = `${item.power_w} W`;
      top5[i].querySelector('.ov-top5-pct').textContent   = `${item.pct} %`;
    });
    // Capteur référence
    if (data.reference_sensor) {
      const ref = this._root.querySelector('.ov-ref-delta');
      if (ref) ref.textContent = `Δ ${data.reference_sensor.delta_w} W (${data.reference_sensor.delta_pct} %)`;
    }
  }

  _buildHTML(d) {
    const c = d.consumption;
    const s = d.status;
    const top5Rows = (d.top5 ?? []).map(t => `
      <tr class="ov-top5-row">
        <td class="ov-top5-name">${this._esc(t.name)}</td>
        <td class="ov-top5-power">${t.power_w} W</td>
        <td class="ov-top5-pct">${t.pct} %</td>
      </tr>`).join('');
    const refHtml = d.reference_sensor ? `
      <div class="hse-card ov-ref">
        <span class="hse-label">Capteur référence</span>
        <span class="ov-ref-delta">Δ ${d.reference_sensor.delta_w} W (${d.reference_sensor.delta_pct} %)</span>
      </div>` : '';
    return `
      <div class="hse-overview-root">
        <div class="hse-card ov-hero">
          <span class="hse-label">Puissance instantanée</span>
          <span class="ov-power-now hse-value-large">${d.power_now_w} W</span>
          <span class="ov-status-badge hse-badge" data-level="${s.level}">${s.message ?? s.level}</span>
        </div>
        <div class="hse-grid-4">
          <div class="hse-card"><span class="hse-label">Aujourd'hui</span><span class="ov-today-kwh">${c.today_kwh} kWh</span><span class="ov-today-eur hse-muted">${c.today_eur} €</span></div>
          <div class="hse-card"><span class="hse-label">Semaine</span><span>${c.week_kwh} kWh</span><span class="hse-muted">${c.week_eur} €</span></div>
          <div class="hse-card"><span class="hse-label">Mois</span><span class="ov-month-kwh">${c.month_kwh} kWh</span><span class="ov-month-eur hse-muted">${c.month_eur} €</span></div>
          <div class="hse-card"><span class="hse-label">Année</span><span>${c.year_kwh} kWh</span><span class="hse-muted">${c.year_eur} €</span></div>
        </div>
        ${refHtml}
        <div class="hse-card">
          <span class="hse-label">Top 5 appareils</span>
          <table class="hse-table"><tbody>${top5Rows}</tbody></table>
        </div>
      </div>`;
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur overview : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default OverviewView;
