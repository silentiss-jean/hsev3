"""
HSE V3 — Options Flow.
Permets de configurer post-install (sans restart) :
- Tarif €/kWh (pré-rempli, modifiable dans l'onglet Config aussi)
- Capteur de référence (entity_id du compteur général, optionnel)

Note : ces valeurs sont stockées dans storage/manager.py (DELTA-009).
L'options flow est uniquement un point d'entrée HA pratique, pas la source de vérité.
"""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN


class HseOptionsFlow(config_entries.OptionsFlow):

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            # Stockage via StorageManager — import lazy pour éviter les cycles
            from .storage.manager import HseStorageManager
            mgr = HseStorageManager(self.hass)
            settings = await mgr.async_load_settings()
            settings["price_ttc_kwh"] = user_input.get("price_ttc_kwh", settings.get("price_ttc_kwh", 0.25))
            settings["reference_entity_id"] = user_input.get("reference_entity_id") or None
            await mgr.async_save_settings(settings)
            return self.async_create_entry(title="", data={})

        from .storage.manager import HseStorageManager
        mgr = HseStorageManager(self.hass)
        settings = await mgr.async_load_settings()

        schema = vol.Schema({
            vol.Optional(
                "price_ttc_kwh",
                default=settings.get("price_ttc_kwh", 0.25),
            ): vol.Coerce(float),
            vol.Optional(
                "reference_entity_id",
                default=settings.get("reference_entity_id") or "",
            ): str,
        })

        return self.async_show_form(step_id="init", data_schema=schema)


@callback
def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> HseOptionsFlow:
    return HseOptionsFlow(config_entry)
