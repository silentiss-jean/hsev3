/**
 * migration_view.js — Onglet 7 : Migration capteurs V1 → V3
 *
 * Endpoints :
 *   GET  /api/hse/migration/export  — détection entités legacy
 *   POST /api/hse/migration/apply   — applique le mapping + nettoyage
 * Wizard 3 étapes : Détection → Validation → Application
 * Polling : ZÉRO auto (type ACTION)
 * Données wizard persistées en mémoire pendant la navigation
 * Règles R1–R5 respectées
 */

export class MigrationView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
    this._step     = 1;  // 1 = Détection, 2 = Validation, 3 = Application
    this._mappings = [];
    this._result   = null;
  }

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    this._buildSkeleton();
    this._fetchDetection();
  }

  update_hass(hass) { this._hass = hass; }  // R1

  unmount() {
    this._mounted = false;
    if (this._abortCtl) { this._abortCtl.abort(); this._abortCtl = null; }
    // Les données wizard (_mappings, _step, _result) restent en mémoire
  }

  // ─── Étape 1 : Détection ──────────────────────────────────────────────────

  async _fetchDetection() {
    if (!this._mounted || this._fetching) return;
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch('/api/hse/migration/export', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const data = await resp.json();
      this._mappings = data.mappings ?? [];
      this._applyData(data);
    } catch (e) {
      if (e.name !== 'AbortError') this._renderError(e);
    } finally {
      this._fetching = false;
    }
  }

  _applyData(data) {
    const sig = JSON.stringify({ data, step: this._step });
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  _buildSkeleton() {
    this._root.innerHTML = `<div class="hse-skeleton" style="height:300px;border-radius:8px"></div>`;
  }

  _render(data) {
    if (!this._root.querySelector('.hse-migration-root')) {
      this._root.innerHTML = this._buildHTML(data);
      this._bindEvents();
      return;
    }
    this._root.querySelector('.mig-content').innerHTML = this._buildStepContent(data);
    this._bindStepEvents();
  }

  _buildHTML(data) {
    return `
      <div class="hse-migration-root">
        <div class="hse-card">
          <div class="mig-stepper">
            ${[1,2,3].map(n => `
              <div class="mig-step ${n===this._step?'active':''} ${n<this._step?'done':''}" data-step="${n}">
                <span class="mig-step-num">${n}</span>
                <span class="mig-step-label">${['Détection','Validation','Application'][n-1]}</span>
              </div>`).join('<div class="mig-step-sep"></div>')}
          </div>
        </div>
        <div class="mig-content">${this._buildStepContent(data)}</div>
      </div>`;
  }

  _buildStepContent(data) {
    if (this._step === 1) return this._buildStep1(data);
    if (this._step === 2) return this._buildStep2();
    return this._buildStep3();
  }

  _buildStep1(data) {
    const found = data.legacy_found ?? 0;
    if (!found) return `
      <div class="hse-card">
        <p class="hse-empty">✅ Aucune entité legacy détectée. Migration non nécessaire.</p>
      </div>`;
    return `
      <div class="hse-card">
        <span class="hse-label">${found} entité(s) legacy détectée(s)</span>
        <table class="hse-table"><thead><tr>
          <th>Legacy</th><th>Suggestion V3</th><th>Confiance</th><th>Action</th>
        </tr></thead><tbody>
          ${(data.mappings ?? []).map(m => `
            <tr>
              <td>${this._esc(m.legacy_entity_id)}</td>
              <td><input class="hse-input mig-target-input" data-legacy="${this._esc(m.legacy_entity_id)}"
                value="${this._esc(m.suggested_entity_id)}"></td>
              <td><span class="hse-badge" data-level="${m.confidence==='high'?'ok':m.confidence==='medium'?'warning':'error'}">${m.confidence}</span></td>
              <td><select class="hse-select mig-status-sel" data-legacy="${this._esc(m.legacy_entity_id)}">
                <option value="pending" ${m.status==='pending'?'selected':''}>En attente</option>
                <option value="validated" ${m.status==='validated'?'selected':''}>Validé</option>
                <option value="skipped" ${m.status==='skipped'?'selected':''}>Ignorer</option>
              </select></td>
            </tr>`).join('')}
        </tbody></table>
        <div class="hse-toolbar" style="margin-top:12px">
          <button class="hse-btn mig-next-btn">Suivant →</button>
        </div>
      </div>`;
  }

  _buildStep2() {
    const validated = this._mappings.filter(m => m.status === 'validated');
    return `
      <div class="hse-card">
        <span class="hse-label">Récapitulatif — ${validated.length} mapping(s) validé(s)</span>
        ${!validated.length ? '<p class="hse-empty">Aucun mapping validé. Retournez à l\'étape 1.</p>' : `
        <table class="hse-table"><thead><tr><th>Legacy</th><th>Cible V3</th></tr></thead><tbody>
          ${validated.map(m => `<tr><td>${this._esc(m.legacy_entity_id)}</td><td>${this._esc(m.target_entity_id ?? m.suggested_entity_id)}</td></tr>`).join('')}
        </tbody></table>`}
        <label class="hse-toggle-row" style="margin-top:12px">
          <span>Nettoyer les anciens capteurs après migration</span>
          <input type="checkbox" class="mig-cleanup-toggle" checked>
        </label>
        <div class="hse-toolbar" style="margin-top:12px">
          <button class="hse-btn hse-btn-ghost mig-back-btn">← Retour</button>
          <button class="hse-btn mig-apply-btn" ${!validated.length?'disabled':''}>Appliquer la migration</button>
        </div>
      </div>`;
  }

  _buildStep3() {
    const r = this._result;
    if (!r) return `<div class="hse-card"><p class="hse-empty">En attente du résultat…</p></div>`;
    return `
      <div class="hse-card">
        <span class="hse-label">Migration terminée</span>
        <div class="hse-grid-4" style="margin-top:12px">
          <div class="hse-stat"><span>${r.applied}</span><span class="hse-muted">Appliqués</span></div>
          <div class="hse-stat"><span>${r.cleaned}</span><span class="hse-muted">Nettoyés</span></div>
          <div class="hse-stat"><span>${r.errors?.length ?? 0}</span><span class="hse-muted">Erreurs</span></div>
        </div>
        ${r.errors?.length ? `<ul class="hse-error-list">${r.errors.map(e => `<li>${this._esc(e)}</li>`).join('')}</ul>` : ''}
        <button class="hse-btn mig-restart-btn" style="margin-top:12px">Recommencer</button>
      </div>`;
  }

  _bindEvents() {
    this._bindStepEvents();
  }

  _bindStepEvents() {
    this._root.querySelector('.mig-next-btn')?.addEventListener('click', () => {
      this._collectMappingsFromDOM();
      this._step = 2;
      this._root.querySelector('.mig-content').innerHTML = this._buildStep2();
      this._updateStepper();
      this._bindStepEvents();
    });
    this._root.querySelector('.mig-back-btn')?.addEventListener('click', () => {
      this._step = 1;
      this._root.querySelector('.mig-content').innerHTML = this._buildStep1({ legacy_found: this._mappings.length, mappings: this._mappings });
      this._updateStepper();
      this._bindStepEvents();
    });
    this._root.querySelector('.mig-apply-btn')?.addEventListener('click', () => this._applyMigration());
    this._root.querySelector('.mig-restart-btn')?.addEventListener('click', () => {
      this._step = 1; this._result = null;
      this._buildSkeleton(); this._fetchDetection();
    });
  }

  _collectMappingsFromDOM() {
    this._root.querySelectorAll('.mig-status-sel').forEach(sel => {
      const m = this._mappings.find(m => m.legacy_entity_id === sel.dataset.legacy);
      if (m) m.status = sel.value;
    });
    this._root.querySelectorAll('.mig-target-input').forEach(inp => {
      const m = this._mappings.find(m => m.legacy_entity_id === inp.dataset.legacy);
      if (m) m.target_entity_id = inp.value;
    });
  }

  async _applyMigration() {
    const validated = this._mappings.filter(m => m.status === 'validated');
    const cleanup   = !!this._root.querySelector('.mig-cleanup-toggle')?.checked;
    const payload   = {
      mappings: validated.map(m => ({ legacy_entity_id: m.legacy_entity_id, target_entity_id: m.target_entity_id ?? m.suggested_entity_id })),
      cleanup_legacy: cleanup,
    };
    try {
      const resp = await this._ctx.hseFetch('/api/hse/migration/apply', { method: 'POST', body: JSON.stringify(payload) });
      this._result = await resp.json();
      this._step   = 3;
      this._root.querySelector('.mig-content').innerHTML = this._buildStep3();
      this._updateStepper();
      this._bindStepEvents();
    } catch (e) { this._renderError(e); }
  }

  _updateStepper() {
    this._root.querySelectorAll('.mig-step').forEach(el => {
      const n = parseInt(el.dataset.step);
      el.classList.toggle('active', n === this._step);
      el.classList.toggle('done',   n < this._step);
    });
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur migration : ${this._esc(err.message)}</p>`;
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
}

export default MigrationView;
