/**
 * migration_view.js — Onglet Migration HSE V3 (S2)
 *
 * Wizard 3 étapes pour migrer les capteurs legacy V1/V2 vers V3.
 *   Étape 1 — Détection : résumé des entités legacy trouvées
 *   Étape 2 — Validation : tableau des mappings éditables
 *   Étape 3 — Rapport : compteurs succès/erreur/ignoré + option nettoyage
 *
 * Règles R1–R5 :
 *   R1 — mount() construit le DOM une fois, update_hass() ne reconstruit jamais
 *   R2 — flag _fetching sur chaque fetch
 *   R3 — JSON.stringify signature avant _render()
 *   R4 — zéro localStorage (état en mémoire dans l'instance)
 *   R5 — skeleton systématique
 */
import { escHtml, escAttr } from '../../shared/hse_esc.js';

const CSS = `
.hse-mig { display: grid; gap: 16px; max-width: 880px; margin: 0 auto; }
.hse-mig__steps { display: flex; gap: 0; border-bottom: 2px solid var(--hse-border, #e5e7eb); }
.hse-mig__step {
  flex: 1; padding: 12px 16px; text-align: center; font-size: 0.875rem;
  color: var(--hse-text-muted, #6b7280); border-bottom: 2px solid transparent;
  margin-bottom: -2px; cursor: default;
}
.hse-mig__step[data-active="true"] {
  color: var(--hse-accent, #2563eb); border-bottom-color: var(--hse-accent, #2563eb); font-weight: 600;
}
.hse-mig__step[data-done="true"] { color: var(--hse-success, #15803d); }
.hse-mig__card {
  background: var(--hse-surface, #fff); border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 16px; padding: 24px;
}
.hse-mig__title { font-size: 1.125rem; font-weight: 700; margin-bottom: 8px; color: var(--hse-text, #1f2937); }
.hse-mig__subtitle { font-size: 0.92rem; color: var(--hse-text-muted, #6b7280); margin-bottom: 20px; }
.hse-mig__summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
.hse-mig__stat { text-align: center; padding: 14px; border-radius: 12px; background: var(--hse-bg-secondary, #f3f4f6); }
.hse-mig__stat-num { font-size: 1.5rem; font-weight: 700; color: var(--hse-text, #1f2937); }
.hse-mig__stat-label { font-size: 0.8rem; color: var(--hse-text-muted, #6b7280); margin-top: 4px; }
.hse-mig__table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 16px; }
.hse-mig__table th, .hse-mig__table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--hse-border, #e5e7eb); }
.hse-mig__table th { font-weight: 600; color: var(--hse-text-muted, #6b7280); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.hse-mig__table input[type="text"], .hse-mig__table select {
  width: 100%; min-height: 36px; border-radius: 8px; border: 1px solid var(--hse-border, #e5e7eb);
  padding: 6px 10px; font: inherit; background: var(--hse-bg, #fff); color: var(--hse-text, #1f2937);
}
.hse-mig__actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
.hse-mig__btn {
  min-height: 44px; padding: 10px 18px; border-radius: 12px; font: inherit; cursor: pointer;
  border: 1px solid var(--hse-border, #e5e7eb); background: var(--hse-surface, #fff); color: var(--hse-text, #1f2937);
}
.hse-mig__btn:hover { border-color: var(--hse-accent, #2563eb); }
.hse-mig__btn:disabled { opacity: 0.5; cursor: default; }
.hse-mig__btn--primary { background: var(--hse-accent, #2563eb); color: var(--hse-on-accent, #fff); border-color: var(--hse-accent, #2563eb); }
.hse-mig__btn--danger { background: var(--hse-error, #dc2626); color: #fff; border-color: var(--hse-error, #dc2626); }
.hse-mig__empty { text-align: center; padding: 32px; color: var(--hse-text-muted, #6b7280); }
.hse-mig__report { display: grid; gap: 12px; }
.hse-mig__report-row { display: flex; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: var(--hse-bg-secondary, #f3f4f6); }
.hse-mig__report-row strong { color: var(--hse-text, #1f2937); }
.hse-mig__errors { font-size: 0.82rem; color: var(--hse-error, #dc2626); margin-top: 8px; }
.hse-mig__toggle { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; background: var(--hse-bg-secondary, #f3f4f6); margin-top: 16px; }
.hse-mig__toggle input { width: 18px; height: 18px; }
.hse-mig__conf { color: var(--hse-warning, #d97706); font-size: 0.85rem; margin-top: 8px; }
`;

export class MigrationView {
  constructor() {
    this._el = null;
    this._ctx = null;
    this._abort = null;
    this._fetching = false;
    this._applying = false;
    this._step = 1;
    this._mappings = [];
    this._report = null;
    this._els = {};
  }

  mount(el, ctx) {
    this._el = el;
    this._ctx = ctx;
    this._abort = new AbortController();
    this._injectCSS();
    this._buildDOM();
    this._fetchDetection();
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
    if (document.getElementById('hse-mig-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-mig-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    this._el.innerHTML = `
      <div class="hse-mig">
        <div class="hse-mig__steps">
          <div class="hse-mig__step" id="hse-mig-step1" data-active="true">1 — Détection</div>
          <div class="hse-mig__step" id="hse-mig-step2">2 — Validation</div>
          <div class="hse-mig__step" id="hse-mig-step3">3 — Rapport</div>
        </div>
        <div class="hse-mig__card" id="hse-mig-card">
          <div class="hse-skeleton"></div>
        </div>
      </div>
    `;
    this._els = {
      step1: this._el.querySelector('#hse-mig-step1'),
      step2: this._el.querySelector('#hse-mig-step2'),
      step3: this._el.querySelector('#hse-mig-step3'),
      card: this._el.querySelector('#hse-mig-card'),
    };
  }

  _setStep(n) {
    this._step = n;
    this._els.step1.dataset.active = n === 1 ? 'true' : 'false';
    this._els.step2.dataset.active = n === 2 ? 'true' : 'false';
    this._els.step3.dataset.active = n === 3 ? 'true' : 'false';
    this._els.step1.dataset.done = n > 1 ? 'true' : 'false';
    this._els.step2.dataset.done = n > 2 ? 'true' : 'false';
  }

  async _fetchDetection() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const r = await this._ctx.hseFetch('/api/hse/migration/export', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      this._mappings = (data.mappings || []).map(m => ({
        legacy_entity_id: m.legacy_entity_id || '',
        suggested_entity_id: m.suggested_entity_id || m.legacy_entity_id || '',
        target_entity_id: m.suggested_entity_id || m.legacy_entity_id || '',
        confidence: m.confidence || 'low',
        action: m.confidence === 'high' ? 'migrate' : 'skip',
      }));
      this._renderStep1(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._els.card.innerHTML = `<div class="hse-error">Erreur chargement migration — ${escHtml(e.message)}</div>`;
    } finally {
      this._fetching = false;
    }
  }

  _renderStep1(data) {
    const count = data.legacy_found || this._mappings.length;
    this._els.card.innerHTML = `
      <div class="hse-mig__title">Détection des capteurs legacy</div>
      <div class="hse-mig__subtitle">Analyse de votre installation pour trouver les capteurs V1/V2 à migrer vers V3.</div>
      ${count === 0 ? `
        <div class="hse-mig__empty">
          <p><strong>Aucun capteur legacy détecté.</strong></p>
          <p>Votre installation est déjà à jour — aucune migration nécessaire.</p>
        </div>
      ` : `
        <div class="hse-mig__summary">
          <div class="hse-mig__stat"><div class="hse-mig__stat-num">${count}</div><div class="hse-mig__stat-label">Capteurs legacy</div></div>
          <div class="hse-mig__stat"><div class="hse-mig__stat-num">${this._mappings.filter(m => m.confidence === 'high').length}</div><div class="hse-mig__stat-label">Confiance haute</div></div>
          <div class="hse-mig__stat"><div class="hse-mig__stat-num">${this._mappings.filter(m => m.confidence !== 'high').length}</div><div class="hse-mig__stat-label">Confiance basse</div></div>
        </div>
        <div class="hse-mig__actions">
          <button class="hse-mig__btn hse-mig__btn--primary" id="hse-mig-next" type="button">Étape suivante →</button>
        </div>
      `}
    `;
    if (count > 0) {
      this._el.querySelector('#hse-mig-next').addEventListener('click', () => this._renderStep2());
    }
  }

  _renderStep2() {
    this._setStep(2);
    const rows = this._mappings.map((m, i) => `
      <tr data-idx="${i}">
        <td><code>${escHtml(m.legacy_entity_id)}</code></td>
        <td>
          <input type="text" data-field="target" value="${escAttr(m.target_entity_id)}" />
        </td>
        <td>
          <select data-field="action">
            <option value="migrate" ${m.action === 'migrate' ? 'selected' : ''}>Migrer</option>
            <option value="skip" ${m.action === 'skip' ? 'selected' : ''}>Ignorer</option>
          </select>
        </td>
        <td>${m.confidence === 'high' ? '✓ Haute' : '⚠ Basse'}</td>
      </tr>
    `).join('');

    this._els.card.innerHTML = `
      <div class="hse-mig__title">Validation des mappings</div>
      <div class="hse-mig__subtitle">Vérifiez chaque mapping. Modifiez l'ID cible si nécessaire, puis choisissez Migrer ou Ignorer.</div>
      <table class="hse-mig__table">
        <thead>
          <tr><th>Capteur legacy</th><th>ID cible V3</th><th>Action</th><th>Confiance</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="hse-mig__actions">
        <button class="hse-mig__btn" id="hse-mig-back" type="button">← Retour</button>
        <button class="hse-mig__btn hse-mig__btn--primary" id="hse-mig-apply" type="button">Appliquer la migration</button>
      </div>
    `;

    // Collecter les modifications
    this._els.card.querySelectorAll('tr[data-idx]').forEach(tr => {
      const idx = parseInt(tr.dataset.idx, 10);
      const targetInput = tr.querySelector('[data-field="target"]');
      const actionSelect = tr.querySelector('[data-field="action"]');
      targetInput.addEventListener('input', () => { this._mappings[idx].target_entity_id = targetInput.value; });
      actionSelect.addEventListener('change', () => { this._mappings[idx].action = actionSelect.value; });
    });

    this._el.querySelector('#hse-mig-back').addEventListener('click', () => {
      this._setStep(1);
      this._renderStep1({ legacy_found: this._mappings.length });
    });
    this._el.querySelector('#hse-mig-apply').addEventListener('click', () => this._applyMigration(false));
  }

  async _applyMigration(cleanupLegacy) {
    if (this._applying) return;
    this._applying = true;
    const toMigrate = this._mappings.filter(m => m.action === 'migrate').map(m => ({
      legacy_entity_id: m.legacy_entity_id,
      target_entity_id: m.target_entity_id,
    }));
    const toSkip = this._mappings.filter(m => m.action === 'skip').length;

    this._els.card.innerHTML = `
      <div class="hse-mig__title">Migration en cours…</div>
      <div class="hse-mig__subtitle">Application des ${toMigrate.length} mappings. Veuillez patienter.</div>
      <div class="hse-skeleton"></div>
    `;

    try {
      const r = await this._ctx.hseFetch('/api/hse/migration/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: toMigrate, cleanup_legacy: cleanupLegacy }),
        signal: this._abort?.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      this._report = { ...data, skipped: toSkip, total: this._mappings.length };
      this._renderStep3();
    } catch (e) {
      if (e.name === 'AbortError') { this._applying = false; return; }
      this._els.card.innerHTML = `<div class="hse-error">Erreur migration — ${escHtml(e.message)}</div>`;
    } finally {
      this._applying = false;
    }
  }

  _renderStep3() {
    this._setStep(3);
    const r = this._report || {};
    const errors = r.errors || [];
    this._els.card.innerHTML = `
      <div class="hse-mig__title">Rapport de migration</div>
      <div class="hse-mig__subtitle">La migration est terminée. Voici le récapitulatif.</div>
      <div class="hse-mig__report">
        <div class="hse-mig__report-row"><span>Total traité</span><strong>${r.total || 0}</strong></div>
        <div class="hse-mig__report-row"><span>Migrés avec succès</span><strong style="color:var(--hse-success,#15803d)">${r.applied || 0}</strong></div>
        <div class="hse-mig__report-row"><span>Ignorés</span><strong>${r.skipped || 0}</strong></div>
        ${r.cleaned ? `<div class="hse-mig__report-row"><span>Nettoyés (legacy supprimés)</span><strong>${r.cleaned}</strong></div>` : ''}
        <div class="hse-mig__report-row"><span>Erreurs</span><strong style="color:var(--hse-error,#dc2626)">${errors.length}</strong></div>
      </div>
      ${errors.length ? `<div class="hse-mig__errors"><strong>Détail des erreurs :</strong><br>${escHtml(errors.join('<br>'))}</div>` : ''}
      <div class="hse-mig__toggle">
        <input type="checkbox" id="hse-mig-cleanup" />
        <label for="hse-mig-cleanup">Supprimer les capteurs legacy du catalogue HSE (nettoyage)</label>
      </div>
      <div class="hse-mig__conf" id="hse-mig-conf" style="display:none;">⚠ Cette action est irréversible. Les entrées legacy seront retirées du catalogue.</div>
      <div class="hse-mig__actions">
        <button class="hse-mig__btn" id="hse-mig-restart" type="button">↻ Recommencer</button>
        <button class="hse-mig__btn hse-mig__btn--danger" id="hse-mig-cleanup-btn" type="button" disabled>Nettoyer les legacy</button>
      </div>
    `;

    const cleanupToggle = this._el.querySelector('#hse-mig-cleanup');
    const cleanupBtn = this._el.querySelector('#hse-mig-cleanup-btn');
    const confMsg = this._el.querySelector('#hse-mig-conf');
    cleanupToggle.addEventListener('change', () => {
      cleanupBtn.disabled = !cleanupToggle.checked;
      confMsg.style.display = cleanupToggle.checked ? 'block' : 'none';
    });
    cleanupBtn.addEventListener('click', () => this._applyMigration(true));
    this._el.querySelector('#hse-mig-restart').addEventListener('click', () => {
      this._setStep(1);
      this._mappings = [];
      this._report = null;
      this._els.card.innerHTML = '<div class="hse-skeleton"></div>';
      this._fetchDetection();
    });
  }
}

export default MigrationView;
