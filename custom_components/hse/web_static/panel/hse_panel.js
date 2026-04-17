/**
 * hse_panel.js — Wrapper Custom Element HA (DELTA-052 étape 0b)
 *
 * Rôle :
 *   - Déclaré comme `module_url` dans __init__.py (embed_iframe=True)
 *   - Crée une <iframe> plein écran pointant vers hse_panel.html
 *   - Récupère le token HA via `set hass()` et le transmet à l'iframe via postMessage
 *
 * Flux :
 *   HA injecte hse-panel dans le DOM
 *   → connectedCallback : crée l'iframe
 *   → iframe envoie postMessage {type:'hse-ready'}
 *   → hse_panel.js répond postMessage {type:'hse-auth', token}
 *
 * Contraintes (DELTA-052) :
 *   - Guard anti double-mount
 *   - disconnectedCallback retire le listener message
 *   - Zéro dépendance externe
 */

class HsePanel extends HTMLElement {
  constructor() {
    super();
    this._iframe = null;
    this._token = null;
    this._iframeReady = false;
    this._messageHandler = null;
    this._mounted = false;
  }

  connectedCallback() {
    // Guard anti double-mount (embed_iframe peut rappeler connectedCallback)
    if (this._mounted) return;
    this._mounted = true;

    // Styles plein écran sur l'hôte
    Object.assign(this.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    });

    // Création de l'iframe
    const iframe = document.createElement('iframe');
    iframe.src = '/hse-static/hse_panel.html';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
    });
    iframe.setAttribute('sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads'
    );
    this._iframe = iframe;
    this.appendChild(iframe);

    // Écoute des messages en provenance de l'iframe
    this._messageHandler = (event) => this._onMessage(event);
    window.addEventListener('message', this._messageHandler);
  }

  disconnectedCallback() {
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
      this._messageHandler = null;
    }
    this._mounted = false;
    this._iframeReady = false;
  }

  /**
   * HA appelle set hass() à chaque changement d'état.
   * On ne s'intéresse qu'au token d'accès.
   */
  set hass(hass) {
    const token = hass && hass.auth && hass.auth.data && hass.auth.data.access_token;
    if (!token) return;
    this._token = token;
    // Si l'iframe est déjà prête, envoyer immédiatement
    if (this._iframeReady) {
      this._sendToken();
    }
  }

  _onMessage(event) {
    // Sécurité : on n'accepte que les messages de notre propre iframe
    if (!this._iframe || event.source !== this._iframe.contentWindow) return;

    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'hse-ready') {
      this._iframeReady = true;
      // Si le token est déjà disponible, l'envoyer tout de suite
      if (this._token) {
        this._sendToken();
      }
    }
  }

  _sendToken() {
    if (!this._iframe || !this._iframe.contentWindow) return;
    this._iframe.contentWindow.postMessage(
      { type: 'hse-auth', token: this._token },
      window.location.origin
    );
  }
}

customElements.define('hse-panel', HsePanel);
