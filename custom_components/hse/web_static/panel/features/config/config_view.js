/**
 * config_view.js — Onglet 4 : Configuration (appareils + rooms/types + tarifs)
 *
 * Endpoints :
 *   GET/POST/PATCH /api/hse/catalogue/*
 *   GET/POST       /api/hse/meta + /meta/sync/preview + /meta/sync/apply
 *   GET/PUT        /api/hse/settings/pricing
 * Polling : ZÉRO auto (type ACTION)
 * Règles R1–R5 respectées
 */

export class ConfigView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
    this._activeSection = 'appareils'; // 'appareils' | 'rooms' | 'pricing'
    this._pendingAssignments = [];
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
      const sig = this._abortCtl.signal;
      const [catResp, metaResp, pricingResp] = await Promise.all([
        this._ctx.hseFetch('/api/hse/catalogue?status=selected&per_page=200', { signal: sig }),
        this._ctx.hseFetch('/api/hse/meta', { signal: sig }),
        this._ctx.hseFetch('/api/hse/settings/pricing', { signal: sig }),
      ]);
      if (!this._mounted) return;
      const data = {
        catalogue: await catResp.json(),
        meta:      await metaResp.json(),
        pricing:   await pricingResp.json(),
      };
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
      <div class="hse-config">
        <div class="hse-skeleton" style="height:44px;border-radius:8px;margin-bottom:12px"></div>
        <div class="hse-skeleton" style="height:400px;border-radius:8px"></div>
      </div>`;
  }

  _render(data) {
    if (!this._root.querySelector('.hse-config-root')) {
      this._root.innerHTML = this._buildHTML(data);
      this._bindEvents(data);
      return;
    }
    // Rafraîchir le contenu de la section active uniquement
    this._refreshSection(data);
  }

  _buildHTML(data) {
    return `
      <div class="hse-config-root">
        <nav class="hse-sectionnav">
          <button class="hse-btn hse-btn-tab cfg-tab ${this._activeSection==='appareils'?'active':''}" data-section="appareils">Appareils</button>
          <button class="hse-btn hse-btn-tab cfg-tab ${this._activeSection==='rooms'?'active':''}" data-section="rooms">Pièces &amp; Types</button>
          <button class="hse-btn hse-btn-tab cfg-tab ${this._activeSection==='pricing'?'active':''}" data-section="pricing">Tarifs</button>
        </nav>
        <div class="cfg-section-content">${this._buildSection(data)}</div>
      </div>`;
  }

  _buildSection(data) {
    if (this._activeSection === 'appareils') return this._buildCatalogueSection(data.catalogue);
    if (this._activeSection === 'rooms')     return this._buildMetaSection(data.meta);
    return this._buildPricingSection(data.pricing);
  }

  _buildCatalogueSection(cat) {
    const rows = (cat.items ?? []).map(it => `
      <tr>
        <td><input type="checkbox" class="cfg-row-check" data-id="${this._esc(it.entity_id)}"></td>
        <td>${this._esc(it.name)}<br><small class="hse-muted">${this._esc(it.entity_id)}</small></td>
        <td>${this._esc(it.room ?? '—')}</td>
        <td>${this._esc(it.type ?? '—')}</td>
        <td><span class="hse-badge" data-level="${it.status}">${it.status}</span></td>
        <td>
          <button class="hse-btn hse-btn-sm hse-btn-ghost cfg-ignore-btn" data-id="${this._esc(it.entity_id)}">Ignorer</button>
        </td>
      </tr>`).join('');
    return `
      <div class="cfg-appareils">
        <div class="hse-toolbar">
          <span class="hse-label">${cat.total} appareils sélectionnés</span>
          <button class="hse-btn hse-btn-secondary cfg-bulk-ignore">Ignorer sélection</button>
        </div>
        <table class="hse-table"><thead><tr>
          <th><input type="checkbox" class="cfg-check-all"></th><th>Appareil</th><th>Pièce</th><th>Type</th><th>Statut</th><th>Action</th>
        </tr></thead><tbody>${rows}</tbody></table>
      </div>`;
  }

  _buildMetaSection(meta) {
    const assignRows = (meta.assignments ?? []).map(a => `
      <tr class="${a.pending ? 'pending' : ''}">
        <td>${this._esc(a.entity_id)}</td>
        <td><select class="hse-select cfg-room-sel" data-id="${this._esc(a.entity_id)}">
          ${meta.rooms.map(r => `<option ${r===a.room?'selected':''}>${this._esc(r)}</option>`).join('')}
        </select></td>
        <td><select class="hse-select cfg-type-sel" data-id="${this._esc(a.entity_id)}">
          ${meta.types.map(t => `<option ${t===a.type?'selected':''}>${this._esc(t)}</option>`).join('')}
        </select></td>
        <td>${a.pending ? '<span class="hse-badge" data-level="warning">Pending</span>' : '—'}</td>
      </tr>`).join('');
    return `
      <div class="cfg-meta">
        <table class="hse-table"><thead><tr><th>Entité</th><th>Pièce</th><th>Type</th><th>État</th></tr></thead>
          <tbody>${assignRows}</tbody></table>
        <div class="hse-toolbar" style="margin-top:12px">
          <button class="hse-btn hse-btn-secondary cfg-meta-preview">Prévisualiser diff</button>
          <button class="hse-btn cfg-meta-apply" disabled>Appliquer</button>
        </div>
        <div class="cfg-meta-diff"></div>
      </div>`;
  }

  _buildPricingSection(p) {
    return `
      <div class="cfg-pricing">
        <form class="hse-form cfg-pricing-form">
          <label>Mode<select class="hse-select" name="mode"><option ${p.mode==='flat'?'selected':''}>flat</option><option ${p.mode==='hphc'?'selected':''}>hphc</option></select></label>
          <label>Prix TTC €/kWh<input class="hse-input" type="number" step="0.001" name="price_ttc_kwh" value="${p.price_ttc_kwh}"></label>
          <label>Abonnement €/mois<input class="hse-input" type="number" step="0.01" name="subscription_eur_month" value="${p.subscription_eur_month}"></label>
          <label>TVA %<input class="hse-input" type="number" step="0.1" name="tax_rate_pct" value="${p.tax_rate_pct}"></label>
          <button class="hse-btn" type="submit">Enregistrer</button>
        </form>
      </div>`;
  }

  _bindEvents(data) {
    // Tabs section
    this._root.querySelectorAll('.cfg-tab').forEach(btn =>
      btn.addEventListener('click', () => {
        this._activeSection = btn.dataset.section;
        this._root.querySelectorAll('.cfg-tab').forEach(b => b.classList.toggle('active', b===btn));
        this._root.querySelector('.cfg-section-content').innerHTML = this._buildSection(data);
        this._bindSectionEvents(data);
      }));
    this._bindSectionEvents(data);
  }

  _bindSectionEvents(data) {
    // Check-all → coche/décoche toutes les lignes (DELTA-026)
    this._root.querySelector('.cfg-check-all')?.addEventListener('change', (e) => {
      this._root.querySelectorAll('.cfg-row-check').forEach(cb => cb.checked = e.target.checked);
    });
    // Pricing form
    this._root.querySelector('.cfg-pricing-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries([...fd.entries()].map(([k,v]) =>
        [k, ['price_ttc_kwh','subscription_eur_month','tax_rate_pct'].includes(k) ? parseFloat(v) : v]));
      try {
        await this._ctx.hseFetch('/api/hse/settings/pricing', { method: 'PUT', body: JSON.stringify(payload) });
        this._fetchData();
      } catch (e) { this._renderError(e); }
    });
    // Meta preview / apply
    this._root.querySelector('.cfg-meta-preview')?.addEventListener('click', async () => {
      const assignments = this._collectAssignments();
      try {
        const resp = await this._ctx.hseFetch('/api/hse/meta/sync/preview', { method: 'POST', body: JSON.stringify({ assignments }) });
        const diff = await resp.json();
        this._root.querySelector('.cfg-meta-diff').innerHTML =
          `<pre class="hse-code">${JSON.stringify(diff, null, 2)}</pre>`;
        this._root.querySelector('.cfg-meta-apply')?.removeAttribute('disabled');
      } catch (e) { this._renderError(e); }
    });
    this._root.querySelector('.cfg-meta-apply')?.addEventListener('click', async () => {
      const assignments = this._collectAssignments();
      try {
        await this._ctx.hseFetch('/api/hse/meta/sync/apply', { method: 'POST', body: JSON.stringify({ assignments }) });
        this._fetchData();
      } catch (e) { this._renderError(e); }
    });
    // Ignore buttons
    this._root.querySelectorAll('.cfg-ignore-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        try {
          await this._ctx.hseFetch('/api/hse/catalogue/triage', { method: 'POST', body: JSON.stringify({ entity_id: btn.dataset.id, action: 'ignore' }) });
          this._fetchData();
        } catch (e) { this._renderError(e); }
      }));
  }

  _collectAssignments() {
    return [...this._root.querySelectorAll('[data-id]')].reduce((acc, el) => {
      const id = el.dataset.id;
      if (!acc.find(a => a.entity_id === id)) acc.push({ entity_id: id, room: '', type: '' });
      const entry = acc.find(a => a.entity_id === id);
      if (el.classList.contains('cfg-room-sel')) entry.room = el.value;
      if (el.classList.contains('cfg-type-sel')) entry.type = el.value;
      return acc;
    }, []);
  }

  _refreshSection(data) {
    const content = this._root.querySelector('.cfg-section-content');
    if (content) content.innerHTML = this._buildSection(data);
    this._bindSectionEvents(data);
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur config : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default ConfigView;
