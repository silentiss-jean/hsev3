/**
 * cards_view.js — Onglet Cartes YAML HSE V3
 *
 * Stub (DELTA-062) — implémentation complète prévue Vague 3.
 * Évite le crash "Failed to fetch dynamically imported module" sur l'onglet.
 *
 * Contrat :
 *   - Respecte R1-R5 (mount/update_hass/unmount, _fetching, JSON.stringify sig, no localStorage, skeleton)
 *   - Affiche un état "bientôt disponible" lisible
 *
 * Source de données prévue : GET /api/hse/catalogue (chargé au mount)
 * Fonctionnalités prévues :
 *   - Checkboxes appareils + options (type de carte, coût, période)
 *   - Prévisualisation YAML (éditeur read-only + coloration syntaxique)
 *   - Bouton "Copier" + "Télécharger .yaml"
 */

const CSS = `
.hse-cards { display: flex; flex-direction: column; gap: 16px; }
.hse-cards__placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 48px 24px; text-align: center;
  background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.15);
  border-radius: 12px;
}
.hse-cards__placeholder-icon { font-size: 3rem; opacity: 0.6; }
.hse-cards__placeholder-title { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.85); }
.hse-cards__placeholder-text { font-size: 0.875rem; color: rgba(255,255,255,0.5); max-width: 480px; line-height: 1.5; }
.hse-cards__placeholder-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.25);
  color: #facc15; font-size: 0.78rem; font-weight: 600;
}
@keyframes hse-shimmer { 0% { background-position:-200% 0; } 100% { background-position: 200% 0; } }
.hse-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:hse-shimmer 1.5s ease-in-out infinite; border-radius:10px; min-height:120px; width:100%; }
@media(prefers-reduced-motion:reduce){ .hse-skeleton { animation:none; } }
`;

export class CardsView {
  constructor() {
    this._el = null;
    this._ctx = null;
    this._abort = null;
    this._mounted = false;
    this._fetching = false;
    this._lastSig = null;
  }

  mount(el, ctx) {
    this._el = el;
    this._ctx = ctx;
    this._abort = new AbortController();
    this._mounted = true;
    this._injectCSS();
    this._buildSkeleton();
    // Pas de fetch : stub. On rend directement l'état "bientôt disponible".
    this._render();
  }

  update_hass(hass) {
    this._ctx = { ...this._ctx, hass };
  }

  unmount() {
    this._mounted = false;
    if (this._abort) this._abort.abort();
    this._abort = null;
    this._el = null;
    this._ctx = null;
  }

  _injectCSS() {
    if (document.getElementById('hse-cards-css')) return;
    const s = document.createElement('style');
    s.id = 'hse-cards-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildSkeleton() {
    this._el.innerHTML = `<div class="hse-cards"><div class="hse-skeleton" style="min-height:240px"></div></div>`;
  }

  _render() {
    if (!this._mounted) return;
    // Signature stable : pas de fetch, donc pas de re-render.
    const sig = 'cards-stub-v1';
    if (sig === this._lastSig) return;
    this._lastSig = sig;

    this._el.innerHTML = `
      <div class="hse-cards">
        <div class="hse-cards__placeholder">
          <div class="hse-cards__placeholder-icon">🎨</div>
          <div class="hse-cards__placeholder-title">Générateur de cartes YAML</div>
          <div class="hse-cards__placeholder-text">
            Cet onglet permettra de générer des cartes Lovelace YAML à partir de vos appareils
            sélectionnés (coût, puissance, période). Implémentation prévue en Vague 3.
          </div>
          <span class="hse-cards__placeholder-badge">🚧 Bientôt disponible — DELTA-062</span>
        </div>
      </div>`;
  }
}

export default CardsView;
