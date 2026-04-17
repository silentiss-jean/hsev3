/**
 * hse_store.js — State global HSE V3
 *
 * Contrat (DELTA-002, hse_v3_synthese.md §3.2, Règle R4) :
 * - Onglet actif (routing shell)
 * - Prefs UI en mémoire — ZÉRO localStorage (R4)
 * - Données catalogue pré-chargées au boot (cache mémoire)
 * - Pattern observer léger pour notifier les abonnés
 *
 * Usage :
 *   import { hseStore } from '../shared/hse_store.js';
 *
 *   // Lire
 *   const tab = hseStore.get('activeTab');     // 'overview'
 *   const prefs = hseStore.get('userPrefs');   // { theme: 'dark', ... }
 *
 *   // Écrire (notifie les abonnés)
 *   hseStore.set('activeTab', 'costs');
 *
 *   // S'abonner à une clé
 *   const unsub = hseStore.subscribe('activeTab', (val) => console.log(val));
 *   unsub(); // se désabonner
 */

const _state = {
  /** @type {string} Identifiant de l'onglet actif */
  activeTab: 'overview',

  /** @type {object|null} Prefs UI — chargées depuis /api/hse/user_prefs au boot */
  userPrefs: null,

  /** @type {object|null} Manifest frontend — chargé au boot */
  frontendManifest: null,

  /** @type {object|null} Catalogue — chargé au boot, mis à jour par config_view */
  catalogue: null,

  /** @type {boolean} True si le bootstrap initial est terminé */
  ready: false,
};

/** @type {Map<string, Set<Function>>} */
const _listeners = new Map();

export const hseStore = {
  /**
   * Lire une valeur du store.
   * Retourne une copie shallow pour les objets/arrays afin d'éviter
   * la mutation externe silencieuse (DELTA-031b).
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const val = _state[key];
    if (val !== null && typeof val === 'object') {
      return Array.isArray(val) ? [...val] : { ...val };
    }
    return val;
  },

  /**
   * Écrire une valeur et notifier les abonnés.
   * Ne notifie que si la valeur a changé (comparaison stricte).
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (_state[key] === value) return;
    _state[key] = value;
    _notify(key, value);
  },

  /**
   * Merger un objet dans une clé existante (utile pour userPrefs).
   * @param {string} key
   * @param {object} patch
   */
  patch(key, patch) {
    const prev = _state[key];
    const next = { ...(prev ?? {}), ...patch };
    _state[key] = next;
    _notify(key, next);
  },

  /**
   * S'abonner aux changements d'une clé.
   * @param {string} key
   * @param {Function} callback - appelé avec (newValue)
   * @returns {Function} unsub — appeler pour se désabonner
   */
  subscribe(key, callback) {
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(callback);
    return () => _listeners.get(key)?.delete(callback);
  },

  /**
   * Snapshot de l'état complet (debug / logging).
   * @returns {object}
   */
  snapshot() {
    return { ..._state };
  },
};

/**
 * @param {string} key
 * @param {*} value
 */
function _notify(key, value) {
  _listeners.get(key)?.forEach((cb) => {
    try { cb(value); } catch (e) { console.error('[hse_store] listener error', key, e); }
  });
}
