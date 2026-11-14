"""
HSE V3 — Endpoints settings
GET  /api/hse/settings           — config complète (référence + pricing)
PUT  /api/hse/settings           — mise à jour partielle (toute clé settings acceptée)
GET  /api/hse/settings/pricing   — alias : bloc pricing uniquement (rétrocompat)
PUT  /api/hse/settings/pricing   — alias : mise à jour pricing uniquement (rétrocompat)
"""
from __future__ import annotations

from http import HTTPStatus
from typing import Any

from aiohttp import web
from homeassistant.core import HomeAssistant

from ..base import HseBaseView
from ...storage.manager import HseStorageManager

_VALID_MODES = ("flat", "hphc")

# Source de vérité unique des clés settings acceptées en GET/PUT.
# Toute clé ajoutée ici doit aussi être documentée dans ROADMAP_TO_PROD.md §8.
_SETTINGS_KEYS = (
    "mode",
    # Tarif fixe
    "price_ht_kwh", "price_ttc_kwh",
    # HP/HC
    "price_hp_ht_kwh", "price_hp_ttc_kwh",
    "price_hc_ht_kwh", "price_hc_ttc_kwh",
    # Plage horaire HC
    "hc_start", "hc_end",
    # Abonnement & fiscalité
    "subscription_eur_month", "tax_rate_pct",
    # Capteur de référence (DELTA-064 Q2)
    "reference_entity_id",
    # Index kWh du compteur général (V3.1)
    "reference_energy_entity_id",
)

# Clés prix : doivent être des nombres finis >= 0 s'il sont présents.
_PRICE_KEYS = (
    "price_ht_kwh", "price_ttc_kwh",
    "price_hp_ht_kwh", "price_hp_ttc_kwh",
    "price_hc_ht_kwh", "price_hc_ttc_kwh",
    "subscription_eur_month",
)

# Borne fiscale : tax_rate_pct doit être >= 0 (évite division par zéro à -100)
# et fini.
_TAX_KEY = "tax_rate_pct"


def _is_finite_number(v: Any) -> bool:
    if v is None:
        return False
    try:
        f = float(v)
    except (TypeError, ValueError):
        return False
    return f == f and f not in (float("inf"), float("-inf"))


def _valid_hhmm(v: Any) -> bool:
    if not isinstance(v, str):
        return False
    parts = v.split(":")
    if len(parts) != 2:
        return False
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        return False
    return 0 <= h <= 23 and 0 <= m <= 59


def _validate_settings(body: dict) -> dict | None:
    """Valide les valeurs des settings. Retourne une erreur ou None."""
    # Prix non négatifs et finis
    for key in _PRICE_KEYS:
        if key in body and not _is_finite_number(body[key]):
            return {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"{key} doit être un nombre valide"}
        if key in body and float(body[key]) < 0:
            return {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"{key} doit être >= 0"}

    # Tax : nombre fini, >= 0 (évite division par zéro à tax_rate_pct = -100)
    if _TAX_KEY in body:
        if not _is_finite_number(body[_TAX_KEY]):
            return {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"{_TAX_KEY} doit être un nombre valide"}
        if float(body[_TAX_KEY]) < 0:
            return {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"{_TAX_KEY} doit être >= 0"}

    # Plages horaires HC au format HH:MM
    for key in ("hc_start", "hc_end"):
        if key in body and not _valid_hhmm(body[key]):
            return {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"{key} doit être au format HH:MM"}

    return None


def _serialize_settings(settings: dict) -> dict:
    """Sérialise un dict settings en payload complet avec défauts."""
    return {
        "mode": settings.get("mode", "flat"),
        "price_ht_kwh": settings.get("price_ht_kwh", 0.0),
        "price_ttc_kwh": settings.get("price_ttc_kwh", 0.25),
        "price_hp_ht_kwh": settings.get("price_hp_ht_kwh", 0.0),
        "price_hp_ttc_kwh": settings.get("price_hp_ttc_kwh", 0.0),
        "price_hc_ht_kwh": settings.get("price_hc_ht_kwh", 0.0),
        "price_hc_ttc_kwh": settings.get("price_hc_ttc_kwh", 0.0),
        "hc_start": settings.get("hc_start", "22:00"),
        "hc_end": settings.get("hc_end", "06:00"),
        "subscription_eur_month": settings.get("subscription_eur_month", 0.0),
        "tax_rate_pct": settings.get("tax_rate_pct", 20.0),
        "reference_entity_id": settings.get("reference_entity_id"),
        "reference_energy_entity_id": settings.get("reference_energy_entity_id"),
    }


async def _apply_settings_update(hass: HomeAssistant, body: dict) -> tuple[dict, dict | None]:
    """Applique un PUT partiel. Retourne (settings_mis_à_jour, erreur_ou_None)."""
    if "mode" in body and body["mode"] not in _VALID_MODES:
        return {}, {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"mode invalide. Valeurs: {_VALID_MODES}"}

    unknown = [k for k in body.keys() if k not in _SETTINGS_KEYS]
    if unknown:
        return {}, {"status": HTTPStatus.UNPROCESSABLE_ENTITY,
                    "message": f"Clés inconnues: {unknown}. Autorisées: {_SETTINGS_KEYS}"}

    validation = _validate_settings(body)
    if validation:
        return {}, validation

    mgr = HseStorageManager(hass)
    settings = await mgr.async_load_settings()
    for field in _SETTINGS_KEYS:
        if field in body:
            settings[field] = body[field]
    await mgr.async_save_settings(settings)
    return settings, None


class HseSettingsView(HseBaseView):
    """GET/PUT /api/hse/settings — config complète (référence + pricing)."""
    url = "/api/hse/settings"
    name = "api:hse:settings"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()
        return self.json_ok(_serialize_settings(settings))

    async def put(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        settings, err = await _apply_settings_update(self.hass, body)
        if err:
            return self.json_error(err["message"], err["status"])
        return self.json_ok({"saved": True, "settings": _serialize_settings(settings)})


class HseSettingsPricingView(HseBaseView):
    """GET/PUT /api/hse/settings/pricing — alias historique (rétrocompat frontend)."""
    url = "/api/hse/settings/pricing"
    name = "api:hse:settings:pricing"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)

    async def get(self, request: web.Request) -> web.Response:
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()
        full = _serialize_settings(settings)
        # Bloc pricing uniquement (rétrocompat frontend existant)
        return self.json_ok({k: full[k] for k in (
            "mode", "price_ht_kwh", "price_ttc_kwh",
            "price_hp_ht_kwh", "price_hp_ttc_kwh",
            "price_hc_ht_kwh", "price_hc_ttc_kwh",
            "hc_start", "hc_end",
            "subscription_eur_month", "tax_rate_pct",
            "reference_entity_id", "reference_energy_entity_id",
        )})

    async def put(self, request: web.Request) -> web.Response:
        try:
            body: dict[str, Any] = await request.json()
        except Exception:
            return self.json_error("Body JSON invalide", HTTPStatus.UNPROCESSABLE_ENTITY)

        settings, err = await _apply_settings_update(self.hass, body)
        if err:
            return self.json_error(err["message"], err["status"])
        return self.json_ok({"saved": True})
