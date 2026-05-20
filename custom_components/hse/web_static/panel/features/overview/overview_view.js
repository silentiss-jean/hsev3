/**
 * overview_view.js — Onglet Overview/Dashboard HSE V3
 *
 * Affiche : puissance live, conso 4 périodes, top5, by_room, by_type, référence
 * Endpoint : GET /api/hse/overview (polling 30s)
 * Règles V3 : R1-R5
 */

const CSS = `
.hse-overview { display: flex; flex-direction: column; gap: 20px; }
.hse-overview__header { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.hse-overview__card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.hse-overview__card-label { font-size: 0.78rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.04em; }
.hse-overview__card-value { font-size: 1.75rem; font-weight: 700; color: #e879f9; line-height: 1.2; }
.hse-overview__card-unit { font-size: 0.875rem; color: rgba(255,255,255,0.4); font-weight: 400; }
.hse-overview__card-sub { font-size: 0.78rem; color: rgba(255,255,255,0.35); }
.hse-overview__consumption { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.hse-overview__consumption-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
.hse-overview__consumption-title { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin-bottom: 6px; text-transform: capitalize; }
.hse-overview__consumption-kwh { font-size: 1.25rem; font-weight: 600; color: rgba(255,255,255,0.9); }
.hse-overview__consumption-eur { font-size: 0.875rem; color: #4ade80; font-weight: 500; }
.hse-overview__section-title { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.hse-overview__top5 { display: flex; flex-direction: column; gap: 8px; }
.hse-overview__top5-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
.hse-overview__top5-rank { font-size: 0.875rem; font-weight: 700; color: #e879f9; min-width: 24px; text-align: center; }
.hse-overview__top5-info { flex: 1; min-width: 0; }
.hse-overview__top5-name { font-size: 0.875rem; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hse-overview__top5-eid { font-size: 0.72rem; color: rgba(255,255,255,0.35); font-family: monospace; }
.hse-overview__top5-power { font-size: 1rem; font-weight: 600; color: #facc15; }
.hse-overview__top5-bar { width: 60px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.hse-overview__top5-bar-fill { height: 100%; background: #e879f9; border-radius: 2px; transition: width 300ms ease; }
.hse-overview__grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.hse-overview__list-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
.hse-overview__list-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.hse-overview__list-item:last-child { border-bottom: none; }
.hse-overview__list-name { font-size: 0.875rem; color: rgba(255,255,255,0.8); }
.hse-overview__list-value { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.9); }
.hse-overview__list-pct { font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-left: 6px; }
.hse-overview__ref-card { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px; }
.hse-overview__ref-icon { font-size: 1.5rem; }
.hse-overview__ref-info { flex: 1; }
.hse-overview__ref-title { font-size: 0.78rem; color: rgba(255,255,255,0.5); }
.hse-overview__ref-value { font-size: 1.1rem; font-weight: 600; color: #f59e0b; }
.hse-overview__ref-delta { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
.hse-overview__ref-delta.positive { color: #4ade80; }
.hse-overview__ref-delta.negative { color: #f87171; }
.hse-overview__status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; }
.hse-overview__status--ok { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #4ade80; }
.hse-overview__status--warning { background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2); color: #facc15; }
.hse-overview__status--error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }
@keyframes hse-shimmer { 0% { background-position:-200% 0; } 100% { background-position: 200% 0; } }
.hse-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite; border-radius:10px; min-height:120px; width:100%; }
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error { color:#f87171; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:0.875rem; }
.hse-empty { text-align:center; padding:48px 16px; color:rgba(255,255,255,0.35); }
`;

const POLLING_INTERVAL = 30000;

export class OverviewView {
  constructor() {
    this._el = null; this._ctx = null;
    this._abort = null;
    this._mounted = false; this._fetching = false;
    this._lastSig = null; this._timer = null; this._data = null;
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
    if (document.getElementById('hse-overview-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-overview-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildSkeleton() {
    this._el.innerHTML = `
      <div class="hse-overview">
        <div class="hse-overview__header">
          <div class="hse-overview__card"><div class="hse-skeleton" style="min-height:80px"></div></div>
          <div class="hse-overview__card"><div class="hse-skeleton" style="min-height:80px"></div></div>
          <div class="hse-overview__card"><div class="hse-skeleton" style="min-height:80px"></div></div>
        </div>
        <div class="hse-skeleton" style="min-height:200px"></div>
        <div class="hse-skeleton" style="min-height:150px"></div>
      </div>`;
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const r = await this._ctx.hseFetch('/api/hse/overview', { signal: this._abort?.signal });
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
    const powerNow = data.power_now_w ?? 0;
    const consumption = data.consumption ?? {};
    const top5 = data.top5 ?? [];
    const byRoom = data.by_room ?? [];
    const byType = data.by_type ?? [];
    const refSensor = data.reference_sensor;
    const status = data.status ?? { level: 'warning', message: 'Aucune donnée' };
    const statusClass = `hse-overview__status--${status.level}`;
    const statusIcon = status.level === 'ok' ? '✓' : status.level === 'warning' ? '⚠' : '✕';

    this._el.innerHTML = `
      <div class="hse-overview">
        <div class="hse-overview__status ${statusClass}">
          <span>${statusIcon}</span><span>${status.message ?? 'Statut inconnu'}</span>
        </div>
        <div class="hse-overview__header">
          <div class="hse-overview__card">
            <span class="hse-overview__card-label">Puissance totale</span>
            <span class="hse-overview__card-value">${powerNow.toLocaleString('fr-FR')}</span>
            <span class="hse-overview__card-unit">watts</span>
          </div>
          <div class="hse-overview__card">
            <span class="hse-overview__card-label">Aujourd'hui</span>
            <span class="hse-overview__card-value">${(consumption.today_kwh ?? 0).toFixed(2)}</span>
            <span class="hse-overview__card-unit">kWh</span>
            <span class="hse-overview__card-sub">${(consumption.today_eur ?? 0).toFixed(2)} € TTC</span>
          </div>
          <div class="hse-overview__card">
            <span class="hse-overview__card-label">Ce mois</span>
            <span class="hse-overview__card-value">${(consumption.month_kwh ?? 0).toFixed(1)}</span>
            <span class="hse-overview__card-unit">kWh</span>
            <span class="hse-overview__card-sub">${(consumption.month_eur ?? 0).toFixed(2)} € TTC</span>
          </div>
        </div>
        <div>
          <div class="hse-overview__section-title">📊 Consommation</div>
          <div class="hse-overview__consumption">
            ${this._renderConsumptionCard("Aujourd'hui", consumption.today_kwh, consumption.today_eur)}
            ${this._renderConsumptionCard('Cette semaine', consumption.week_kwh, consumption.week_eur)}
            ${this._renderConsumptionCard('Ce mois', consumption.month_kwh, consumption.month_eur)}
            ${this._renderConsumptionCard('Cette année', consumption.year_kwh, consumption.year_eur)}
          </div>
        </div>
        ${refSensor ? `
        <div class="hse-overview__ref-card">
          <span class="hse-overview__ref-icon">⭐</span>
          <div class="hse-overview__ref-info">
            <div class="hse-overview__ref-title">Capteur de référence</div>
            <div class="hse-overview__ref-value">${refSensor.power_w.toLocaleString('fr-FR')} W</div>
            <div class="hse-overview__ref-delta ${refSensor.delta_w >= 0 ? 'positive' : 'negative'}">
              Δ ${refSensor.delta_w >= 0 ? '+' : ''}${refSensor.delta_w.toFixed(1)} W (${refSensor.delta_pct >= 0 ? '+' : ''}${refSensor.delta_pct}%)
            </div>
          </div>
        </div>` : ''}
        <div>
          <div class="hse-overview__section-title">🔥 Top 5 consommateurs (live)</div>
          <div class="hse-overview__top5">
            ${top5.length ? top5.map((item, idx) => this._renderTop5Item(item, idx, top5[0]?.power_w ?? 1)).join('') : '<div class="hse-empty">Aucun capteur actif</div>'}
          </div>
        </div>
        <div class="hse-overview__grid-2">
          <div class="hse-overview__list-card">
            <div class="hse-overview__section-title">🏠 Par pièce</div>
            ${byRoom.length ? byRoom.map(r => `
              <div class="hse-overview__list-item">
                <span class="hse-overview__list-name">${this._esc(r.room)}</span>
                <span><span class="hse-overview__list-value">${r.power_w.toFixed(1)} W</span><span class="hse-overview__list-pct">(${r.pct}%)</span></span>
              </div>`).join('') : '<div class="hse-empty">Aucune pièce assignée</div>'}
          </div>
          <div class="hse-overview__list-card">
            <div class="hse-overview__section-title">⚡ Par type</div>
            ${byType.length ? byType.map(t => `
              <div class="hse-overview__list-item">
                <span class="hse-overview__list-name">${this._esc(t.type)}</span>
                <span class="hse-overview__list-value">${t.power_w.toFixed(1)} W</span>
              </div>`).join('') : '<div class="hse-empty">Aucun type assigné</div>'}
          </div>
        </div>
      </div>`;
  }

  _renderConsumptionCard(label, kwh, eur) {
    return `
      <div class="hse-overview__consumption-card">
        <div class="hse-overview__consumption-title">${label}</div>
        <div class="hse-overview__consumption-kwh">${(kwh ?? 0).toFixed(2)} kWh</div>
        <div class="hse-overview__consumption-eur">${(eur ?? 0).toFixed(2)} €</div>
      </div>`;
  }

  _renderTop5Item(item, idx, maxPower) {
    const pct = maxPower > 0 ? Math.round((item.power_w / maxPower) * 100) : 0;
    return `
      <div class="hse-overview__top5-item">
        <span class="hse-overview__top5-rank">${idx + 1}</span>
        <div class="hse-overview__top5-info">
          <div class="hse-overview__top5-name">${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-overview__top5-eid">${this._esc(item.entity_id)}</div>
        </div>
        <div class="hse-overview__top5-bar"><div class="hse-overview__top5-bar-fill" style="width:${pct}%"></div></div>
        <span class="hse-overview__top5-power">${item.power_w.toFixed(1)} W</span>
      </div>`;
  }

  _renderError(err) { this._el.innerHTML = `<div class="hse-error">Erreur : ${err.message}</div>`; }

  _esc(str) { if (str == null) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
}
