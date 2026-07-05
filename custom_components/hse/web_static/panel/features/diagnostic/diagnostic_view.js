/**
 * diagnostic_view.js — Onglet Diagnostic HSE V3 (S1)
 *
 * Affiche le score qualité, la liste des capteurs avec leurs issues,
 * les statistiques storage et permet de relancer un diagnostic.
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
.hse-diag { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }
.hse-diag__header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: var(--hse-surface, #fff); border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 16px; padding: 20px;
}
.hse-diag__score { display: flex; align-items: center; gap: 16px; }
.hse-diag__score-ring {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; font-weight: 700;
  border: 4px solid var(--hse-accent, #2563eb);
  color: var(--hse-text, #1f2937);
}
.hse-diag__score-ring[data-status="ok"]      { border-color: var(--hse-success, #15803d); color: var(--hse-success, #15803d); }
.hse-diag__score-ring[data-status="warning"] { border-color: var(--hse-warning, #d97706); color: var(--hse-warning, #d97706); }
.hse-diag__score-ring[data-status="error"]   { border-color: var(--hse-error, #dc2626); color: var(--hse-error, #dc2626); }
.hse-diag__score-label { font-size: 0.9rem; color: var(--hse-text-muted, #6b7280); }
.hse-diag__score-label strong { display: block; font-size: 1rem; color: var(--hse-text, #1f2937); }
.hse-diag__btn {
  min-height: 44px; padding: 10px 18px; border-radius: 12px;
  border: 1px solid var(--hse-border, #e5e7eb); background: var(--hse-surface, #fff);
  color: var(--hse-text, #1f2937); font: inherit; cursor: pointer;
}
.hse-diag__btn:hover { border-color: var(--hse-accent, #2563eb); }
.hse-diag__btn:disabled { opacity: 0.5; cursor: default; }
.hse-diag__stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;
}
.hse-diag__stat {
  background: var(--hse-surface, #fff); border: 1px solid var(--hse-border, #e5e7eb);
  border-radius: 12px; padding: 14px; text-align: center;
}
.hse-diag__stat-num { font-size: 1.5rem; font-weight: 700; color: var(--hse-text, #1f2937); }
.hse-diag__stat-label { font-size: 0.8rem; color: var(--hse-text-muted, #6b7280); margin-top: 4px; }
.hse-diag__section-title { font-size: 1rem; font-weight: 700; color: var(--hse-text, #1f2937); margin-bottom: 8px; }
.hse-diag__table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.hse-diag__table th, .hse-diag__table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--hse-border, #e5e7eb); }
.hse-diag__table th { font-weight: 600; color: var(--hse-text-muted, #6b7280); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.hse-diag__status { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.hse-diag__status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
.hse-diag__status[data-status="ok"]::before      { background: var(--hse-success, #15803d); }
.hse-diag__status[data-status="warning"]::before { background: var(--hse-warning, #d97706); }
.hse-diag__status[data-status="error"]::before   { background: var(--hse-error, #dc2626); }
.hse-diag__issues { color: var(--hse-text-muted, #6b7280); font-size: 0.82rem; }
.hse-diag__empty { text-align: center; padding: 32px; color: var(--hse-text-muted, #6b7280); }
.hse-diag__last-run { font-size: 0.8rem; color: var(--hse-text-muted, #6b7280); }
`;

export class DiagnosticView {
  constructor() {
    this._el = null;
    this._ctx = null;
    this._abort = null;
    this._fetching = false;
    this._data = null;
    this._sig = null;
    this._els = {};
    this._refreshing = false;
    this._timer = null;
  }

  mount(el, ctx) {
    this._el = el;
    this._ctx = ctx;
    this._abort = new AbortController();
    this._injectCSS();
    this._buildDOM();
    this._fetchData();
    // Polling 60s
    this._timer = setInterval(() => this._fetchData(), 60_000);
  }

  update_hass(hass) {
    // R1 — ne reconstruit pas le DOM
  }

  unmount() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._abort) this._abort.abort();
    this._abort = null;
    this._el = null;
    this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-diag-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-diag-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    this._el.innerHTML = `
      <div class="hse-diag">
        <div class="hse-diag__header">
          <div class="hse-diag__score">
            <div class="hse-diag__score-ring" id="hse-diag-ring" data-status="ok">—</div>
            <div class="hse-diag__score-label">
              <strong>Score qualité</strong>
              <span id="hse-diag-last-run">Chargement…</span>
            </div>
          </div>
          <button class="hse-diag__btn" id="hse-diag-refresh" type="button">↻ Relancer le diagnostic</button>
        </div>

        <div class="hse-diag__stats" id="hse-diag-stats">
          <div class="hse-diag__stat"><div class="hse-diag__stat-num" id="hse-diag-total">—</div><div class="hse-diag__stat-label">Total capteurs</div></div>
          <div class="hse-diag__stat"><div class="hse-diag__stat-num" id="hse-diag-selected">—</div><div class="hse-diag__stat-label">Actifs</div></div>
          <div class="hse-diag__stat"><div class="hse-diag__stat-num" id="hse-diag-ignored">—</div><div class="hse-diag__stat-label">Ignorés</div></div>
          <div class="hse-diag__stat"><div class="hse-diag__stat-num" id="hse-diag-pending">—</div><div class="hse-diag__stat-label">En attente</div></div>
        </div>

        <div>
          <div class="hse-diag__section-title">Capteurs supervisés</div>
          <div id="hse-diag-body"><div class="hse-skeleton"></div></div>
        </div>
      </div>
    `;

    this._els = {
      ring: this._el.querySelector('#hse-diag-ring'),
      lastRun: this._el.querySelector('#hse-diag-last-run'),
      refresh: this._el.querySelector('#hse-diag-refresh'),
      total: this._el.querySelector('#hse-diag-total'),
      selected: this._el.querySelector('#hse-diag-selected'),
      ignored: this._el.querySelector('#hse-diag-ignored'),
      pending: this._el.querySelector('#hse-diag-pending'),
      body: this._el.querySelector('#hse-diag-body'),
    };

    this._els.refresh.addEventListener('click', () => this._triggerRefresh());
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const r = await this._ctx.hseFetch('/api/hse/diagnostic', { signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const sig = JSON.stringify(data);
      if (sig === this._sig) return;
      this._sig = sig;
      this._data = data;
      this._render(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      this._els.body.innerHTML = `<div class="hse-error">Erreur chargement diagnostic — ${escHtml(e.message)}</div>`;
    } finally {
      this._fetching = false;
    }
  }

  _render(data) {
    const score = data.score_pct ?? 0;
    const status = score >= 90 ? 'ok' : score >= 60 ? 'warning' : 'error';
    this._els.ring.textContent = `${score}%`;
    this._els.ring.dataset.status = status;

    const lastRun = data.last_run_at;
    this._els.lastRun.textContent = lastRun ? `Dernier diagnostic : ${new Date(lastRun).toLocaleString('fr-FR')}` : 'Jamais';

    const stats = data.storage_stats || {};
    this._els.total.textContent = stats.total ?? '—';
    this._els.selected.textContent = stats.selected ?? '—';
    this._els.ignored.textContent = stats.ignored ?? '—';
    this._els.pending.textContent = stats.pending ?? '—';

    const sensors = data.sensors || [];
    if (!sensors.length) {
      this._els.body.innerHTML = '<div class="hse-diag__empty">Aucun capteur dans le catalogue. Allez dans l\'onglet Détection pour scanner.</div>';
      return;
    }

    // R1 — construire le tableau une seule fois
    if (!this._els.table) {
      this._els.body.innerHTML = `
        <table class="hse-diag__table">
          <thead>
            <tr><th>Capteur</th><th>Statut</th><th>Issues</th></tr>
          </thead>
          <tbody id="hse-diag-tbody"></tbody>
        </table>
      `;
      this._els.tbody = this._el.querySelector('#hse-diag-tbody');
      // Créer les lignes une seule fois
      for (const s of sensors) {
        const tr = document.createElement('tr');
        tr.dataset.id = s.entity_id;
        tr.innerHTML = `
          <td class="hse-diag__name"></td>
          <td><span class="hse-diag__status" data-status=""></span></td>
          <td class="hse-diag__issues"></td>
        `;
        this._els.tbody.appendChild(tr);
      }
    }

    // R1 — mise à jour via textContent
    for (const s of sensors) {
      const row = this._els.tbody.querySelector(`tr[data-id="${escAttr(s.entity_id)}"]`);
      if (!row) continue;
      row.querySelector('.hse-diag__name').textContent = s.name || s.entity_id;
      const statusEl = row.querySelector('.hse-diag__status');
      statusEl.dataset.status = s.status || 'ok';
      statusEl.textContent = s.status === 'ok' ? 'OK' : s.status === 'warning' ? 'Attention' : 'Erreur';
      row.querySelector('.hse-diag__issues').textContent = (s.issues || []).join(', ') || '—';
    }
  }

  async _triggerRefresh() {
    if (this._refreshing) return;
    this._refreshing = true;
    const btn = this._els.refresh;
    btn.disabled = true;
    btn.textContent = '↻ Diagnostic en cours…';
    try {
      const r = await this._ctx.hseFetch('/api/hse/diagnostic', { method: 'POST', signal: this._abort?.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Le diagnostic tourne en async — on attend 2s puis recharge
      setTimeout(() => {
        this._sig = null;
        this._fetchData();
      }, 2000);
      btn.textContent = '✓ Diagnostic lancé';
      setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Relancer le diagnostic'; }, 3000);
    } catch (e) {
      if (e.name === 'AbortError') { this._refreshing = false; return; }
      if (e.status === 409) {
        btn.textContent = '⚠ Diagnostic déjà en cours';
        setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Relancer le diagnostic'; }, 3000);
      } else {
        btn.textContent = '⚠ Erreur';
        setTimeout(() => { btn.disabled = false; btn.textContent = '↻ Relancer le diagnostic'; }, 3000);
      }
    } finally {
      this._refreshing = false;
    }
  }
}

export default DiagnosticView;
