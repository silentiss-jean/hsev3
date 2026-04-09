/**
 * diagnostic_view.js — Onglet 2 : Diagnostic qualité
 *
 * Endpoints :
 *   GET  /api/hse/diagnostic  — charge le dernier résultat
 *   POST /api/hse/diagnostic  — déclenche un nouveau run
 * Polling : aucun auto (type LECTURE — rechargement manuel uniquement)
 * Règles R1–R5 respectées
 */

export class DiagnosticView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
  }

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    this._buildSkeleton();
    this._fetchData();
  }

  update_hass(hass) { this._hass = hass; }  // R1

  unmount() {
    this._mounted = false;
    if (this._abortCtl) { this._abortCtl.abort(); this._abortCtl = null; }
  }

  async _fetchData() {
    if (!this._mounted || this._fetching) return;
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch('/api/hse/diagnostic', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const data = await resp.json();
      this._applyData(data);
    } catch (e) {
      if (e.name !== 'AbortError') this._renderError(e);
    } finally {
      this._fetching = false;
    }
  }

  async _runDiagnostic() {
    if (this._fetching) return;
    this._root.querySelector('.diag-run-btn')?.setAttribute('disabled', 'true');
    try {
      await this._ctx.hseFetch('/api/hse/diagnostic', { method: 'POST', body: '{}' });
      await this._fetchData();
    } catch (e) {
      this._renderError(e);
    } finally {
      this._root.querySelector('.diag-run-btn')?.removeAttribute('disabled');
    }
  }

  _applyData(data) {
    const sig = JSON.stringify(data);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  _buildSkeleton() {
    this._root.innerHTML = `
      <div class="hse-diagnostic">
        <div class="hse-skeleton" style="height:60px;border-radius:8px;margin-bottom:12px"></div>
        <div class="hse-skeleton" style="height:200px;border-radius:8px"></div>
      </div>`;
  }

  _render(data) {
    if (!this._root.querySelector('.hse-diag-root')) {
      this._root.innerHTML = this._buildHTML(data);
      this._root.querySelector('.diag-run-btn')?.addEventListener('click', () => this._runDiagnostic());
      return;
    }
    // Mises à jour ciblées
    this._root.querySelector('.diag-score').textContent    = `${data.score_pct} %`;
    this._root.querySelector('.diag-last-run').textContent = data.last_run_at
      ? new Date(data.last_run_at).toLocaleString('fr-FR') : '—';
    this._root.querySelector('.diag-storage-total').textContent   = data.storage_stats.total;
    this._root.querySelector('.diag-storage-selected').textContent = data.storage_stats.selected;
    this._root.querySelector('.diag-storage-ignored').textContent  = data.storage_stats.ignored;
    this._root.querySelector('.diag-storage-pending').textContent  = data.storage_stats.pending;
    // Tableau capteurs : rebuild autorisé ici car action manuelle
    this._root.querySelector('.diag-sensors-tbody').innerHTML =
      this._buildSensorsRows(data.sensors);
  }

  _buildHTML(d) {
    const levelClass = d.score_pct >= 80 ? 'ok' : d.score_pct >= 50 ? 'warning' : 'error';
    return `
      <div class="hse-diag-root">
        <div class="hse-card diag-header">
          <span class="hse-label">Score qualité</span>
          <span class="diag-score hse-value-large" data-level="${levelClass}">${d.score_pct} %</span>
          <span class="hse-muted">Dernier run : <span class="diag-last-run">${d.last_run_at ? new Date(d.last_run_at).toLocaleString('fr-FR') : '—'}</span></span>
          <button class="hse-btn diag-run-btn">Relancer le diagnostic</button>
        </div>
        <div class="hse-card">
          <span class="hse-label">Stockage</span>
          <div class="hse-grid-4" style="margin-top:8px">
            <div class="hse-stat"><span class="diag-storage-total">${d.storage_stats.total}</span><span class="hse-muted">Total</span></div>
            <div class="hse-stat"><span class="diag-storage-selected">${d.storage_stats.selected}</span><span class="hse-muted">Sélectionnés</span></div>
            <div class="hse-stat"><span class="diag-storage-ignored">${d.storage_stats.ignored}</span><span class="hse-muted">Ignorés</span></div>
            <div class="hse-stat"><span class="diag-storage-pending">${d.storage_stats.pending}</span><span class="hse-muted">En attente</span></div>
          </div>
        </div>
        ${d.repairs?.length ? `
        <div class="hse-card">
          <span class="hse-label">Alertes HA Repairs (${d.repairs.length})</span>
          <ul class="diag-repairs">${d.repairs.map(r =>
            `<li class="diag-repair-item" data-severity="${r.severity}"><strong>${r.severity}</strong> — ${this._esc(r.description)}</li>`).join('')}
          </ul>
        </div>` : ''}
        <div class="hse-card">
          <span class="hse-label">Capteurs (${d.sensors?.length ?? 0})</span>
          <table class="hse-table"><thead><tr><th>Entité</th><th>Statut</th><th>Problèmes</th></tr></thead>
            <tbody class="diag-sensors-tbody">${this._buildSensorsRows(d.sensors)}</tbody>
          </table>
        </div>
      </div>`;
  }

  _buildSensorsRows(sensors) {
    if (!sensors?.length) return `<tr><td colspan="3" class="hse-empty">Aucun capteur</td></tr>`;
    return sensors.map(s => `
      <tr>
        <td>${this._esc(s.name)}<br><small class="hse-muted">${this._esc(s.entity_id)}</small></td>
        <td><span class="hse-badge" data-level="${s.status}">${s.status}</span></td>
        <td>${s.issues?.join(', ') || '—'}</td>
      </tr>`).join('');
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur diagnostic : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default DiagnosticView;
