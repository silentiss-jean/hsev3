/**
 * hse_panel.js — Point d'entrée HA du panel HSE V3
 *
 * Responsabilités (DELTA-011) :
 *   1. Importer hse_shell.js qui définit le custom element <hse-panel>
 *   2. Déclarer window.customPanelInfo pour que HA sache quel élément instancier
 *
 * Ce fichier NE DOIT PAS :
 *   - Redéfinir <hse-panel> (c'est hse_shell.js qui le fait)
 *   - Utiliser localStorage (règle R4)
 *   - Contenir de logique métier
 *
 * Dépendances :
 *   - ./shared/hse_shell.js  (définit HsePanel + customElements.define)
 */

import './shared/hse_shell.js';

/**
 * Déclaration du panel auprès de HA.
 * HA lit window.customPanelInfo pour instancier le bon custom element
 * et configurer l'iframe / module.
 *
 * @see https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/
 */
window.customPanelInfo = {
  /** Nom du custom element enregistré dans hse_shell.js */
  name: 'hse-panel',
  /** Doit correspondre au frontend_url_path dans async_setup_entry */
  url_path: 'hse',
  embed_iframe: false,
  trust_external_script: false,
};
