/**
 * cards_view.js — Onglet 6 : Génération YAML Lovelace
 *
 * Endpoints :
 *   GET /api/hse/catalogue  — catalogue complet pour la sélection
 * Polling : ZÉRO auto (type ACTION)
 * Règles R1–R5 respectées
 * Note : yamlComposer.js (V2) sera importé depuis shared/ quand disponible.
 *        En attendant, une génération YAML inline minimaliste est fournie.
 */

export class CardsView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
    this._catalogue = [];
  }

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    // Utiliser le catalogue du store si disponible
    const cached = ctx.store.get('catalogue');
    if (cached) {
      this._catalogue = cached.items ?? [];
      this._applyData(cached);
    } else {
      this._buildSkeleton();
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
      const resp = await this._ctx.hseFetch('/api/hse/catalogue?status=selected&per_page=200', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const data = await resp.json();
      this._ctx.store.set('catalogue', data);
      this._catalogue = data.items ?? [];
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
    if (this._root.querySelector('.hse-cards-root')) return; // DOM déjà en place
    this._root.innerHTML = this._buildHTML(data);
    this._bindEvents();
  }

  _buildHTML(data) {
    const items = data.items ?? [];
    return `
      <div class="hse-cards-root">
        <div class="hse-card">
          <span class="hse-label">Sélectionner les appareils</span>
          <div class="hse-toolbar">
            <button class="hse-btn hse-btn-ghost cards-check-all">Tout sélectionner</button>
            <button class="hse-btn hse-btn-ghost cards-uncheck-all">Tout désélectionner</button>
          </div>
          <div class="cards-list" style="max-height:280px;overflow-y:auto">
            ${items.map(it => `
              <label class="hse-checkbox-row">
                <input type="checkbox" class="cards-item-check" data-id="${this._esc(it.entity_id)}" checked>
                ${this._esc(it.name)}
                <small class="hse-muted">${this._esc(it.entity_id)}</small>
              </label>`).join('')}
          </div>
        </div>
        <div class="hse-card">
          <span class="hse-label">Options</span>
          <label class="hse-toggle-row"><span>Afficher le coût</span><input type="checkbox" class="cards-opt-cost" checked></label>
          <label class="hse-toggle-row"><span>Période</span><select class="hse-select cards-opt-period">
            <option value="day">Jour</option><option value="week">Semaine</option>
            <option value="month" selected>Mois</option><option value="year">Année</option>
          </select></label>
          <button class="hse-btn cards-generate-btn" style="margin-top:12px">Générer le YAML</button>
        </div>
        <div class="hse-card cards-yaml-card" style="display:none">
          <span class="hse-label">YAML généré</span>
          <pre class="hse-code cards-yaml-output" style="max-height:300px;overflow-y:auto"></pre>
          <div class="hse-toolbar" style="margin-top:8px">
            <button class="hse-btn hse-btn-secondary cards-copy-btn">📋 Copier</button>
            <button class="hse-btn hse-btn-ghost cards-download-btn">⬇ Télécharger .yaml</button>
          </div>
        </div>
      </div>`;
  }

  _bindEvents() {
    this._root.querySelector('.cards-check-all')?.addEventListener('click', () =>
      this._root.querySelectorAll('.cards-item-check').forEach(cb => cb.checked = true));
    this._root.querySelector('.cards-uncheck-all')?.addEventListener('click', () =>
      this._root.querySelectorAll('.cards-item-check').forEach(cb => cb.checked = false));
    this._root.querySelector('.cards-generate-btn')?.addEventListener('click', () => this._generate());
    this._root.querySelector('.cards-copy-btn')?.addEventListener('click', () => {
      const yaml = this._root.querySelector('.cards-yaml-output')?.textContent ?? '';
      navigator.clipboard.writeText(yaml).catch(() => {});
    });
    this._root.querySelector('.cards-download-btn')?.addEventListener('click', () => {
      const yaml = this._root.querySelector('.cards-yaml-output')?.textContent ?? '';
      const blob = new Blob([yaml], { type: 'text/yaml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hse_cards.yaml';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  _generate() {
    const checked = [...this._root.querySelectorAll('.cards-item-check:checked')].map(cb => cb.dataset.id);
    const showCost = !!this._root.querySelector('.cards-opt-cost')?.checked;
    const period   = this._root.querySelector('.cards-opt-period')?.value ?? 'month';
    const selected = this._catalogue.filter(it => checked.includes(it.entity_id));
    const yaml     = this._composeYaml(selected, { showCost, period });
    const pre = this._root.querySelector('.cards-yaml-output');
    const card = this._root.querySelector('.cards-yaml-card');
    if (pre)  pre.textContent = yaml;
    if (card) card.style.display = '';
  }

  /**
   * Génération YAML Lovelace minimale.
   * Sera remplacé par yamlComposer.js V2 quand disponible dans shared/.
   */
  _composeYaml(items, opts) {
    if (!items.length) return '# Aucun appareil sélectionné';
    const lines = ['type: entities', 'title: HSE — Consommation', 'entities:'];
    items.forEach(it => {
      lines.push(`  - entity: ${it.entity_id}`);
      lines.push(`    name: ${it.name}`);
      if (opts.showCost) lines.push(`    # Période: ${opts.period}`);
    });
    return lines.join('\n');
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur cards : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default CardsView;
