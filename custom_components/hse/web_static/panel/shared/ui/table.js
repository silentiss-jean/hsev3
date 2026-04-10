/*
 * HSE V3 — shared/ui/table.js
 * Rendu de tableaux HTML génériques pour les views HSE.
 *
 * V3 : ES module — import nommé depuis dom.js
 * Contrat :
 *   render_table(container, columns, rows) → void
 *
 *   columns : Array<{ label: string, get_value: (row) => any }>
 *   rows    : Array<any>   (objets provenant des réponses API)
 *
 * Les valeurs null/undefined sont affichées comme « — ».
 */

import { el, clear } from './dom.js';

/**
 * Rend un tableau HSE dans un conteneur DOM.
 * @param {HTMLElement} container
 * @param {Array<{label: string, get_value: function}>} columns
 * @param {Array<any>} rows
 */
export function render_table(container, columns, rows) {
  clear(container);

  const table = el('table', 'hse_table');

  // Thead
  const thead = document.createElement('thead');
  const trh   = document.createElement('tr');
  for (const col of columns) {
    trh.appendChild(el('th', null, col.label));
  }
  thead.appendChild(trh);

  // Tbody
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of columns) {
      const td  = document.createElement('td');
      const val = col.get_value(row);
      td.textContent = (val === undefined || val === null) ? '\u2014' : String(val);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}
