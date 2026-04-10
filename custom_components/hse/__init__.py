"""
HSE V3 — Home Suivi Élec
Orchestration principale : setup, unload, static files, panel HA, vues API.

Règles :
- Ce fichier reste < 200 lignes (hse_v3_synthese.md §3.2)
- Pas de sensor.py — pattern hse_sensors_ready event
- StaticPathConfig uniquement (pas de shutil.copytree)
- Tous les imports lourds dans les sous-modules
"""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_register_built_in_panel, async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

from .api.views.ping import HsePingView
from .api.views.catalogue import HseCatalogueView
from .api.views.costs import HseCostsView, HseHistoryView, HseExportView
from .api.views.diagnostic import HseDiagnosticView
from .api.views.frontend_manifest import HseFrontendManifestView
from .api.views.meta import HseMetaView
from .api.views.migration import HseMigrationView
from .api.views.overview import HseOverviewView
from .api.views.scan import HseScanView
from .api.views.settings import HseSettingsView
from .api.views.user_prefs import HseUserPrefsView

_LOGGER = logging.getLogger(__name__)

DOMAIN = "hse"
VERSION = "3.0.0"

# Chemin absolu vers les fichiers statiques du panel
_STATIC_DIR = Path(__file__).parent / "web_static" / "panel"
_STATIC_URL = "/hse-static"

# URL du module JS déclaré au panel HA
_PANEL_MODULE_URL = f"{_STATIC_URL}/hse_panel.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Setup appelé au chargement de l'intégration (YAML — non utilisé en V3)."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Setup de la config entry.
    - Enregistre les fichiers statiques
    - Enregistre le panel HA (require_admin=True)
    - Enregistre toutes les vues API
    - Stocke les références dans hass.data[DOMAIN]
    """
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    # ── Fichiers statiques ─────────────────────────────────────────────────────────
    await hass.http.async_register_static_paths([
        StaticPathConfig(_STATIC_URL, str(_STATIC_DIR), cache_headers=False),
    ])

    # ── Panel HA ─────────────────────────────────────────────────────────────────
    # require_admin=True : panel visible uniquement pour les admins HA
    # (hse_v3_synthese.md §4)
    await async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="HSE",
        sidebar_icon="mdi:home-lightning-bolt",
        frontend_url_path=DOMAIN,
        config={
            "_panel_custom": {
                "name": "hse-panel",
                "embed_iframe": False,
                "trust_external_script": False,
                "module_url": _PANEL_MODULE_URL,
            }
        },
        require_admin=True,
    )

    # ── Vues API ─────────────────────────────────────────────────────────────────
    for view in [
        HsePingView(hass),
        HseCatalogueView(hass),
        HseCostsView(hass),
        HseHistoryView(hass),
        HseExportView(hass),
        HseDiagnosticView(hass),
        HseFrontendManifestView(hass),
        HseMetaView(hass),
        HseMigrationView(hass),
        HseOverviewView(hass),
        HseScanView(hass),
        HseSettingsView(hass),
        HseUserPrefsView(hass),
    ]:
        hass.http.register_view(view)

    _LOGGER.info("HSE V3 %s démarré (entry: %s)", VERSION, entry.entry_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Nettoyage lors de la désinstallation.
    - Retire le panel de la sidebar HA
    - Les vues HTTP HA ne peuvent pas être désenregistrées dynamiquement
    """
    async_remove_panel(hass, DOMAIN)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    _LOGGER.info("HSE V3 déchargé (entry: %s)", entry.entry_id)
    return True
