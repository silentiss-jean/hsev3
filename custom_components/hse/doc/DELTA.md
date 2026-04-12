# HSE V3 — DELTA.md

> Référence d'alignement entre la documentation et le code.
> **Ce fichier est la première chose à lire avant chaque session de développement.**
>
> **Règle d'or : si ce fichier est vide (section "Écarts actifs" sans ligne) → doc et code sont parfaitement alignés.**

---

## 🧠 INSTRUCTION IA (lire systématiquement)

Si tu lis ce fichier, tu dois :
1. **Signaler** tous les écarts `EN_DISCUSSION` ou `DOC_AHEAD` ou `CODE_AHEAD` liés au sujet de la demande
2. **Ne jamais générer** de code ou de doc qui contredit un écart non résolu sans le signaler explicitement
3. **Proposer de fermer** un écart quand la solution est validée dans le thread
4. **Distinguer** les deux modes de travail :
   - **EXPLORATION** → on réfléchit, rien n'est écrit, on ajoute une ligne `EN_DISCUSSION` si la discussion dure
   - **COMMIT** → décision prise, on génère le patch doc + patch code + on ferme la ligne dans ce fichier
5. **Vérifier la 🗂️ Carte du repo** ci-dessous pour connaître l'état réel de chaque fichier
6. **Ordre d'exécution des DELTA actifs** : DELTA-022 → DELTA-023 → DELTA-024 → DELTA-025 → DELTA-026 (dans cet ordre, chaque DELTA débloque le suivant)

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🗂️ Carte du repo — état réel au 2026-04-12

> Mise à jour à chaque commit ajoutant ou supprimant un fichier.
> ✅ = fichier présent et conforme | 🔴 = manquant ou stub (voir écart DELTA-0XX)

```
hsev3/
├── README.md                                    ✅
├── .gitignore                                   ✅
├── analyse.md                                   ✅
├── analyse0.md                                  ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    ├── __init__.py                              ✅
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    │
    ├── translations/
    │   ├── fr.json                              ✅
    │   └── en.json                              ✅
    │
    ├── api/
    │   ├── __init__.py                          ✅
    │   ├── base.py                              ✅
    │   └── views/
    │       ├── __init__.py                      ✅
    │       ├── ping.py                          ✅
    │       ├── catalogue.py                     🟡 quality_score incorrect (DELTA-025)
    │       ├── costs.py                         🔴 HseCostsView partiel + HseHistoryView stub (DELTA-024)
    │       ├── diagnostic.py                    🟡 friendly_name manquant (DELTA-026)
    │       ├── frontend_manifest.py             ✅
    │       ├── meta.py                          ✅
    │       ├── migration.py                     ✅
    │       ├── overview.py                      🔴 week/month/year hardcodés à 0.0, by_type vide (DELTA-023)
    │       ├── scan.py                          🟡 quality_score incorrect (DELTA-025)
    │       ├── settings.py                      ✅
    │       └── user_prefs.py                    ✅
    │
    ├── catalogue/
    │   ├── __init__.py                          ✅
    │   ├── defaults.py                          ✅
    │   ├── manager.py                           ✅
    │   ├── scan_engine.py                       ✅
    │   └── schema.py                            ✅
    │
    ├── meta/
    │   ├── __init__.py                          ✅
    │   ├── assignments.py                       ✅
    │   ├── schema.py                            ✅
    │   ├── store.py                             ✅
    │   └── sync.py                              ✅
    │
    ├── storage/
    │   ├── __init__.py                          ✅
    │   └── manager.py                           ✅
    │
    ├── engine/
    │   ├── __init__.py                          ✅
    │   ├── cost.py                              ✅
    │   ├── calculation.py                       ✅
    │   ├── group_totals.py                      ✅
    │   ├── analytics.py                         ✅ (entity seul — global non implémenté, documenté)
    │   └── period_stats.py                      🔴 À CRÉER (DELTA-022) — débloque DELTA-023 et DELTA-024
    │
    ├── sensors/
    │   ├── __init__.py                          ✅
    │   ├── quality_scorer.py                    ✅
    │   ├── sync_manager.py                      ✅
    │   └── name_fixer.py                        ✅
    │
    ├── web_static/panel/
    │   ├── hse_panel.html                       ✅
    │   ├── hse_panel.js                         ✅
    │   ├── style.hse.panel.css                  ✅
    │   ├── shared/
    │   │   ├── hse_fetch.js                     ✅
    │   │   ├── hse_store.js                     ✅
    │   │   ├── hse_shell.js                     ✅
    │   │   ├── ui/
    │   │   │   ├── dom.js                       ✅
    │   │   │   └── table.js                     ✅
    │   │   └── styles/
    │   │       ├── hse_tokens.shadow.css        ✅
    │   │       ├── hse_themes.shadow.css        ✅
    │   │       ├── hse_alias.v2.css             ✅
    │   │       └── tokens.css                   ✅
    │   └── features/
    │       ├── overview/overview_view.js        ✅
    │       ├── diagnostic/diagnostic_view.js    ✅
    │       ├── scan/scan_view.js                ✅
    │       ├── config/config_view.js            🟡 checkbox check-all sans handler (DELTA-026)
    │       ├── custom/custom_view.js            ✅
    │       ├── cards/cards_view.js              ✅
    │       ├── migration/migration_view.js      ✅
    │       └── costs/costs_view.js              ✅
    │
    └── doc/
        ├── DELTA.md                             ✅ (ce fichier)
        ├── 00_methode_front_commune.md          ✅
        ├── 01_onglet_overview.md                ✅
        ├── 02_onglet_diagnostic.md              ✅
        ├── 03_onglet_scan.md                    ✅
        ├── 04_onglet_config.md                  ✅
        ├── 05_onglet_custom.md                  ✅
        ├── 06_onglet_cards.md                   ✅
        ├── 07_onglet_migration.md               ✅
        ├── 08_onglet_costs.md                   ✅
        ├── 09_squelette_hse_tab_base.md         ✅
        ├── 10_api_contrat.md                    ✅
        └── hse_v3_synthese.md                   ✅
```

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` — V3 **remplace** V2 | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | `hse_v3_synthese.md` §4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — **jamais localStorage** | Règle R4 |
| Stockage `user_prefs` | `StorageManager` dans `storage/manager.py` | `hse_v3_synthese.md` §7 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Pas de `sensor.py` | Interdit — event `hse_sensors_ready` | `hse_v3_synthese.md` §2 |
| `__init__.py` | < 200 lignes, orchestration uniquement | `hse_v3_synthese.md` §3.2 |
| Fichiers statiques | `StaticPathConfig` — pas de `shutil.copytree` | `hse_v3_synthese.md` §4 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` : `hse_fetch.js`, `hse_store.js`, etc. | DELTA-006 — 2026-04-08 |
| Dossier HACS | `custom_components/hse/` | DELTA-004 — 2026-04-08 |
| Source repo V2 | `https://github.com/silentiss-jean/hse.git` | DELTA-007 — 2026-04-08 |
| Migration | Hypothèse A — ajout `entity_id` V1 au catalogue V3 | DELTA-008 — 2026-04-08 |
| Capteur référence | `storage/manager.py` (live, sans restart) | DELTA-009 — 2026-04-08 |
| `frontend_manifest.py` | Conservé — version + onglets + feature flags | DELTA-010 — 2026-04-08 |
| Polling onglets "action" | ZÉRO auto — refresh sur action uniquement | Session 2026-04-08 |
| Polling onglets "lecture" | Autorisé mais suspendu si onglet inactif | Session 2026-04-08 |
| Chemin fichiers statiques | `web_static/panel/shared/` (Option B) | DELTA-002 — 2026-04-09 |
| Chemin views frontend | `web_static/panel/features/<id>/<id>_view.js` | DELTA-003 — 2026-04-09 |
| `hse_panel.js` | **RÉÉCRITURE complète** V3 — import `hse_shell.js` + `customPanelInfo` | DELTA-011 — 2026-04-10 |
| Rôle `hse_shell.js` | Custom element `<hse-panel>` + bootstrap + routing onglets | DELTA-011 — 2026-04-10 |
| Rôle `hse_panel.js` | Point d'entrée HA : `customPanelInfo` + `import hse_shell.js` | DELTA-011 — 2026-04-10 |
| URL statiques | `/hse-static/` → `web_static/panel/` | DELTA-011 — 2026-04-10 |
| Panel module_url | `/hse-static/hse_panel.js` | DELTA-011 — 2026-04-10 |
| Translations | `fr.json` + `en.json` — config_flow + options_flow + issues | DELTA-012 — 2026-04-10 |
| History + Export views | `HseHistoryView` + `HseExportView` dans `costs.py` (pas de fichiers séparés) | DELTA-015 — 2026-04-10 |
| Shared UI/CSS | `shared/ui/dom.js`, `table.js` — ES modules (migration V2 IIFE→ES) | DELTA-016 — 2026-04-10 |
| Shared styles | `hse_tokens.shadow.css`, `hse_themes.shadow.css`, `hse_alias.v2.css`, `tokens.css` | DELTA-016 — 2026-04-10 |
| `repairs.py` | Adapté V2→V3 — lecture via `HseStorageManager`, appel au démarrage (non bloquant) | DELTA-013 — 2026-04-10 |
| `services.yaml` | 8 services déclarés (catalogue_refresh, meta_sync, export_data, migrate_cleanup, reset_*, set_*) | DELTA-014 — 2026-04-10 |
| 8 `*_view.js` | Présents et vérifiés — audit fichier par fichier confirmé | DELTA-017 — 2026-04-10 |
| `.DS_Store` | Supprimé du repo + `.gitignore` ajouté à la racine | DELTA-018 — 2026-04-10 |
| Nom fichier `hse_fetch.js` | Correction doc : séparateur `_` (pas `.`) confirmé dans `00_methode_front_commune.md` §5 | DELTA-019 — 2026-04-10 |
| Stubs `week/month/year` + distinction REST vs service HA | Notes ajoutées dans `10_api_contrat.md` (§overview + §catalogue/refresh + §history) | DELTA-020 — 2026-04-10 |
| Nature chantier API Phases 2–3 | Modules V2 portés, pas réinventés — audit complet réalisé le 2026-04-12 | DELTA-021 — 2026-04-12 fermé |
| Calcul énergie par période | `engine/period_stats.py` à créer — delta recorder sur day/week/month/year | DELTA-022 — 2026-04-12 |
| `overview.py` stubs + by_type | À brancher sur `period_stats` + `totals_by_type` | DELTA-023 — 2026-04-12 |
| `costs.py` — énergie période + historique | À brancher sur `period_stats` + `analytics.py` | DELTA-024 — 2026-04-12 |
| `quality_score` entier 0-100 | `scan.py` + `catalogue.py` à brancher sur `quality_scorer.score_item()` | DELTA-025 — 2026-04-12 |
| `diagnostic.py` friendly_name + config checkbox | Corrections qualité | DELTA-026 — 2026-04-12 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `CODE_MANQUANT` | Fichier ou fonction absent — bloque l'onglet |
| 🟡 | `CODE_INCORRECT` | Fichier présent mais retourne une valeur fausse |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Ordre de résolution des écarts actifs

```
DELTA-022 (créer engine/period_stats.py)
    └─► DELTA-023 (overview.py — brancher period_stats + totals_by_type)
    └─► DELTA-024 (costs.py — brancher period_stats + analytics.py)
DELTA-025 (scan.py + catalogue.py — quality_score entier)
DELTA-026 (diagnostic.py + config_view.js — corrections qualité)
```

---

## Écarts actifs

---

### 🔴 DELTA-022 — `CODE_MANQUANT` — `engine/period_stats.py` à créer

**Ouvert le :** 2026-04-12
**Priorité :** CRITIQUE — débloque DELTA-023 et DELTA-024
**Onglets bloqués :** Overview (semaine/mois/année), Costs (tableau énergie), Export CSV

#### Problème

Il n'existe aucun module capable de calculer l'énergie consommée sur une période (day/week/month/year).
`engine/analytics.py` fait du mois-par-mois sur 12 mois, mais rien ne calcule le delta d'un compteur
cumulatif sur une fenêtre arbitraire. `overview.py` et `costs.py` ont tous les deux besoin de cela.

#### Ce qu'il faut créer : `custom_components/hse/engine/period_stats.py`

```python
"""
HSE V3 — engine/period_stats.py
Calcul de l'énergie consommée sur une période via le recorder HA natif.

Principe : pour un compteur cumulatif (state_class = total_increasing),
l'énergie sur une période = dernier état connu dans la fenêtre - premier état connu.

Dépendances : homeassistant.components.recorder (synchrone → executor)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

# Fenêtres temporelles par période
def _window_for_period(period: str) -> tuple[datetime, datetime]:
    """
    Retourne (start, end) UTC pour la période demandée.
    end = maintenant. start = début de la fenêtre.
    """
    now = datetime.now(timezone.utc)
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _delta_from_states(state_list: list[Any]) -> float:
    """
    Énergie = dernier état valide - premier état valide de la liste.
    Retourne 0.0 si impossible à calculer.
    """
    first_val = None
    last_val = None
    for s in state_list:
        state_str = getattr(s, "state", None)
        if state_str and str(state_str).lower() not in ("unavailable", "unknown", "none", ""):
            v = _safe_float(state_str)
            if v is not None:
                if first_val is None:
                    first_val = v
                last_val = v
    if first_val is not None and last_val is not None and last_val >= first_val:
        return round(last_val - first_val, 3)
    return 0.0


async def async_energy_for_period(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> dict[str, float]:
    """
    Calcule l'énergie consommée (kWh) sur la période pour chaque entity_id fourni.

    Paramètres
    ----------
    entity_ids : list[str]
        Liste des entity_id à interroger.
    period : "day" | "week" | "month" | "year"

    Retourne
    --------
    dict[entity_id → kwh: float]
    Toujours retourné, même si vide ou en cas d'erreur (0.0 par défaut).
    """
    if not entity_ids:
        return {}

    try:
        from homeassistant.components.recorder import history as rec_history
    except ImportError:
        _LOGGER.warning("HSE period_stats: recorder non disponible")
        return {eid: 0.0 for eid in entity_ids}

    start, end = _window_for_period(period)
    result: dict[str, float] = {eid: 0.0 for eid in entity_ids}

    try:
        def _fetch():
            return rec_history.get_significant_states(
                hass, start, end, entity_ids, minimal_response=True
            )

        states_map: dict[str, list[Any]] = await hass.async_add_executor_job(_fetch)

        for eid in entity_ids:
            state_list = states_map.get(eid) or []
            result[eid] = _delta_from_states(state_list)

    except Exception:
        _LOGGER.exception("HSE period_stats: erreur recorder pour période %s", period)

    return result


async def async_total_energy_for_period(
    hass: HomeAssistant,
    entity_ids: list[str],
    period: str = "month",
) -> float:
    """
    Somme de l'énergie (kWh) de tous les entity_ids sur la période.
    Raccourci pour overview.py.
    """
    per_entity = await async_energy_for_period(hass, entity_ids, period)
    return round(sum(per_entity.values()), 3)
```

#### Validation

- Tester avec une entité `sensor.xxx_energy` qui a `state_class: total_increasing`
- `period="day"` doit retourner un delta cohérent avec la valeur HA "Energy" du jour
- `period="month"` doit correspondre à la somme des deltas journaliers du mois

#### Fermeture

Fermer ce DELTA quand `engine/period_stats.py` est commité et ses deux fonctions importées avec succès dans `overview.py` (DELTA-023) et `costs.py` (DELTA-024).

---

### 🔴 DELTA-023 — `CODE_INCORRECT` — `api/views/overview.py` : week/month/year hardcodés + by_type vide

**Ouvert le :** 2026-04-12
**Dépend de :** DELTA-022 (period_stats.py doit exister)
**Priorité :** CRITIQUE — onglet Overview affiche 0 kWh permanent sur 3 colonnes sur 4
**Fichier :** `custom_components/hse/api/views/overview.py`

#### Problème 1 — week/month/year = 0.0 hardcodés

Dans `HseOverviewView.get()`, la clé `consumption` contient :
```python
"week_kwh": 0.0,   # ← jamais calculé
"week_eur": 0.0,
"month_kwh": 0.0,  # ← jamais calculé
"month_eur": 0.0,
"year_kwh": 0.0,   # ← jamais calculé
"year_eur": 0.0,
```

#### Problème 2 — by_type = [] hardcodé

```python
"by_type": [],  # ← group_totals.totals_by_type() jamais appelé
```

`engine/group_totals.py` contient `totals_by_type(catalogue, meta_store, states)` prête à l'emploi.

#### Correction à appliquer dans `overview.py`

**Ajout des imports en tête de fichier :**
```python
from ...engine.period_stats import async_energy_for_period
from ...engine.cost import cost_summary
from ...engine.group_totals import totals_by_type
```

**Dans `HseOverviewView.get()`, après le calcul de `states`, ajouter :**
```python
# Calcul énergie par période pour tous les capteurs sélectionnés
periods = {}
for p in ("day", "week", "month", "year"):
    kwh = await async_energy_for_period(hass=self.hass, entity_ids=selected_ids, period=p)
    total_kwh = sum(kwh.values())
    periods[p] = {
        "kwh": round(total_kwh, 3),
        "eur": cost_summary(total_kwh, settings)["cost_ttc_eur"],
    }
```

**Remplacer le bloc `consumption` hardcodé par :**
```python
"consumption": {
    "today_kwh": periods["day"]["kwh"],
    "today_eur": periods["day"]["eur"],
    "week_kwh": periods["week"]["kwh"],
    "week_eur": periods["week"]["eur"],
    "month_kwh": periods["month"]["kwh"],
    "month_eur": periods["month"]["eur"],
    "year_kwh": periods["year"]["kwh"],
    "year_eur": periods["year"]["eur"],
},
```

**Remplacer `"by_type": []` par :**
```python
"by_type": totals_by_type(catalogue, meta, states),
```

Note : `meta` est déjà chargé dans la view (`meta = await mgr.async_load_meta()`).

#### Fermeture

Fermer ce DELTA quand `overview.py` retourne des valeurs réelles pour week/month/year et que `by_type` n'est plus vide.

---

### 🔴 DELTA-024 — `CODE_INCORRECT` — `api/views/costs.py` : énergie instantanée + historique stub

**Ouvert le :** 2026-04-12
**Dépend de :** DELTA-022 (period_stats.py doit exister)
**Priorité :** CRITIQUE — onglet Costs affiche des kWh incorrects + aucun historique
**Fichier :** `custom_components/hse/api/views/costs.py`

#### Problème 1 — HseCostsView : `energy_kwh` = valeur brute du compteur, pas la période

Dans `HseCostsView.get()` :
```python
en = get_energy_kwh(state_obj) or 0.0   # ← valeur brute du compteur cumulatif à l'instant T
cost = cost_summary(en, settings)        # ← coût calculé sur cette valeur fausse
```
La vue accepte un paramètre `period` (day/week/month/year) mais ne l'utilise jamais pour filtrer.
L'export CSV (`HseExportView`) hérite du même défaut car il instancie `HseCostsView`.

#### Correction à appliquer dans HseCostsView

**Ajout import :**
```python
from ...engine.period_stats import async_energy_for_period
```

**Dans `HseCostsView.get()`, après le chargement de `selected`, calculer les énergies par période :**
```python
# Récupérer les entity_ids sélectionnés
selected_eids = [
    (item.get("source") or {}).get("entity_id")
    for item in selected
    if (item.get("source") or {}).get("entity_id")
]

# Calcul énergie sur la période demandée (recorder)
energy_map = await async_energy_for_period(
    hass=self.hass,
    entity_ids=selected_eids,
    period=period,
)
```

**Dans la boucle sur les items, remplacer :**
```python
en = get_energy_kwh(state_obj) or 0.0
```
**par :**
```python
en = energy_map.get(eid, 0.0)
```

#### Problème 2 — HseHistoryView : `points: []` hardcodé, analytics.py jamais appelé

```python
# Stub actuel dans HseHistoryView.get() :
return self.json_ok({
    "entity_id": entity_id,
    "granularity": granularity,
    "points": [],   # ← analytics.py importé nulle part
})
```

`engine/analytics.py` contient `async_history_12months(hass, entity_id, granularity)` complète.
Il faut aussi calculer `eur_ttc` par point (analytics.py retourne `eur_ttc: 0.0`).

#### Correction à appliquer dans HseHistoryView

**Ajout imports :**
```python
from ...engine.analytics import async_history_12months
from ...engine.cost import cost_eur
```

**Remplacer intégralement le corps de `HseHistoryView.get()` après la validation par :**
```python
mgr = HseStorageManager(self.hass)
settings = await mgr.async_load_settings()

# Vérification entity_id dans le catalogue si fourni
if entity_id:
    catalogue = await mgr.async_load_catalogue()
    items = catalogue.get("items") or {}
    known = any(
        (v.get("source") or {}).get("entity_id") == entity_id
        for v in items.values() if isinstance(v, dict)
    )
    if not known:
        return self.json_error(f"{entity_id} inconnu du catalogue", HTTPStatus.NOT_FOUND)

result = await async_history_12months(self.hass, entity_id, granularity=granularity)

# Enrichissement eur_ttc par point
for pt in result.get("points", []):
    kwh = pt.get("kwh", 0.0)
    pt["eur_ttc"] = round(cost_eur(kwh, settings)["ttc"], 2)

return self.json_ok(result)
```

Note : `cost_eur(kwh, settings)` retourne `{"ht": float, "ttc": float}`.
Vérifier la signature exacte dans `engine/cost.py` avant de commiter.

#### Fermeture

Fermer ce DELTA quand :
1. `HseCostsView` retourne l'énergie sur la période réelle (pas la valeur brute)
2. `HseHistoryView` retourne les 12 points mensuels avec `eur_ttc` calculé

---

### 🟡 DELTA-025 — `CODE_INCORRECT` — `scan.py` + `catalogue.py` : quality_score string au lieu d'entier

**Ouvert le :** 2026-04-12
**Priorité :** IMPORTANTE — badge qualité affiché comme "ok"/"warning" au lieu de 0-100
**Fichiers :** `custom_components/hse/api/views/scan.py` et `api/views/catalogue.py`

#### Problème dans scan.py

```python
# scan.py ligne ~58 :
"quality_score": c.get("status"),   # ← retourne "ok" / "warning" / "error" (string)
```

Le frontend `scan_view.js` utilise `data-score="${it.quality_score}"` et s'attend à un entier 0-100.
`sensors/quality_scorer.py` contient `score_item(item, ha_state)` qui retourne un int 0-100.

Mais `scan.py` travaille sur les `candidates` du scan, pas sur les items du catalogue.
Les candidats ne sont pas encore dans le catalogue → on peut calculer un score "estimé" à partir
des attributs HA disponibles.

#### Correction dans scan.py

**Ajout import :**
```python
from ...sensors.quality_scorer import score_item
```

**Créer un item synthétique pour scorer les candidats :**
```python
# Dans la boucle sur candidates, remplacer "quality_score": c.get("status") par :
state_obj = self.hass.states.get(eid)
# Construire un item minimal pour quality_scorer
synthetic_item = {
    "source": {
        "entity_id": eid,
        "kind": c.get("kind"),
        "unit": (getattr(state_obj, "attributes", {}) or {}).get("unit_of_measurement"),
        "device_class": (getattr(state_obj, "attributes", {}) or {}).get("device_class"),
        "state_class": (getattr(state_obj, "attributes", {}) or {}).get("state_class"),
        "last_seen_state": getattr(state_obj, "state", None),
    }
}
ha_state_raw = getattr(state_obj, "state", None) if state_obj else None
quality_score_int = score_item(synthetic_item, ha_state_raw)
```

**Puis utiliser `quality_score_int` dans le dict résultat.**

#### Problème dans catalogue.py

```python
# catalogue.py ligne ~55 :
"quality_score": (item.get("health") or {}).get("escalation", "none"),
# ← retourne "none"/"warning_15m"/"error_24h" (string d'escalation, pas un score)
```

**Correction dans catalogue.py :**
```python
from ...sensors.quality_scorer import score_item
# ...
state_obj = self.hass.states.get(eid)
ha_state_raw = getattr(state_obj, "state", None) if state_obj else None
"quality_score": score_item(item, ha_state_raw),
```

#### Fermeture

Fermer ce DELTA quand `scan.py` et `catalogue.py` retournent tous les deux un entier 0-100 pour `quality_score`.

---

### 🟡 DELTA-026 — `CODE_INCORRECT` — `diagnostic.py` + `config_view.js` : corrections qualité

**Ouvert le :** 2026-04-12
**Priorité :** SECONDAIRE — n'empêche pas le fonctionnement de base
**Fichiers :** `api/views/diagnostic.py` et `web_static/panel/features/config/config_view.js`

#### Problème 1 — diagnostic.py : `name` = entity_id brut au lieu du friendly_name

```python
# diagnostic.py ligne ~45 :
sensors_out.append({
    "entity_id": eid,
    "name": eid,          # ← friendly_name non utilisé
    ...
})
```

**Correction :**
```python
state_obj = self.hass.states.get(eid)
friendly = (getattr(state_obj, "attributes", {}) or {}).get("friendly_name") or eid
sensors_out.append({
    "entity_id": eid,
    "name": friendly,     # ← friendly_name HA
    ...
})
```

#### Problème 2 — diagnostic.py : `repairs: []` hardcodé

La view retourne toujours `"repairs": []` sans interroger l'API HA Repairs.
Ce point est de moindre priorité (HA Repairs est rarement peuplé) mais doit être noté.

**Pour l'instant : documenter dans le code avec un commentaire `# TODO DELTA-026`.**
L'implémentation HA Repairs nécessite `homeassistant.components.repairs` — à vérifier
la disponibilité dans les versions HA supportées (manifest.json `homeassistant: ">=2024.1"`).

#### Problème 3 — config_view.js : checkbox "check-all" sans handler

Dans `config_view.js`, le HTML génère `<input type="checkbox" class="cfg-check-all">` dans
la section `_buildCatalogueSection()`, mais aucun event listener n'est attaché à ce sélecteur
dans `_bindSectionEvents()`.

**Correction dans `_bindSectionEvents(data)` :**
```javascript
this._root.querySelector('.cfg-check-all')?.addEventListener('change', (e) => {
  this._root.querySelectorAll('.cfg-row-check').forEach(cb => cb.checked = e.target.checked);
});
```

Note : vérifier que les lignes du tableau config ont bien la classe `cfg-row-check`
(et non `scan-row-check`) sinon adapter le sélecteur.

#### Fermeture

Fermer ce DELTA quand :
1. `diagnostic.py` affiche les friendly_names HA dans la liste des capteurs
2. `diagnostic.py` a un commentaire `# TODO DELTA-026` sur la ligne `"repairs": []`
3. `config_view.js` a un handler fonctionnel pour `cfg-check-all`

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-021 | 2026-04-12 | Audit exhaustif réalisé — les modules backend sont des portages complets (non des stubs). 5 défauts identifiés → DELTA-022 à 026 ouverts. |
| DELTA-020 | 2026-04-10 | `10_api_contrat.md` : note stubs `0.0` sur `week/month/year` (§overview) + note distinction `POST /catalogue/refresh` REST vs service HA `hse.catalogue_refresh` + note stub `points: []` sur `/history` |
| DELTA-019 | 2026-04-10 | `00_methode_front_commune.md` §5 : `hse.fetch.js` → `hse_fetch.js` (séparateur `_` conforme DELTA-006) + note explicative ajoutée |
| DELTA-018 | 2026-04-10 | `.DS_Store` supprimé du repo + `.gitignore` ajouté à la racine |
| DELTA-017 | 2026-04-10 | 8 `*_view.js` — audit réel confirmé : tous présents (overview, diagnostic, scan, config, custom, cards, migration, costs) |
| DELTA-016 | 2026-04-10 | Shared frontend — `shared/ui/dom.js` + `table.js` (ES modules) + 4 fichiers CSS |
| DELTA-015 | 2026-04-10 | `HseHistoryView` + `HseExportView` — classes dans `costs.py`, enregistrement ajouté dans `__init__.py` |
| DELTA-014 | 2026-04-10 | `services.yaml` — 8 services déclarés : catalogue_refresh, meta_sync, export_data, migrate_cleanup, reset_catalogue, reset_settings, reset_meta, set_entity_assignment, set_triage_policy |
| DELTA-013 | 2026-04-10 | `repairs.py` — adaptation V2→V3 (lecture via `HseStorageManager`), appel non bloquant au démarrage dans `__init__.py` |
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `translations/en.json` — config_flow + options_flow + issues |
| DELTA-011 | 2026-04-10 | `hse_panel.html` + `hse_panel.js` (réécriture V3) + `style.hse.panel.css` + panel registration |
| DELTA-003 | 2026-04-09 | 8 dossiers views JS créés — `web_static/panel/features/<id>/` |
| DELTA-002 | 2026-04-09 | Shell JS — `hse_fetch.js` + `hse_store.js` + `hse_shell.js` |
| DELTA-004 Bloc 4 | 2026-04-09 | Toutes les views `api/views/` — 19 classes, 11 fichiers |
| DELTA-004 Bloc 3 | 2026-04-09 | `engine/__init__.py` + `cost.py` + `calculation.py` + `group_totals.py` + `analytics.py` |
| DELTA-004 Bloc 2 | 2026-04-09 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` |
| DELTA-004 Bloc 1 | 2026-04-09 | `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` |
| DELTA-010 | 2026-04-08 | `frontend_manifest.py` conservé |
| DELTA-009 | 2026-04-08 | Capteur référence → `storage/manager.py` |
| DELTA-008 | 2026-04-08 | Migration : Hypothèse A |
| DELTA-007 | 2026-04-08 | Source repo V2 : `silentiss-jean/hse` |
| DELTA-006 | 2026-04-08 | Nommage frontend : séparateur `_` |
| DELTA-005 | 2026-04-08 | `10_api_contrat.md` rédigé |
| DELTA-001 | 2026-04-08 | Payload `user_prefs` défini |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
