/*
 * HSE V3 — shared/ui/dom.js
 * Utilitaires DOM légers consommés par tous les *_view.js
 *
 * V3 : ES module (export nommé) — suppression window.hse_dom (R4)
 * Contrat :
 *   el(tag, className?, text?)  → HTMLElement
 *   clear(node)                  → void
 */

/**
 * Crée un élément HTML avec une classe et un texte optionnels.
 * @param {string} tag
 * @param {string|null} [className]
 * @param {string|number|null} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className = null, text = undefined) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

/**
 * Vide le contenu d'un nœud DOM.
 * @param {HTMLElement} node
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
