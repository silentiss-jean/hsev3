/**
 * cards_view.js — Onglet Cartes YAML HSE V3 (S3)
 *
 * Génère du YAML Lovelace prêt à coller dans un dashboard HA.
 *   - Charge le catalogue au mount
 *   - Sélection multiple d'appareils
 *   - Options : type de carte, affichage coût, période
 *   - Prévisualisation YAML (read-only)
 *   - Copier dans le presse-papier + téléchargement .yaml
 *
 * Règles R1–R5 :
 *   R1 — mount() construit le DOM une fois, update_hass() ne reconstruit jamais
 *   R2 — flag _fetching sur chaque fetch
 *   R3 — JSON.stringify signature avant _render()
 *   R4 — zéro localStorage
 *   R5 — skeleton systématique
 */
import { escHtml, escAttr } from '../../shared/hse_esc.js';

const CSS = `
.hse-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 1200px; margin: 0 auto; }
@media (max-width: 768px) { .hse-cards { grid-template-columns: 1fr; } }
.hse-cards__panel {
  background: var(--hse-surface, #fff); border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 16px; padding: 20px;
}
.hse-cards__title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: var(--hse-text, #1f2937); }
.hse-cards__options { display: grid; gap: 12px; margin-bottom: 16px; }
.hse-cards__field { display: grid; gap: 6px; }
.hse-cards__label { font-size: 0.85rem; font-weight: 600; color: var(--hse-text, #1f2937); }
.hse-cards__select, .hse-cards__input {
  width: 100%; min-height: 40px; border-radius: 10px; border: 1px solid var(--hse-border, #e5e7eb);
  padding: 8px 12px; font: inherit; background: var(--hse-bg, #fff); color: var(--hse-text, #1f2937);
}
.hse-cards__toggle { display: flex; align-items: center; gap: 10px; }
.hse-cards__toggle input { width: 18px; height: 18px; }
.hse-cards__list { max-height: 320px; overflow-y: auto; border: 1px solid var(--hse-border, #e5e7eb); border-radius: 10px; }
.hse-cards__item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--hse-border, #e5e7eb); font-size: 0.875rem; }
.hse-cards__item:last-child { border-bottom: none; }
.hse-cards__item input { width: 18px; height: 18px; }
.hse-cards__item-name { flex: 1; color: var(--hse-text, #1f2937); }
.hse-cards__item-id { font-size: 0.78rem; color: var(--hse-text-muted, #6b7280); font-family: monospace; }
.hse-cards__item--inactive { opacity: 0.5; }
.hse-cards__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.hse-cards__btn {
  min-height: 40px; padding: 8px 16px; border-radius: 10px; font: inherit; cursor: pointer;
  border: 1px solid var(--hse-border, #e5e7eb); background: var(--hse-surface, #fff); color: var(--hse-text, #1f2937);
}
.hse-cards__btn:hover { border-color: var(--hse-accent, #2563eb); }
.hse-cards__btn:disabled { opacity: 0.5; cursor: default; }
.hse-cards__btn--primary { background: var(--hse-accent, #2563eb); color: var(--hse-on-accent, #fff); border-color: var(--hse-accent, #2563eb); }
.hse-cards__yaml {
  width: 100%; min-height: 360px; resize: vertical; font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.82rem; line-height: 1.5; border-radius: 10px; border: 1px solid var(--hse-border, #e5e7eb);
  padding: 14px; background: var(--hse-bg-secondary, #f9fafb); color: var(--hse-text, #1f2937);
  white-space: pre; overflow-x: auto;
}
.hse-cards__empty { text-align: center; padding: 32px; color: var(--hse-text-muted, #6b7280); }
.hse-cards__status { font-size: 0.85rem; color: var(--hse-success, #15803d); margin-top: 8px; min-height: 1.2em; }
`;

/**
 * Génère le YAML Lovelace à partir des appareils sélectionnés et des options.
 * @param {Array<{entity_id: string, name: string}>} devices
 * @param {{card_type: string, show_cost: boolean, period: string}} options
 * @returns {string}
 */
function generateYaml(devices, options) {
  const { card_type, show_cost, period } = options;
  const cards = devices.map(d => {
    const parts = [
      `type: ${card_type}`,
      `entity: ${d.entity_id}`,
      `name: ${d.name || d.entity_id}`,
    ];
    if (card_type === 'gauge') {
      parts.push('min: 0', 'max: 5000', 'unit: W');
    }
    if (show_cost) {
      parts.push(`secondary_info: Coût ${period}`);
    }
    return parts.map(l => '  ' + l).join('\n');
  });

  return [
    'title: HSE — Dashboard généré',
    'views:',
    '  - title: HSE',
    '    cards:',
    ...cards.map(c => '      - ' + c.replace(/\n/g, '\n        ')),
  ].join('\n');
}

export class CardsView {
  constructor() {
    this._el = null;
    this._ctx = null;
    this._abort = null;
    this._fetching = false;
    this._data = null;
    this._sig = null;
    this._els = {};
    this._selected = new Set();
    this._options = { card_type: 'sensor', show_cost: false, period: 'day' };
  }

  mount(el, ctx) {
    this._el = el;
    this._ctx = ctx;
    this._abort = new AbortController();
    this._injectCSS();
    this._buildDOM();
    this._fetchData();
  }

  update_hass(hass) {
    // R1 — ne reconstruit pas le DOM
  }

  unmount() {
    if (this._abort) this._abort.abort();
    this._abort = null;
    this._el = null;
    this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-cards-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-cards-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    this._el.innerHTML = `
      <div class="hse-cards">
        <div class="hse-cards__panel">
          <div class="hse-cards__title">Sélection des appareils</div>
          <div class="hse-cards__options">
            <div class="hse-cards__field">
              <label class="hse-cards__label" for="hse-cards-type">Type de carte</label>
              <select class="hse-cards__select" id="hse-cards-type">
                <option value="sensor">Sensor (valeur)</option>
                <option value="gauge">Gauge (jauge)</option>
                <option value="entity">Entity (liste)</option>
              </select>
            </div>
            <div class="hse-cards__field">
              <label class="hse-cards__label" for="hse-cards-period">Période</label>
              <select class="hse-cards__select" id="hse-cards-period">
                <option value="day">Jour</option>
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
                <option value="year">Année</option>
              </select>
            </div>
            <label class="hse-cards__toggle">
              <input type="checkbox" id="hse-cards-cost" />
              <span>Afficher le coût (secondary_info)</span>
            </label>
          </div>
          <div class="hse-cards__list" id="hse-cards-list"><div class="hse-skeleton"></div></div>
          <div class="hse-cards__actions">
            <button class="hse-cards__btn" id="hse-cards-select-all" type="button">Tout sélectionner</button>
            <button class="hse-cards__btn" id="hse-cards-clear" type="button">Effacer</button>
          </div>
        </div>

        <div class="hse-cards__panel">
          <div class="hse-cards__title">YAML généré</div>
          <textarea class="hse-cards__yaml" id="hse-cards-yaml" readonly aria-label="YAML généré"></textarea>
          <div class="hse-cards__actions">
            <button class="hse-cards__btn hse-cards__btn--primary" id="hse-cards-copy" type="button">📋 Copier</button>
            <button class="hse-cards__btn" id="hse-cards-download" type="button">⬇ Télécharger .yaml</button>
          </div>
          <div class="hse-cards__status" id="hse-cards-status" aria-live="polite"></div>
        </div>
      </div>
    `;

    this._els = {
      type: this._el.querySelector('#hse-cards-type'),
      period: this._el.querySelector('#hse-cards-period'),
      cost: this._el.querySelector('#hse-cards-cost'),
      list: this._el.querySelector('#hse-cards-list'),
      selectAll: this._el.querySelector('#hse-cards-select-all'),
      clear: this._el.querySelector('#hse-cards-clear'),
      yaml: this._el.querySelector('#hse-cards-yaml'),
      copy: this._el.querySelector('#hse-cards-copy'),
      download: this._el.querySelector('#hse-cards-download'),
      status: this._el.querySelector('#hse-cards-status'),
    };

    this._els.type.addEventListener('change', () => { this._options.card_type = this._els.type.value; this._updateYaml(); });
    this._els.period.addEventListener('change', () => { this._options.period = this._els.period.value; this._updateYaml(); });
    this._els.cost.addEventListener('change', () => { this._options.show_cost = this._els.cost.checked; this._updateYaml(); });
    this._els.selectAll.addEventListener('click', () => this._selectAll());
    this._els.clear.addEventListener('click', () => this._clearAll());
    this._els.copy.addEventListener('click', () => this._copyYaml());
    this._els.download.addEventListener('click', () => this._downloadYaml());
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue?status=selected', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const sig = JSON.stringify(data);
      if (sig === this._sig) return;
      this._sig = sig;
      this._data = data;
      this._renderList(data);
      this._updateYaml();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._els.list.innerHTML = `<div class="hse-error">Erreur chargement catalogue — ${escHtml(e.message)}</div>`;
    } finally {
      this._fetching = false;
    }
  }

  _renderList(data) {
    const items = data.items || [];
    if (!items.length) {
      this._els.list.innerHTML = '<div class="hse-cards__empty">Aucun appareil actif. Allez dans l\'onglet Détection pour scanner et activer des capteurs.</div>';
      return;
    }

    // R1 — construire la liste une seule fois
    this._els.list.innerHTML = '';
    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'hse-cards__item';
      div.dataset.id = item.entity_id;
      div.innerHTML = `
        <input type="checkbox" data-id="${escAttr(item.entity_id)}" />
        <span class="hse-cards__item-name"></span>
        <span class="hse-cards__item-id"></span>
      `;
      div.querySelector('.hse-cards__item-name').textContent = item.name || item.entity_id;
      div.querySelector('.hse-cards__item-id').textContent = item.entity_id;
      const cb = div.querySelector('input');
      cb.addEventListener('change', () => {
        if (cb.checked) this._selected.add(item.entity_id);
        else this._selected.delete(item.entity_id);
        this._updateYaml();
      });
      this._els.list.appendChild(div);
    }
  }

  _selectAll() {
    if (!this._data) return;
    for (const item of (this._data.items || [])) {
      this._selected.add(item.entity_id);
      const cb = this._els.list.querySelector(`input[data-id="${escAttr(item.entity_id)}"]`);
      if (cb) cb.checked = true;
    }
    this._updateYaml();
  }

  _clearAll() {
    this._selected.clear();
    this._els.list.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    this._updateYaml();
  }

  _getSelectedDevices() {
    if (!this._data) return [];
    return (this._data.items || []).filter(i => this._selected.has(i.entity_id));
  }

  _updateYaml() {
    const devices = this._getSelectedDevices();
    if (!devices.length) {
      this._els.yaml.value = '# Sélectionnez au moins un appareil pour générer le YAML';
      return;
    }
    this._els.yaml.value = generateYaml(devices, this._options);
  }

  async _copyYaml() {
    const text = this._els.yaml.value;
    if (!text || text.startsWith('#')) {
      this._setStatus('Aucun YAML à copier', true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this._setStatus('✓ YAML copié dans le presse-papier', false);
    } catch (e) {
      // Fallback : sélectionner le textarea
      this._els.yaml.select();
      try {
        document.execCommand('copy');
        this._setStatus('✓ YAML copié', false);
      } catch {
        this._setStatus('⚠ Copie impossible — sélectionnez et copiez manuellement', true);
      }
    }
  }

  _downloadYaml() {
    const text = this._els.yaml.value;
    if (!text || text.startsWith('#')) {
      this._setStatus('Aucun YAML à télécharger', true);
      return;
    }
    const blob = new Blob([text], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hse_dashboard.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._setStatus('✓ Fichier téléchargé', false);
  }

  _setStatus(msg, isError) {
    this._els.status.textContent = msg;
    this._els.status.style.color = isError ? 'var(--hse-error, #dc2626)' : 'var(--hse-success, #15803d)';
  }
}

export default CardsView;
