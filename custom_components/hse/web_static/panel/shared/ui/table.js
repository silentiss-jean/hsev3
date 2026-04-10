/**
 * table.js — Composant tableau partagé HSE V3
 *
 * Fonctionnalités :
 *   - Rendu initial via renderTable() — construit le DOM une seule fois
 *   - Mise à jour ciblée via updateRows() — ZÉRO rebuild complet (fix bug V2)
 *   - Tri côté client (colonnes numériques et texte)
 *   - État vide designé
 *   - Support pagination légère
 *   - Zéro localStorage (R4)
 *
 * Usage :
 *   import { HseTable } from '../shared/ui/table.js';
 *
 *   const table = new HseTable(container, columns, options);
 *   table.setRows(data.items);
 *   // Plus tard (polling) :
 *   table.updateRows(newItems);
 *
 * Colonnes :
 *   { key, label, numeric?, sortable?, format?, width?, align? }
 */

import { el, setText, esc, clearChildren, on } from './dom.js';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SORT_ASC  = 'asc';
const SORT_DESC = 'desc';

// ─── Classe principale ───────────────────────────────────────────────────────

export class HseTable {
  /**
   * @param {Element}  container — Nœud DOM racine où injecter le tableau
   * @param {Column[]} columns   — Définition des colonnes
   * @param {object}   opts      — Options
   *   - emptyText     {string}  — Texte état vide (défaut : 'Aucune donnée')
   *   - rowKey        {string}  — Propriété utilisée comme clé de ligne (défaut : index)
   *   - onRowClick    {Function(row, event)} — Callback clic sur ligne
   *   - stickyHeader  {boolean} — Entête collant (défaut : true)
   *   - pageSize      {number}  — Taille de page (0 = pas de pagination)
   */
  constructor(container, columns, opts = {}) {
    this._container   = container;
    this._columns     = columns;
    this._opts        = {
      emptyText:    opts.emptyText    ?? 'Aucune donnée',
      rowKey:       opts.rowKey       ?? null,
      onRowClick:   opts.onRowClick   ?? null,
      stickyHeader: opts.stickyHeader ?? true,
      pageSize:     opts.pageSize     ?? 0,
    };
    this._rows        = [];
    this._sortKey     = null;
    this._sortDir     = SORT_ASC;
    this._page        = 0;
    this._cleanups    = [];
    this._built       = false;

    // Nœuds DOM (null jusqu'à _build)
    this._tableEl     = null;
    this._theadEl     = null;
    this._tbodyEl     = null;
    this._footerEl    = null;
    this._emptyEl     = null;
  }

  // ─── API publique ───────────────────────────────────────────────────────────

  /**
   * Initialise le tableau avec des données (construction DOM complète — 1 seule fois).
   */
  setRows(rows) {
    this._rows = rows ?? [];
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._applySort();
    this._renderRows();
    this._renderPager();
  }

  /**
   * Met à jour les lignes existantes sans reconstruire le tableau.
   * Si le nombre de lignes change → rebuild du corps uniquement (tbody).
   */
  updateRows(rows) {
    const newRows = rows ?? [];
    const prevLen = this._rows.length;
    this._rows = newRows;
    this._applySort();

    const visibleRows = this._getPageRows();
    const tbodyRows   = Array.from(this._tbodyEl.querySelectorAll('tr[data-row-idx]'));

    if (tbodyRows.length !== visibleRows.length) {
      // Nombre différent → rebuild tbody uniquement (autorisé : action/changement de période)
      this._renderRows();
      this._renderPager();
      return;
    }
    // Même nombre → update textContent uniquement (zéro reflow tableau)
    visibleRows.forEach((row, i) => {
      const tr = tbodyRows[i];
      if (!tr) return;
      this._columns.forEach(col => {
        const td = tr.querySelector(`[data-col="${col.key}"]`);
        if (td) setText(td, this._formatCell(col, row));
      });
    });
    this._updateEmpty();
  }

  /**
   * Vide le tableau et remet à zéro.
   */
  clear() {
    this._rows = [];
    if (this._tbodyEl) clearChildren(this._tbodyEl);
    this._page = 0;
    this._updateEmpty();
    this._renderPager();
  }

  /**
   * Détruit le tableau et nettoie les listeners.
   */
  destroy() {
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
    clearChildren(this._container);
    this._built = false;
  }

  // ─── Construction DOM (1 fois) ──────────────────────────────────────────────

  _build() {
    clearChildren(this._container);

    const wrapper = el('div', { cls: 'hse-table-wrapper' });

    // Tableau
    this._tableEl = el('table', {
      cls: 'hse-table',
      attrs: { role: 'grid' },
    });

    // En-tête
    this._theadEl = el('thead');
    const headerRow = el('tr');
    this._columns.forEach(col => {
      const th = el('th', {
        cls: [
          col.numeric ? 'tabnum' : '',
          col.sortable !== false ? 'sortable' : '',
          col.align ? `align-${col.align}` : '',
        ],
        attrs: {
          'data-col': col.key,
          'aria-sort': 'none',
          ...(col.width ? { style: `width:${col.width}` } : {}),
        },
        html: `${esc(col.label)}<span class="hse-sort-icon" aria-hidden="true"></span>`,
      });
      if (col.sortable !== false) {
        this._cleanups.push(on(th, 'click', () => this._toggleSort(col.key)));
      }
      headerRow.appendChild(th);
    });
    this._theadEl.appendChild(headerRow);
    this._tableEl.appendChild(this._theadEl);

    // Corps
    this._tbodyEl = el('tbody');
    this._tableEl.appendChild(this._tbodyEl);

    wrapper.appendChild(this._tableEl);

    // État vide
    this._emptyEl = el('div', {
      cls: 'hse-table-empty',
      attrs: { hidden: '' },
    });
    this._emptyEl.appendChild(el('div', { cls: 'hse-table-empty-icon', html: _emptyIconSVG() }));
    this._emptyEl.appendChild(el('p', { text: this._opts.emptyText }));
    wrapper.appendChild(this._emptyEl);

    // Pagination
    if (this._opts.pageSize > 0) {
      this._footerEl = el('div', { cls: 'hse-table-footer' });
      this._buildPager();
      wrapper.appendChild(this._footerEl);
    }

    this._container.appendChild(wrapper);

    // Sticky header
    if (this._opts.stickyHeader) {
      this._theadEl.classList.add('sticky');
    }
  }

  // ─── Rendu des lignes ───────────────────────────────────────────────────────

  _renderRows() {
    clearChildren(this._tbodyEl);
    const visibleRows = this._getPageRows();

    visibleRows.forEach((row, i) => {
      const tr = el('tr', {
        attrs: {
          'data-row-idx': i,
          ...(this._opts.rowKey ? { 'data-row-key': row[this._opts.rowKey] } : {}),
          tabindex: this._opts.onRowClick ? '0' : undefined,
          role: this._opts.onRowClick ? 'button' : undefined,
        },
      });
      if (this._opts.onRowClick) {
        this._cleanups.push(on(tr, 'click', (e) => this._opts.onRowClick(row, e)));
        this._cleanups.push(on(tr, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') this._opts.onRowClick(row, e);
        }));
      }
      this._columns.forEach(col => {
        const td = el('td', {
          cls: [col.numeric ? 'tabnum' : '', col.align ? `align-${col.align}` : ''],
          attrs: { 'data-col': col.key },
          text: this._formatCell(col, row),
        });
        tr.appendChild(td);
      });
      this._tbodyEl.appendChild(tr);
    });

    this._updateEmpty();
  }

  _formatCell(col, row) {
    const val = row[col.key];
    if (col.format) return col.format(val, row);
    return val === null || val === undefined ? '—' : String(val);
  }

  _updateEmpty() {
    if (!this._emptyEl) return;
    const isEmpty = this._rows.length === 0;
    this._emptyEl.hidden = !isEmpty;
    this._tableEl.hidden = isEmpty;
  }

  // ─── Tri ────────────────────────────────────────────────────────────────────

  _toggleSort(key) {
    if (this._sortKey === key) {
      this._sortDir = this._sortDir === SORT_ASC ? SORT_DESC : SORT_ASC;
    } else {
      this._sortKey = key;
      this._sortDir = SORT_ASC;
    }
    this._page = 0;
    this._applySort();
    this._renderRows();
    this._renderPager();
    this._updateSortIcons();
  }

  _applySort() {
    if (!this._sortKey) return;
    const col = this._columns.find(c => c.key === this._sortKey);
    this._rows = [...this._rows].sort((a, b) => {
      let va = a[this._sortKey];
      let vb = b[this._sortKey];
      if (col?.numeric) {
        va = Number(va ?? 0);
        vb = Number(vb ?? 0);
      } else {
        va = String(va ?? '').toLowerCase();
        vb = String(vb ?? '').toLowerCase();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this._sortDir === SORT_ASC ? cmp : -cmp;
    });
  }

  _updateSortIcons() {
    if (!this._theadEl) return;
    this._theadEl.querySelectorAll('th[data-col]').forEach(th => {
      const key = th.dataset.col;
      const icon = th.querySelector('.hse-sort-icon');
      if (key === this._sortKey) {
        th.setAttribute('aria-sort', this._sortDir === SORT_ASC ? 'ascending' : 'descending');
        if (icon) icon.textContent = this._sortDir === SORT_ASC ? ' ↑' : ' ↓';
      } else {
        th.setAttribute('aria-sort', 'none');
        if (icon) icon.textContent = '';
      }
    });
  }

  // ─── Pagination ─────────────────────────────────────────────────────────────

  _getPageRows() {
    if (!this._opts.pageSize) return this._rows;
    const start = this._page * this._opts.pageSize;
    return this._rows.slice(start, start + this._opts.pageSize);
  }

  _buildPager() {
    if (!this._footerEl) return;
    clearChildren(this._footerEl);
    const info   = el('span', { cls: 'hse-pager-info' });
    const prev   = el('button', { cls: 'hse-btn hse-btn-ghost hse-pager-prev', text: '←', attrs: { 'aria-label': 'Page précédente' } });
    const next   = el('button', { cls: 'hse-btn hse-btn-ghost hse-pager-next', text: '→', attrs: { 'aria-label': 'Page suivante' } });
    this._cleanups.push(on(prev, 'click', () => { if (this._page > 0) { this._page--; this._renderRows(); this._renderPager(); } }));
    this._cleanups.push(on(next, 'click', () => {
      const maxPage = Math.ceil(this._rows.length / this._opts.pageSize) - 1;
      if (this._page < maxPage) { this._page++; this._renderRows(); this._renderPager(); }
    }));
    this._footerEl.appendChild(prev);
    this._footerEl.appendChild(info);
    this._footerEl.appendChild(next);
  }

  _renderPager() {
    if (!this._footerEl || !this._opts.pageSize) return;
    const total   = this._rows.length;
    const pages   = Math.max(1, Math.ceil(total / this._opts.pageSize));
    const start   = this._page * this._opts.pageSize + 1;
    const end     = Math.min(start + this._opts.pageSize - 1, total);
    const info    = this._footerEl.querySelector('.hse-pager-info');
    const prev    = this._footerEl.querySelector('.hse-pager-prev');
    const next    = this._footerEl.querySelector('.hse-pager-next');
    if (info) setText(info, total > 0 ? `${start}–${end} / ${total}` : '0');
    if (prev) prev.disabled = this._page === 0;
    if (next) next.disabled = this._page >= pages - 1;
  }
}

// ─── Icône état vide (inline SVG, pas de dépendance externe) ─────────────────

function _emptyIconSVG() {
  return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">
    <path d="M3 6h18M3 12h18M3 18h18"/>
  </svg>`;
}

// ─── Export helper fonctionnel (API courte) ───────────────────────────────────

/**
 * Crée et initialise un tableau en une ligne.
 * @returns {HseTable}
 *
 * @example
 *   const table = renderTable(container, [
 *     { key: 'name',   label: 'Appareil' },
 *     { key: 'kwh',    label: 'kWh',  numeric: true },
 *     { key: 'eur',    label: '€ TTC', numeric: true, format: v => `${v} €` },
 *   ], data.items);
 */
export function renderTable(container, columns, rows, opts = {}) {
  const table = new HseTable(container, columns, opts);
  table.setRows(rows);
  return table;
}
