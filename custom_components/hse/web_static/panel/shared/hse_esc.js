/**
 * hse_esc.js — Helper d'échappement HTML partagé (R4-safe, pas de localStorage)
 *
 * Évite les injections XSS via innerHTML en échappant les 5 caractères dangereux.
 * Utilisé par tous les onglets pour injecter des données utilisateur ou des
 * messages d'erreur dans le DOM via innerHTML.
 *
 * Usage :
 *   import { escHtml, escAttr } from '../../shared/hse_esc.js';
 *   el.innerHTML = `<div class="err">${escHtml(err.message)}</div>`;
 *   el.innerHTML = `<tr data-eid="${escAttr(item.entity_id)}">`;
 */

/**
 * Échappe une chaîne pour insertion dans innerHTML (texte).
 * Échappe : & < > " '
 * @param {*} str
 * @returns {string}
 */
export function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

/**
 * Échappe une chaîne pour insertion dans un attribut HTML entre guillemets doubles.
 * Échappe : & < > "
 * @param {*} str
 * @returns {string}
 */
export function escAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
