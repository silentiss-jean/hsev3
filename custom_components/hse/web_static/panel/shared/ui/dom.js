/**
 * dom.js — Utilitaires DOM partagés HSE V3
 *
 * Règles :
 *   - Zéro localStorage (R4)
 *   - Zéro innerHTML complet sur des nœuds existants (règle supplémentaire V3)
 *   - Zéro framework — vanilla JS uniquement
 *
 * Usage :
 *   import { el, setText, setAttr, show, hide, on, clearChildren, esc } from '../shared/ui/dom.js';
 */

// ─── Création / sélection ────────────────────────────────────────────────────

/**
 * Crée un élément HTML avec classes, attributs et contenu texte optionnels.
 * @param {string} tag   — Nom de la balise (ex: 'div', 'span', 'button')
 * @param {object} opts  — { cls, attrs, text, html (déconseillé), children }
 * @returns {HTMLElement}
 *
 * @example
 *   const card = el('div', { cls: 'hse-card', attrs: { 'data-id': '42' }, text: 'Hello' });
 */
export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.cls) {
    const classes = Array.isArray(opts.cls) ? opts.cls : opts.cls.split(' ');
    node.classList.add(...classes.filter(Boolean));
  }
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
  }
  if (opts.text !== undefined) node.textContent = opts.text;
  // opts.html : usage restreint aux contenus statiques (pas de données utilisateur)
  if (opts.html !== undefined) node.innerHTML = opts.html;
  if (opts.children) {
    for (const child of opts.children) {
      if (child) node.appendChild(child);
    }
  }
  return node;
}

/**
 * Raccourci querySelector avec assertion (throw si manquant en dev).
 * @param {Element|ShadowRoot|Document} root
 * @param {string} selector
 * @param {boolean} [required=false] — si true, throw si non trouvé
 */
export function q(root, selector, required = false) {
  const found = root.querySelector(selector);
  if (required && !found) {
    console.warn(`[hse/dom] Sélecteur introuvable : "${selector}"`);
  }
  return found;
}

/**
 * Raccourci querySelectorAll → Array.
 */
export function qa(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

// ─── Mutation ciblée (R1 — jamais de rebuild complet) ───────────────────────

/**
 * Met à jour le textContent d'un élément si la valeur a changé.
 * No-op si l'élément est null ou si la valeur est identique (évite les reflows inutiles).
 */
export function setText(node, value) {
  if (!node) return;
  const s = String(value ?? '');
  if (node.textContent !== s) node.textContent = s;
}

/**
 * Met à jour un attribut d'un élément.
 */
export function setAttr(node, attr, value) {
  if (!node) return;
  const s = String(value ?? '');
  if (node.getAttribute(attr) !== s) node.setAttribute(attr, s);
}

/**
 * Met à jour une propriété CSS custom (--var) sur un élément.
 */
export function setCssVar(node, varName, value) {
  if (!node) return;
  node.style.setProperty(varName, value);
}

/**
 * Ajoute ou retire une classe CSS conditionnellement.
 */
export function toggleClass(node, cls, condition) {
  if (!node) return;
  node.classList.toggle(cls, Boolean(condition));
}

// ─── Visibilité ──────────────────────────────────────────────────────────────

/**
 * Affiche un élément (retire display:none).
 */
export function show(node) {
  if (!node) return;
  node.hidden = false;
  if (node.style.display === 'none') node.style.display = '';
}

/**
 * Cache un élément via l'attribut hidden (accessible + pas de reflow layout).
 */
export function hide(node) {
  if (!node) return;
  node.hidden = true;
}

/**
 * Cache un élément via display:none (pour les cas où hidden ne suffit pas).
 */
export function hideDisplay(node) {
  if (!node) return;
  node.style.display = 'none';
}

// ─── Gestion des enfants ─────────────────────────────────────────────────────

/**
 * Vide un nœud sans reconstruire son parent (plus rapide que innerHTML = '').
 * Conforme à la règle "pas de rebuild complet".
 */
export function clearChildren(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Remplace le contenu d'un nœud par un ou plusieurs enfants.
 * Équivalent sûr de innerHTML = '...' + appendChild.
 */
export function replaceChildren(node, ...children) {
  if (!node) return;
  clearChildren(node);
  for (const child of children.flat()) {
    if (child) node.appendChild(child);
  }
}

// ─── Événements ──────────────────────────────────────────────────────────────

/**
 * Ajoute un écouteur d'événement et retourne une fonction de nettoyage.
 * Idéal pour unmount() : stocker le retour et appeler au démontage.
 *
 * @example
 *   this._cleanups.push(on(btn, 'click', () => this._doAction()));
 *   // dans unmount() :
 *   this._cleanups.forEach(fn => fn());
 */
export function on(node, event, handler, options) {
  if (!node) return () => {};
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}

/**
 * Délègue un événement sur un conteneur parent (utile pour les listes dynamiques).
 * @param {Element} root      — Conteneur racine
 * @param {string}  event     — Nom de l'événement
 * @param {string}  selector  — Sélecteur CSS des cibles
 * @param {Function} handler  — Appelé avec (event, matchedTarget)
 */
export function delegate(root, event, selector, handler) {
  if (!root) return () => {};
  const fn = (e) => {
    const target = e.target?.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  };
  root.addEventListener(event, fn);
  return () => root.removeEventListener(event, fn);
}

// ─── Skeleton (R5) ───────────────────────────────────────────────────────────

/**
 * Crée un bloc skeleton animé.
 * @param {object} opts — { height, width, radius, lines }
 *   - lines : nombre de lignes texte simulées (alternative à height fixe)
 */
export function skeleton(opts = {}) {
  if (opts.lines) {
    const wrap = el('div', { cls: 'hse-skeleton-block' });
    for (let i = 0; i < opts.lines; i++) {
      const line = el('div', {
        cls: 'hse-skeleton hse-skeleton-line',
        attrs: { style: i === opts.lines - 1 ? 'width:60%' : '' },
      });
      wrap.appendChild(line);
    }
    return wrap;
  }
  return el('div', {
    cls: 'hse-skeleton',
    attrs: {
      style: [
        opts.height ? `height:${opts.height}` : '',
        opts.width  ? `width:${opts.width}`   : '',
        opts.radius ? `border-radius:${opts.radius}` : '',
      ].filter(Boolean).join(';'),
    },
  });
}

// ─── Sécurité ─────────────────────────────────────────────────────────────────

/**
 * Échappe les caractères HTML dangereux.
 * À utiliser avant toute insertion via innerHTML (cas rares, statiques uniquement).
 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ─── Divers ───────────────────────────────────────────────────────────────────

/**
 * Attend que le DOM soit peint (1 frame) avant de continuer.
 * Utile pour déclencher des transitions CSS après une injection DOM.
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Attend N millisecondes.
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formate un nombre avec séparateur de milliers et décimales.
 * @param {number} value
 * @param {number} [decimals=2]
 * @param {string} [locale='fr-FR']
 */
export function fmtNumber(value, decimals = 2, locale = 'fr-FR') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formate un coût en euros.
 */
export function fmtEur(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${fmtNumber(value, decimals)} €`;
}

/**
 * Formate une puissance en W ou kW selon la valeur.
 */
export function fmtWatt(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const v = Number(value);
  return v >= 1000 ? `${fmtNumber(v / 1000, 2)} kW` : `${fmtNumber(v, 0)} W`;
}
