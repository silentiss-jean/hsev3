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

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🗂️ Carte du repo — état réel au 2026-04-13

> ✅ = fichier présent et conforme | 🔴 = manquant ou stub (voir écart DELTA-0XX)

```
hsev3/
├── README.md                                    ✅
├── .gitignore                                   ✅
├── hse_v3_synthese.md                           ✅
│
└── custom_components/hse/
    ├── __init__.py                              ✅
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅  (+ window_for_period, start_of_*/week/month/year)
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅
    ├── api/base.py + views/* (13 views)         ✅
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static/panel/shared/* (5 JS + 4 CSS) ✅
    └── web_static/panel/features/* (8 views JS) ✅
```

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` — V3 remplace V2 | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | Règle R4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — jamais localStorage | Règle R4 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Pas de `sensor.py` | Interdit — event `hse_sensors_ready` | `hse_v3_synthese.md` §2 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` : `hse_fetch.js`, etc. | DELTA-006 |
| `costs_by_entity` | Reçoit `energy_map` depuis recorder — jamais `get_energy_kwh(state)` | DELTA-029a |
| Fenêtres temporelles | `window_for_period()` depuis `time_utils` — pas de calcul inline | DELTA-029c |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | En cours de discussion |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée — résultats à venir |
| 🟡 | `ANOMALIE` | Anomalie trouvée pendant l'audit — correctif requis |
| ✅ | `ALIGNED` | Résolu et commité |

---

## Écarts actifs

### 🔎 AUDIT STATIQUE V3 — Plan en 7 phases

> **Contexte** : HSEv3 est 100% théorique — code écrit mais jamais exécuté ni installé dans HA.
> Objectif : vérifier logiquement, fichier par fichier, que **tout ce qui est censé fonctionner fonctionnera**.
> Périmètre : **code uniquement** (doc/synthèse déjà alignée). On ne relance pas l'IA sur la doc.
> Chaque phase génère ses propres DELTA-0XX si une anomalie est trouvée.

---

| ID | Statut | Phase | Périmètre | Fichiers concernés | Priorité |
|---|---|---|---|---|---|
| DELTA-027 | ✅ ALIGNED | **Phase 1 — Bootstrapping HA** | Séquence d'installation et de démarrage | `manifest.json`, `config_flow.py`, `options_flow.py`, `__init__.py`, `const.py` | 🔴 CRITIQUE |
| DELTA-028 | ✅ ALIGNED | **Phase 2 — Sécurité & Auth** | Tous les endpoints + base | `api/base.py`, `api/views/*.py` (13 fichiers) | 🔴 CRITIQUE |
| DELTA-029 | ✅ ALIGNED | **Phase 3 — Moteurs backend** | Calculs, cohérence des sorties | `engine/period_stats.py`, `engine/cost.py`, `engine/calculation.py`, `engine/group_totals.py`, `engine/analytics.py` | 🟡 IMPORTANT |
| DELTA-030 | ✅ ALIGNED | **Phase 4 — Contrat API ↔ Frontend** | Shape JSON retourné vs shape attendu par les views JS | `api/views/*.py` ↔ `features/*_view.js` (8 paires) | 🔴 CRITIQUE |
| DELTA-031 | ⬜ EN_ATTENTE | **Phase 5 — Frontend logique** | Règles R1–R5, flux de données, guard re-entrance, gestion erreurs | `hse_shell.js`, `hse_fetch.js`, `hse_store.js`, 8 `*_view.js` | 🟡 IMPORTANT |
| DELTA-032 | ⬜ EN_ATTENTE | **Phase 6 — Catalogue & Méta** | Cohérence lecture/écriture catalogue, assignments, sync | `catalogue/*.py`, `meta/*.py`, `storage/manager.py` | 🟡 IMPORTANT |
| DELTA-033 | ⬜ EN_ATTENTE | **Phase 7 — Cas limites & robustesse** | Valeurs manquantes, entités disparues, storage vide, premier démarrage | Tous les modules exposés à l'extérieur | 🟢 QUALITÉ |

---

### Détail de chaque phase

#### DELTA-027 — Phase 1 : Bootstrapping HA ✅

**Anomalies trouvées et corrigées (2026-04-13) :**
- **DELTA-027a** (🟡 mineur) : `DOMAIN`/`VERSION` redéfinis dans `__init__.py` — corrigé, import depuis `const.py`
- **DELTA-027b** (🔴 bloquant) : `async_get_options_flow` absent de `HseConfigFlow` — options flow mort-né — corrigé, méthode statique ajoutée
- **DELTA-027c** (🟡 moyen) : pas de guard sur `async_register_static_paths` — risque `ValueError` au reload — corrigé, try/except + check `_STATIC_DIR.exists()`

Commits : `94f684d` (`__init__.py`) | `930b2a9` (`config_flow.py`)

---

#### DELTA-028 — Phase 2 : Sécurité & Auth ✅

**Résultat audit (2026-04-13) :** `api/base.py` conforme. 13 views : héritage `HseBaseView` ✅, zéro `requires_auth=False` ✅, codes HTTP cohérents ✅, merge partiel `user_prefs` ✅.

**Anomalies trouvées et corrigées :**
- **DELTA-028a** (🟡 moyen) : `ping.py` — `from .. import HseBaseView` → `ImportError` au démarrage — corrigé, import uniformé vers `from ..base import HseBaseView`
- **DELTA-028b** (🟡 mineur) : `catalogue.py` — flag `_SCANNING = False` module-level orphelin — corrigé, ligne supprimée

Commits : `da147d2` (`ping.py`) | `4112300` (`catalogue.py`)

---

#### DELTA-029 — Phase 3 : Moteurs backend ✅

**Résultat audit (2026-04-13) :** `cost.py` et `calculation.py` conformes sans modification. Trois anomalies corrigées.

**Anomalies trouvées et corrigées :**
- **DELTA-029a** (🔴 bloquant) : `group_totals.costs_by_entity` lisait `get_energy_kwh(state)` (cumulatif total) au lieu de l'énergie sur la période — corrigé, signature enrichie `energy_map: dict[str, float]` fourni par la view via `async_energy_for_period`
- **DELTA-029b** (🟡 mineur) : `analytics.py` — variable `raw` orpheline jamais lue — corrigée, ligne supprimée
- **DELTA-029c** (🟡 moyen) : logique de fenêtres temporelles dupliquée entre `period_stats` et `analytics` — corrigé, `window_for_period` + `start_of_*` centralisés dans `time_utils.py`, `period_stats` réécrit pour importer depuis `time_utils`

Commits : `907469d` (`group_totals.py`) | `af83614` (`analytics.py`) | `3f7d068` (`time_utils.py`) | `b4eda50` (`period_stats.py`)

---

#### DELTA-030 — Phase 4 : Contrat API ↔ Frontend ✅

**Résultat audit (2026-04-13) :** 8 paires auditées. Aucune anomalie de code. 4 corrections de doc uniquement.

**Résultats paire par paire :**

| Endpoint | Backend | Frontend | Verdict |
|---|---|---|---|
| `GET /api/hse/overview` | `overview.py` | `overview_view.js` | ✅ ALIGNÉ — `by_room`/`by_type` produits mais non consommés (feature future, non bloquant) |
| `GET /api/hse/costs` + `/history` | `costs.py` | `costs_view.js` | ✅ ALIGNÉ — validation DELTA-029a confirmée : `async_energy_for_period` bien appelé |
| `GET /api/hse/diagnostic` | `diagnostic.py` | `diagnostic_view.js` | ✅ ALIGNÉ |
| `GET /api/hse/scan` | `scan.py` | `scan_view.js` | ✅ ALIGNÉ |
| `GET/PATCH /api/hse/catalogue` | `catalogue.py` | `config_view.js` | ✅ ALIGNÉ |
| `GET/PUT /api/hse/settings/pricing` | `settings.py` | `config_view.js` | ✅ ALIGNÉ |
| `GET/PATCH /api/hse/user_prefs` | `user_prefs.py` | `custom_view.js` | ✅ ALIGNÉ |

**Corrections doc appliquées dans ce commit :**
- **DELTA-030c** : doc écrivait `score` → corrigé en `score_pct` (valeur réelle produite par `diagnostic.py` et lue par `diagnostic_view.js`)
- **DELTA-030d** : doc écrivait `entities[]` → corrigé en `items[]` (valeur réelle produite par `scan.py` et lue par `scan_view.js`)
- **DELTA-030e** : doc écrivait `tariff.{ht_kwh,tva,abo_eur}` → corrigé en `{price_ttc_kwh, tax_rate_pct, subscription_eur_month}` (noms réels des clés dans `settings.py`)
- **DELTA-030f** : doc écrivait `GET/PUT /api/hse/settings` → corrigé en `GET/PUT /api/hse/settings/pricing` (URL réelle dans `settings.py`)

**Tableau de contrat corrigé (source de vérité pour DELTA-031+) :**

| Endpoint | View backend | View frontend | Clés JSON validées |
|---|---|---|---|
| `GET /api/hse/overview` | `overview.py` | `overview_view.js` | `power_now_w`, `consumption.{today,week,month,year}_{kwh,eur}`, `top5[].{name,power_w,pct}`, `status.{level,message}`, `reference_sensor.{delta_w,delta_pct}` |
| `GET /api/hse/costs` | `costs.py` | `costs_view.js` | `total_kwh`, `total_ttc_eur`, `items[].{name,entity_id,room,power_w,energy_kwh,cost_ttc_eur,pct_total}` |
| `GET /api/hse/history` | `costs.py (HseHistoryView)` | `costs_view.js` | `points[].{label,kwh,eur_ttc}` |
| `GET /api/hse/diagnostic` | `diagnostic.py` | `diagnostic_view.js` | `score_pct`, `sensors[].{entity_id,name,status,issues[]}`, `repairs[].{severity,description}`, `storage_stats.{total,selected,ignored,pending}`, `last_run_at` |
| `GET /api/hse/scan` | `scan.py` | `scan_view.js` | `total`, `page`, `per_page`, `items[].{entity_id,name,domain,device,quality_score,suggested_action}` |
| `GET/PATCH /api/hse/catalogue` | `catalogue.py` | `config_view.js` | `total`, `items[].{entity_id,name,room,type,status}` |
| `GET/PUT /api/hse/settings/pricing` | `settings.py` | `config_view.js` | `mode`, `price_ttc_kwh`, `subscription_eur_month`, `tax_rate_pct`, `price_hp_ttc_kwh`, `price_hc_ttc_kwh`, `price_ht_kwh` |
| `GET/PATCH /api/hse/user_prefs` | `user_prefs.py` | `custom_view.js` | `theme`, `glassmorphism`, `dynamic_bg`, `active_tab`, `overview_period`, `costs_period` |

**Note pour DELTA-032 :** vérifier que `catalogue.py` produit bien la clé `status` sur chaque item (lue par `config_view.js` pour le badge).

---

#### DELTA-031 — Phase 5 : Frontend logique

**Ce qu'on vérifie :**
- `hse_panel.js` : déclare bien `customPanelInfo` + importe `hse_shell.js` — pas de `localStorage`
- `hse_shell.js` : custom element `<hse-panel>` défini, routing onglets correct (index 0–7 → bons modules), `update_hass` propagé à la view active, `unmount` appelé au changement d'onglet
- `hse_fetch.js` : injecte `Authorization: Bearer` depuis `window.__hseToken`, gère les réponses non-2xx (throw), compatible AbortController
- `hse_store.js` : `get()` / `patch()` / `set()` cohérents — pas de mutation directe de l'objet retourné
- Pour chacun des 8 `*_view.js` : R1 (DOM construit dans mount), R2 (guard `_fetching`), R3 (sig JSON), R4 (zéro localStorage), R5 (skeleton), unmount annule le timer, erreur réseau affiche message

---

#### DELTA-032 — Phase 6 : Catalogue & Méta

**Ce qu'on vérifie :**
- `catalogue/manager.py` : lecture/écriture dans `storage/manager.py` — pas d'accès direct au fichier JSON
- `catalogue/scan_engine.py` : filtre correctement les domaines non-energy, retourne `quality_score` entier 0–100
- `catalogue/schema.py` : schéma volontaire (tous champs optionnels sauf `entity_id`) — pas de validation trop stricte qui bloquerait des ajouts partiels
- `meta/sync.py` : sync ne perd pas les assignments existants lors d'un refresh catalogue
- `meta/assignments.py` : pas de doublon room/type possible
- `storage/manager.py` : lecture asynchrone propre, écriture atomique (write temp + rename), gère le cas fichier absent (premier démarrage → dict vide)
- `sensors/quality_scorer.py` : retourne bien un `int` (pas un `float` ni une `str`)
- **Point DELTA-030** : vérifier que `catalogue.py` produit la clé `status` sur chaque item de la liste

---

#### DELTA-033 — Phase 7 : Cas limites & robustesse

**Ce qu'on vérifie :**
- **Premier démarrage** (storage vide) : toutes les views retournent un JSON valide vide, pas d'exception non capturée
- **Entité HA disparue** : catalogue référence un `entity_id` qui n'existe plus dans HA → overview/costs ne plante pas, affiche 0 W proprement
- **Recorder vide** : `period_stats.py` appelé sur une entité sans historique recorder → retourne `0.0`, pas `None` ni exception
- **Payload malformé** : POST/PATCH avec JSON invalide → 400 avec message clair, pas 500
- **Token expiré/absent** : fetch frontend reçoit 401 → message d'erreur affiché dans la view, pas boucle infinie
- **Onglet switché pendant un fetch** : `unmount()` annule l'AbortController avant que la réponse arrive — pas de setState sur composant démonté
- **50+ entités scannées** : `scan_view.js` gère la pagination (ou affiche un warning) — pas de DOM avec 500 lignes
- **Valeur NaN dans calculs** : `cost.py` + `calculation.py` ne retournent jamais `NaN` ou `Infinity` dans le JSON

---

## Règles d'exécution de l'audit

```
1. On traite UNE phase à la fois — dans l'ordre numérique
2. Pour chaque phase : lire le(s) fichier(s) → signaler les anomalies en EXPLORATION
3. Si anomalie confirmée → ouvrir un sous-DELTA (ex: DELTA-027a, DELTA-027b...) + générer le patch en mode COMMIT
4. Si aucune anomalie → fermer la phase (DELTA-0XX → ✅ ALIGNED)
5. Ne pas passer à la phase suivante avant que la précédente soit ✅
6. Résultat final attendu : DELTA-027 à 033 tous ✅ = V3 prête pour première installation
```

---

## Historique

| ID | Fermé le | Description |
|---|---|---|
| DELTA-030 | 2026-04-13 | Phase 4 Contrat API↔Frontend — 8 paires auditées, aucune anomalie code, 4 corrections doc (030c/d/e/f) |
| DELTA-029 | 2026-04-13 | Phase 3 Moteurs backend — 3 anomalies (029a/b/c) corrigées |
| DELTA-028 | 2026-04-13 | Phase 2 Sécurité & Auth — 2 anomalies (028a/b) corrigées |
| DELTA-027 | 2026-04-13 | Phase 1 Bootstrapping — 3 anomalies (027a/b/c) corrigées |
| DELTA-026 | 2026-04-13 | `diagnostic.py` + `config_view.js` |
| DELTA-025 | 2026-04-13 | `quality_score` entier — déjà présent |
| DELTA-024 | 2026-04-13 | `costs.py` — énergie période + historique |
| DELTA-023 | 2026-04-13 | `overview.py` — périodes + by_type |
| DELTA-022 | 2026-04-13 | `engine/period_stats.py` créé |
| DELTA-021 | 2026-04-12 | Audit exhaustif — 5 défauts → DELTA-022 à 026 |
| DELTA-020 | 2026-04-10 | `10_api_contrat.md` stubs + REST vs service |
| DELTA-019 | 2026-04-10 | `hse_fetch.js` séparateur `_` confirmé |
| DELTA-018 | 2026-04-10 | `.DS_Store` supprimé |
| DELTA-017 | 2026-04-10 | 8 `*_view.js` tous présents |
| DELTA-016 | 2026-04-10 | Shared frontend — dom.js + table.js + 4 CSS |
| DELTA-015 | 2026-04-10 | `HseHistoryView` + `HseExportView` dans `costs.py` |
| DELTA-014 | 2026-04-10 | `services.yaml` — 8 services |
| DELTA-013 | 2026-04-10 | `repairs.py` adapté V2→V3 |
| DELTA-012 | 2026-04-10 | `translations/fr.json` + `en.json` |
| DELTA-011 | 2026-04-10 | `hse_panel.js` réécriture V3 |
| DELTA-003 | 2026-04-09 | 8 dossiers views JS créés |
| DELTA-002 | 2026-04-09 | Shell JS — fetch + store + shell |
| DELTA-004 Blocs 1–4 | 2026-04-09 | Tous les modules backend créés |
| DELTA-010 à 001 | 2026-04-08 | Décisions fondatrices V3 |

---

## Workflow rapide

```
Début de session : lire DELTA.md → identifier les écarts du jour
EXPLORATION : pas de commit, ajouter EN_DISCUSSION si échange > 1 tour
COMMIT : patch doc + patch code en même temps → fermer la ligne
Fin de session : DELTA.md = état réel exact
```
