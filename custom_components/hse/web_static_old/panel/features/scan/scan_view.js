/**
 * scan_view.js — Onglet 3 : Détection entités
 *
 * Endpoints :
 *   GET  /api/hse/scan              — liste entités non cataloguées
 *   POST /api/hse/catalogue/triage  — triage unitaire
 *   POST /api/hse/catalogue/triage/bulk — triage en masse
 *   POST /api/hse/catalogue/refresh — re-scan
 * Polling : ZÉRO auto (type ACTION)
 * Règles R1–R5 respectées
 */

export class ScanView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
    this._filters  = { domain: '', q: '', page: 1 };
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
    const { domain, q, page } = this._filters;
    const params = new URLSearchParams({ page, per_page: 50 });
    if (domain) params.set('domain', domain);
    if (q)      params.set('q', q);
    try {
      const resp = await this._ctx.hseFetch(`/api/hse/scan?${params}`, { signal: this._abortCtl.signal });
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
    const sig = JSON.stringify(data);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  _buildSkeleton() {
    this._root.innerHTML = `
      <div class="hse-scan">
        <div class="hse-skeleton" style="height:44px;border-radius:8px;margin-bottom:12px"></div>
        <div class="hse-skeleton" style="height:300px;border-radius:8px"></div>
      </div>`;
  }

  _render(data) {
    if (!this._root.querySelector('.hse-scan-root')) {
      this._root.innerHTML = this._buildHTML(data);
      this._bindEvents();
      return;
    }
    this._root.querySelector('.scan-total').textContent = `${data.total} entités détectées`;
    this._root.querySelector('.scan-tbody').innerHTML = this._buildRows(data.items);
    this._bindRowEvents();
  }

  _buildHTML(d) {
    return `
      <div class="hse-scan-root">
        <div class="hse-toolbar">
          <span class="scan-total hse-label">${d.total} entités détectées</span>
          <input class="hse-input scan-filter-q" type="search" placeholder="Filtrer…" value="${this._filters.q}">
          <input class="hse-input scan-filter-domain" type="text" placeholder="Domaine" value="${this._filters.domain}">
          <button class="hse-btn hse-btn-secondary scan-refresh-btn">🔄 Re-scanner</button>
          <button class="hse-btn scan-bulk-btn">✅ Tout sélectionner</button>
        </div>
        <table class="hse-table">
          <thead><tr><th><input type="checkbox" class="scan-check-all"></th><th>Entité</th><th>Device</th><th>Score</th><th>Action</th></tr></thead>
          <tbody class="scan-tbody">${this._buildRows(d.items)}</tbody>
        </table>
        <div class="hse-pagination scan-pagination">
          <button class="hse-btn hse-btn-ghost scan-prev" ${d.page <= 1 ? 'disabled' : ''}>◀</button>
          <span>Page ${d.page}</span>
          <button class="hse-btn hse-btn-ghost scan-next" ${d.items.length < 50 ? 'disabled' : ''}>▶</button>
        </div>
      </div>`;
  }

  _buildRows(items) {
    if (!items?.length) return `<tr><td colspan="5" class="hse-empty">Aucune entité à cataloguer 🎉</td></tr>`;
    return items.map(it => `
      <tr>
        <td><input type="checkbox" class="scan-row-check" data-id="${this._esc(it.entity_id)}"></td>
        <td>${this._esc(it.name)}<br><small class="hse-muted">${this._esc(it.entity_id)}</small></td>
        <td>${this._esc(it.device ?? '—')}</td>
        <td><span class="hse-badge" data-score="${it.quality_score}">${it.quality_score}</span></td>
        <td>
          <button class="hse-btn hse-btn-sm scan-add-btn" data-id="${this._esc(it.entity_id)}">+ Ajouter</button>
          <button class="hse-btn hse-btn-sm hse-btn-ghost scan-ignore-btn" data-id="${this._esc(it.entity_id)}">Ignorer</button>
        </td>
      </tr>`).join('');
  }

  _bindEvents() {
    this._root.querySelector('.scan-filter-q')?.addEventListener('input', (e) => {
      this._filters.q = e.target.value; this._filters.page = 1; this._fetchData();
    });
    this._root.querySelector('.scan-filter-domain')?.addEventListener('input', (e) => {
      this._filters.domain = e.target.value; this._filters.page = 1; this._fetchData();
    });
    this._root.querySelector('.scan-refresh-btn')?.addEventListener('click', async () => {
      await this._ctx.hseFetch('/api/hse/catalogue/refresh', { method: 'POST', body: '{}' });
      this._fetchData();
    });
    this._root.querySelector('.scan-prev')?.addEventListener('click', () => {
      if (this._filters.page > 1) { this._filters.page--; this._fetchData(); }
    });
    this._root.querySelector('.scan-next')?.addEventListener('click', () => {
      this._filters.page++; this._fetchData();
    });
    this._root.querySelector('.scan-check-all')?.addEventListener('change', (e) => {
      this._root.querySelectorAll('.scan-row-check').forEach(cb => cb.checked = e.target.checked);
    });
    this._root.querySelector('.scan-bulk-btn')?.addEventListener('click', () => this._bulkSelect());
    this._bindRowEvents();
  }

  _bindRowEvents() {
    this._root.querySelectorAll('.scan-add-btn').forEach(btn =>
      btn.addEventListener('click', () => this._triage(btn.dataset.id, 'select')));
    this._root.querySelectorAll('.scan-ignore-btn').forEach(btn =>
      btn.addEventListener('click', () => this._triage(btn.dataset.id, 'ignore')));
  }

  async _triage(entityId, action) {
    try {
      await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method: 'POST', body: JSON.stringify({ entity_id: entityId, action }),
      });
      this._fetchData();
    } catch (e) { this._renderError(e); }
  }

  async _bulkSelect() {
    const ids = [...this._root.querySelectorAll('.scan-row-check:checked')].map(cb => cb.dataset.id);
    if (!ids.length) return;
    try {
      await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method: 'POST', body: JSON.stringify({ items: ids.map(id => ({ entity_id: id, action: 'select' })) }),
      });
      this._fetchData();
    } catch (e) { this._renderError(e); }
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur scan : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default ScanView;
