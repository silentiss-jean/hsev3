/*
 * HSE V3 — dom.js
 * Utilitaires DOM partagés.
 * Migré de V2 (IIFE + window.hse_dom) vers ES module.
 * DELTA-016 — 2026-04-10
 */

/**
 * Crée un élément HTML avec une classe et un texte optionnels.
 * @param {string} tag
 * @param {string|null} className
 * @param {string|number|null} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

/**
 * Vide un nœud DOM de tous ses enfants.
 * @param {HTMLElement} node
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
