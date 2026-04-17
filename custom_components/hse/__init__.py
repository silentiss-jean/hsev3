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
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.config_entries import ConfigEntry

from .const import DOMAIN, VERSION
from .api.views.ping import HsePingView
from .api.views.catalogue import HseCatalogueView
from .api.views.costs import HseCostsView, HseHistoryView, HseExportView, _build_costs_data
from .api.views.diagnostic import HseDiagnosticView
from .api.views.frontend_manifest import HseFrontendManifestView
from .api.views.meta import HseMetaView
from .api.views.migration import HseMigrationView, HseMigrationExportView, HseMigrationApplyView  # DELTA-051
from .api.views.overview import HseOverviewView
from .api.views.scan import HseScanView
from .api.views.settings import HseSettingsPricingView  # DELTA-045
from .api.views.user_prefs import HseUserPrefsView
from .repairs import async_sync_repairs

_LOGGER = logging.getLogger(__name__)

_STATIC_DIR = Path(__file__).parent / "web_static" / "panel"
_STATIC_URL = "/hse-static"
# DELTA-052 0a : module_url pointe vers hse_panel.js (Custom Element — crée lui-même l'iframe)
_PANEL_MODULE_URL = f"{_STATIC_URL}/hse_panel.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    # ── Fichiers statiques ───────────────────────────────────────────────────
    if not _STATIC_DIR.exists():
        _LOGGER.error(
            "HSE V3 : répertoire statique introuvable : %s — panel HA désactivé", _STATIC_DIR
        )
    else:
        try:
            await hass.http.async_register_static_paths([
                StaticPathConfig(_STATIC_URL, str(_STATIC_DIR), cache_headers=False),
            ])
        except ValueError:
            _LOGGER.debug("HSE V3 : static path déjà enregistré, ignoré.")

    # ── Panel HA ─────────────────────────────────────────────────────────────
    async_remove_panel(hass, DOMAIN)
    try:
        await async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="HSE",
            sidebar_icon="mdi:home-lightning-bolt",
            frontend_url_path=DOMAIN,
            config={
                "_panel_custom": {
                    "name": "hse-panel",
                    # DELTA-052 0a : embed_iframe=False — hse_panel.js crée lui-même l'iframe
                    # (embed_iframe=True invalide : HA charge module_url comme JS ES6, pas comme src iframe)
                    "embed_iframe": False,
                    "trust_external_script": False,
                    "module_url": _PANEL_MODULE_URL,
                }
            },
            require_admin=True,
        )
    except Exception:  # noqa: BLE001
        _LOGGER.warning("HSE V3 : panel déjà enregistré, ignoré.")

    # ── Vues API ─────────────────────────────────────────────────────────────
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
        HseMigrationExportView(hass),   # DELTA-051
        HseMigrationApplyView(hass),    # DELTA-051
        HseOverviewView(hass),
        HseScanView(hass),
        HseSettingsPricingView(hass),
        HseUserPrefsView(hass),
    ]:
        hass.http.register_view(view)

    # ── Services HA ──────────────────────────────────────────────────────────
    _register_services(hass)

    # ── Repairs ──────────────────────────────────────────────────────────────
    hass.async_create_task(async_sync_repairs(hass))

    _LOGGER.info("HSE V3 %s démarré (entry: %s)", VERSION, entry.entry_id)
    return True


def _register_services(hass: HomeAssistant) -> None:
    """Enregistre les 9 services HA déclarés dans services.yaml (DELTA-035)."""
    from .storage.manager import HseStorageManager
    from .catalogue.scan_engine import async_scan_hass
    from .catalogue.manager import merge_scan_into_catalogue
    from .meta.sync import async_build_ha_snapshot, compute_pending_diff, apply_pending_diff

    async def _svc_catalogue_refresh(call: ServiceCall) -> None:
        mgr = HseStorageManager(hass)
        scan = await async_scan_hass(hass)
        catalogue = await mgr.async_load_catalogue()
        updated = merge_scan_into_catalogue(catalogue, scan)
        await mgr.async_save_catalogue(updated)
        await async_sync_repairs(hass)
        _LOGGER.info("HSE service catalogue_refresh : %d candidats", len(scan.get("candidates", [])))

    async def _svc_meta_sync(call: ServiceCall) -> None:
        mgr = HseStorageManager(hass)
        catalogue = await mgr.async_load_catalogue()
        meta_store = await mgr.async_load_meta()
        snapshot = await async_build_ha_snapshot(hass, catalogue)
        diff = compute_pending_diff(meta_store, snapshot)
        if diff.get("has_changes"):
            updated = apply_pending_diff(meta_store, diff)
            await mgr.async_save_meta(updated)
        _LOGGER.info("HSE service meta_sync : changes=%s", diff.get("has_changes"))

    async def _svc_export_data(call: ServiceCall) -> None:
        period = call.data.get("period", "month")
        fmt = call.data.get("format", "csv")
        data = await _build_costs_data(hass, period)
        _LOGGER.info(
            "HSE service export_data : period=%s format=%s total_kwh=%s",
            period, fmt, data.get("total_kwh"),
        )

    async def _svc_migrate_cleanup(call: ServiceCall) -> None:
        from homeassistant.helpers.storage import Store
        for legacy_key in ("hse_catalogue", "hse_meta", "hse_settings", "hse_user_prefs"):
            store: Store = Store(hass, 1, f"{DOMAIN}.{legacy_key}")
            await store.async_remove()
        _LOGGER.info("HSE service migrate_cleanup : clés V1 supprimées")

    async def _svc_reset_catalogue(call: ServiceCall) -> None:
        mgr = HseStorageManager(hass)
        from .storage.manager import default_catalogue
        await mgr.async_save_catalogue(default_catalogue())
        _LOGGER.warning("HSE service reset_catalogue : catalogue réinitialisé")

    async def _svc_reset_settings(call: ServiceCall) -> None:
        mgr = HseStorageManager(hass)
        from .storage.manager import default_settings
        await mgr.async_save_settings(default_settings())
        _LOGGER.warning("HSE service reset_settings : paramètres réinitialisés")

    async def _svc_reset_meta(call: ServiceCall) -> None:
        mgr = HseStorageManager(hass)
        from .storage.manager import default_meta
        await mgr.async_save_meta(default_meta())
        _LOGGER.warning("HSE service reset_meta : méta réinitialisées")

    async def _svc_set_entity_assignment(call: ServiceCall) -> None:
        entity_id = call.data.get("entity_id")
        room_id = call.data.get("room_id")
        type_id = call.data.get("type_id")
        if not entity_id:
            _LOGGER.error("HSE service set_entity_assignment : entity_id manquant")
            return
        mgr = HseStorageManager(hass)
        meta_store = await mgr.async_load_meta()
        meta = (meta_store or {}).get("meta") or {}
        assignments = meta.setdefault("assignments", {})
        cur = assignments.setdefault(entity_id, {})
        if room_id is not None:
            cur["room_id"] = room_id
            cur["room_mode"] = "manual"
        if type_id is not None:
            cur["type_id"] = type_id
            cur["type_mode"] = "manual"
        await mgr.async_save_meta(meta_store)
        _LOGGER.info("HSE service set_entity_assignment : %s → room=%s type=%s", entity_id, room_id, type_id)

    async def _svc_set_triage_policy(call: ServiceCall) -> None:
        entity_id = call.data.get("entity_id")
        policy = call.data.get("policy")
        if not entity_id or policy not in ("selected", "ignored", "removed"):
            _LOGGER.error("HSE service set_triage_policy : paramètres invalides")
            return
        mgr = HseStorageManager(hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}
        matched_key = None
        for k, v in items.items():
            if isinstance(v, dict) and (v.get("source") or {}).get("entity_id") == entity_id:
                matched_key = k
                break
        if matched_key is None:
            _LOGGER.warning("HSE service set_triage_policy : %s absent du catalogue", entity_id)
            return
        items[matched_key].setdefault("triage", {})["policy"] = policy
        await mgr.async_save_catalogue(catalogue)
        _LOGGER.info("HSE service set_triage_policy : %s → %s", entity_id, policy)

    _SVC = [
        ("catalogue_refresh", _svc_catalogue_refresh),
        ("meta_sync", _svc_meta_sync),
        ("export_data", _svc_export_data),
        ("migrate_cleanup", _svc_migrate_cleanup),
        ("reset_catalogue", _svc_reset_catalogue),
        ("reset_settings", _svc_reset_settings),
        ("reset_meta", _svc_reset_meta),
        ("set_entity_assignment", _svc_set_entity_assignment),
        ("set_triage_policy", _svc_set_triage_policy),
    ]
    for name, handler in _SVC:
        if not hass.services.has_service(DOMAIN, name):
            hass.services.async_register(DOMAIN, name, handler)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    async_remove_panel(hass, DOMAIN)
    for svc in (
        "catalogue_refresh", "meta_sync", "export_data", "migrate_cleanup",
        "reset_catalogue", "reset_settings", "reset_meta",
        "set_entity_assignment", "set_triage_policy",
    ):
        hass.services.async_remove(DOMAIN, svc)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    _LOGGER.info("HSE V3 déchargé (entry: %s)", entry.entry_id)
    return True
