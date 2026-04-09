"""
HSE V3 — Constantes métier.
"""
from __future__ import annotations

DOMAIN = "hse"
VERSION = "3.0.0"

# ── Storage keys ─────────────────────────────────────────────────────────────
STORAGE_KEY_CATALOGUE = f"{DOMAIN}.catalogue"
STORAGE_KEY_META = f"{DOMAIN}.meta"
STORAGE_KEY_USER_PREFS = f"{DOMAIN}.user_prefs"
STORAGE_KEY_SETTINGS = f"{DOMAIN}.settings"

# ── Valeurs par défaut user_prefs ───────────────────────────────────────────────────
USER_PREFS_DEFAULTS = {
    "active_tab": "overview",
    "overview_period": "day",
    "costs_period": "month",
    "theme": "default",
    "glassmorphism": False,
    "dynamic_bg": False,
}

USER_PREFS_VALID_TABS = {"overview", "diagnostic", "scan", "config", "custom", "cards", "migration", "costs"}
USER_PREFS_VALID_PERIODS = {"day", "week", "month", "year"}

# ── Paramètres catalogue ────────────────────────────────────────────────────────
CATALOGUE_OFFLINE_GRACE_S = 900  # 15 minutes avant escalation warning
CATALOGUE_REFRESH_INTERVAL_S = 300  # 5 minutes entre 2 scans auto

# ── Détection legacy (onglet Migration) ─────────────────────────────────────────────
LEGACY_V1_PREFIX = "sensor.home_suivi_elec_"
