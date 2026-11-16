/**
 * config_view.js — Onglet Configuration HSE V3
 * Onglet C : saisie libre HT + TTC, pas de champ TVA, pas de calcul auto
 */

const CSS = `
.hse-cfg { display:flex; flex-direction:column; gap:16px; }
.hse-cfg__tabs { display:flex; gap:4px; border-bottom:2px solid rgba(255,255,255,0.08); margin-bottom:4px; }
.hse-cfg__tab { padding:8px 16px; font-size:0.875rem; font-family:inherit; font-weight:500; background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.5); border-bottom:2px solid transparent; margin-bottom:-2px; transition:color 180ms, border-color 180ms; }
.hse-cfg__tab:hover { color:rgba(255,255,255,0.85); }
.hse-cfg__tab.active { color:#e879f9; border-bottom-color:#e879f9; }
.hse-cfg__panel { display:none; }
.hse-cfg__panel.active { display:block; }
.hse-btn { padding:7px 14px; border-radius:6px; border:1px solid transparent; font-size:0.82rem; font-family:inherit; cursor:pointer; transition:opacity 150ms,background 150ms; white-space:nowrap; }
.hse-btn:disabled { opacity:0.38; cursor:not-allowed; }
.hse-btn--primary { background:#e879f9; color:#000; font-weight:600; }
.hse-btn--primary:hover:not(:disabled) { opacity:0.85; }
.hse-btn--ghost { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); }
.hse-btn--ghost:hover:not(:disabled) { background:rgba(255,255,255,0.12); }
.hse-btn--danger { background:rgba(239,68,68,0.12); color:#f87171; border-color:rgba(239,68,68,0.25); }
.hse-btn--danger:hover:not(:disabled) { background:rgba(239,68,68,0.2); }
.hse-btn--sm { padding:3px 9px; font-size:0.76rem; }
.hse-cfg__ref-block, .hse-cfg__auto-block { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:10px; margin-bottom:10px; font-size:0.82rem; }
.hse-cfg__ref-block { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); }
.hse-cfg__auto-block { background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.22); }
.hse-cfg__ref-icon { font-size:1.1rem; flex-shrink:0; }
.hse-cfg__ref-label { flex:1; color:rgba(255,255,255,0.7); }
.hse-cfg__ref-select { flex:1 1 240px; min-width:180px; padding:5px 10px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); font-size:0.82rem; font-family:inherit; outline:none; transition:border-color 150ms; }
.hse-cfg__ref-select:focus { border-color:#f59e0b; }
.hse-cfg__ref-status { font-size:0.75rem; color:rgba(255,255,255,0.35); margin-left:4px; }
.hse-cfg__ref-status[data-level="error"] { color:#fca5a5; }
.hse-cfg__ref-status[data-level="ok"] { color:#4ade80; }
.hse-cfg__ref-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; width:100%; }
.hse-cfg__ref-row + .hse-cfg__ref-row { margin-top:8px; }
.hse-cfg__ref-hint { font-size:0.72rem; color:rgba(255,255,255,0.4); flex:1 1 100%; }
.hse-cfg__toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
.hse-cfg__search { flex:1 1 200px; padding:7px 12px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:inherit; font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 150ms; }
.hse-cfg__search:focus { border-color:#e879f9; }
.hse-cfg__search::placeholder { color:rgba(255,255,255,0.3); }
.hse-cfg__filter { padding:7px 12px; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(255,255,255,0.05); color:inherit; font-size:0.875rem; font-family:inherit; cursor:pointer; outline:none; }
.hse-cfg__bulk { display:none; align-items:center; gap:8px; flex-wrap:wrap; padding:7px 12px; background:rgba(232,121,249,0.08); border:1px solid rgba(232,121,249,0.2); border-radius:8px; font-size:0.82rem; margin-bottom:8px; }
.hse-cfg__bulk.visible { display:flex; }
.hse-cfg__bulk-label { flex:1; color:rgba(255,255,255,0.6); }
.hse-cfg__groups { display:flex; flex-direction:column; gap:8px; }
.hse-cfg__group { border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; background:rgba(255,255,255,0.02); }
.hse-cfg__group-head { display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(255,255,255,0.05); cursor:pointer; user-select:none; transition:background 150ms; }
.hse-cfg__group-head:hover { background:rgba(255,255,255,0.08); }
.hse-cfg__group-arrow { font-size:0.7rem; color:rgba(255,255,255,0.4); transition:transform 200ms; flex-shrink:0; }
.hse-cfg__group.open .hse-cfg__group-arrow { transform:rotate(90deg); }
.hse-cfg__group-name { font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.85); }
.hse-cfg__group-count { margin-left:4px; font-size:0.72rem; font-weight:600; padding:1px 6px; border-radius:999px; background:rgba(232,121,249,0.15); color:#e879f9; }
.hse-cfg__group-summary { margin-left:auto; display:flex; gap:6px; align-items:center; font-size:0.72rem; color:rgba(255,255,255,0.4); }
.hse-cfg__group-selall { display:flex; gap:6px; padding:6px 12px; border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; align-items:center; }
.hse-cfg__group-body { display:none; }
.hse-cfg__group.open .hse-cfg__group-body { display:block; }
.hse-cfg__sensor-row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 120ms; }
.hse-cfg__sensor-row:last-child { border-bottom:none; }
.hse-cfg__sensor-row:hover { background:rgba(255,255,255,0.04); }
.hse-cfg__sensor-row.selected { background:rgba(232,121,249,0.05); }
.hse-cfg__sensor-info { flex:1; min-width:0; }
.hse-cfg__sensor-name { font-size:0.875rem; color:rgba(255,255,255,0.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-eid { font-size:0.72rem; color:rgba(255,255,255,0.35); font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-meta { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
.hse-cfg__sensor-actions { display:flex; gap:4px; flex-shrink:0; flex-wrap:nowrap; }
.hse-cfg__type-icon { font-size:0.9rem; flex-shrink:0; }
.hse-cfg__badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px; font-size:0.7rem; font-weight:600; white-space:nowrap; }
.hse-cfg__badge--selected { background:rgba(34,197,94,0.15); color:#4ade80; }
.hse-cfg__badge--ignored { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); }
.hse-cfg__badge--pending { background:rgba(234,179,8,0.12); color:#facc15; }
.hse-cfg__badge--normal { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); }
.hse-cfg__quality { display:inline-flex; align-items:center; gap:3px; font-size:0.7rem; color:rgba(255,255,255,0.4); }
.hse-cfg__quality-level { font-size:0.68rem; font-weight:600; padding:1px 5px; border-radius:4px; }
.hse-cfg__quality-level--BON { background:rgba(34,197,94,0.18); color:#4ade80; }
.hse-cfg__quality-level--ACCEPTABLE{ background:rgba(234,179,8,0.15); color:#facc15; }
.hse-cfg__quality-level--MOYEN { background:rgba(249,115,22,0.15); color:#fb923c; }
.hse-cfg__quality-level--MAUVAIS { background:rgba(239,68,68,0.15); color:#f87171; }
.hse-cfg__stars { color:#f59e0b; font-size:0.72rem; }
.hse-cfg__score { font-size:0.68rem; color:rgba(255,255,255,0.3); }
.hse-cfg__diff-banner { display:none; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); border-radius:10px; font-size:0.875rem; margin-bottom:12px; }
.hse-cfg__diff-banner.visible { display:flex; }
.hse-cfg__diff-msg { flex:1; }
.hse-cfg__pricing-wrap { display:flex; flex-direction:column; gap:20px; max-width:860px; }
.hse-cfg__pricing-section { border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; }
.hse-cfg__pricing-section-title { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(255,255,255,0.04); font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.7); border-bottom:1px solid rgba(255,255,255,0.06); }
.hse-cfg__pricing-body { padding:14px; display:flex; flex-direction:column; gap:14px; }
.hse-cfg__pricing-subtitle { font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.5); padding:4px 0 2px; display:flex; align-items:center; gap:6px; }
.hse-cfg__field { display:flex; flex-direction:column; gap:5px; }
.hse-cfg__field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:560px){ .hse-cfg__field-row { grid-template-columns:1fr; } }
.hse-cfg__label { font-size:0.8rem; font-weight:500; color:rgba(255,255,255,0.6); }
.hse-cfg__input, .hse-cfg__select { padding:7px 11px; border:1px solid rgba(255,255,255,0.1); border-radius:6px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 150ms; width:100%; }
.hse-cfg__input:focus, .hse-cfg__select:focus { border-color:#e879f9; }
.hse-cfg__input::placeholder { color:rgba(255,255,255,0.2); }
.hse-cfg__hp-hc { display:none; flex-direction:column; gap:14px; }
.hse-cfg__hp-hc.visible { display:flex; }
.hse-cfg__save-row { display:flex; align-items:center; gap:10px; }
.hse-cfg__save-status { font-size:0.8rem; color:rgba(255,255,255,0.4); }
.hse-cfg__grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:600px){ .hse-cfg__grid { grid-template-columns:1fr; } }
.hse-cfg__card { border:1px solid rgba(255,255,255,0.08); border-radius:10px; background:rgba(255,255,255,0.02); overflow:hidden; }
.hse-cfg__card-head { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.875rem; font-weight:600; }
.hse-cfg__list { padding:0; margin:0; list-style:none; }
.hse-cfg__list li { display:flex; align-items:baseline; justify-content:space-between; padding:7px 14px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.875rem; gap:8px; }
.hse-cfg__list li:last-child { border-bottom:none; }
.hse-cfg__list-eid { font-size:0.7rem; color:rgba(255,255,255,0.3); font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px; }
@keyframes hse-shimmer { 0% { background-position:-200% 0; } 100% { background-position: 200% 0; } }
.hse-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite; border-radius:10px; min-height:120px; width:100%; }
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error { color:#f87171; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:12px 16px; font-size:0.875rem; }
.hse-empty { text-align:center; padding:48px 16px; color:rgba(255,255,255,0.35); }
.hse-empty-icon { font-size:2.5rem; margin-bottom:12px; }
.hse-empty p { font-size:0.875rem; }
.hse-cfg__note { font-size:0.78rem; color:rgba(255,255,255,0.35); padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.07); }
.hse-cfg__modes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(255,255,255,0.06); }
`;

const CATALOGUE_PER_PAGE = 200;
// FIX #3 : TYPE_ICON enrichi avec variantes réelles tapo/tplink/tuya
const TYPE_ICON = {
  energy:'⚡', power:'🔋', gas:'🔥', water:'💧', temperature:'🌡️',
  current_power:'🔋', today_energy:'⚡', month_energy:'⚡',
  daily_energy:'⚡', weekly_energy:'⚡', yearly_energy:'⚡',
  total_energy:'⚡', consumption:'⚡', production:'☀️',
  voltage:'🔌', current:'🔌', apparent_power:'🔋', reactive_power:'🔋',
};

export class ConfigView {
  constructor() {
    this._el = null; this._ctx = null; this._abort = null; this._mounted = false; this._activeTab = 'appareils';
    this._catFetching = false; this._catData = null; this._catSig = null; this._catPage = 1;
    this._catStatus = 'all'; this._catQ = ''; this._selected = new Set(); this._openGroups = new Set();
    this._refEntityId = null; this._refEnergyId = null; this._refSaving = false; this._autoSelecting = false;
    this._metaFetching = false; this._metaData = null; this._metaSig = null; this._diffApplying = false;
    this._asgFetching = false; this._asgData = null; this._asgSig = null; this._asgPage = 1;
    this._asgStatus = 'all'; this._asgQ = ''; this._asgFilter = 'all';
    this._asgDirty = new Map(); // entity_id -> {room_id?, type_id?}
    this._modalState = null; // {mode: 'create'|'rename', kind: 'room'|'type', id?, name?}
    this._pricingFetching = false; this._pricingData = null; this._pricingSig = null; this._pricingSaving = false;
  }

  mount(el, ctx) {
    this._el = el; this._ctx = ctx; this._abort = new AbortController();
    this._mounted = true; this._injectCSS(); this._buildDOM();
    this._loadCatalogue(); this._loadReference();
  }
  update_hass(hass) { this._ctx = { ...this._ctx, hass }; }
  unmount() {
    this._mounted = false;
    if (this._abort) this._abort.abort();
    this._abort = null; this._el = null; this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-cfg-css')) return;
    const s = document.createElement('style'); s.id = 'hse-cfg-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    this._el.innerHTML = '';
    const root = document.createElement('div'); root.className = 'hse-cfg';
    root.innerHTML = `
      <div class="hse-cfg__tabs" role="tablist">
        <button class="hse-cfg__tab active" data-tab="appareils" role="tab" aria-selected="true">Appareils</button>
        <button class="hse-cfg__tab" data-tab="meta" role="tab" aria-selected="false">Pièces &amp; Types</button>
        <button class="hse-cfg__tab" data-tab="pricing" role="tab" aria-selected="false">Tarification</button>
      </div>
      <div class="hse-cfg__panel active" id="hse-cfg-panel-appareils" role="tabpanel">
        <div class="hse-cfg__ref-block">
          <span class="hse-cfg__ref-icon">⭐</span>
          <span class="hse-cfg__ref-label">Capteur de référence (ex : Linky)</span>
          <div class="hse-cfg__ref-row">
            <span class="hse-cfg__ref-hint">Index d'énergie cumulatif (kWh, state_class total) — base de facturation</span>
            <select id="hse-cfg-ref-energy-select" class="hse-cfg__ref-select"><option value="">— Aucun —</option></select>
            <button id="hse-cfg-ref-energy-save" class="hse-btn hse-btn--primary hse-btn--sm">Enregistrer</button>
            <span id="hse-cfg-ref-energy-status" class="hse-cfg__ref-status"></span>
          </div>
          <div class="hse-cfg__ref-row">
            <span class="hse-cfg__ref-hint">Puissance instantanée (W) — contrôle en direct uniquement, jamais facturable</span>
            <select id="hse-cfg-ref-select" class="hse-cfg__ref-select"><option value="">— Aucun —</option></select>
            <button id="hse-cfg-ref-save" class="hse-btn hse-btn--ghost hse-btn--sm">Enregistrer</button>
            <span id="hse-cfg-ref-status" class="hse-cfg__ref-status"></span>
          </div>
        </div>
        <div class="hse-cfg__auto-block">
          <span class="hse-cfg__ref-icon">✨</span>
          <span class="hse-cfg__ref-label">Sélection automatique intelligente</span>
          <button id="hse-cfg-auto-btn" class="hse-btn hse-btn--primary hse-btn--sm">🚀 Lancer</button>
          <span id="hse-cfg-auto-status" class="hse-cfg__ref-status"></span>
        </div>
        <!-- Barre de modes d'usage -->
        <div class="hse-cfg__modes">
          <button id="hse-cfg-mode-auto" class="hse-btn hse-btn--ghost hse-btn--sm hse-mode-btn" data-mode="auto" title="Sélectionne automatiquement les 5 plus gros consommateurs">⚡ Auto</button>
          <button id="hse-cfg-mode-conseiller" class="hse-btn hse-btn--ghost hse-btn--sm hse-mode-btn" data-mode="conseiller" title="Analyse et propose les meilleurs capteurs à surveiller">🎯 Conseiller</button>
          <button id="hse-cfg-mode-custom" class="hse-btn hse-btn--primary hse-btn--sm hse-mode-btn hse-mode-active" data-mode="custom" title="Sélection manuelle appareil par appareil">✋ Customisation</button>
          <button id="hse-cfg-mode-reflexion" class="hse-btn hse-btn--ghost hse-btn--sm hse-mode-btn" data-mode="reflexion" title="Analyse les économies potentielles et suggère des groupes">💡 Reflexion</button>
        </div>
        <div class="hse-cfg__toolbar">
          <input class="hse-cfg__search" placeholder="Rechercher un appareil…" />
          <select id="hse-cfg-status-filter" class="hse-cfg__filter">
            <option value="all">Tous</option><option value="selected">Sélectionnés</option><option value="ignored">Ignorés</option><option value="pending">En attente</option>
          </select>
          <button id="hse-cfg-refresh-btn" class="hse-btn hse-btn--ghost hse-btn--sm">🔄 Rafraîchir</button>
          <button id="hse-cfg-expand-btn" class="hse-btn hse-btn--ghost hse-btn--sm" title="Tout déplier / Replier">⊞ Déplier tout</button>
          <button id="hse-cfg-select-all-btn" class="hse-btn hse-btn--ghost hse-btn--sm">✓ Tout sélectionner</button>
          <button id="hse-cfg-select-none-btn" class="hse-btn hse-btn--ghost hse-btn--sm">✕ Tout désélectionner</button>
        </div>
        <div id="hse-cfg-bulk" class="hse-cfg__bulk">
          <span id="hse-cfg-bulk-label" class="hse-cfg__bulk-label">0 sélectionné(s)</span>
          <button id="hse-cfg-bulk-activate" class="hse-btn hse-btn--primary hse-btn--sm">✓ Activer</button>
          <button id="hse-cfg-bulk-ignore" class="hse-btn hse-btn--danger hse-btn--sm">✕ Ignorer</button>
          <button id="hse-cfg-bulk-cancel" class="hse-btn hse-btn--ghost hse-btn--sm">Annuler</button>
        </div>
        <div id="hse-cfg-cat-body"><div class="hse-skeleton"></div></div>
        <div id="hse-cfg-cat-pager" style="display:none;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.8rem;color:rgba(255,255,255,0.4);"></div>
      </div>
      <div class="hse-cfg__panel" id="hse-cfg-panel-meta" role="tabpanel">
        <div id="hse-cfg-diff-banner" class="hse-cfg__diff-banner">
          <span id="hse-cfg-diff-msg" class="hse-cfg__diff-msg"></span>
          <button id="hse-cfg-diff-apply" class="hse-btn hse-btn--primary hse-btn--sm">Appliquer</button>
          <button id="hse-cfg-diff-dismiss" class="hse-btn hse-btn--ghost hse-btn--sm">Ignorer</button>
        </div>
        <div id="hse-cfg-meta-body"><div class="hse-skeleton"></div></div>
        <p class="hse-cfg__note">ℹ️ La création manuelle de pièces et types sera disponible prochainement (DELTA-059).</p>
      </div>
      <div class="hse-cfg__panel" id="hse-cfg-panel-pricing" role="tabpanel">
        <div id="hse-cfg-pricing-body"><div class="hse-skeleton"></div></div>
      </div>`;
    this._el.appendChild(root);
    this._bindTabs(root); this._bindAppareilsEvents(root);
    // FIX: _bindMetaEvents() sera appelé dans _renderMeta() pour rebinder après chaque re-render
  }

  _bindTabs(root) {
    root.querySelectorAll('.hse-cfg__tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab === this._activeTab) return;
        this._activeTab = tab;
        root.querySelectorAll('.hse-cfg__tab').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-tab') === tab);
          b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false');
        });
        root.querySelectorAll('.hse-cfg__panel').forEach(p => {
          p.classList.toggle('active', p.id === `hse-cfg-panel-${tab}`);
        });
        if (tab === 'meta' && !this._metaData) { this._loadMeta(); this._loadDiffPreview(); }
        if (tab === 'pricing' && !this._pricingData) this._loadPricing();
      });
    });
  }

  async _loadReference() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      this._refEntityId = data.reference_entity_id ?? null;
      this._refEnergyId = data.reference_energy_entity_id ?? null;
      this._populateRefSelect();
    } catch (e) {}
  }

  // FIX #2 : liste élargie à tous les capteurs non-ignorés, triés par quality_score desc
  // Capteurs selected+energy en tête ; current_ref toujours présent même si non catalogué
  _populateRefSelect() {
    this._fillRefSelect('#hse-cfg-ref-select', this._refEntityId, false);
    this._fillRefSelect('#hse-cfg-ref-energy-select', this._refEnergyId, true);
  }

  /**
   * Q7-R7 — alimente un des deux selects de référence.
   *
   * `energyOnly` = index cumulatif (kWh) : on ne propose que des entités dont
   * le type évoque une énergie, parce que le backend refuse toute autre unité
   * (Q7-R1). Sans ce filtre, l'utilisateur sélectionne une puissance et
   * l'enregistrement échoue en 422 sans comprendre pourquoi.
   */
  _fillRefSelect(selector, current, energyOnly) {
    const sel = this._el?.querySelector(selector);
    if (!sel) return;
    const items = this._catData?.items ?? [];
    const ENERGY_TYPES = new Set([
      'energy', 'today_energy', 'month_energy', 'daily_energy',
      'weekly_energy', 'yearly_energy', 'total_energy', 'consumption',
    ]);
    const candidates = items
      .filter(i => i.status !== 'ignored')
      .sort((a, b) => (b.quality_score ?? b.score ?? 0) - (a.quality_score ?? a.score ?? 0));
    // Sélectionnés de type energy en tête
    const priority = candidates.filter(i =>
      i.status === 'selected' && ENERGY_TYPES.has((i.type ?? '').toLowerCase())
    );
    const rest = candidates.filter(i =>
      !(i.status === 'selected' && ENERGY_TYPES.has((i.type ?? '').toLowerCase()))
    );
    let sorted = [...priority, ...rest];
    if (energyOnly) {
      sorted = sorted.filter(i => ENERGY_TYPES.has((i.type ?? '').toLowerCase()));
    }
    // Garder la ref actuelle même si non cataloguée
    if (current && !sorted.find(i => i.entity_id === current)) {
      sorted = [{ entity_id: current, name: current }, ...sorted];
    }
    sel.innerHTML = '<option value="">— Aucun —</option>';
    sorted.forEach(item => {
      const label = item.name && item.name !== item.entity_id
        ? `${item.name} (${item.entity_id})`
        : item.entity_id;
      const opt = document.createElement('option');
      opt.value = item.entity_id; opt.textContent = label;
      if (item.entity_id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async _saveReference(selector, statusSelector, field, value) {
    const status = this._el?.querySelector(statusSelector);
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }), signal: this._abort?.signal,
      });
      if (!r.ok) {
        // Q7-R1 — le backend renvoie un message explicite (422) : on l'affiche
        // tel quel plutôt qu'un « Erreur » générique.
        let msg = `HTTP ${r.status}`;
        try { const body = await r.json(); msg = body.message ?? body.error ?? msg; } catch (e) {}
        if (status) {
          status.textContent = msg;
          status.dataset.level = 'error';
          setTimeout(() => { if (status) { status.textContent = ''; delete status.dataset.level; } }, 6000);
        }
        return false;
      }
      if (status) {
        status.textContent = '✓ Enregistré';
        status.dataset.level = 'ok';
        setTimeout(() => { if (status) { status.textContent = ''; delete status.dataset.level; } }, 2500);
      }
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
      if (status) { status.textContent = `Erreur : ${e.message}`; status.dataset.level = 'error'; }
      return false;
    }
  }

  async _saveReference() {
    if (this._refSaving) return;
    this._refSaving = true;
    try {
      const sel = this._el?.querySelector('#hse-cfg-ref-select');
      const val = sel?.value ?? '';
      if (await this._saveReference('#hse-cfg-ref-select', '#hse-cfg-ref-status', 'reference_entity_id', val)) {
        this._refEntityId = val;
      }
    } finally { this._refSaving = false; }
  }

  async _saveReferenceEnergy() {
    if (this._refSaving) return;
    this._refSaving = true;
    try {
      const sel = this._el?.querySelector('#hse-cfg-ref-energy-select');
      const val = sel?.value ?? '';
      if (await this._saveReference('#hse-cfg-ref-energy-select', '#hse-cfg-ref-energy-status', 'reference_energy_entity_id', val)) {
        this._refEnergyId = val;
      }
    } finally { this._refSaving = false; }
  }

  _bindAppareilsEvents(root) {
    let deb;
    root.querySelector('.hse-cfg__search').addEventListener('input', e => {
      clearTimeout(deb);
      deb = setTimeout(() => { this._catQ = e.target.value.trim(); this._catPage = 1; this._catSig = null; this._loadCatalogue(); }, 350);
    });
    root.querySelector('#hse-cfg-status-filter').addEventListener('change', e => {
      this._catStatus = e.target.value; this._catPage = 1; this._catSig = null; this._loadCatalogue();
    });
    root.querySelector('#hse-cfg-refresh-btn').addEventListener('click', () => { this._catSig = null; this._loadCatalogue(); });
    // FIX feat : bouton Déplier tout / Replier tout
    root.querySelector('#hse-cfg-expand-btn').addEventListener('click', () => {
      const btn = root.querySelector('#hse-cfg-expand-btn');
      const groups = this._el?.querySelectorAll('.hse-cfg__group');
      if (!groups?.length) return;
      const anyOpen = Array.from(groups).some(g => g.classList.contains('open'));
      groups.forEach(g => {
        const key = g.getAttribute('data-group');
        if (anyOpen) { g.classList.remove('open'); this._openGroups.delete(key); }
        else { g.classList.add('open'); this._openGroups.add(key); }
      });
      btn.textContent = anyOpen ? '⊞ Déplier tout' : '⊟ Replier tout';
    });
    root.querySelector('#hse-cfg-bulk-activate').addEventListener('click', () => this._bulkAction('select'));
    root.querySelector('#hse-cfg-bulk-ignore').addEventListener('click', () => this._bulkAction('ignore'));
    root.querySelector('#hse-cfg-bulk-cancel').addEventListener('click', () => { this._selected.clear(); this._updateBulkBar(); });
    root.querySelector('#hse-cfg-ref-save').addEventListener('click', () => this._saveReference());
    root.querySelector('#hse-cfg-ref-energy-save').addEventListener('click', () => this._saveReferenceEnergy());
    root.querySelector('#hse-cfg-auto-btn').addEventListener('click', () => this._modeAuto());
    root.querySelector('#hse-cfg-mode-auto').addEventListener('click', () => this._setMode('auto'));
    root.querySelector('#hse-cfg-mode-conseiller').addEventListener('click', () => this._setMode('conseiller'));
    root.querySelector('#hse-cfg-mode-custom').addEventListener('click', () => this._setMode('custom'));
    root.querySelector('#hse-cfg-mode-reflexion').addEventListener('click', () => this._setMode('reflexion'));
    root.querySelector('#hse-cfg-select-all-btn').addEventListener('click', () => {
      const cbs = this._el?.querySelectorAll('.hse-cfg__cb');
      cbs.forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change')); });
    });
    root.querySelector('#hse-cfg-select-none-btn').addEventListener('click', () => {
      const cbs = this._el?.querySelectorAll('.hse-cfg__cb');
      cbs.forEach(cb => { cb.checked = false; cb.dispatchEvent(new Event('change')); });
    });
  }

  async _loadCatalogue() {
    if (this._catFetching) return;
    this._catFetching = true;
    const params = new URLSearchParams({ status: this._catStatus, page: this._catPage, per_page: CATALOGUE_PER_PAGE });
    if (this._catQ) params.set('q', this._catQ);
    try {
      const r = await this._ctx.hseFetch(`/api/hse/catalogue?${params}`, { signal: this._abort?.signal });
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._catSig) return;
      this._catSig = sig; this._catData = data;
      this._renderCatalogue(); this._populateRefSelect();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Erreur catalogue — ${this._esc(e.message)}</div>`);
    } finally { this._catFetching = false; }
  }

  _renderCatalogue() {
    const d = this._catData; if (!d) return;
    const items = d.items ?? [];
    if (!items.length) { this._setCatBody(`<div class="hse-empty"><div class="hse-empty-icon">📦</div><p>Aucun appareil catalogué.</p></div>`); return; }
    const groups = {};
    for (const item of items) {
      const key = item.integration_domain ?? item.integration ?? 'inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    if (this._openGroups.size === 0) Object.keys(groups).forEach(k => this._openGroups.add(k));
    const modePanel = this._renderModePanel(this._activeMode || 'custom', d);
    const html = Object.entries(groups).sort(([a],[b]) => a.localeCompare(b))
      .map(([integ, gItems]) => this._renderGroup(integ, gItems)).join('');
    this._setCatBody(`${modePanel}<div class="hse-cfg__groups">${html}</div>`);
    this._bindGroupEvents(); this._bindModeEvents(); this._renderCatPager(d);
    // Sync label bouton expand après rendu
    const btn = this._el?.querySelector('#hse-cfg-expand-btn');
    if (btn) {
      const anyOpen = Array.from(this._el?.querySelectorAll('.hse-cfg__group') ?? []).some(g => g.classList.contains('open'));
      btn.textContent = anyOpen ? '⊟ Replier tout' : '⊞ Déplier tout';
    }
  }

  _renderGroup(integ, items) {
    const isOpen = this._openGroups.has(integ);
    const selCount = items.filter(i => i.status === 'selected').length;
    const rows = items.map(item => this._renderSensorRow(item)).join('');
    return `
      <div class="hse-cfg__group ${isOpen ? 'open' : ''}" data-group="${this._attrVal(integ)}">
        <div class="hse-cfg__group-head">
          <span class="hse-cfg__group-arrow">▶</span>
          <span class="hse-cfg__group-name">${this._esc(integ)}</span>
          <span class="hse-cfg__group-count">${items.length}</span>
          <span class="hse-cfg__group-summary">${selCount} actif${selCount>1?'s':''}/ ${items.length}</span>
        </div>
        <div class="hse-cfg__group-selall">
          <button class="hse-btn hse-btn--sm hse-btn--ghost" data-grp-sel="${this._attrVal(integ)}" data-grp-action="select_all">Tout sélectionner</button>
          <button class="hse-btn hse-btn--sm hse-btn--ghost" data-grp-sel="${this._attrVal(integ)}" data-grp-action="deselect_all">Tout désélectionner</button>
        </div>
        <div class="hse-cfg__group-body">${rows}</div>
      </div>`;
  }

  _renderSensorRow(item) {
    const sel = this._selected.has(item.entity_id);
    const statusCls = `hse-cfg__badge--${item.status ?? 'pending'}`;
    const statusLbl = { selected:'Sélectionné', ignored:'Ignoré', pending:'En attente' }[item.status] ?? (item.status ?? 'En attente');
    const quality = this._renderQuality(item);
    const typeKey = (item.type ?? '').toLowerCase();
    const typeIcon = TYPE_ICON[typeKey] ?? '❓';
    return `
      <div class="hse-cfg__sensor-row ${sel ? 'selected' : ''}" data-eid="${this._attrVal(item.entity_id)}">
        <input type="checkbox" class="hse-cfg__cb" data-cb-eid="${this._attrVal(item.entity_id)}" ${sel ? 'checked' : ''} />
        <span class="hse-cfg__type-icon">${typeIcon}</span>
        <div class="hse-cfg__sensor-info">
          <div class="hse-cfg__sensor-name" data-toggle-cb="${this._attrVal(item.entity_id)}">${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-cfg__sensor-eid" data-toggle-cb="${this._attrVal(item.entity_id)}">${this._esc(item.entity_id)}</div>
        </div>
        <div class="hse-cfg__sensor-meta">${quality}<span class="hse-cfg__badge ${statusCls}">${statusLbl}</span></div>
        <div class="hse-cfg__sensor-actions">
          ${item.status !== 'selected' ? `<button class="hse-btn hse-btn--sm hse-btn--primary" data-triage-id="${this._attrVal(item.entity_id)}" data-triage-action="select">✓ Activer</button>` : ''}
          ${item.status !== 'ignored' ? `<button class="hse-btn hse-btn--sm hse-btn--ghost" data-triage-id="${this._attrVal(item.entity_id)}" data-triage-action="ignore">✕ Ignorer</button>` : ''}
        </div>
      </div>`;
  }

  _renderQuality(item) {
    const score = item.quality_score ?? item.score ?? null;
    const level = item.quality_level ?? item.quality ?? null;
    if (score === null && level === null) return '';
    const stars = score !== null ? this._scoreToStars(score) : '';
    const lvlCls = level ? `hse-cfg__quality-level--${level}` : '';
    const lvlLbl = level ? `<span class="hse-cfg__quality-level ${lvlCls}">${level}</span>` : '';
    const scoreStr = score !== null ? `<span class="hse-cfg__score">${score}/150</span>` : '';
    return `${lvlLbl}<span class="hse-cfg__stars">${stars}</span>${scoreStr}`;
  }

  _scoreToStars(score) {
    const n = Math.round((score / 150) * 5);
    return '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0, 5-n));
  }

  _bindGroupEvents() {
    const body = this._el?.querySelector('#hse-cfg-cat-body');
    if (!body) return;
    body.querySelectorAll('.hse-cfg__group-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const grp = head.closest('.hse-cfg__group');
        const key = grp.getAttribute('data-group');
        const open = grp.classList.toggle('open');
        open ? this._openGroups.add(key) : this._openGroups.delete(key);
        // Sync label bouton expand
        const btn = this._el?.querySelector('#hse-cfg-expand-btn');
        if (btn) {
          const allGroups = Array.from(this._el?.querySelectorAll('.hse-cfg__group') ?? []);
          const anyOpen = allGroups.some(g => g.classList.contains('open'));
          btn.textContent = anyOpen ? '⊟ Replier tout' : '⊞ Déplier tout';
        }
      });
    });
    body.querySelectorAll('[data-grp-sel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.getAttribute('data-grp-sel');
        const action = btn.getAttribute('data-grp-action');
        const items = (this._catData?.items ?? []).filter(i => (i.integration_domain ?? i.integration ?? 'inconnu') === grp);
        items.forEach(i => action === 'select_all' ? this._selected.add(i.entity_id) : this._selected.delete(i.entity_id));
        items.forEach(i => {
          const esc = CSS.escape ? CSS.escape(i.entity_id) : i.entity_id;
          const row = body.querySelector(`[data-eid="${esc}"]`);
          const cb = body.querySelector(`[data-cb-eid="${esc}"]`);
          if (cb) cb.checked = action === 'select_all';
          if (row) row.classList.toggle('selected', action === 'select_all');
        });
        this._updateBulkBar();
      });
    });
    body.querySelectorAll('.hse-cfg__cb').forEach(cb => {
      cb.addEventListener('change', async () => {
        const eid = cb.getAttribute('data-cb-eid');
        if (!eid) return;
        const action = cb.checked ? 'select' : 'ignore';
        cb.checked ? this._selected.add(eid) : this._selected.delete(eid);
        const row = cb.closest('.hse-cfg__sensor-row');
        if (row) row.classList.toggle('selected', cb.checked);
        this._updateBulkBar();
        try {
          await this._ctx.hseFetch('/api/hse/catalogue/triage', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ entity_id: eid, action }), signal: this._abort?.signal,
          });
          this._catSig = null;
          await this._loadCatalogue();
        } catch (e) {
          if (e.name === 'AbortError') return;
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
    body.querySelectorAll('[data-toggle-cb]').forEach(el => {
      el.addEventListener('click', () => {
        const eid = el.getAttribute('data-toggle-cb');
        const esc = CSS.escape ? CSS.escape(eid) : eid;
        const cb = body.querySelector(`[data-cb-eid="${esc}"]`);
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
    body.querySelectorAll('[data-triage-id]').forEach(btn => {
      btn.addEventListener('click', () => this._triage(btn.getAttribute('data-triage-id'), btn.getAttribute('data-triage-action')));
    });
  }

  _updateBulkBar() {
    const bar = this._el?.querySelector('#hse-cfg-bulk');
    const label = this._el?.querySelector('#hse-cfg-bulk-label');
    if (!bar) return;
    const n = this._selected.size;
    bar.classList.toggle('visible', n > 0);
    if (label) label.textContent = `${n} sélectionné${n > 1 ? 's' : ''}`;
  }

  async _triage(entityId, action) {
    const btn = this._el?.querySelector(`[data-triage-id="${this._attrVal(entityId)}"][data-triage-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: entityId, action }), signal: this._abort?.signal,
      });
      this._catSig = null; this._selected.delete(entityId); this._updateBulkBar();
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = action === 'select' ? '✓ Activer' : action === 'ignore' ? '✕ Ignorer' : '↺'; }
    }
  }

  async _bulkAction(action) {
    if (!this._selected.size) return;
    const items = Array.from(this._selected).map(id => ({ entity_id: id, action }));
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items }), signal: this._abort?.signal,
      });
      this._catSig = null; this._selected.clear(); this._updateBulkBar();
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  async _autoSelect() {
    if (this._autoSelecting) return;
    this._autoSelecting = true;
    const btn = this._el?.querySelector('#hse-cfg-auto-btn');
    const status = this._el?.querySelector('#hse-cfg-auto-status');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ En cours…'; }
    try {
      const catR = await this._ctx.hseFetch('/api/hse/catalogue?status=all&per_page=500', { signal: this._abort?.signal });
      if (!catR.ok) throw new Error(`HTTP ${catR.status}`);
      const catData = await catR.json();
      const all = catData.items ?? [];
      const byDevice = {};
      for (const item of all) {
        const dev = item.device_id ?? item.entity_id;
        if (!byDevice[dev]) byDevice[dev] = [];
        byDevice[dev].push(item);
      }
      const toSelect = [];
      for (const [, devItems] of Object.entries(byDevice)) {
        const best = devItems.sort((a,b) => (b.quality_score ?? b.score ?? 0) - (a.quality_score ?? a.score ?? 0))[0];
        if (best && best.status !== 'selected') toSelect.push({ entity_id: best.entity_id, action: 'select' });
      }
      if (!toSelect.length) {
        if (status) { status.textContent = 'Aucun capteur en attente.'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
        return;
      }
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items: toSelect }), signal: this._abort?.signal,
      });
      if (status) { status.textContent = `✓ ${toSelect.length} capteur(s) activé(s)`; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
      this._catSig = null; await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) { status.textContent = `Erreur : ${e.message}`; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } finally {
      this._autoSelecting = false;
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Lancer'; }
    }
  }

  // ── Modes d'usage ──────────────────────────────────────────────────
  _setMode(mode) {
    this._activeMode = mode;
    // Mise à jour des boutons de mode
    this._el?.querySelectorAll('.hse-mode-btn').forEach(b => {
      b.classList.toggle('hse-mode-active', b.getAttribute('data-mode') === mode);
    });
    // Re-render le catalogue avec le bon mode
    this._renderCatalogue();
  }

  async _modeAuto() {
    if (this._autoSelecting) return;
    this._autoSelecting = true;
    const btn = this._el?.querySelector('#hse-cfg-auto-btn');
    const status = this._el?.querySelector('#hse-cfg-auto-status');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ En cours…'; }
    try {
      const catR = await this._ctx.hseFetch('/api/hse/catalogue?status=all&per_page=500', { signal: this._abort?.signal });
      if (!catR.ok) throw new Error(`HTTP ${catR.status}`);
      const catData = await catR.json();
      const all = catData.items ?? [];
      // Sélectionner les 5 plus gros consommateurs par qualité
      const byDevice = {};
      for (const item of all) {
        const dev = item.device_id ?? item.entity_id;
        if (!byDevice[dev]) byDevice[dev] = [];
        byDevice[dev].push(item);
      }
      const toSelect = [];
      for (const [, devItems] of Object.entries(byDevice)) {
        const best = devItems.sort((a,b) => (b.quality_score ?? b.score ?? 0) - (a.quality_score ?? a.score ?? 0))[0];
        if (best && best.status !== 'selected') toSelect.push({ entity_id: best.entity_id, action: 'select' });
      }
      if (!toSelect.length) {
        if (status) { status.textContent = 'Aucun capteur en attente.'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
        return;
      }
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items: toSelect }), signal: this._abort?.signal,
      });
      if (status) { status.textContent = `✓ ${toSelect.length} capteur(s) activé(s)`; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
      this._catSig = null; await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) { status.textContent = `Erreur : ${e.message}`; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } finally {
      this._autoSelecting = false;
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Lancer'; }
    }
  }

  async _modeConseiller() {
    this._setMode('conseiller');
    this._renderCatalogue();
  }

  async _modeReflexion() {
    this._setMode('reflexion');
    this._renderCatalogue();
  }

  _renderModePanel(mode, data) {
    const panels = {
      auto: this._renderModeAutoPanel(data),
      conseiller: this._renderModeConseillerPanel(data),
      reflexion: this._renderModeReflexionPanel(data),
    };
    return panels[mode] || this._renderModeCustomPanel(data);
  }

  _renderModeCustomPanel(data) {
    const items = data.items ?? [];
    const selected = items.filter(i => i.status === 'selected').length;
    const total = items.length;
    return `
      <div class="hse-cfg__mode-panel">
        <div class="hse-cfg__mode-title">✋ Customisation — Sélection manuelle</div>
        <div class="hse-cfg__mode-desc">Cliquez sur un appareil ou sa case pour l'activer/ignorer. Sélectionnez ceux que vous souhaitez suivre dans HSE.</div>
        <div class="hse-cfg__mode-stats">${selected} / ${total} appareils sélectionnés</div>
        <div class="hse-cfg__mode-actions">
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-btn-toggle-all">✓ Tout activer</button>
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-btn-toggle-none">✕ Tout ignorer</button>
        </div>
      </div>`;
  }

  _renderModeAutoPanel(data) {
    const items = data.items ?? [];
    const selected = items.filter(i => i.status === 'selected').length;
    const total = items.length;
    return `
      <div class="hse-cfg__mode-panel">
        <div class="hse-cfg__mode-title">⚡ Mode Auto — Sélection intelligente</div>
        <div class="hse-cfg__mode-desc">HSE sélectionne automatiquement les 5 plus gros consommateurs par qualité de détection.</div>
        <div class="hse-cfg__mode-stats">${selected} / ${total} appareils sélectionnés</div>
        <div class="hse-cfg__mode-actions">
          <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-cfg-btn-auto-run">🚀 Lancer la sélection auto</button>
        </div>
      </div>`;
  }

  _renderModeConseillerPanel(data) {
    const items = data.items ?? [];
    const energyItems = items.filter(i => i.kind === 'energy' && i.status !== 'selected').sort((a,b) => (b.quality_score ?? 0) - (a.quality_score ?? 0)).slice(0, 5);
    const html = energyItems.map(i => `
      <div class="hse-cfg__mode-item hse-mode-selected">
        <span class="hse-cfg__mode-icon">⭐</span>
        <div class="hse-cfg__mode-info">
          <div class="hse-cfg__mode-name">${this._esc(i.name ?? i.entity_id)}</div>
          <div class="hse-cfg__mode-subtitle">${i.entity_id} • Score ${i.quality_score ?? 0}/150</div>
        </div>
        <div class="hse-cfg__mode-stats">+${((i.quality_score ?? 0) / 150 * 100).toFixed(0)}%</div>
        <button class="hse-btn hse-btn--primary hse-btn--sm" data-conseiller-id="${this._attrVal(i.entity_id)}">Ajouter</button>
      </div>`).join('');
    return `
      <div class="hse-cfg__mode-panel">
        <div class="hse-cfg__mode-title">🎯 Mode Conseiller</div>
        <div class="hse-cfg__mode-desc">HSE vous propose les capteurs les plus pertinents à surveiller en priorité.</div>
        <div class="hse-cfg__mode-grid">${html || '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.5)">Aucun capteur à proposer.</div>'}</div>
      </div>`;
  }

  _renderModeReflexionPanel(data) {
    const items = data.items ?? [];
    const selected = items.filter(i => i.status === 'selected').length;
    const ignored = items.filter(i => i.status === 'ignored').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const total = items.length;
    const pctSelected = total > 0 ? Math.round(selected / total * 100) : 0;
    return `
      <div class="hse-cfg__mode-panel">
        <div class="hse-cfg__mode-title">💡 Mode Reflexion</div>
        <div class="hse-cfg__mode-desc">Analysez votre installation et voyez l'impact de vos choix sur le suivi HSE.</div>
        <div class="hse-cfg__mode-grid">
          <div class="hse-cfg__mode-item">
            <span class="hse-cfg__mode-icon">📊</span>
            <div class="hse-cfg__mode-info">
              <div class="hse-cfg__mode-name">Capteurs totaux</div>
              <div class="hse-cfg__mode-subtitle">${total} entités dans le catalogue</div>
            </div>
            <div class="hse-cfg__mode-stats">${total}</div>
          </div>
          <div class="hse-cfg__mode-item">
            <span class="hse-cfg__mode-icon">✅</span>
            <div class="hse-cfg__mode-info">
              <div class="hse-cfg__mode-name">Surveillés</div>
              <div class="hse-cfg__mode-subtitle">${selected} appareils actifs</div>
            </div>
            <div class="hse-cfg__mode-stats">${pctSelected}%</div>
          </div>
          <div class="hse-cfg__mode-item">
            <span class="hse-cfg__mode-icon">⚠️</span>
            <div class="hse-cfg__mode-info">
              <div class="hse-cfg__mode-name">Ignorés</div>
              <div class="hse-cfg__mode-subtitle">${ignored} appareils exclus</div>
            </div>
            <div class="hse-cfg__mode-stats">${ignored}</div>
          </div>
          <div class="hse-cfg__mode-item">
            <span class="hse-cfg__mode-icon">⏳</span>
            <div class="hse-cfg__mode-info">
              <div class="hse-cfg__mode-name">En attente</div>
              <div class="hse-cfg__mode-subtitle">${pending} non classés</div>
            </div>
            <div class="hse-cfg__mode-stats">${pending}</div>
          </div>
        </div>
        <div class="hse-cfg__mode-actions">
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-btn-reflexion-help">💡 Voir les suggestions</button>
        </div>
      </div>`;
  }

  _setCatBody(html) { const el = this._el?.querySelector('#hse-cfg-cat-body'); if (el) el.innerHTML = html; }

  _setMetaBody(html) { const el = this._el?.querySelector('#hse-cfg-meta-body'); if (el) el.innerHTML = html; }

  _bindModeEvents() {
    const body = this._el?.querySelector('#hse-cfg-cat-body');
    if (!body) return;
    // Bouton lancer auto
    const btnAuto = body.querySelector('#hse-cfg-btn-auto-run');
    if (btnAuto) btnAuto.addEventListener('click', () => this._modeAuto());
    // Boutons conseiller
    body.querySelectorAll('[data-conseiller-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const eid = btn.getAttribute('data-conseiller-id');
        this._ctx.hseFetch('/api/hse/catalogue/triage', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id: eid, action: 'select' }), signal: this._abort?.signal,
        }).then(() => { this._catSig = null; this._loadCatalogue(); });
      });
    });
    // Bouton reflexion help
    const btnReflexion = body.querySelector('#hse-cfg-btn-reflexion-help');
    if (btnReflexion) btnReflexion.addEventListener('click', () => {
      const items = this._catData?.items ?? [];
      const pending = items.filter(i => i.status === 'pending').length;
      const ignored = items.filter(i => i.status === 'ignored').length;
      alert(`💡 Suggestions Reflexion :\n\n• ${pending} capteurs en attente de classification\n• ${ignored} capteurs ignorés peuvent être réévalués\n• Les capteurs avec un score > 100/150 sont recommandés pour le suivi\n\nActivez les capteurs à forte consommation pour optimiser vos coûts.`);
    });
    // Boutons toggle-all / toggle-none (mode custom)
    const btnToggleAll = body.querySelector('#hse-cfg-btn-toggle-all');
    if (btnToggleAll) btnToggleAll.addEventListener('click', () => {
      const cbs = body.querySelectorAll('.hse-cfg__cb');
      cbs.forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change')); });
    });
    const btnToggleNone = body.querySelector('#hse-cfg-btn-toggle-none');
    if (btnToggleNone) btnToggleNone.addEventListener('click', () => {
      const cbs = body.querySelectorAll('.hse-cfg__cb');
      cbs.forEach(cb => { cb.checked = false; cb.dispatchEvent(new Event('change')); });
    });
  }

  _renderCatPager(d) {
    const pager = this._el?.querySelector('#hse-cfg-cat-pager');
    if (!pager) return;
    const total = d.total ?? 0; const page = d.page ?? 1; const perPage = d.per_page ?? CATALOGUE_PER_PAGE;
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `
      <button class="hse-btn hse-btn--ghost hse-btn--sm" ${page <= 1 ? 'disabled' : ''} data-pager="prev">◀ Précédent</button>
      <span>Page ${page} / ${pages} — ${total} capteur(s)</span>
      <button class="hse-btn hse-btn--ghost hse-btn--sm" ${page >= pages ? 'disabled' : ''} data-pager="next">Suivant ▶</button>`;
    pager.querySelector('[data-pager="prev"]')?.addEventListener('click', () => { this._catPage--; this._catSig = null; this._loadCatalogue(); });
    pager.querySelector('[data-pager="next"]')?.addEventListener('click', () => { this._catPage++; this._catSig = null; this._loadCatalogue(); });
  }

  // ── Meta (Pièces & Types) ──────────────────────────────────────────────────

  _bindMetaEvents(root) {
    root.querySelector('#hse-cfg-diff-apply')?.addEventListener('click', () => this._applyDiff());
    root.querySelector('#hse-cfg-diff-dismiss')?.addEventListener('click', () => {
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      if (banner) banner.classList.remove('visible');
    });
    // Room actions
    root.querySelector('#hse-cfg-room-add')?.addEventListener('click', () => this._openRoomModal('create'));
    root.querySelector('#hse-cfg-type-add')?.addEventListener('click', () => this._openTypeModal('create'));
    // Assignments: search, filter
    const search = root.querySelector('#hse-cfg-asg-search');
    if (search) {
      let deb;
      search.addEventListener('input', e => {
        clearTimeout(deb);
        deb = setTimeout(() => { this._asgQ = e.target.value.trim(); this._asgPage = 1; this._asgSig = null; this._loadAssignments(); }, 300);
      });
    }
    root.querySelector('#hse-cfg-asg-filter')?.addEventListener('change', e => { this._asgFilter = e.target.value; this._asgPage = 1; this._asgSig = null; this._loadAssignments(); });
    root.querySelector('#hse-cfg-asg-refresh')?.addEventListener('click', () => { this._asgSig = null; this._loadAssignments(); });
    // Modal close
    root.querySelector('#hse-cfg-modal-close')?.addEventListener('click', () => this._closeModal());
    root.querySelector('#hse-cfg-modal-cancel')?.addEventListener('click', () => this._closeModal());
    root.querySelector('#hse-cfg-modal-save')?.addEventListener('click', () => this._saveModal());
    // Close modal on backdrop click
    root.querySelector('#hse-cfg-modal-backdrop')?.addEventListener('click', e => { if (e.target === e.currentTarget) this._closeModal(); });
    // Assignment row save buttons (delegated) — robuste: rebind à chaque render
    const asgBody = root.querySelector('#hse-cfg-asg-body');
    if (asgBody) {
      // Nettoyer anciens listeners si présents (évite double-bind)
      asgBody._hseBound = true;
      asgBody.addEventListener('click', e => {
        const btn = e.target.closest('[data-asg-save]');
        if (btn) this._saveAssignment(btn.getAttribute('data-asg-save'));
      });
      asgBody.addEventListener('change', e => {
        const sel = e.target.closest('[data-asg-field]');
        if (sel) this._markAssignmentDirty(sel.getAttribute('data-asg-field'), sel.getAttribute('data-asg-eid'), sel.value);
      });
    } else {
      // Debug: element pas encore dans le DOM
      console.debug('[HSE Config] #hse-cfg-asg-body introuvable lors du bind meta');
    }
  }

  async _loadMeta() {
    if (this._metaFetching) return;
    this._metaFetching = true;
    this._setMetaBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta', { signal: this._abort?.signal });
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._metaSig) return;
      this._metaSig = sig; this._metaData = data;
      // Pré-peupler _asgData pour le 1er render (évite double-fetch + double-render)
      const assignments = data.assignments ?? [];
      const rooms = data.rooms ?? [];
      const types = data.types ?? [];
      this._asgPage = 1; this._asgSig = null;
      this._asgData = { items: assignments.slice(0, 50), total: assignments.length, page: 1, per_page: 50, pages: Math.ceil(assignments.length / 50), rooms, types };
      this._renderMeta();
      // Charger les assignations (pagination/filtres) - seulement si nécessaire
      // this._loadAssignments(); // Supprimé: _renderMeta() a déjà rendu la table
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setMetaBody(`<div class="hse-error">Erreur meta — ${this._esc(e.message)}</div>`);
    } finally { this._metaFetching = false; }
  }

  async _loadAssignments() {
    if (this._asgFetching) return;
    this._asgFetching = true;
    const bodyEl = this._el?.querySelector('#hse-cfg-asg-body');
    if (bodyEl && this._asgPage === 1) bodyEl.innerHTML = '<div class="hse-skeleton"></div>';
    try {
      // Utilise les données déjà chargées par _loadMeta() pour éviter un 2ème fetch
      const data = this._metaData;
      if (!data) return;
      const assignments = data.assignments ?? [];
      const rooms = data.rooms ?? [];
      const types = data.types ?? [];
      // Filtres
      let filtered = assignments;
      if (this._asgQ) {
        const q = this._asgQ.toLowerCase();
        filtered = filtered.filter(a => a.entity_id.toLowerCase().includes(q));
      }
      if (this._asgFilter === 'unassigned_room') {
        filtered = filtered.filter(a => !a.room);
      } else if (this._asgFilter === 'unassigned_type') {
        filtered = filtered.filter(a => !a.type);
      } else if (this._asgFilter === 'unassigned_both') {
        filtered = filtered.filter(a => !a.room && !a.type);
      } else if (this._asgFilter === 'pending') {
        filtered = filtered.filter(a => a.pending);
      }
      // Pagination côté client (50 par page)
      const perPage = 50;
      const total = filtered.length;
      const start = (this._asgPage - 1) * perPage;
      const pageItems = filtered.slice(start, start + perPage);
      const pages = Math.ceil(total / perPage);
      this._asgData = { items: pageItems, total, page: this._asgPage, per_page: perPage, pages, rooms, types };
      this._renderMeta(); // Re-render le panel meta (inclut la table des assignations)
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (bodyEl) bodyEl.innerHTML = `<div class="hse-error">Erreur assignations — ${this._esc(e.message)}</div>`;
    } finally { this._asgFetching = false; }
  }

  async _loadDiffPreview() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta/sync/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) return;
      const data = await resp.json();
      // FIX-2026-07-04 C7 : compter aussi to_update (to_remove toujours [] côté backend)
      const count = (data.to_add?.length ?? 0) + (data.to_update?.length ?? 0);
      if (!count) return;
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      const msg = this._el?.querySelector('#hse-cfg-diff-msg');
      if (banner && msg) {
        msg.textContent = `${count} changement(s) détecté(s) dans la config HA. Voulez-vous synchroniser ?`;
        banner.classList.add('visible');
      }
    } catch (e) {}
  }

  async _applyDiff() {
    if (this._diffApplying) return;
    this._diffApplying = true;
    const btn = this._el?.querySelector('#hse-cfg-diff-apply');
    if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta/sync/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      if (banner) banner.classList.remove('visible');
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      alert(`Erreur : ${e.message}`);
    } finally {
      this._diffApplying = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Appliquer'; }
    }
  }

  _renderMeta() {
    const d = this._metaData; if (!d) return;
    const rooms = d.rooms ?? [];
    const types = d.types ?? [];
    const TYPE_ICON_META = TYPE_ICON;

    const roomsHtml = !rooms.length ? `<li class="hse-empty-row">Aucune pièce.</li>` :
      rooms.map(r => {
        const id = r.id ?? '';
        const name = r.name ?? id;
        const count = (d.assignments ?? []).filter(a => a.room === id).length;
        return `<li data-room-id="${this._attrVal(id)}">
          <span class="hse-cfg__room-name">${this._esc(name)}</span>
          <span class="hse-cfg__list-eid">${this._esc(id)}</span>
          <span class="hse-cfg__badge hse-cfg__badge--normal">${count} capteur${count > 1 ? 's' : ''}</span>
          <div class="hse-cfg__sensor-actions">
            <button class="hse-btn hse-btn--sm hse-btn--ghost" data-room-rename="${this._attrVal(id)}" title="Renommer">✏️</button>
            <button class="hse-btn hse-btn--sm hse-btn--danger" data-room-delete="${this._attrVal(id)}" title="Supprimer">🗑️</button>
          </div>
        </li>`;
      }).join('');

    const typesHtml = !types.length ? `<li class="hse-empty-row">Aucun type.</li>` :
      types.map(t => {
        const icon = TYPE_ICON_META[t?.toLowerCase()] ?? '';
        const count = (d.assignments ?? []).filter(a => a.type === t).length;
        return `<li data-type-name="${this._attrVal(t)}">
          <span class="hse-cfg__type-name">${icon ? icon + ' ' : ''}${this._esc(t)}</span>
          <span class="hse-cfg__badge hse-cfg__badge--normal">${count} capteur${count > 1 ? 's' : ''}</span>
          <div class="hse-cfg__sensor-actions">
            <button class="hse-btn hse-btn--sm hse-btn--ghost" data-type-rename="${this._attrVal(t)}" title="Renommer">✏️</button>
            <button class="hse-btn hse-btn--sm hse-btn--danger" data-type-delete="${this._attrVal(t)}" title="Supprimer">🗑️</button>
          </div>
        </li>`;
      }).join('');

    // Assignments table
    const asgData = this._asgData;
    const asgItems = asgData?.items ?? [];
    const asgTotal = asgData?.total ?? 0;
    const asgPage = asgData?.page ?? 1;
    const asgPages = asgData?.pages ?? 1;
    const asgRooms = asgData?.rooms ?? rooms;
    const asgTypes = asgData?.types ?? types;

    const roomOptions = asgRooms.map(r => `<option value="${this._attrVal(r.id)}">${this._esc(r.name)}</option>`).join('');
    const typeOptions = asgTypes.map(t => `<option value="${this._attrVal(t)}">${this._esc(t)}</option>`).join('');

    const asgRowsHtml = !asgItems.length ? `<tr><td colspan="7" class="hse-empty-row">Aucune assignation.</td></tr>` :
      asgItems.map(a => {
        const eid = a.entity_id;
        const roomId = a.room ?? '';
        const typeId = a.type ?? '';
        const pending = a.pending;
        const dirty = this._asgDirty.get(eid) ?? {};
        const currentRoom = dirty.room_id !== undefined ? dirty.room_id : roomId;
        const currentType = dirty.type_id !== undefined ? dirty.type_id : typeId;
        const isDirty = dirty.room_id !== undefined || dirty.type_id !== undefined;
        const roomSel = `<select class="hse-cfg__select hse-cfg__asg-select" data-asg-field="room_id" data-asg-eid="${this._attrVal(eid)}"><option value="">— Non affecté —</option>${roomOptions.replace(new RegExp(`value="${this._attrVal(currentRoom)}"`), 'value="' + this._attrVal(currentRoom) + '" selected')}</select>`;
        const typeSel = `<select class="hse-cfg__select hse-cfg__asg-select" data-asg-field="type_id" data-asg-eid="${this._attrVal(eid)}"><option value="">— Non affecté —</option>${typeOptions.replace(new RegExp(`value="${this._attrVal(currentType)}"`), 'value="' + this._attrVal(currentType) + '" selected')}</select>`;
        const statusBadge = pending
          ? `<span class="hse-cfg__badge hse-cfg__badge--pending">Proposé</span>`
          : (!roomId && !typeId
              ? `<span class="hse-cfg__badge hse-cfg__badge--ignored">Non affecté</span>`
              : `<span class="hse-cfg__badge hse-cfg__badge--selected">Affecté</span>`);
        const saveBtn = isDirty
          ? `<button class="hse-btn hse-btn--sm hse-btn--primary" data-asg-save="${this._attrVal(eid)}">💾</button>`
          : `<button class="hse-btn hse-btn--sm hse-btn--ghost" data-asg-save="${this._attrVal(eid)}" disabled>💾</button>`;
        return `<tr data-eid="${this._attrVal(eid)}" class="${isDirty ? 'hse-dirty' : ''}${pending ? ' hse-pending' : ''}">
          <td class="hse-cfg__asg-name">${this._esc(eid)}</td>
          <td>${roomSel}</td>
          <td>${typeSel}</td>
          <td>${statusBadge}</td>
          <td>${saveBtn}</td>
        </tr>`;
      }).join('');

    const pagerHtml = asgPages <= 1 ? '' : `
      <div class="hse-cfg__asg-pager">
        <button class="hse-btn hse-btn--ghost hse-btn--sm" data-asg-page="prev" ${asgPage <= 1 ? 'disabled' : ''}>◀</button>
        <span>Page ${asgPage} / ${asgPages} — ${asgTotal} assignation${asgTotal > 1 ? 's' : ''}</span>
        <button class="hse-btn hse-btn--ghost hse-btn--sm" data-asg-page="next" ${asgPage >= asgPages ? 'disabled' : ''}>▶</button>
      </div>`;

    this._setMetaBody(`
      <div class="hse-cfg__meta-toolbar">
        <button id="hse-cfg-room-add" class="hse-btn hse-btn--primary hse-btn--sm">➕ Ajouter une pièce</button>
        <button id="hse-cfg-type-add" class="hse-btn hse-btn--primary hse-btn--sm">➕ Ajouter un type</button>
        <button id="hse-cfg-asg-refresh" class="hse-btn hse-btn--ghost hse-btn--sm" title="Actualiser">🔄</button>
      </div>
      <div class="hse-cfg__grid">
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head"><span>🏠 Pièces (${rooms.length})</span></div>
          <ul class="hse-cfg__list hse-cfg__list--meta">${roomsHtml}</ul>
        </div>
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head"><span>🏷️ Types (${types.length})</span></div>
          <ul class="hse-cfg__list hse-cfg__list--meta">${typesHtml}</ul>
        </div>
      </div>
      <div class="hse-cfg__card hse-cfg__asg-card">
        <div class="hse-cfg__card-head">
          <span>📋 Affectations des capteurs (${asgTotal})</span>
          <div class="hse-cfg__asg-filters">
            <input type="search" id="hse-cfg-asg-search" class="hse-cfg__search" placeholder="Rechercher entity_id…" style="width:200px;">
            <select id="hse-cfg-asg-filter" class="hse-cfg__filter" style="width:auto;">
              <option value="all">Tous</option>
              <option value="unassigned_room">Sans pièce</option>
              <option value="unassigned_type">Sans type</option>
              <option value="unassigned_both">Sans pièce ni type</option>
              <option value="pending">Proposés (sync)</option>
            </select>
          </div>
        </div>
        <div class="hse-cfg__asg-table-wrap">
          <table class="hse-cfg__asg-table">
            <thead>
              <tr>
                <th>Entity ID</th>
                <th>Pièce</th>
                <th>Type</th>
                <th>Statut</th>
                <th style="width:60px;"></th>
              </tr>
            </thead>
            <tbody id="hse-cfg-asg-body">${asgRowsHtml}</tbody>
          </table>
        </div>
        ${pagerHtml}
      </div>
      <!-- Modal pour création/renommage pièce/type -->
      <div id="hse-cfg-modal-backdrop" class="hse-cfg__modal-backdrop" style="display:none;">
        <div class="hse-cfg__modal">
          <div class="hse-cfg__modal-head">
            <span id="hse-cfg-modal-title"></span>
            <button id="hse-cfg-modal-close" class="hse-btn hse-btn--ghost hse-btn--sm" aria-label="Fermer">✕</button>
          </div>
          <div class="hse-cfg__modal-body">
            <label class="hse-cfg__label" id="hse-cfg-modal-label"></label>
            <input type="text" id="hse-cfg-modal-input" class="hse-cfg__input" autocomplete="off" />
            <span id="hse-cfg-modal-error" class="hse-error" style="display:none;"></span>
          </div>
          <div class="hse-cfg__modal-foot">
            <button id="hse-cfg-modal-cancel" class="hse-btn hse-btn--ghost">Annuler</button>
            <button id="hse-cfg-modal-save" class="hse-btn hse-btn--primary">Confirmer</button>
          </div>
        </div>
      </div>
    `);

    // Bind events for room/type actions and assignment pagination
    this._bindMetaListEvents();
    this._bindAsgPager();
    // FIX: Rebind meta events after every render (delegation sur #hse-cfg-asg-body détruit au innerHTML)
    this._bindMetaEvents(this._el);
  }

  _bindMetaListEvents() {
    const root = this._el;
    if (!root) return;
    // Room rename/delete
    root.querySelectorAll('[data-room-rename]').forEach(btn => {
      btn.addEventListener('click', () => this._openRoomModal('rename', btn.getAttribute('data-room-rename')));
    });
    root.querySelectorAll('[data-room-delete]').forEach(btn => {
      btn.addEventListener('click', () => this._confirmDeleteRoom(btn.getAttribute('data-room-delete')));
    });
    // Type rename/delete
    root.querySelectorAll('[data-type-rename]').forEach(btn => {
      btn.addEventListener('click', () => this._openTypeModal('rename', btn.getAttribute('data-type-rename')));
    });
    root.querySelectorAll('[data-type-delete]').forEach(btn => {
      btn.addEventListener('click', () => this._confirmDeleteType(btn.getAttribute('data-type-delete')));
    });
  }

  _bindAsgPager() {
    const root = this._el;
    if (!root) return;
    root.querySelectorAll('[data-asg-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-asg-page');
        if (dir === 'prev' && this._asgPage > 1) { this._asgPage--; this._asgSig = null; this._loadAssignments(); }
        if (dir === 'next' && this._asgData && this._asgPage < this._asgData.pages) { this._asgPage++; this._asgSig = null; this._loadAssignments(); }
      });
    });
  }

  // ── Modal & CRUD Pièces/Types ────────────────────────────────────────────────

  _openRoomModal(mode, id = null) {
    const backdrop = this._el?.querySelector('#hse-cfg-modal-backdrop');
    const title = this._el?.querySelector('#hse-cfg-modal-title');
    const label = this._el?.querySelector('#hse-cfg-modal-label');
    const input = this._el?.querySelector('#hse-cfg-modal-input');
    const error = this._el?.querySelector('#hse-cfg-modal-error');
    if (!backdrop) return;
    this._modalState = { kind: 'room', mode, id };
    if (mode === 'create') {
      title.textContent = 'Créer une pièce';
      label.textContent = 'Nom de la pièce';
      input.value = '';
    } else {
      const room = this._metaData?.rooms?.find(r => r.id === id);
      title.textContent = 'Renommer la pièce';
      label.textContent = `Nouveau nom pour « ${room?.name ?? id} »`;
      input.value = room?.name ?? '';
    }
    error.style.display = 'none';
    input.focus();
    backdrop.style.display = 'flex';
  }

  _openTypeModal(mode, name = null) {
    const backdrop = this._el?.querySelector('#hse-cfg-modal-backdrop');
    const title = this._el?.querySelector('#hse-cfg-modal-title');
    const label = this._el?.querySelector('#hse-cfg-modal-label');
    const input = this._el?.querySelector('#hse-cfg-modal-input');
    const error = this._el?.querySelector('#hse-cfg-modal-error');
    if (!backdrop) return;
    this._modalState = { kind: 'type', mode, name };
    if (mode === 'create') {
      title.textContent = 'Créer un type';
      label.textContent = 'Nom du type d\'appareil';
      input.value = '';
    } else {
      title.textContent = 'Renommer le type';
      label.textContent = `Nouveau nom pour « ${name} »`;
      input.value = name;
    }
    error.style.display = 'none';
    input.focus();
    backdrop.style.display = 'flex';
  }

  _closeModal() {
    const backdrop = this._el?.querySelector('#hse-cfg-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    this._modalState = null;
  }

  async _saveModal() {
    const input = this._el?.querySelector('#hse-cfg-modal-input');
    const error = this._el?.querySelector('#hse-cfg-modal-error');
    const name = input?.value?.trim() ?? '';
    if (!name) {
      if (error) { error.textContent = 'Le nom est requis'; error.style.display = 'block'; }
      return;
    }
    const state = this._modalState;
    if (!state) return;
    try {
      let action, body;
      if (state.kind === 'room') {
        if (state.mode === 'create') { action = 'create_room'; body = { action, name }; }
        else { action = 'rename_room'; body = { action, id: state.id, name }; }
      } else {
        if (state.mode === 'create') { action = 'create_type'; body = { action, name }; }
        else { action = 'rename_type'; body = { action, old_name: state.name, new_name: name }; }
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
      this._closeModal();
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (error) { error.textContent = e.message; error.style.display = 'block'; }
    }
  }

  _confirmDeleteRoom(roomId) {
    const room = this._metaData?.rooms?.find(r => r.id === roomId);
    const count = (this._metaData?.assignments ?? []).filter(a => a.room === roomId).length;
    const msg = `Supprimer la pièce « ${room?.name ?? roomId} » ?\n${count} capteur${count > 1 ? 's' : ''} affecté${count > 1 ? 's' : ''} perdront leur pièce (type conservé).`;
    if (!confirm(msg)) return;
    this._deleteRoom(roomId);
  }

  async _deleteRoom(roomId) {
    const btn = this._el?.querySelector(`[data-room-delete="${this._attrVal(roomId)}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify({ action: 'delete_room', id: roomId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') {
        alert('Suppression expirée (15s) — le serveur a peut-être traité la requête. Rafraîchissez la page.');
        return;
      }
      alert(`Erreur : ${e.message}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🗑️'; }
    }
  }

  _confirmDeleteType(typeName) {
    const count = (this._metaData?.assignments ?? []).filter(a => a.type === typeName).length;
    const msg = `Supprimer le type « ${typeName} » ?\n${count} capteur${count > 1 ? 's' : ''} affecté${count > 1 ? 's' : ''} perdront leur type (pièce conservée).`;
    if (!confirm(msg)) return;
    this._deleteType(typeName);
  }

  async _deleteType(typeName) {
    const btn = this._el?.querySelector(`[data-type-delete="${this._attrVal(typeName)}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      // Utilise fetch direct avec AbortController pour timeout fiable (non bloquant)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s max
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify({ action: 'delete_type', name: typeName }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') {
        alert('Suppression expirée (15s) — le serveur a peut-être traité la requête. Rafraîchissez la page.');
        return;
      }
      alert(`Erreur : ${e.message}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🗑️'; }
    }
  }

  _markAssignmentDirty(field, entityId, value) {
    const dirty = this._asgDirty.get(entityId) ?? {};
    if (value === '') {
      delete dirty[field];
    } else {
      dirty[field] = value;
    }
    if (Object.keys(dirty).length === 0) {
      this._asgDirty.delete(entityId);
    } else {
      this._asgDirty.set(entityId, dirty);
    }
    // Re-render just the save button state for this row
    const row = this._el?.querySelector(`[data-eid="${CSS.escape ? CSS.escape(entityId) : entityId}"]`);
    if (row) {
      const btn = row.querySelector('[data-asg-save]');
      const isDirty = Object.keys(dirty).length > 0;
      if (btn) {
        btn.disabled = !isDirty;
        btn.classList.toggle('hse-btn--primary', isDirty);
        btn.classList.toggle('hse-btn--ghost', !isDirty);
        btn.textContent = '💾';
      }
      row.classList.toggle('hse-dirty', isDirty);
    }
  }

  async _saveAssignment(entityId) {
    const dirty = this._asgDirty.get(entityId);
    if (!dirty) return;
    const btn = this._el?.querySelector(`[data-asg-save="${this._attrVal(entityId)}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
      const payload = { action: 'assign', entity_id: entityId };
      if (dirty.room_id !== undefined) payload.room_id = dirty.room_id || null;
      if (dirty.type_id !== undefined) payload.type_id = dirty.type_id || null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(this._ctx.hassUrl + '/api/hse/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._ctx.hass?.auth?.accessToken || ''}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }
      this._asgDirty.delete(entityId);
      this._metaSig = null; await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = '💾'; }
      alert(`Erreur : ${e.message}`);
    }
  }

  // ── Tarification (Onglet C) ────────────────────────────────────────────────

  async _loadPricing() {
    if (this._pricingFetching) return;
    this._pricingFetching = true;
    this._setPricingBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._pricingSig) return;
      this._pricingSig = sig; this._pricingData = data;
      this._renderPricing();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setPricingBody(`<div class="hse-error">Erreur tarification — ${this._esc(e.message)}</div>`);
    } finally { this._pricingFetching = false; }
  }

  _renderPricing() {
    const d = this._pricingData ?? {};
    const mode = d.mode ?? 'flat';
    const isHphc = mode === 'hphc';

    const sub   = d.subscription_eur_month ?? 9.47;
    const taxPct = d.tax_rate_pct ?? 20;

    const flatHt  = d.price_ht_kwh  ?? 0.1297;
    const flatTtc = d.price_ttc_kwh ?? 0.1927;
    const hpHt  = d.price_hp_ht_kwh  ?? 0.1327;
    const hpTtc = d.price_hp_ttc_kwh ?? 0.1952;
    const hcHt  = d.price_hc_ht_kwh  ?? 0.1327;
    const hcTtc = d.price_hc_ttc_kwh ?? 0.1952;

    const hcStart = d.hc_start ?? '22:00';
    const hcEnd   = d.hc_end   ?? '06:00';

    this._setPricingBody(`
      <div class="hse-cfg__pricing-wrap">
        <form id="hse-cfg-pricing-form">
          <div class="hse-cfg__pricing-section">
            <div class="hse-cfg__pricing-section-title">⚙️ Configuration Tarifaire</div>
            <div class="hse-cfg__pricing-body">
              <div class="hse-cfg__field">
                <label class="hse-cfg__label">Mode tarifaire</label>
                <select id="hse-cfg-mode" name="mode" class="hse-cfg__select">
                  <option value="flat" ${mode === 'flat' ? 'selected' : ''}>Tarif fixe (Base)</option>
                  <option value="hphc" ${mode === 'hphc' ? 'selected' : ''}>Heures Pleines / Heures Creuses</option>
                </select>
              </div>
              <div id="hse-cfg-flat-wrap">
                <div class="hse-cfg__pricing-subtitle">⚡ Tarif Fixe</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Prix HT (€/kWh)</label>
                    <input id="hse-cfg-flat-ht" name="price_ht_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${flatHt}" placeholder="0.1297" />
                  </div>
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Prix TTC (€/kWh)</label>
                    <input id="hse-cfg-flat-ttc" name="price_ttc_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${flatTtc}" placeholder="0.1927" />
                  </div>
                </div>
              </div>
              <div id="hse-cfg-hphc-wrap" class="hse-cfg__hp-hc ${isHphc ? 'visible' : ''}">
                <div class="hse-cfg__pricing-subtitle">🌟 Heures Pleines</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field"><label class="hse-cfg__label">HP HT (€/kWh)</label>
                    <input id="hse-cfg-hp-ht" name="price_hp_ht_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${hpHt}" placeholder="0.1327" />
                  </div>
                  <div class="hse-cfg__field"><label class="hse-cfg__label">HP TTC (€/kWh)</label>
                    <input id="hse-cfg-hp-ttc" name="price_hp_ttc_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${hpTtc}" placeholder="0.1952" />
                  </div>
                </div>
                <div class="hse-cfg__pricing-subtitle">🌙 Heures Creuses</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field"><label class="hse-cfg__label">HC HT (€/kWh)</label>
                    <input id="hse-cfg-hc-ht" name="price_hc_ht_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${hcHt}" placeholder="0.1327" />
                  </div>
                  <div class="hse-cfg__field"><label class="hse-cfg__label">HC TTC (€/kWh)</label>
                    <input id="hse-cfg-hc-ttc" name="price_hc_ttc_kwh" type="number" step="0.0001" class="hse-cfg__input" value="${hcTtc}" placeholder="0.1952" />
                  </div>
                </div>
                <div class="hse-cfg__pricing-subtitle">🕐 Plage Horaire HC</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Début HC</label>
                    <input id="hse-cfg-hc-start" name="hc_start" type="time" class="hse-cfg__input" value="${hcStart}" />
                  </div>
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Fin HC</label>
                    <input id="hse-cfg-hc-end" name="hc_end" type="time" class="hse-cfg__input" value="${hcEnd}" />
                  </div>
                </div>
              </div>
              <div class="hse-cfg__pricing-section-title" style="margin-top:8px;">💶 Abonnement &amp; Fiscalité</div>
              <div class="hse-cfg__pricing-body" style="padding:0;">
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Abonnement (€/mois HT)</label>
                    <input id="hse-cfg-sub" name="subscription_eur_month" type="number" step="0.01" class="hse-cfg__input" value="${sub}" placeholder="9.47" />
                  </div>
                  <div class="hse-cfg__field"><label class="hse-cfg__label">Taux TVA (%)</label>
                    <input id="hse-cfg-tax" name="tax_rate_pct" type="number" step="0.1" class="hse-cfg__input" value="${taxPct}" placeholder="20" />
                  </div>
                </div>
              </div>
              <div class="hse-cfg__save-row">
                <button type="submit" class="hse-btn hse-btn--primary">💾 Enregistrer</button>
                <span id="hse-cfg-pricing-status" class="hse-cfg__save-status"></span>
              </div>
            </div>
          </div>
        </form>
      </div>`);
    this._bindPricingForm();
  }

  _bindPricingForm() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;
    const modeSel = form.querySelector('#hse-cfg-mode');
    const hphcWrap = form.querySelector('#hse-cfg-hphc-wrap');
    const flatWrap = form.querySelector('#hse-cfg-flat-wrap');
    modeSel?.addEventListener('change', () => {
      const hphc = modeSel.value === 'hphc';
      if (hphcWrap) hphcWrap.classList.toggle('visible', hphc);
      if (flatWrap) flatWrap.style.display = hphc ? 'none' : '';
    });
    form.addEventListener('submit', async e => { e.preventDefault(); await this._savePricing(form); });
  }

  async _savePricing(form) {
    if (this._pricingSaving) return;
    this._pricingSaving = true;
    const status = this._el?.querySelector('#hse-cfg-pricing-status');
    if (status) status.textContent = '⏳ Enregistrement…';
    const mode = form.querySelector('#hse-cfg-mode')?.value || 'flat';
    const payload = {
      mode,
      subscription_eur_month: parseFloat(form.querySelector('#hse-cfg-sub')?.value) || 0,
      tax_rate_pct: parseFloat(form.querySelector('#hse-cfg-tax')?.value) || 0,
    };
    if (mode === 'flat') {
      payload.price_ht_kwh  = parseFloat(form.querySelector('#hse-cfg-flat-ht')?.value)  || 0;
      payload.price_ttc_kwh = parseFloat(form.querySelector('#hse-cfg-flat-ttc')?.value) || 0;
    } else {
      payload.price_hp_ht_kwh  = parseFloat(form.querySelector('#hse-cfg-hp-ht')?.value)  || 0;
      payload.price_hp_ttc_kwh = parseFloat(form.querySelector('#hse-cfg-hp-ttc')?.value) || 0;
      payload.price_hc_ht_kwh  = parseFloat(form.querySelector('#hse-cfg-hc-ht')?.value)  || 0;
      payload.price_hc_ttc_kwh = parseFloat(form.querySelector('#hse-cfg-hc-ttc')?.value) || 0;
      payload.hc_start = form.querySelector('#hse-cfg-hc-start')?.value || '22:00';
      payload.hc_end   = form.querySelector('#hse-cfg-hc-end')?.value   || '06:00';
    }
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: this._abort?.signal,
      });
      this._pricingSig = null;
      if (status) { status.textContent = '✓ Enregistré'; setTimeout(() => { if (status) status.textContent = ''; }, 2500); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) { status.textContent = `Erreur : ${e.message}`; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } finally { this._pricingSaving = false; }
  }

  _setPricingBody(html) { const el = this._el?.querySelector('#hse-cfg-pricing-body'); if (el) el.innerHTML = html; }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  _esc(s) { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; }
  _attrVal(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
}
