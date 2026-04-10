/*
 * HSE V3 — table.js
 * Rendu de tableaux HTML partagé.
 * Migré de V2 (IIFE + window.hse_table) vers ES module.
 * DELTA-016 — 2026-04-10
 *
 * ⚠️  Règle R1 : render_table() ne doit être appelé que depuis _render()
 *      dans mount(). Interdit dans update_hass() et les callbacks de polling.
 */

import { el, clear } from './dom.js';

/**
 * Construit (ou reconstruit) un tableau dans un conteneur.
 *
 * @param {HTMLElement} container  — élément cible (vidé avant construction)
 * @param {Array<{label: string, get_value: function}>} columns
 * @param {Array<object>} rows
 */
export function render_table(container, columns, rows) {
  clear(container);

  const table = el('table', 'hse_table');
  const thead = document.createElement('thead');
  const trh   = document.createElement('tr');

  for (const col of columns) {
    trh.appendChild(el('th', null, col.label));
  }
  thead.appendChild(trh);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of columns) {
      const td    = document.createElement('td');
      const value = col.get_value(row);
      td.textContent = (value === undefined || value === null) ? '—' : String(value);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}
