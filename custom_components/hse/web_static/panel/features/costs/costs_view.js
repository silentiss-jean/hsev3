/**
 * costs_view.js — Onglet 8 : Analyse de coûts
 *
 * BUG V2 CORRIGÉ : tableau reconstruit une seule fois dans mount(),
 * puis mis à jour uniquement par textContent (règle R1 + règle supplémentaire).
 *
 * Endpoints :
 *   GET /api/hse/costs    — tableau coûts par appareil (polling 60s)
 *   GET /api/hse/history  — historique 12 mois
 *   GET /api/hse/export   — export CSV/JSON
 * Polling : 60s (type LECTURE — annulé dans unmount)
 * Règles R1–R5 respectées
 */

export class CostsView {
  constructor() {
    this._mounted      = false;
    this._fetching     = false;
    this._lastSig      = null;
    this._timer        = null;
    this._abortCtl     = null;
    this._hass         = null;
    this._ctx          = null;
    this._root         = null;
    this._period       = 'month';
    this._historyData  = null;
    this._domBuilt     = false;  // Guard re-render complet
  }

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    // Lire la période depuis les prefs (R4 — pas de localStorage)
    const prefs = ctx.store.get('userPrefs');
    if (prefs?.costs_period) this._period = prefs.costs_period;
    this._buildSkeleton();
    this._fetchData();
    // Polling 60s — type lecture
    this._timer = setInterval(() => this._fetchData(), 60_000);
  }

  update_hass(hass) { this._hass = hass; }  // R1

  unmount() {
    this._mounted = false;
    if (this._timer)    { clearInterval(this._timer);   this._timer    = null; }
    if (this._abortCtl) { this._abortCtl.abort();        this._abortCtl = null; }
    this._domBuilt = false;
  }

  // ─── Fetch coûts ──────────────────────────────────────────────────────────

  async _fetchData() {
    if (!this._mounted || this._fetching) return;  // R2
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch(`/api/hse/costs?period=${this._period}`, { signal: this._abortCtl.signal });
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
      <div class="hse-costs">
        <div class="hse-skeleton" style="height:44px;border-radius:8px;margin-bottom:12px"></div>
        <div class="hse-skeleton" style="height:300px;border-radius:8px"></div>
      </div>`;
  }

  _render(data) {
    // ★ Correction bug V2 :
    //   1ère fois → construire le DOM complet (mount autorisé)
    //   Fois suivantes → NE PAS reconstruire le tableau, juste les données (textContent)
    if (!this._domBuilt) {
      this._root.innerHTML = this._buildHTML(data);
      this._domBuilt = true;
      this._bindEvents();
      this._fetchHistory();
      return;
    }
    // Mise à jour ciblée — ZÉRO innerHTML sur le tableau
    this._root.querySelector('.costs-total-kwh').textContent = `${data.total_kwh} kWh`;
    this._root.querySelector('.costs-total-eur').textContent = `${data.total_ttc_eur} €`;
    this._updateTableRows(data.items);
  }

  _buildHTML(data) {
    const rows = this._buildTableRows(data.items);
    return `
      <div class="hse-costs-root">
        <div class="hse-toolbar">
          <span class="hse-label">Période :</span>
          <select class="hse-select costs-period-sel">
            ${['day','week','month','year'].map(p =>
              `<option value="${p}" ${p===this._period?'selected':''}>${{day:'Jour',week:'Semaine',month:'Mois',year:'Année'}[p]}</option>`)}
          </select>
          <span class="hse-muted">Total : <strong class="costs-total-kwh">${data.total_kwh} kWh</strong> — <strong class="costs-total-eur">${data.total_ttc_eur} €</strong></span>
          <button class="hse-btn hse-btn-ghost costs-export-csv">⬇ CSV</button>
          <button class="hse-btn hse-btn-ghost costs-export-json">⬇ JSON</button>
        </div>

        <table class="hse-table costs-table">
          <thead><tr>
            <th>Appareil</th><th>Pièce</th>
            <th class="tabnum">Puissance (W)</th>
            <th class="tabnum">Énergie (kWh)</th>
            <th class="tabnum">Coût TTC (€)</th>
            <th class="tabnum">% total</th>
          </tr></thead>
          <tbody class="costs-tbody">${rows}</tbody>
        </table>

        <div class="hse-card" style="margin-top:16px">
          <span class="hse-label">Historique 12 mois</span>
          <div class="costs-history-placeholder hse-skeleton" style="height:140px;border-radius:8px"></div>
        </div>
      </div>`;
  }

  /** Construit les <tr> du tableau (utilisé uniquement dans _buildHTML) */
  _buildTableRows(items) {
    if (!items?.length) return `<tr><td colspan="6" class="hse-empty">Aucune donnée</td></tr>`;
    return items.map((it, i) => `
      <tr data-row="${i}">
        <td class="cost-name">${this._esc(it.name)}<br><small class="hse-muted">${this._esc(it.entity_id)}</small></td>
        <td class="cost-room">${this._esc(it.room ?? '—')}</td>
        <td class="tabnum cost-power">${it.power_w}</td>
        <td class="tabnum cost-kwh">${it.energy_kwh}</td>
        <td class="tabnum cost-eur">${it.cost_ttc_eur}</td>
        <td class="tabnum cost-pct">${it.pct_total} %</td>
      </tr>`).join('');
  }

  /**
   * Mise à jour des lignes existantes — SANS reconstruire le tableau (fix bug V2).
   * Si le nombre de lignes change, rebuild autorisé (action manuelle = changement de période).
   */
  _updateTableRows(items) {
    const tbody = this._root.querySelector('.costs-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr[data-row]');
    if (rows.length !== (items?.length ?? 0)) {
      // Nombre de lignes différent (changement période) — rebuild autorisé
      tbody.innerHTML = this._buildTableRows(items);
      return;
    }
    // Même nombre de lignes → update textContent uniquement
    (items ?? []).forEach((it, i) => {
      const row = rows[i];
      if (!row) return;
      row.querySelector('.cost-power').textContent = it.power_w;
      row.querySelector('.cost-kwh').textContent   = it.energy_kwh;
      row.querySelector('.cost-eur').textContent   = it.cost_ttc_eur;
      row.querySelector('.cost-pct').textContent   = `${it.pct_total} %`;
    });
  }

  _bindEvents() {
    this._root.querySelector('.costs-period-sel')?.addEventListener('change', async (e) => {
      this._period = e.target.value;
      // Persister la période (R4)
      try {
        await this._ctx.hseFetch('/api/hse/user_prefs', { method: 'PATCH', body: JSON.stringify({ costs_period: this._period }) });
        this._ctx.store.patch('userPrefs', { costs_period: this._period });
      } catch {}
      this._lastSig = null;  // Forcer le re-render
      this._domBuilt = false;
      this._buildSkeleton();
      this._fetchData();
    });
    this._root.querySelector('.costs-export-csv')?.addEventListener('click', () => this._export('csv'));
    this._root.querySelector('.costs-export-json')?.addEventListener('click', () => this._export('json'));
  }

  // ─── Historique ───────────────────────────────────────────────────────────

  async _fetchHistory() {
    if (!this._mounted) return;
    try {
      const resp = await this._ctx.hseFetch(`/api/hse/history?granularity=month`);
      if (!this._mounted) return;
      const data = await resp.json();
      this._renderHistory(data);
    } catch {}
  }

  _renderHistory(data) {
    const el = this._root.querySelector('.costs-history-placeholder');
    if (!el) return;
    el.classList.remove('hse-skeleton');
    const points = data.points ?? [];
    if (!points.length) { el.textContent = 'Aucun historique disponible'; return; }
    const max = Math.max(...points.map(p => p.kwh));
    el.innerHTML = `
      <div class="costs-history-bars" style="display:flex;align-items:flex-end;gap:4px;height:120px">
        ${points.map(p => `
          <div title="${this._esc(p.label)} — ${p.kwh} kWh — ${p.eur_ttc} €"
            style="flex:1;background:var(--primary-color,#03a9f4);border-radius:3px 3px 0 0;
            height:${max > 0 ? Math.round((p.kwh / max) * 100) : 0}%;min-height:2px;
            opacity:0.85;cursor:default"
          ></div>`).join('')}
      </div>
      <div class="costs-history-labels" style="display:flex;gap:4px;margin-top:4px">
        ${points.map(p => `<div style="flex:1;text-align:center;font-size:10px;color:var(--secondary-text-color)">${this._esc(p.label.slice(5))}</div>`).join('')}
      </div>`;
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async _export(format) {
    try {
      const resp = await this._ctx.hseFetch(`/api/hse/export?period=${this._period}&format=${format}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `hse_export_${this._period}_${new Date().toISOString().slice(0,10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('[costs] export error', e); }
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur costs : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default CostsView;
