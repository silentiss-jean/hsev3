/**
 * config_view.js — Onglet Configuration HSE V3  (UI V3 — DELTA-063)
 *
 * 3 sous-onglets :
 *   A — Appareils       : bloc ⭐ référence, bloc ✨ sélection auto, groupes collapse,
 *                         icônes type inline, stars qualité, triage bulk
 *   B — Pièces & Types  : fix room.name (bug ?) + entity_id HA + types string[]
 *   C — Tarification    : INCHANGÉ (layout 2-col HT|TTC, HP/HC, preview live)
 *
 * Contraintes DELTA actives :
 *   DELTA-058 : PATCH/DELETE catalogue absents → contournement POST /catalogue/triage
 *   DELTA-059 : POST /api/hse/meta absent     → bouton "Créer" grisé
 *
 * Audit DELTA-064 résolu :
 *   Q1 — Sélection auto : POST /catalogue/triage/bulk avec action "select" sur tous les pending
 *   Q2 — Capteur référence : GET/PUT /api/hse/settings/pricing → champ reference_entity_id
 *   Q3 — Bug room.name : backend retourne rooms=[{id,name}], types=[string]
 *        (d.device_types n'existe pas → utiliser d.types)
 *
 * Règles V3 : R1 mount() once | R2 _fetching guard | R3 JSON sig | R4 no localStorage | R5 skeleton first
 */

const CSS = `
/* ── Layout ──────────────────────────────────────────────────────── */
.hse-cfg { display:flex; flex-direction:column; gap:16px; }

/* ── Sub-tabs ─────────────────────────────────────────────────── */
.hse-cfg__tabs {
  display:flex; gap:4px;
  border-bottom:2px solid rgba(255,255,255,0.08);
  margin-bottom:4px;
}
.hse-cfg__tab {
  padding:8px 16px; font-size:0.875rem; font-family:inherit; font-weight:500;
  background:none; border:none; cursor:pointer;
  color:rgba(255,255,255,0.5);
  border-bottom:2px solid transparent; margin-bottom:-2px;
  transition:color 180ms, border-color 180ms;
}
.hse-cfg__tab:hover  { color:rgba(255,255,255,0.85); }
.hse-cfg__tab.active { color:#e879f9; border-bottom-color:#e879f9; }
.hse-cfg__panel { display:none; }
.hse-cfg__panel.active { display:block; }

/* ── Buttons ───────────────────────────────────────────────────── */
.hse-btn {
  padding:7px 14px; border-radius:6px; border:1px solid transparent;
  font-size:0.82rem; font-family:inherit; cursor:pointer;
  transition:opacity 150ms,background 150ms; white-space:nowrap;
}
.hse-btn:disabled { opacity:0.38; cursor:not-allowed; }
.hse-btn--primary { background:#e879f9; color:#000; font-weight:600; }
.hse-btn--primary:hover:not(:disabled) { opacity:0.85; }
.hse-btn--ghost   { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); }
.hse-btn--ghost:hover:not(:disabled)   { background:rgba(255,255,255,0.12); }
.hse-btn--danger  { background:rgba(239,68,68,0.12); color:#f87171; border-color:rgba(239,68,68,0.25); }
.hse-btn--danger:hover:not(:disabled)  { background:rgba(239,68,68,0.2); }
.hse-btn--sm { padding:3px 9px; font-size:0.76rem; }

/* ── Blocs référence / sélection auto ─────────────────────────── */
.hse-cfg__ref-block,
.hse-cfg__auto-block {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:10px 14px; border-radius:10px; margin-bottom:10px;
  font-size:0.82rem;
}
.hse-cfg__ref-block {
  background:rgba(245,158,11,0.08);
  border:1px solid rgba(245,158,11,0.22);
}
.hse-cfg__auto-block {
  background:rgba(99,102,241,0.08);
  border:1px solid rgba(99,102,241,0.22);
}
.hse-cfg__ref-icon   { font-size:1.1rem; flex-shrink:0; }
.hse-cfg__ref-label  { flex:1; color:rgba(255,255,255,0.7); }
.hse-cfg__ref-select {
  flex:1 1 240px; min-width:180px;
  padding:5px 10px; border:1px solid rgba(255,255,255,0.12); border-radius:6px;
  background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9);
  font-size:0.82rem; font-family:inherit; outline:none;
  transition:border-color 150ms;
}
.hse-cfg__ref-select:focus { border-color:#f59e0b; }
.hse-cfg__ref-status { font-size:0.75rem; color:rgba(255,255,255,0.35); margin-left:4px; }

/* ── Toolbar ───────────────────────────────────────────────────── */
.hse-cfg__toolbar {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;
}
.hse-cfg__search {
  flex:1 1 200px; padding:7px 12px;
  border:1px solid rgba(255,255,255,0.12); border-radius:6px;
  background:rgba(255,255,255,0.05); color:inherit;
  font-size:0.875rem; font-family:inherit; outline:none;
  transition:border-color 150ms;
}
.hse-cfg__search:focus { border-color:#e879f9; }
.hse-cfg__search::placeholder { color:rgba(255,255,255,0.3); }
.hse-cfg__filter {
  padding:7px 12px; border:1px solid rgba(255,255,255,0.12); border-radius:6px;
  background:rgba(255,255,255,0.05); color:inherit;
  font-size:0.875rem; font-family:inherit; cursor:pointer; outline:none;
}

/* ── Bulk bar ───────────────────────────────────────────────────── */
.hse-cfg__bulk {
  display:none; align-items:center; gap:8px; flex-wrap:wrap;
  padding:7px 12px; background:rgba(232,121,249,0.08);
  border:1px solid rgba(232,121,249,0.2); border-radius:8px;
  font-size:0.82rem; margin-bottom:8px;
}
.hse-cfg__bulk.visible { display:flex; }
.hse-cfg__bulk-label { flex:1; color:rgba(255,255,255,0.6); }

/* ── Integration groups ────────────────────────────────────────────── */
.hse-cfg__groups { display:flex; flex-direction:column; gap:8px; }
.hse-cfg__group {
  border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;
  background:rgba(255,255,255,0.02);
}
.hse-cfg__group-head {
  display:flex; align-items:center; gap:8px; padding:8px 12px;
  background:rgba(255,255,255,0.05); cursor:pointer;
  user-select:none; transition:background 150ms;
}
.hse-cfg__group-head:hover { background:rgba(255,255,255,0.08); }
.hse-cfg__group-arrow { font-size:0.7rem; color:rgba(255,255,255,0.4); transition:transform 200ms; flex-shrink:0; }
.hse-cfg__group.open .hse-cfg__group-arrow { transform:rotate(90deg); }
.hse-cfg__group-name { font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.85); }
.hse-cfg__group-count {
  margin-left:4px; font-size:0.72rem; font-weight:600;
  padding:1px 6px; border-radius:999px;
  background:rgba(232,121,249,0.15); color:#e879f9;
}
.hse-cfg__group-summary {
  margin-left:auto; display:flex; gap:6px; align-items:center;
  font-size:0.72rem; color:rgba(255,255,255,0.4);
}
.hse-cfg__group-selall { display:flex; gap:6px; padding:6px 12px; border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; align-items:center; }
.hse-cfg__group-body { display:none; }
.hse-cfg__group.open .hse-cfg__group-body { display:block; }

/* ── Sensor rows ───────────────────────────────────────────────────── */
.hse-cfg__sensor-row {
  display:flex; align-items:center; gap:10px; padding:8px 12px;
  border-bottom:1px solid rgba(255,255,255,0.05);
  transition:background 120ms;
}
.hse-cfg__sensor-row:last-child { border-bottom:none; }
.hse-cfg__sensor-row:hover { background:rgba(255,255,255,0.04); }
.hse-cfg__sensor-row.selected { background:rgba(232,121,249,0.05); }
.hse-cfg__sensor-info { flex:1; min-width:0; }
.hse-cfg__sensor-name { font-size:0.875rem; color:rgba(255,255,255,0.9); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-eid  { font-size:0.72rem; color:rgba(255,255,255,0.35); font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hse-cfg__sensor-meta { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
.hse-cfg__sensor-actions { display:flex; gap:4px; flex-shrink:0; flex-wrap:nowrap; }
.hse-cfg__type-icon { font-size:0.9rem; flex-shrink:0; }

/* ── Quality badges ────────────────────────────────────────────────── */
.hse-cfg__badge {
  display:inline-flex; align-items:center; padding:2px 7px; border-radius:999px;
  font-size:0.7rem; font-weight:600; white-space:nowrap;
}
.hse-cfg__badge--selected { background:rgba(34,197,94,0.15); color:#4ade80; }
.hse-cfg__badge--ignored  { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); }
.hse-cfg__badge--pending  { background:rgba(234,179,8,0.12); color:#facc15; }
.hse-cfg__badge--normal   { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); }
.hse-cfg__quality {
  display:inline-flex; align-items:center; gap:3px;
  font-size:0.7rem; color:rgba(255,255,255,0.4);
}
.hse-cfg__quality-level {
  font-size:0.68rem; font-weight:600; padding:1px 5px; border-radius:4px;
}
.hse-cfg__quality-level--BON      { background:rgba(34,197,94,0.18); color:#4ade80; }
.hse-cfg__quality-level--ACCEPTABLE{ background:rgba(234,179,8,0.15); color:#facc15; }
.hse-cfg__quality-level--MOYEN    { background:rgba(249,115,22,0.15); color:#fb923c; }
.hse-cfg__quality-level--MAUVAIS  { background:rgba(239,68,68,0.15); color:#f87171; }
.hse-cfg__stars { color:#f59e0b; font-size:0.72rem; }
.hse-cfg__score { font-size:0.68rem; color:rgba(255,255,255,0.3); }

/* ── Diff bandeau ─────────────────────────────────────────────────── */
.hse-cfg__diff-banner {
  display:none; align-items:center; gap:10px; flex-wrap:wrap;
  padding:10px 14px; background:rgba(99,102,241,0.1);
  border:1px solid rgba(99,102,241,0.25); border-radius:10px;
  font-size:0.875rem; margin-bottom:12px;
}
.hse-cfg__diff-banner.visible { display:flex; }
.hse-cfg__diff-msg { flex:1; }

/* ── Pricing form ────────────────────────────────────────────────── */
.hse-cfg__pricing-wrap { display:flex; flex-direction:column; gap:20px; max-width:860px; }
.hse-cfg__pricing-info {
  display:flex; align-items:flex-start; gap:10px; padding:10px 14px;
  background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:8px;
  font-size:0.82rem; color:rgba(255,255,255,0.7);
}
.hse-cfg__pricing-section {
  border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;
}
.hse-cfg__pricing-section-title {
  display:flex; align-items:center; gap:8px;
  padding:10px 14px; background:rgba(255,255,255,0.04);
  font-size:0.82rem; font-weight:600; color:rgba(255,255,255,0.7);
  border-bottom:1px solid rgba(255,255,255,0.06);
}
.hse-cfg__pricing-body { padding:14px; display:flex; flex-direction:column; gap:14px; }
.hse-cfg__field { display:flex; flex-direction:column; gap:5px; }
.hse-cfg__field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:560px){ .hse-cfg__field-row { grid-template-columns:1fr; } }
.hse-cfg__label { font-size:0.8rem; font-weight:500; color:rgba(255,255,255,0.6); }
.hse-cfg__input, .hse-cfg__select {
  padding:7px 11px; border:1px solid rgba(255,255,255,0.1); border-radius:6px;
  background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9);
  font-size:0.875rem; font-family:inherit; outline:none;
  transition:border-color 150ms; width:100%;
}
.hse-cfg__input:focus, .hse-cfg__select:focus { border-color:#e879f9; }
.hse-cfg__input::placeholder { color:rgba(255,255,255,0.2); }
.hse-cfg__input-ttc {
  padding:7px 11px; border:1px solid rgba(255,255,255,0.06); border-radius:6px;
  background:rgba(255,255,255,0.02); color:rgba(255,255,255,0.5);
  font-size:0.875rem; font-family:inherit; width:100%;
  cursor:default; user-select:none;
}
.hse-cfg__input-ttc-label { font-size:0.8rem; font-weight:500; color:rgba(255,255,255,0.35); }
.hse-cfg__hp-hc { display:none; flex-direction:column; gap:14px; }
.hse-cfg__hp-hc.visible { display:flex; }
.hse-cfg__time-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:560px){ .hse-cfg__time-row { grid-template-columns:1fr; } }
.hse-cfg__preview {
  padding:12px 16px;
  background:rgba(232,121,249,0.06); border:1px solid rgba(232,121,249,0.15); border-radius:10px;
  font-size:0.875rem; display:flex; align-items:center; gap:8px;
}
.hse-cfg__preview-label { flex:1; color:rgba(255,255,255,0.6); }
.hse-cfg__preview-value { font-size:1.1rem; font-weight:700; color:#e879f9; }
.hse-cfg__save-row { display:flex; align-items:center; gap:10px; }
.hse-cfg__save-status { font-size:0.8rem; color:rgba(255,255,255,0.4); }

/* ── Rooms/types grid ──────────────────────────────────────────────── */
.hse-cfg__grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:600px){ .hse-cfg__grid { grid-template-columns:1fr; } }
.hse-cfg__card {
  border:1px solid rgba(255,255,255,0.08); border-radius:10px;
  background:rgba(255,255,255,0.02); overflow:hidden;
}
.hse-cfg__card-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; background:rgba(255,255,255,0.04);
  border-bottom:1px solid rgba(255,255,255,0.06);
  font-size:0.875rem; font-weight:600;
}
.hse-cfg__list { padding:0; margin:0; list-style:none; }
.hse-cfg__list li {
  display:flex; align-items:baseline; justify-content:space-between;
  padding:7px 14px; border-bottom:1px solid rgba(255,255,255,0.05);
  font-size:0.875rem; gap:8px;
}
.hse-cfg__list li:last-child { border-bottom:none; }
.hse-cfg__list-eid {
  font-size:0.7rem; color:rgba(255,255,255,0.3); font-family:monospace;
  text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px;
}

/* ── Skeleton / error / empty ─────────────────────────────────────── */
@keyframes hse-shimmer {
  0%   { background-position:-200% 0; }
  100% { background-position: 200% 0; }
}
.hse-skeleton {
  background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);
  background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite;
  border-radius:10px; min-height:120px; width:100%;
}
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
.hse-error {
  color:#f87171; background:rgba(239,68,68,0.08);
  border:1px solid rgba(239,68,68,0.2); border-radius:10px;
  padding:12px 16px; font-size:0.875rem;
}
.hse-empty {
  text-align:center; padding:48px 16px; color:rgba(255,255,255,0.35);
}
.hse-empty-icon { font-size:2.5rem; margin-bottom:12px; }
.hse-empty p { font-size:0.875rem; }
.hse-cfg__note {
  font-size:0.78rem; color:rgba(255,255,255,0.35);
  padding:6px 10px; background:rgba(255,255,255,0.03);
  border-radius:6px; border:1px solid rgba(255,255,255,0.07);
}
`;

const CATALOGUE_PER_PAGE = 200;

// Q1 — icône par type de mesure (device_class HA)
const TYPE_ICON = { energy:'⚡', power:'🔋', gas:'🔥', water:'💧', temperature:'🌡️' };

export class ConfigView {
  constructor() {
    this._el         = null;
    this._ctx        = null;
    this._abort      = null;
    this._mounted    = false;
    this._activeTab  = 'appareils';

    // Appareils
    this._catFetching  = false;
    this._catData      = null;
    this._catSig       = null;
    this._catPage      = 1;
    this._catStatus    = 'all';
    this._catQ         = '';
    this._selected     = new Set();
    this._openGroups   = new Set();

    // Référence (Q2)
    this._refEntityId    = null;   // valeur actuelle en base
    this._refSaving      = false;

    // Auto-select (Q1)
    this._autoSelecting  = false;

    // Meta
    this._metaFetching = false;
    this._metaData     = null;
    this._metaSig      = null;
    this._diffApplying = false;

    // Pricing
    this._pricingFetching = false;
    this._pricingData     = null;
    this._pricingSig      = null;
    this._pricingSaving   = false;
  }

  // ── Cycle de vie ────────────────────────────────────────────────────────────
  mount(el, ctx) {
    this._el = el; this._ctx = ctx;
    this._abort = new AbortController();
    this._mounted = true;
    this._injectCSS();
    this._buildDOM();
    this._loadCatalogue();
    this._loadReference();   // Q2 — charger reference_entity_id dès le départ
  }
  update_hass(hass) { this._ctx = { ...this._ctx, hass }; }
  unmount() {
    this._mounted = false;
    if (this._abort) this._abort.abort();
    this._abort = null; this._el = null; this._ctx = null;
  }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  _injectCSS() {
    if (document.getElementById('hse-cfg-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-cfg-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── DOM (R1) ─────────────────────────────────────────────────────────────────
  _buildDOM() {
    this._el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'hse-cfg';
    root.innerHTML = `
      <div class="hse-cfg__tabs" role="tablist">
        <button class="hse-cfg__tab active" data-tab="appareils" role="tab" aria-selected="true">Appareils</button>
        <button class="hse-cfg__tab" data-tab="meta" role="tab" aria-selected="false">Pi\u00e8ces &amp; Types</button>
        <button class="hse-cfg__tab" data-tab="pricing" role="tab" aria-selected="false">Tarification</button>
      </div>

      <!-- PANEL A -->
      <div class="hse-cfg__panel active" id="hse-cfg-panel-appareils" role="tabpanel">

        <!-- Bloc ⭐ référence -->
        <div class="hse-cfg__ref-block" id="hse-cfg-ref-block">
          <span class="hse-cfg__ref-icon">⭐</span>
          <span class="hse-cfg__ref-label">Capteur de r\u00e9f\u00e9rence (ex\u00a0: Linky)\u00a0:</span>
          <select class="hse-cfg__ref-select" id="hse-cfg-ref-select" aria-label="Capteur de r\u00e9f\u00e9rence">
            <option value="">\u2014 Aucun (non configur\u00e9) \u2014</option>
          </select>
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-ref-save">Enregistrer</button>
          <span class="hse-cfg__ref-status" id="hse-cfg-ref-status"></span>
        </div>

        <!-- Bloc ✨ sélection auto -->
        <div class="hse-cfg__auto-block">
          <span class="hse-cfg__ref-icon">\u2728</span>
          <span class="hse-cfg__ref-label" style="color:rgba(255,255,255,0.7)">
            S\u00e9lection automatique intelligente \u2014 active tous les capteurs en attente selon leur score qualit\u00e9.
          </span>
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-auto-btn">\u2728 Lancer</button>
          <span class="hse-cfg__ref-status" id="hse-cfg-auto-status"></span>
        </div>

        <div class="hse-cfg__toolbar">
          <input class="hse-cfg__search" type="search" placeholder="Rechercher un capteur\u2026" aria-label="Rechercher" />
          <select class="hse-cfg__filter" id="hse-cfg-status-filter" aria-label="Filtrer par statut">
            <option value="all">Tous les statuts</option>
            <option value="selected">S\u00e9lectionn\u00e9s</option>
            <option value="ignored">Ignor\u00e9s</option>
            <option value="pending">En attente</option>
          </select>
          <button class="hse-btn hse-btn--ghost" id="hse-cfg-refresh-btn">&#x21bb; Actualiser</button>
        </div>
        <div class="hse-cfg__bulk" id="hse-cfg-bulk">
          <span class="hse-cfg__bulk-label" id="hse-cfg-bulk-label">0 s\u00e9lectionn\u00e9(s)</span>
          <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-cfg-bulk-activate">&#x2713; Activer</button>
          <button class="hse-btn hse-btn--danger hse-btn--sm" id="hse-cfg-bulk-ignore">&#x2715; Ignorer</button>
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-bulk-cancel">Annuler</button>
        </div>
        <div id="hse-cfg-cat-body"><div class="hse-skeleton"></div></div>
        <div class="hse-cfg__toolbar" id="hse-cfg-cat-pager" style="display:none;margin-top:8px"></div>
      </div>

      <!-- PANEL B -->
      <div class="hse-cfg__panel" id="hse-cfg-panel-meta" role="tabpanel">
        <div class="hse-cfg__diff-banner" id="hse-cfg-diff-banner">
          <span class="hse-cfg__diff-msg" id="hse-cfg-diff-msg"></span>
          <button class="hse-btn hse-btn--primary hse-btn--sm" id="hse-cfg-diff-apply">Appliquer</button>
          <button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-diff-dismiss">Ignorer</button>
        </div>
        <div id="hse-cfg-meta-body"><div class="hse-skeleton"></div></div>
        <p class="hse-cfg__note" style="margin-top:12px">&#x2139;&#xFE0F; La cr\u00e9ation manuelle de pi\u00e8ces et types sera disponible prochainement (DELTA-059).</p>
      </div>

      <!-- PANEL C -->
      <div class="hse-cfg__panel" id="hse-cfg-panel-pricing" role="tabpanel">
        <div id="hse-cfg-pricing-body"><div class="hse-skeleton"></div></div>
      </div>
    `;
    this._el.appendChild(root);
    this._bindTabs(root);
    this._bindAppareilsEvents(root);
    this._bindMetaEvents(root);
  }

  // ── Navigation sous-onglets ────────────────────────────────────────────────
  _bindTabs(root) {
    root.querySelectorAll('.hse-cfg__tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === this._activeTab) return;
        this._activeTab = tab;
        root.querySelectorAll('.hse-cfg__tab').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
          b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
        });
        root.querySelectorAll('.hse-cfg__panel').forEach(p => {
          p.classList.toggle('active', p.id === `hse-cfg-panel-${tab}`);
        });
        if (tab === 'meta'    && !this._metaData)    { this._loadMeta(); this._loadDiffPreview(); }
        if (tab === 'pricing' && !this._pricingData) this._loadPricing();
      });
    });
  }

  // ── PANEL A — Appareils ─────────────────────────────────────────────────────

  // Q2 — Charger reference_entity_id depuis GET /api/hse/settings/pricing
  async _loadReference() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      this._refEntityId = data.reference_entity_id ?? null;
      this._populateRefSelect();
    } catch (e) { /* non-bloquant */ }
  }

  // Peupler le select de référence avec les capteurs selected du catalogue
  _populateRefSelect() {
    const sel = this._el?.querySelector('#hse-cfg-ref-select');
    if (!sel) return;
    const items = this._catData?.items ?? [];
    const current = this._refEntityId;
    // Garder uniquement selected + current s'il n'est pas dans la liste
    const eids = items.filter(i => i.status === 'selected').map(i => i.entity_id);
    if (current && !eids.includes(current)) eids.unshift(current);
    // Reconstruire les options
    sel.innerHTML = '<option value="">\u2014 Aucun \u2014</option>';
    eids.forEach(eid => {
      const item = items.find(i => i.entity_id === eid);
      const label = item ? `${item.name ?? eid} (${eid})` : eid;
      const opt = document.createElement('option');
      opt.value = eid; opt.textContent = label;
      if (eid === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // Q2 — Sauvegarder reference_entity_id via PUT /api/hse/settings/pricing
  async _saveReference() {
    if (this._refSaving) return;
    const sel    = this._el?.querySelector('#hse-cfg-ref-select');
    const status = this._el?.querySelector('#hse-cfg-ref-status');
    const btn    = this._el?.querySelector('#hse-cfg-ref-save');
    if (!sel) return;
    this._refSaving = true;
    if (btn)    { btn.disabled = true; btn.textContent = '\u2026'; }
    if (status) status.textContent = '';
    const val = sel.value || null;
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ reference_entity_id: val }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._refEntityId = val;
      if (status) { status.textContent = '\u2713 Enregistr\u00e9'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = '\u26a0 Erreur';
    } finally {
      this._refSaving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
    }
  }

  // Q1 — Sélection automatique : select en bulk tous les pending
  async _autoSelect() {
    if (this._autoSelecting) return;
    this._autoSelecting = true;
    const btn    = this._el?.querySelector('#hse-cfg-auto-btn');
    const status = this._el?.querySelector('#hse-cfg-auto-status');
    if (btn)    { btn.disabled = true; btn.textContent = '\u2026'; }
    if (status) status.textContent = '';
    try {
      // 1 — Charger TOUS les pending (per_page max)
      const r = await this._ctx.hseFetch('/api/hse/catalogue?status=pending&per_page=200', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const pending = (data.items ?? []).filter(i => i.status === 'pending');
      if (!pending.length) {
        if (status) { status.textContent = 'Aucun capteur en attente.'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
        return;
      }
      // 2 — Trier par quality_score desc, prendre les meilleurs
      const sorted = [...pending].sort((a,b) => (b.quality_score??0) - (a.quality_score??0));
      const items  = sorted.map(i => ({ entity_id: i.entity_id, action: 'select' }));
      const r2 = await this._ctx.hseFetch('/api/hse/catalogue/triage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ items }), signal: this._abort?.signal,
      });
      if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
      const res = await r2.json();
      if (status) {
        status.textContent = `\u2713 ${res.processed ?? items.length} capteur(s) activ\u00e9(s)`;
        setTimeout(() => { if (status) status.textContent = ''; }, 4000);
      }
      this._catSig = null;
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = '\u26a0 Erreur';
    } finally {
      this._autoSelecting = false;
      if (btn) { btn.disabled = false; btn.textContent = '\u2728 Lancer'; }
    }
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
    root.querySelector('#hse-cfg-bulk-activate').addEventListener('click', () => this._bulkAction('select'));
    root.querySelector('#hse-cfg-bulk-ignore').addEventListener('click', () => this._bulkAction('ignore'));
    root.querySelector('#hse-cfg-bulk-cancel').addEventListener('click', () => { this._selected.clear(); this._updateBulkBar(); });
    root.querySelector('#hse-cfg-ref-save').addEventListener('click', () => this._saveReference());
    root.querySelector('#hse-cfg-auto-btn').addEventListener('click', () => this._autoSelect());
  }

  async _loadCatalogue() {
    if (this._catFetching) return;  // R2
    this._catFetching = true;
    const params = new URLSearchParams({ status: this._catStatus, page: this._catPage, per_page: CATALOGUE_PER_PAGE });
    if (this._catQ) params.set('q', this._catQ);
    try {
      const r = await this._ctx.hseFetch(`/api/hse/catalogue?${params}`, { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);  // R3
      if (sig === this._catSig) return;
      this._catSig = sig; this._catData = data;
      this._renderCatalogue();
      this._populateRefSelect(); // Mettre à jour le select référence après chaque reload
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setCatBody(`<div class="hse-error">Erreur catalogue \u2014 ${e.message}</div>`);
    } finally { this._catFetching = false; }
  }

  _renderCatalogue() {
    const d = this._catData;
    if (!d) return;
    const items = d.items ?? [];
    if (!items.length) {
      this._setCatBody(`<div class="hse-empty"><div class="hse-empty-icon">&#x1F4E6;</div><p>Aucun appareil catalogu\u00e9.</p></div>`);
      return;
    }

    // Grouper par integration_domain
    const groups = {};
    for (const item of items) {
      const key = item.integration_domain ?? item.integration ?? 'inconnu';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    if (this._openGroups.size === 0) {
      Object.keys(groups).forEach(k => this._openGroups.add(k));
    }

    const html = Object.entries(groups)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([integ, gItems]) => this._renderGroup(integ, gItems))
      .join('');

    this._setCatBody(`<div class="hse-cfg__groups">${html}</div>`);
    this._bindGroupEvents();
    this._renderCatPager(d);
  }

  _renderGroup(integ, items) {
    const isOpen   = this._openGroups.has(integ);
    const selCount = items.filter(i => i.status === 'selected').length;
    const rows     = items.map(item => this._renderSensorRow(item)).join('');
    return `
      <div class="hse-cfg__group ${isOpen ? 'open' : ''}" data-group="${this._esc(integ)}">
        <div class="hse-cfg__group-head">
          <span class="hse-cfg__group-arrow">&#x25B6;</span>
          <span class="hse-cfg__group-name">${this._esc(integ)}</span>
          <span class="hse-cfg__group-count">${items.length}</span>
          <span class="hse-cfg__group-summary">
            <span style="color:rgba(74,222,128,0.9)">${selCount} actif${selCount>1?'s':''}</span>
            <span style="color:rgba(255,255,255,0.25)">/ ${items.length}</span>
          </span>
        </div>
        <div class="hse-cfg__group-body">
          <div class="hse-cfg__group-selall">
            <button class="hse-btn hse-btn--ghost hse-btn--sm" data-grp-sel="${this._esc(integ)}" data-grp-action="select_all">Tout s\u00e9lectionner</button>
            <button class="hse-btn hse-btn--ghost hse-btn--sm" data-grp-sel="${this._esc(integ)}" data-grp-action="desel_all">Tout d\u00e9s\u00e9lectionner</button>
          </div>
          ${rows}
        </div>
      </div>`;
  }

  _renderSensorRow(item) {
    const sel        = this._selected.has(item.entity_id);
    const statusCls  = `hse-cfg__badge--${item.status ?? 'pending'}`;
    const statusLbl  = { selected:'S\u00e9lectionn\u00e9', ignored:'Ignor\u00e9', pending:'En attente' }[item.status] ?? (item.status ?? 'En attente');
    const quality    = this._renderQuality(item);
    // Q1 — icône type basée sur item.type (device_class)
    const typeKey    = (item.type ?? '').toLowerCase();
    const typeIcon   = TYPE_ICON[typeKey] ?? '\u2753';
    return `
      <div class="hse-cfg__sensor-row${sel ? ' selected' : ''}" data-eid="${this._esc(item.entity_id)}">
        <input type="checkbox" class="hse-cfg__cb" aria-label="S\u00e9lectionner" ${sel ? 'checked' : ''} data-cb-eid="${this._esc(item.entity_id)}" />
        <span class="hse-cfg__type-icon" title="${this._esc(item.type ?? 'inconnu')}">${typeIcon}</span>
        <div class="hse-cfg__sensor-info">
          <div class="hse-cfg__sensor-name">${this._esc(item.name ?? item.entity_id)}</div>
          <div class="hse-cfg__sensor-eid">${this._esc(item.entity_id)}</div>
        </div>
        <div class="hse-cfg__sensor-meta">
          ${quality}
          <span class="hse-cfg__badge ${statusCls}">${statusLbl}</span>
        </div>
        <div class="hse-cfg__sensor-actions">
          ${item.status !== 'selected' ? `<button class="hse-btn hse-btn--primary hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="select">&#x2713; Activer</button>` : ''}
          ${item.status !== 'ignored'  ? `<button class="hse-btn hse-btn--danger hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="ignore">&#x2715; Ignorer</button>` : ''}
          <button class="hse-btn hse-btn--ghost hse-btn--sm" data-triage-id="${this._esc(item.entity_id)}" data-triage-action="reset">&#x21BA;</button>
        </div>
      </div>`;
  }

  _renderQuality(item) {
    const score  = item.quality_score ?? item.score ?? null;
    const level  = item.quality_level ?? item.quality ?? null;
    if (score === null && level === null) return '';
    const stars  = score !== null ? this._scoreToStars(score) : '';
    const lvlCls = level ? `hse-cfg__quality-level--${level}` : '';
    const lvlLbl = level ? `<span class="hse-cfg__quality-level ${lvlCls}">${level}</span>` : '';
    const scoreStr = score !== null ? `<span class="hse-cfg__score">${score}/150</span>` : '';
    return `<span class="hse-cfg__quality">${lvlLbl}<span class="hse-cfg__stars">${stars}</span>${scoreStr}</span>`;
  }

  _scoreToStars(score) {
    const n = Math.round((score / 150) * 5);
    return '\u2605'.repeat(Math.max(0,n)) + '\u2606'.repeat(Math.max(0, 5-n));
  }

  _bindGroupEvents() {
    const body = this._el?.querySelector('#hse-cfg-cat-body');
    if (!body) return;

    body.querySelectorAll('.hse-cfg__group-head').forEach(head => {
      head.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const grp  = head.closest('.hse-cfg__group');
        const key  = grp.dataset.group;
        const open = grp.classList.toggle('open');
        open ? this._openGroups.add(key) : this._openGroups.delete(key);
      });
    });

    body.querySelectorAll('[data-grp-sel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp    = btn.dataset.grpSel;
        const action = btn.dataset.grpAction;
        const items  = (this._catData?.items ?? []).filter(i => (i.integration_domain ?? i.integration ?? 'inconnu') === grp);
        items.forEach(i => action === 'select_all' ? this._selected.add(i.entity_id) : this._selected.delete(i.entity_id));
        items.forEach(i => {
          const esc = CSS.escape ? CSS.escape(i.entity_id) : i.entity_id;
          const row = body.querySelector(`[data-eid="${esc}"]`);
          const cb  = body.querySelector(`[data-cb-eid="${esc}"]`);
          if (cb)  cb.checked = action === 'select_all';
          if (row) row.classList.toggle('selected', action === 'select_all');
        });
        this._updateBulkBar();
      });
    });

    body.querySelectorAll('.hse-cfg__cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const eid = cb.dataset.cbEid;
        if (!eid) return;
        cb.checked ? this._selected.add(eid) : this._selected.delete(eid);
        const row = cb.closest('.hse-cfg__sensor-row');
        if (row) row.classList.toggle('selected', cb.checked);
        this._updateBulkBar();
      });
    });

    body.querySelectorAll('[data-triage-id]').forEach(btn => {
      btn.addEventListener('click', () => this._triage(btn.dataset.triageId, btn.dataset.triageAction));
    });
  }

  _updateBulkBar() {
    const bar   = this._el?.querySelector('#hse-cfg-bulk');
    const label = this._el?.querySelector('#hse-cfg-bulk-label');
    if (!bar) return;
    const n = this._selected.size;
    bar.classList.toggle('visible', n > 0);
    if (label) label.textContent = `${n}\u00a0s\u00e9lectionn\u00e9${n > 1 ? 's' : ''}`;
  }

  async _triage(entityId, action) {
    const btn = this._el?.querySelector(`[data-triage-id="${this._attrVal(entityId)}"][data-triage-action="${action}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/catalogue/triage', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: entityId, action }), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._catSig = null; this._selected.delete(entityId); this._updateBulkBar();
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (btn) { btn.disabled = false; btn.textContent = action === 'select' ? '\u2713 Activer' : action === 'ignore' ? '\u2715 Ignorer' : '\u21ba'; }
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
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._selected.clear(); this._catSig = null;
      await this._loadCatalogue();
    } catch (e) {
      if (e.name === 'AbortError') return;
    } finally { this._updateBulkBar(); }
  }

  _renderCatPager(d) {
    const pager = this._el?.querySelector('#hse-cfg-cat-pager');
    if (!pager) return;
    const total = d.total ?? 0;
    const totalPages = Math.ceil(total / CATALOGUE_PER_PAGE);
    if (totalPages <= 1) { pager.style.display = 'none'; return; }
    pager.style.display = 'flex';
    pager.innerHTML = `<span>${total} appareils</span><div style="display:flex;gap:6px"><button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-prev" ${this._catPage<=1?'disabled':''}>&larr;</button><button class="hse-btn hse-btn--ghost hse-btn--sm" id="hse-cfg-next" ${this._catPage>=totalPages?'disabled':''}>&rarr;</button></div>`;
    pager.querySelector('#hse-cfg-prev')?.addEventListener('click', () => { this._catPage--; this._catSig=null; this._loadCatalogue(); });
    pager.querySelector('#hse-cfg-next')?.addEventListener('click', () => { this._catPage++; this._catSig=null; this._loadCatalogue(); });
  }

  _setCatBody(html) {
    const el = this._el?.querySelector('#hse-cfg-cat-body');
    if (el) el.innerHTML = html;
  }

  // ── PANEL B — Pièces & Types ─────────────────────────────────────────────────
  _bindMetaEvents(root) {
    root.querySelector('#hse-cfg-diff-apply')?.addEventListener('click', () => this._applyDiff());
    root.querySelector('#hse-cfg-diff-dismiss')?.addEventListener('click', () => {
      this._el?.querySelector('#hse-cfg-diff-banner')?.classList.remove('visible');
    });
  }

  async _loadMeta() {
    if (this._metaFetching) return;
    this._metaFetching = true;
    this._setMetaBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._metaSig) return;
      this._metaSig = sig; this._metaData = data;
      this._renderMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setMetaBody(`<div class="hse-error">Erreur m\u00e9ta \u2014 ${e.message}</div>`);
    } finally { this._metaFetching = false; }
  }

  async _loadDiffPreview() {
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/preview', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({}), signal: this._abort?.signal,
      });
      if (!r.ok) return;
      const data = await r.json();
      if (!this._mounted) return;
      const count = (data.to_add?.length ?? 0) + (data.to_update?.length ?? 0);
      const banner = this._el?.querySelector('#hse-cfg-diff-banner');
      const msg    = this._el?.querySelector('#hse-cfg-diff-msg');
      if (!banner || !msg) return;
      if (count > 0) {
        msg.textContent = `${count} changement${count>1?'s':''} d\u00e9tect\u00e9${count>1?'s':''} entre HA et le catalogue.`;
        banner.classList.add('visible');
      } else {
        banner.classList.remove('visible');
      }
    } catch (e) { /* non-bloquant */ }
  }

  async _applyDiff() {
    if (this._diffApplying) return;
    this._diffApplying = true;
    const btn = this._el?.querySelector('#hse-cfg-diff-apply');
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    try {
      const r = await this._ctx.hseFetch('/api/hse/meta/sync/apply', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({}), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._el?.querySelector('#hse-cfg-diff-banner')?.classList.remove('visible');
      this._metaSig = null;
      await this._loadMeta();
    } catch (e) {
      if (e.name === 'AbortError') return;
      const msg = this._el?.querySelector('#hse-cfg-diff-msg');
      if (msg) msg.textContent = `Erreur : ${e.message}`;
      if (btn) { btn.disabled = false; btn.textContent = 'Appliquer'; }
    } finally { this._diffApplying = false; }
  }

  // Q3 — Fix : backend retourne rooms=[{id, name}] et types=[string]
  // L'ancienne version lisait d.device_types (inexistant) → bug '?'
  _renderMeta() {
    const d = this._metaData;
    if (!d) return;

    // rooms = [{id, name}] (format backend réel post-DELTA-064)
    const rooms = d.rooms ?? [];
    // types = string[] (identifiants bruts : "energy", "power", etc.)
    const types = d.types ?? [];

    const renderRooms = (items) => {
      if (!items.length) return `<li style="padding:12px 14px;color:rgba(255,255,255,0.3);font-size:0.875rem">Aucune pi\u00e8ce.</li>`;
      return items.map(r => {
        // r est {id, name} — fix bug '?' : on lit r.name (jamais r.label/r.display_name)
        const name = r.name ?? r.id ?? '?';
        const id   = r.id   ?? '';
        return `<li>
          <span>${this._esc(name)}</span>
          <span class="hse-cfg__list-eid" title="${this._esc(id)}">${this._esc(id)}</span>
        </li>`;
      }).join('');
    };

    const renderTypes = (items) => {
      if (!items.length) return `<li style="padding:12px 14px;color:rgba(255,255,255,0.3);font-size:0.875rem">Aucun type.</li>`;
      return items.map(t => {
        // t est un string (ex: "energy")
        const icon = TYPE_ICON[t?.toLowerCase()] ?? '';
        return `<li><span>${icon} ${this._esc(t ?? '?')}</span></li>`;
      }).join('');
    };

    this._setMetaBody(`
      <div class="hse-cfg__grid">
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">Pi\u00e8ces <span style="font-weight:400;font-size:0.8rem;opacity:0.5">(${rooms.length})</span></div>
          <ul class="hse-cfg__list">${renderRooms(rooms)}</ul>
        </div>
        <div class="hse-cfg__card">
          <div class="hse-cfg__card-head">Types d&apos;appareils <span style="font-weight:400;font-size:0.8rem;opacity:0.5">(${types.length})</span></div>
          <ul class="hse-cfg__list">${renderTypes(types)}</ul>
        </div>
      </div>`);
  }

  _setMetaBody(html) {
    const el = this._el?.querySelector('#hse-cfg-meta-body');
    if (el) el.innerHTML = html;
  }

  // ── PANEL C — Tarification (inchangé) ──────────────────────────────────────
  async _loadPricing() {
    if (this._pricingFetching) return;
    this._pricingFetching = true;
    this._setPricingBody('<div class="hse-skeleton"></div>');
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!this._mounted) return;
      const sig = JSON.stringify(data);
      if (sig === this._pricingSig) return;
      this._pricingSig = sig; this._pricingData = data;
      this._renderPricing();
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._setPricingBody(`<div class="hse-error">Erreur tarification \u2014 ${e.message}</div>`);
    } finally { this._pricingFetching = false; }
  }

  _renderPricing() {
    const d        = this._pricingData ?? {};
    const contract = d.contract_type ?? 'base';
    const isHphc   = contract === 'hphc';
    const tax      = d.tax_rate ?? 20;

    const ttcSub = d.subscription_ht != null ? (d.subscription_ht * (1 + tax/100)).toFixed(3) : (d.subscription_monthly ?? '');
    const ttcHp  = d.price_hp != null ? (d.price_hp * (1 + tax/100)).toFixed(4) : '';
    const ttcHc  = d.price_hc != null ? (d.price_hc * (1 + tax/100)).toFixed(4) : '';
    const ttcFix = d.price_ht != null ? (d.price_ht * (1 + tax/100)).toFixed(4) : '';

    this._setPricingBody(`
      <div class="hse-cfg__pricing-wrap">
        <div class="hse-cfg__pricing-info">
          &#x1F4C5; Les modifications seront appliqu\u00e9es apr\u00e8s sauvegarde. Les calculs seront mis \u00e0 jour automatiquement.
        </div>
        <div class="hse-cfg__pricing-section">
          <div class="hse-cfg__pricing-section-title">&#x2699;&#xFE0F; Configuration Tarifaire</div>
          <div class="hse-cfg__pricing-body">
            <form id="hse-cfg-pricing-form" novalidate>
              <div class="hse-cfg__field" style="margin-bottom:14px">
                <label class="hse-cfg__label" for="hse-cfg-contract-type">Type de contrat :</label>
                <select class="hse-cfg__select" id="hse-cfg-contract-type" name="contract_type">
                  <option value="base" ${!isHphc ? 'selected' : ''}>Prix fixe</option>
                  <option value="hphc" ${isHphc  ? 'selected' : ''}>Heures Pleines / Creuses</option>
                </select>
              </div>
              <div class="hse-cfg__field-row" style="margin-bottom:14px">
                <div class="hse-cfg__field">
                  <label class="hse-cfg__label" for="hse-cfg-sub-ht">Abonnement mensuel HT (\u20ac) :</label>
                  <input class="hse-cfg__input" type="number" id="hse-cfg-sub-ht" name="subscription_ht"
                    step="0.01" min="0" value="${d.subscription_ht ?? d.subscription_monthly ?? ''}" placeholder="ex: 14.68" />
                </div>
                <div class="hse-cfg__field">
                  <label class="hse-cfg__input-ttc-label" for="hse-cfg-sub-ttc">Abonnement mensuel TTC (\u20ac) :</label>
                  <div class="hse-cfg__input-ttc" id="hse-cfg-sub-ttc">${ttcSub !== '' ? ttcSub : '\u2014'}</div>
                </div>
              </div>
              <div class="hse-cfg__field-row" style="margin-bottom:4px">
                <div class="hse-cfg__field">
                  <label class="hse-cfg__label" for="hse-cfg-tax-rate">TVA et taxes (%) :</label>
                  <input class="hse-cfg__input" type="number" id="hse-cfg-tax-rate" name="tax_rate"
                    step="0.1" min="0" max="100" value="${tax}" placeholder="20" />
                </div>
              </div>
              <div class="${!isHphc ? '' : 'hse-cfg__hp-hc'}" id="hse-cfg-base-fields">
                <div class="hse-cfg__pricing-section-title" style="margin-top:10px;border:none;background:none;padding-left:0">&#x26A1; Tarif Fixe</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label" for="hse-cfg-price-ht">Prix HT (\u20ac/kWh) :</label>
                    <input class="hse-cfg__input" type="number" id="hse-cfg-price-ht" name="price_ht"
                      step="0.0001" min="0" value="${d.price_ht ?? ''}" placeholder="ex: 0.1297" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__input-ttc-label">Prix TTC (\u20ac/kWh) :</label>
                    <div class="hse-cfg__input-ttc" id="hse-cfg-fix-ttc">${ttcFix !== '' ? ttcFix : '\u2014'}</div>
                  </div>
                </div>
              </div>
              <div class="hse-cfg__hp-hc ${isHphc ? 'visible' : ''}" id="hse-cfg-hphc-fields">
                <div class="hse-cfg__pricing-section-title" style="margin-top:10px;border:none;background:none;padding-left:0">&#x2600;&#xFE0F; Heures Pleines</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label" for="hse-cfg-price-hp">Prix HP HT (\u20ac/kWh) :</label>
                    <input class="hse-cfg__input" type="number" id="hse-cfg-price-hp" name="price_hp"
                      step="0.0001" min="0" value="${d.price_hp ?? ''}" placeholder="ex: 0.1327" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__input-ttc-label">Prix HP TTC (\u20ac/kWh) :</label>
                    <div class="hse-cfg__input-ttc" id="hse-cfg-hp-ttc">${ttcHp !== '' ? ttcHp : '\u2014'}</div>
                  </div>
                </div>
                <div class="hse-cfg__pricing-section-title" style="margin-top:6px;border:none;background:none;padding-left:0">&#x1F319; Heures Creuses</div>
                <div class="hse-cfg__field-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label" for="hse-cfg-price-hc">Prix HC HT (\u20ac/kWh) :</label>
                    <input class="hse-cfg__input" type="number" id="hse-cfg-price-hc" name="price_hc"
                      step="0.0001" min="0" value="${d.price_hc ?? ''}" placeholder="ex: 0.1327" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__input-ttc-label">Prix HC TTC (\u20ac/kWh) :</label>
                    <div class="hse-cfg__input-ttc" id="hse-cfg-hc-ttc">${ttcHc !== '' ? ttcHc : '\u2014'}</div>
                  </div>
                </div>
                <div class="hse-cfg__pricing-section-title" style="margin-top:6px;border:none;background:none;padding-left:0">&#x23F0; Plage Horaire HC</div>
                <div class="hse-cfg__time-row">
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label" for="hse-cfg-hc-start">D\u00e9but (HH:MM) :</label>
                    <input class="hse-cfg__input" type="time" id="hse-cfg-hc-start" name="hc_start"
                      value="${d.hc_start ?? '22:00'}" />
                  </div>
                  <div class="hse-cfg__field">
                    <label class="hse-cfg__label" for="hse-cfg-hc-end">Fin (HH:MM) :</label>
                    <input class="hse-cfg__input" type="time" id="hse-cfg-hc-end" name="hc_end"
                      value="${d.hc_end ?? '06:00'}" />
                  </div>
                </div>
              </div>
              <div class="hse-cfg__preview" style="margin-top:8px">
                <span class="hse-cfg__preview-label">Co\u00fbt mensuel estim\u00e9 :</span>
                <span class="hse-cfg__preview-value" id="hse-cfg-preview-val">\u2014</span>
              </div>
              <div class="hse-cfg__field" style="margin-top:8px">
                <label class="hse-cfg__label" for="hse-cfg-estimate">Consommation estim\u00e9e (kWh/mois) :</label>
                <input class="hse-cfg__input" type="number" id="hse-cfg-estimate" name="monthly_kwh_estimate"
                  step="1" min="0" value="${d.monthly_kwh_estimate ?? ''}" placeholder="ex: 300" style="max-width:260px" />
              </div>
              <div class="hse-cfg__save-row" style="margin-top:10px">
                <button type="submit" class="hse-btn hse-btn--primary" id="hse-cfg-save-btn">Sauvegarder</button>
                <span class="hse-cfg__save-status" id="hse-cfg-save-status"></span>
              </div>
            </form>
          </div>
        </div>
      </div>`);
    this._bindPricingForm();
    this._updatePricingPreview();
  }

  _bindPricingForm() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;
    const contractSel = form.querySelector('#hse-cfg-contract-type');
    const hphcFields  = form.querySelector('#hse-cfg-hphc-fields');
    const baseFields  = form.querySelector('#hse-cfg-base-fields');
    contractSel?.addEventListener('change', () => {
      const hphc = contractSel.value === 'hphc';
      hphcFields?.classList.toggle('visible', hphc);
      if (baseFields) baseFields.style.display = hphc ? 'none' : '';
      this._updatePricingPreview();
    });
    form.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => this._updatePricingPreview()));
    form.addEventListener('submit', async e => { e.preventDefault(); await this._savePricing(form); });
  }

  _updatePricingPreview() {
    const form = this._el?.querySelector('#hse-cfg-pricing-form');
    if (!form) return;
    const tax    = parseFloat(form.querySelector('#hse-cfg-tax-rate')?.value) || 20;
    const mult   = 1 + tax / 100;
    const subHt  = parseFloat(form.querySelector('#hse-cfg-sub-ht')?.value) || 0;
    const kwh    = parseFloat(form.querySelector('#hse-cfg-estimate')?.value) || 0;
    const ct     = form.querySelector('#hse-cfg-contract-type')?.value ?? 'base';
    const setTtc = (id, ht) => { const el = form.querySelector(id); if (el) el.textContent = ht > 0 ? (ht * mult).toFixed(4) : '\u2014'; };
    const setTtcV= (id, v)  => { const el = form.querySelector(id); if (el) el.textContent = v > 0 ? (v * mult).toFixed(3) : '\u2014'; };
    setTtcV('#hse-cfg-sub-ttc', subHt);
    setTtc('#hse-cfg-fix-ttc', parseFloat(form.querySelector('#hse-cfg-price-ht')?.value) || 0);
    setTtc('#hse-cfg-hp-ttc',  parseFloat(form.querySelector('#hse-cfg-price-hp')?.value) || 0);
    setTtc('#hse-cfg-hc-ttc',  parseFloat(form.querySelector('#hse-cfg-price-hc')?.value) || 0);
    const val = this._el?.querySelector('#hse-cfg-preview-val');
    if (!val) return;
    const price = ct === 'hphc'
      ? (parseFloat(form.querySelector('#hse-cfg-price-hp')?.value) || 0) * mult
      : (parseFloat(form.querySelector('#hse-cfg-price-ht')?.value) || 0) * mult;
    const total = (kwh * price) + (subHt * mult);
    val.textContent = (kwh > 0 || subHt > 0) ? `${total.toFixed(2)}\u00a0\u20ac/mois` : '\u2014';
  }

  async _savePricing(form) {
    if (this._pricingSaving) return;
    this._pricingSaving = true;
    const btn    = form.querySelector('#hse-cfg-save-btn');
    const status = form.querySelector('#hse-cfg-save-status');
    if (btn) { btn.disabled = true; btn.textContent = '\u2026'; }
    if (status) status.textContent = '';
    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) payload[k] = v === '' ? null : (isNaN(v) ? v : parseFloat(v));
    if (payload.subscription_ht != null) payload.subscription_monthly = payload.subscription_ht;
    try {
      const r = await this._ctx.hseFetch('/api/hse/settings/pricing', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload), signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      this._pricingSig = null;
      if (status) { status.textContent = '\u2713 Enregistr\u00e9'; setTimeout(() => { if (status) status.textContent = ''; }, 3000); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (status) status.textContent = `\u26a0 Erreur : ${e.message}`;
    } finally {
      this._pricingSaving = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Sauvegarder'; }
    }
  }

  _setPricingBody(html) {
    const el = this._el?.querySelector('#hse-cfg-pricing-body');
    if (el) el.innerHTML = html;
  }

  // ── Utilitaires ─────────────────────────────────────────────────────────────
  _attrVal(str) {
    if (str == null) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
  _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
}
