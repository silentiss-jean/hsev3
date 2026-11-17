/**
 * hse_fetch.js — Client HTTP mutualisé HSE V3
 *
 * Contrat (00_methode_front_commune.md §5 + hse_v3_synthese.md §4) :
 * - Injecte Authorization: Bearer automatiquement depuis window.__hseToken
 * - Content-Type: application/json par défaut (surchargeable)
 * - Supporte AbortController via options.signal
 * - Lève une Error enrichie si réponse non-ok (status + body)
 *
 * Usage :
 *   import { hseFetch } from '../shared/hse_fetch.js';
 *   const resp = await hseFetch('/api/hse/overview');
 *   const data = await resp.json();
 *
 * Usage avec AbortController :
 *   const ctl = new AbortController();
 *   const resp = await hseFetch('/api/hse/scan', { method: 'POST', signal: ctl.signal });
 *   ctl.abort(); // dans unmount()
 */

/**
 * Wrapper fetch centralisé — injection token HA automatique.
 *
 * @param {string} path       - Chemin absolu ex: '/api/hse/overview'
 * @param {RequestInit} [options] - Options fetch standard (method, body, signal…)
 * @returns {Promise<Response>}  - Response brute (appelant fait .json() ou .text())
 * @throws {HseFetchError}       - Si réponse HTTP non-ok (4xx / 5xx)
 */
export async function hseFetch(path, options = {}) {
  // FIX bug #1: fallback sur hassAuthToken si __hseToken absent
  const token = window.__hseToken || window.hassAuthToken;
  if (!token) {
    throw new HseFetchError('HSE : token non initialisé — shell non chargé ou token manquant', 0);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  // FIX: si 401, tenter de récupérer le token depuis le localStorage HA
  if (response.status === 401 && !window.__hseToken) {
    try {
      const hassTokens = localStorage.getItem('hassTokens');
      if (hassTokens) {
        const parsed = JSON.parse(hassTokens);
        const fallbackToken = parsed.access_token;
        if (fallbackToken) {
          console.warn('[HSE Fetch] 401 sans __hseToken — retry avec token localStorage');
          window.__hseToken = fallbackToken;
          const retryResp = await fetch(path, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${fallbackToken}`,
              ...options.headers,
            },
          });
          if (retryResp.ok) return retryResp;
        }
      }
    } catch (_) {}
  }

  if (!response.ok) {
    // Lecture directe — le body n'a pas encore été consommé à ce stade (DELTA-031a)
    let detail = '';
    try {
      const body = await response.json();
      detail = body.message || body.error || JSON.stringify(body);
    } catch {
      try { detail = await response.text(); } catch { /* body illisible */ }
    }
    throw new HseFetchError(
      `HSE API ${response.status} sur ${path}${detail ? ' — ' + detail : ''}`,
      response.status
    );
  }

  return response;
}

/**
 * Erreur enrichie avec le status HTTP.
 * Permet au catch des onglets de distinguer 401 / 403 / 404 / 500.
 */
export class HseFetchError extends Error {
  /**
   * @param {string} message
   * @param {number} status - Code HTTP (0 = réseau / token manquant)
   */
  constructor(message, status) {
    super(message);
    this.name = 'HseFetchError';
    this.status = status;
  }
}
