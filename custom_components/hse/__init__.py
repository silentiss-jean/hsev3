"""
HSE V3 — Home Suivi Élec
Orchestration principale : setup, unload, static files, enregistrement des vues API.

Règles :
- Ce fichier reste < 200 lignes (hse_v3_synthese.md §3.2)
- Pas de sensor.py — pattern hse_sensors_ready event
- StaticPathConfig uniquement (pas de shutil.copytree)
- Tous les imports lourds dans les sous-modules
"""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry

from .api.views.ping import HsePingView

_LOGGER = logging.getLogger(__name__)

DOMAIN = "hse"
VERSION = "3.0.0"

# Chemin absolu vers les fichiers statiques du panel
_STATIC_DIR = Path(__file__).parent / "web_static" / "panel"
_STATIC_URL = "/hse-static"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Setup appelé au chargement de l'intégration (YAML — non utilisé en V3)."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Setup de la config entry.
    - Enregistre les fichiers statiques
    - Enregistre toutes les vues API
    - Stocke les références dans hass.data[DOMAIN]
    """
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    # ── Fichiers statiques ──────────────────────────────────────────────────
    await hass.http.async_register_static_paths([
        StaticPathConfig(_STATIC_URL, str(_STATIC_DIR), cache_headers=False),
    ])

    # ── Vues API ────────────────────────────────────────────────────────────
    # Bloc 1 : ping uniquement — les autres vues seront ajoutées dans les blocs suivants
    hass.http.register_view(HsePingView(hass))

    _LOGGER.info("HSE V3 %s démarré (entry: %s)", VERSION, entry.entry_id)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Nettoyage lors de la désinstallation.
    Les vues HTTP HA ne peuvent pas être désenregistrées dynamiquement —
    le unload retire uniquement les données en mémoire.
    """
    hass.data[DOMAIN].pop(entry.entry_id, None)
    _LOGGER.info("HSE V3 déchargé (entry: %s)", entry.entry_id)
    return True
