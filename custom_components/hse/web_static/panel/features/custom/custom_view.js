export class CustomView {
  constructor() {
    this._mounted = false;
    this._fetching = false;
    this._lastSig = null;
    this._abortCtl = null;
    this._hass = null;
    this._ctx = null;
    this._root = null;
    this._prefs = null;
    this._els = {};
    this._boundOnThemeChange = null;
    this._boundOnGlassChange = null;
    this._boundOnDynamicBgChange = null;
    this._boundOnReset = null;
  }

  mount(container, ctx) {
    this._ctx = ctx;
    this._hass = ctx.hass || null;
    this._root = container;
    this._mounted = true;
    this._injectCSS();
    this._buildSkeleton();
    this._fetchData();
  }

  update_hass(hass) {
    this._hass = hass;
  }

  unmount() {
    this._mounted = false;
    if (this._abortCtl) this._abortCtl.abort();

    if (this._els.themeSelect && this._boundOnThemeChange) {
      this._els.themeSelect.removeEventListener('change', this._boundOnThemeChange);
    }
    if (this._els.glassToggle && this._boundOnGlassChange) {
      this._els.glassToggle.removeEventListener('change', this._boundOnGlassChange);
    }
    if (this._els.dynamicBgToggle && this._boundOnDynamicBgChange) {
      this._els.dynamicBgToggle.removeEventListener('change', this._boundOnDynamicBgChange);
    }
    if (this._els.resetBtn && this._boundOnReset) {
      this._els.resetBtn.removeEventListener('click', this._boundOnReset);
    }
  }

  _injectCSS() {
    if (document.getElementById('hse-custom-view-css')) return;
    const style = document.createElement('style');
    style.id = 'hse-custom-view-css';
    style.textContent = `
      .hse-custom {
        display: grid;
        gap: 16px;
        max-width: 880px;
        margin: 0 auto;
      }
      .hse-custom__card {
        background: var(--hse-surface, rgba(255,255,255,0.88));
        border: 1px solid var(--hse-border, rgba(0,0,0,0.08));
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      }
      .hse-custom__title {
        font-size: 1.125rem;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .hse-custom__subtitle {
        font-size: 0.92rem;
        opacity: 0.78;
        margin-bottom: 18px;
      }
      .hse-custom__grid {
        display: grid;
        gap: 16px;
      }
      .hse-custom__field {
        display: grid;
        gap: 8px;
      }
      .hse-custom__label {
        font-size: 0.9rem;
        font-weight: 600;
      }
      .hse-custom__select {
        width: 100%;
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid var(--hse-border, rgba(0,0,0,0.12));
        background: var(--hse-surface-2, rgba(255,255,255,0.92));
        color: inherit;
        padding: 10px 12px;
        font: inherit;
      }
      .hse-custom__toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 44px;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--hse-surface-2, rgba(255,255,255,0.92));
        border: 1px solid var(--hse-border, rgba(0,0,0,0.08));
      }
      .hse-custom__toggle input {
        width: 18px;
        height: 18px;
      }
      .hse-custom__actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .hse-custom__button {
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid var(--hse-border, rgba(0,0,0,0.12));
        background: var(--hse-surface-2, rgba(255,255,255,0.92));
        color: inherit;
        padding: 10px 16px;
        font: inherit;
        cursor: pointer;
      }
      .hse-custom__button:hover {
        border-color: var(--hse-accent, #2563eb);
      }
      .hse-custom__status {
        font-size: 0.88rem;
        min-height: 1.2em;
      }
      .hse-custom__status[data-kind="success"] { color: #15803d; }
      .hse-custom__status[data-kind="error"] { color: #dc2626; }
      .hse-custom__preview {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .hse-custom__sample {
        border-radius: 16px;
        border: 1px solid var(--hse-border, rgba(0,0,0,0.08));
        background: var(--hse-surface-2, rgba(255,255,255,0.94));
        padding: 16px;
        display: grid;
        gap: 10px;
      }
      .hse-custom__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: var(--hse-accent, #2563eb);
        color: #fff;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .hse-custom__sample button {
        width: fit-content;
        min-height: 40px;
        padding: 0 14px;
        border-radius: 10px;
        border: none;
        background: var(--hse-accent, #2563eb);
        color: white;
        font: inherit;
      }
      .hse-custom__muted { opacity: 0.72; }
      @media (max-width: 640px) {
        .hse-custom__card { padding: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  _buildSkeleton() {
    this._root.innerHTML = `<div class="hse-skeleton"></div>`;
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch('/api/hse/user_prefs', { signal: this._abortCtl.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
    this._prefs = data;
    this._render(data);
  }

  _render(data) {
    const themes = [
      'default', 'light', 'dark', 'ocean', 'forest', 'sunset',
      'minimal', 'neon', 'aurora', 'neuro', 'ember', 'slate', 'solar'
    ];

    if (!this._els.root) {
      this._root.innerHTML = `
        <section class="hse-custom hse-loaded">
          <div class="hse-custom__card">
            <div class="hse-custom__title">Personnalisation</div>
            <div class="hse-custom__subtitle">Cet onglet pilote les thèmes HSE V5 via /api/hse/user_prefs.</div>
            <div class="hse-custom__grid">
              <div class="hse-custom__field">
                <label class="hse-custom__label" for="hse-theme-select">Thème</label>
                <select id="hse-theme-select" class="hse-custom__select"></select>
              </div>
              <label class="hse-custom__toggle">
                <span>Activer le glassmorphism</span>
                <input id="hse-glass-toggle" type="checkbox">
              </label>
              <label class="hse-custom__toggle">
                <span>Activer le fond dynamique</span>
                <input id="hse-dynamic-bg-toggle" type="checkbox">
              </label>
              <div class="hse-custom__actions">
                <button type="button" id="hse-custom-reset" class="hse-custom__button">Réinitialiser</button>
                <div id="hse-custom-status" class="hse-custom__status" aria-live="polite"></div>
              </div>
            </div>
          </div>

          <div class="hse-custom__card">
            <div class="hse-custom__title">Prévisualisation live</div>
            <div class="hse-custom__subtitle">Le thème est appliqué immédiatement au document HTML de l'iframe.</div>
            <div class="hse-custom__preview">
              <div class="hse-custom__sample">
                <span class="hse-custom__badge">Badge</span>
                <strong>Carte exemple</strong>
                <span class="hse-custom__muted">Utilise les variables CSS du thème actif.</span>
                <button type="button" disabled>Aperçu bouton</button>
              </div>
              <div class="hse-custom__sample">
                <strong>État</strong>
                <span class="hse-custom__muted">Theme: <span id="hse-preview-theme"></span></span>
                <span class="hse-custom__muted">Glass: <span id="hse-preview-glass"></span></span>
                <span class="hse-custom__muted">Dynamic BG: <span id="hse-preview-dynamic-bg"></span></span>
              </div>
            </div>
          </div>
        </section>
      `;

      this._els = {
        root: this._root.querySelector('.hse-custom'),
        themeSelect: this._root.querySelector('#hse-theme-select'),
        glassToggle: this._root.querySelector('#hse-glass-toggle'),
        dynamicBgToggle: this._root.querySelector('#hse-dynamic-bg-toggle'),
        resetBtn: this._root.querySelector('#hse-custom-reset'),
        status: this._root.querySelector('#hse-custom-status'),
        previewTheme: this._root.querySelector('#hse-preview-theme'),
        previewGlass: this._root.querySelector('#hse-preview-glass'),
        previewDynamicBg: this._root.querySelector('#hse-preview-dynamic-bg'),
      };

      this._els.themeSelect.innerHTML = themes
        .map(theme => `<option value="${theme}">${theme}</option>`)
        .join('');

      this._boundOnThemeChange = (event) => {
        const nextTheme = event.target.value;
        this._updatePrefs({ theme: nextTheme }, { optimistic: true, statusText: 'Thème enregistré.' });
      };
      this._boundOnGlassChange = (event) => {
        this._updatePrefs({ glassmorphism: !!event.target.checked }, { optimistic: true, statusText: 'Option glass enregistrée.' });
      };
      this._boundOnDynamicBgChange = (event) => {
        this._updatePrefs({ dynamic_bg: !!event.target.checked }, { optimistic: true, statusText: 'Fond dynamique enregistré.' });
      };
      this._boundOnReset = () => {
        this._updatePrefs({ theme: 'default', glassmorphism: false, dynamic_bg: false }, { optimistic: true, statusText: 'Préférences réinitialisées.' });
      };

      this._els.themeSelect.addEventListener('change', this._boundOnThemeChange);
      this._els.glassToggle.addEventListener('change', this._boundOnGlassChange);
      this._els.dynamicBgToggle.addEventListener('change', this._boundOnDynamicBgChange);
      this._els.resetBtn.addEventListener('click', this._boundOnReset);
    }

    this._els.themeSelect.value = data.theme || 'default';
    this._els.glassToggle.checked = !!data.glassmorphism;
    this._els.dynamicBgToggle.checked = !!data.dynamic_bg;
    this._els.previewTheme.textContent = data.theme || 'default';
    this._els.previewGlass.textContent = data.glassmorphism ? 'on' : 'off';
    this._els.previewDynamicBg.textContent = data.dynamic_bg ? 'on' : 'off';
    this._setStatus('', null);

    if (typeof this._ctx.applyPrefs === 'function') {
      this._ctx.applyPrefs(data);
    }
  }

  async _updatePrefs(patch, options = {}) {
    if (this._fetching) return;
    const previous = this._prefs || {};
    const optimisticPrefs = { ...previous, ...patch };

    if (options.optimistic) {
      this._prefs = optimisticPrefs;
      this._lastSig = JSON.stringify(optimisticPrefs);
      this._render(optimisticPrefs);
    }

    this._fetching = true;
    this._abortCtl = new AbortController();
    this._setStatus('Enregistrement…', null);

    try {
      const resp = await this._ctx.hseFetch('/api/hse/user_prefs', {
        method: 'PATCH',
        signal: this._abortCtl.signal,
        body: JSON.stringify(patch),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!this._mounted) return;
      this._applyData(data);
      this._setStatus(options.statusText || 'Préférences enregistrées.', 'success');
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._prefs = previous;
      this._lastSig = JSON.stringify(previous);
      this._render(previous);
      this._setStatus(`Erreur : ${e.message}`, 'error');
    } finally {
      this._fetching = false;
    }
  }

  _setStatus(text, kind) {
    if (!this._els.status) return;
    this._els.status.textContent = text;
    if (kind) {
      this._els.status.dataset.kind = kind;
    } else {
      delete this._els.status.dataset.kind;
    }
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur : ${err.message}</p>`;
  }
}

export default CustomView;
