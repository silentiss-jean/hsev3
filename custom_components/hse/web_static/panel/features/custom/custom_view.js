/**
 * custom_view.js — Onglet 5 : Personnalisation (thème, UI)
 *
 * Endpoints :
 *   GET   /api/hse/user_prefs   — charge les prefs
 *   PATCH /api/hse/user_prefs   — sauvegarde (merge partiel, R4)
 * Polling : ZÉRO auto (type ACTION)
 * R4 : zéro localStorage — tout passe par user_prefs API
 * Règles R1–R5 respectées
 */

export class CustomView {
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
    // user_prefs déjà dans le store (chargé au bootstrap) — on l'utilise directement
    const prefs = ctx.store.get('userPrefs');
    if (prefs) {
      this._applyData(prefs);
    } else {
      this._fetchData();
    }
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
      const resp = await this._ctx.hseFetch('/api/hse/user_prefs', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const prefs = await resp.json();
      this._applyData(prefs);
    } catch (e) {
      if (e.name !== 'AbortError') this._renderError(e);
    } finally {
      this._fetching = false;
    }
  }

  _applyData(prefs) {
    const sig = JSON.stringify(prefs);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(prefs);
  }

  _buildSkeleton() {
    this._root.innerHTML = `<div class="hse-skeleton" style="height:300px;border-radius:8px"></div>`;
  }

  _render(prefs) {
    if (!this._root.querySelector('.hse-custom-root')) {
      this._root.innerHTML = this._buildHTML(prefs);
      this._bindEvents(prefs);
      return;
    }
    // Mise à jour ciblée des contrôles
    const themeSelect = this._root.querySelector('.custom-theme-select');
    if (themeSelect) themeSelect.value = prefs.theme ?? 'default';
    const glass = this._root.querySelector('.custom-glass-toggle');
    if (glass) glass.checked = !!prefs.glassmorphism;
    const dynBg = this._root.querySelector('.custom-dynbg-toggle');
    if (dynBg) dynBg.checked = !!prefs.dynamic_bg;
    // Appliquer l'aperçu live
    document.documentElement.setAttribute('data-hse-theme', prefs.theme ?? 'default');
  }

  _buildHTML(prefs) {
    const themes = ['default', 'dark', 'ocean', 'nature', 'sunset'];
    return `
      <div class="hse-custom-root">
        <div class="hse-card">
          <span class="hse-label">Thème</span>
          <select class="hse-select custom-theme-select">
            ${themes.map(t => `<option value="${t}" ${prefs.theme===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <div class="hse-theme-preview" data-hse-theme="${prefs.theme ?? 'default'}">
            <span class="hse-label">Aperçu</span>
            <div style="width:100%;height:40px;background:var(--hse-color-primary,#03a9f4);border-radius:6px;margin-top:8px"></div>
          </div>
        </div>
        <div class="hse-card">
          <span class="hse-label">Options visuelles</span>
          <label class="hse-toggle-row">
            <span>Glassmorphism</span>
            <input type="checkbox" class="custom-glass-toggle" ${prefs.glassmorphism?'checked':''}>
          </label>
          <label class="hse-toggle-row">
            <span>Fond dynamique</span>
            <input type="checkbox" class="custom-dynbg-toggle" ${prefs.dynamic_bg?'checked':''}>
          </label>
        </div>
        <div class="hse-toolbar">
          <button class="hse-btn custom-save-btn">Enregistrer</button>
          <button class="hse-btn hse-btn-ghost custom-reset-btn">Réinitialiser</button>
        </div>
      </div>`;
  }

  _bindEvents(prefs) {
    this._root.querySelector('.custom-theme-select')?.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-hse-theme', e.target.value);
      this._root.querySelector('.hse-theme-preview')?.setAttribute('data-hse-theme', e.target.value);
    });
    this._root.querySelector('.custom-save-btn')?.addEventListener('click', () => this._save());
    this._root.querySelector('.custom-reset-btn')?.addEventListener('click', () => this._reset());
  }

  async _save() {
    const payload = {
      theme:          this._root.querySelector('.custom-theme-select')?.value ?? 'default',
      glassmorphism:  !!this._root.querySelector('.custom-glass-toggle')?.checked,
      dynamic_bg:     !!this._root.querySelector('.custom-dynbg-toggle')?.checked,
    };
    try {
      const resp = await this._ctx.hseFetch('/api/hse/user_prefs', { method: 'PATCH', body: JSON.stringify(payload) });
      const updated = await resp.json();
      this._ctx.store.patch('userPrefs', updated);
      this._applyData(updated);
    } catch (e) { this._renderError(e); }
  }

  async _reset() {
    const defaults = { theme: 'default', glassmorphism: false, dynamic_bg: false };
    try {
      const resp = await this._ctx.hseFetch('/api/hse/user_prefs', { method: 'PATCH', body: JSON.stringify(defaults) });
      const updated = await resp.json();
      this._ctx.store.patch('userPrefs', updated);
      this._applyData(updated);
    } catch (e) { this._renderError(e); }
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur personnalisation : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default CustomView;
