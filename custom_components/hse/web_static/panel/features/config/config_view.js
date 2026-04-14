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
    // Référence stable vers le handler pricing submit pour cleanup (DELTA-031g)
    this._pricingSubmitHandler = null;
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
    this._pricingSubmitHandler = null;
  }

  async _fetchData() {
    if (!this._mounted || this._fetching) return;
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const sig = this._abortCtl.signal;
      const [catResp, metaResp, pricingResp] = await Promise.all([
        this._ctx.hseFetch('/api/hse/catalogue?per_page=200', { signal: sig }),
        this._ctx.hseFetch('/api/hse/meta', { signal: sig }),
        this._ctx.hseFetch('/api/hse/settings/pricing', { signal: sig }),
      ]);
      if (!this._mounted) return;
      const [cat, meta, pricing] = await Promise.all([
        catResp.json(), metaResp.json(), pricingResp.json(),
      ]);
      const data = { cat, meta, pricing };
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
    this._root.innerHTML = `<div class="hse-skeleton" style="height:300px;border-radius:8px"></div>`;
  }

  _render(data) {
    if (!this._root.querySelector('.hse-config-root')) {
      this._root.innerHTML = this._buildHTML(data);
      this._bindSectionNav(data);
    }
    this._refreshSection(data);
  }

  _buildHTML(data) {
    return `
      <div class="hse-config-root">
        <nav class="hse-tab-nav">
          <button class="hse-tab ${this._activeSection==='appareils'?'active':''}" data-section="appareils">Appareils</button>
          <button class="hse-tab ${this._activeSection==='rooms'?'active':''}" data-section="rooms">Pièces / Types</button>
          <button class="hse-tab ${this._activeSection==='pricing'?'active':''}" data-section="pricing">Tarifs</button>
        </nav>
        <div class="hse-config-section-content"></div>
      </div>`;
  }

  _bindSectionNav(data) {
    this._root.querySelectorAll('.hse-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeSection = btn.dataset.section;
        this._root.querySelectorAll('.hse-tab').forEach(b => b.classList.toggle('active', b === btn));
        this._refreshSection(data);
      });
    });
  }

  _refreshSection(data) {
    const el = this._root.querySelector('.hse-config-section-content');
    if (!el) return;
    if (this._activeSection === 'appareils') {
      el.innerHTML = this._buildAppareils(data.cat);
      this._bindAppareils(data);
    } else if (this._activeSection === 'rooms') {
      el.innerHTML = this._buildRooms(data.meta);
      this._bindRooms(data);
    } else {
      el.innerHTML = this._buildPricing(data.pricing);
      this._bindPricing(data);  // cleanup garanti ici (DELTA-031g)
    }
  }

  // ─── Section Appareils ───────────────────────────────────────────────────

  _buildAppareils(cat) {
    const items = cat.items ?? [];
    return `
      <div class="hse-card">
        <span class="hse-label">Appareils (${items.length})</span>
        <table class="hse-table">
          <thead><tr><th>Nom</th><th>Entité</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody class="cfg-items-tbody">
            ${items.map(it => `
              <tr data-id="${this._esc(it.entity_id)}">
                <td>${this._esc(it.name)}</td>
                <td class="hse-muted">${this._esc(it.entity_id)}</td>
                <td><span class="hse-badge" data-level="${it.status ?? 'pending'}">${it.status ?? 'pending'}</span></td>
                <td>
                  <button class="hse-btn hse-btn-ghost cfg-select-btn" data-id="${this._esc(it.entity_id)}" data-status="selected">Sélectionner</button>
                  <button class="hse-btn hse-btn-ghost cfg-ignore-btn"  data-id="${this._esc(it.entity_id)}" data-status="ignored">Ignorer</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="hse-toolbar" style="margin-top:10px">
          <button class="hse-btn cfg-apply-batch-btn" disabled>Appliquer la sélection</button>
          <span class="hse-muted cfg-batch-count">0 en attente</span>
        </div>
      </div>`;
  }

  _bindAppareils(data) {
    this._pendingAssignments = [];
    this._root.querySelectorAll('.cfg-select-btn, .cfg-ignore-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, status } = btn.dataset;
        const existing = this._pendingAssignments.findIndex(a => a.entity_id === id);
        if (existing >= 0) this._pendingAssignments[existing].status = status;
        else this._pendingAssignments.push({ entity_id: id, status });
        const countEl = this._root.querySelector('.cfg-batch-count');
        const applyEl = this._root.querySelector('.cfg-apply-batch-btn');
        if (countEl) countEl.textContent = `${this._pendingAssignments.length} en attente`;
        if (applyEl) applyEl.disabled = this._pendingAssignments.length === 0;
      });
    });
    this._root.querySelector('.cfg-apply-batch-btn')?.addEventListener('click', () => this._applyBatch(data));
  }

  async _applyBatch(data) {
    if (!this._pendingAssignments.length) return;
    try {
      await this._ctx.hseFetch('/api/hse/catalogue/batch', {
        method: 'PATCH',
        body: JSON.stringify({ items: this._pendingAssignments }),
      });
      this._pendingAssignments = [];
      this._lastSig = null;
      this._domBuilt = false;
      this._buildSkeleton();
      this._fetchData();
    } catch (e) { this._renderError(e); }
  }

  // ─── Section Rooms / Types ───────────────────────────────────────────────

  _buildRooms(meta) {
    const rooms = meta.rooms ?? [];
    const types = meta.device_types ?? [];
    return `
      <div class="hse-card">
        <span class="hse-label">Pièces (${rooms.length})</span>
        <ul class="hse-list" style="margin-bottom:12px">
          ${rooms.map(r => `<li class="hse-list-item">${this._esc(r.label ?? r.id)}</li>`).join('')}
        </ul>
        <button class="hse-btn hse-btn-ghost cfg-meta-sync-btn">Synchroniser depuis HA</button>
      </div>
      <div class="hse-card" style="margin-top:12px">
        <span class="hse-label">Types d'appareils (${types.length})</span>
        <ul class="hse-list">
          ${types.map(t => `<li class="hse-list-item">${this._esc(t.label ?? t.id)}</li>`).join('')}
        </ul>
      </div>`;
  }

  _bindRooms(data) {
    this._root.querySelector('.cfg-meta-sync-btn')?.addEventListener('click', () => this._syncMeta(data));
  }

  async _syncMeta(data) {
    try {
      const preview = await (await this._ctx.hseFetch('/api/hse/meta/sync/preview')).json();
      const msg = `Prévisualisation sync :\n${JSON.stringify(preview, null, 2)}\n\nAppliquer ?`;
      if (!confirm(msg)) return;
      await this._ctx.hseFetch('/api/hse/meta/sync/apply', { method: 'POST', body: '{}' });
      this._lastSig = null;
      this._fetchData();
    } catch (e) { this._renderError(e); }
  }

  // ─── Section Pricing — DELTA-031g fix ────────────────────────────────────

  _buildPricing(pricing) {
    return `
      <div class="hse-card">
        <span class="hse-label">Tarification (€/kWh)</span>
        <form class="cfg-pricing-form" novalidate>
          <label class="hse-form-row">
            <span>Tarif HP (heures pleines)</span>
            <input class="hse-input" type="number" step="0.001" name="hp" value="${pricing.hp_eur_kwh ?? 0.2516}">
          </label>
          <label class="hse-form-row">
            <span>Tarif HC (heures creuses)</span>
            <input class="hse-input" type="number" step="0.001" name="hc" value="${pricing.hc_eur_kwh ?? 0.1837}">
          </label>
          <label class="hse-form-row">
            <span>TVA (%)</span>
            <input class="hse-input" type="number" step="0.1" name="tva" value="${pricing.tva_pct ?? 20}">
          </label>
          <label class="hse-form-row">
            <span>Abonnement (€/mois)</span>
            <input class="hse-input" type="number" step="0.01" name="abonnement" value="${pricing.monthly_fee_eur ?? 9.50}">
          </label>
          <div class="hse-toolbar" style="margin-top:12px">
            <button class="hse-btn" type="submit">Enregistrer les tarifs</button>
          </div>
        </form>
      </div>`;
  }

  _bindPricing(data) {
    const form = this._root.querySelector('.cfg-pricing-form');
    if (!form) return;
    // DELTA-031g : cleanup du handler précédent avant de rebinder
    // Évite l'accumulation de listeners 'submit' lors des changements de section
    if (this._pricingSubmitHandler) {
      form.removeEventListener('submit', this._pricingSubmitHandler);
    }
    this._pricingSubmitHandler = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        hp_eur_kwh:      parseFloat(fd.get('hp')),
        hc_eur_kwh:      parseFloat(fd.get('hc')),
        tva_pct:         parseFloat(fd.get('tva')),
        monthly_fee_eur: parseFloat(fd.get('abonnement')),
      };
      try {
        await this._ctx.hseFetch('/api/hse/settings/pricing', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        this._lastSig = null;
        this._fetchData();
      } catch (err) { this._renderError(err); }
    };
    form.addEventListener('submit', this._pricingSubmitHandler);
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur config : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default ConfigView;
