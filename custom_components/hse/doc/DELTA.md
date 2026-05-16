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
3. **Proposer de fermer** un écart quand la solution est validée — **mais attendre la confirmation humaine avant de passer à ✅**
4. **Distinguer** les deux modes de travail :
   - **EXPLORATION** → on réfléchit, rien n'est écrit, on ajoute une ligne `EN_DISCUSSION` si la discussion dure
   - **COMMIT** → décision prise, on pousse le patch code + doc → statut passe à `CORRECTIF_DEPLOYÉ` (pas encore `ALIGNED`)
5. **Ne jamais passer à `✅ ALIGNED`** sans que l'humain ait explicitement confirmé que le correctif fonctionne
6. **Vérifier la 🗂️ Carte du repo** ci-dessous pour connaître l'état réel de chaque fichier

### R0 — Vérifier avant de proposer une décision d'architecture

> Avant de proposer un changement architectural (intégration HA, mode de chargement, auth, cycle de vie),
> l'IA doit soit :
> - Citer une source vérifiable (code HA, doc officielle, précédent dans le repo)
> - Ou signaler explicitement : `⚠️ hypothèse non vérifiée — à confirmer avant commit`
>
> Toute décision non sourcée reste en statut `EN_DISCUSSION` et **ne peut pas passer en COMMIT**.

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🔒 Règle permanente — Cohérence inter-fichiers

| # | Paire | Question à poser systématiquement |
|---|---|---|
| P1 | `services.yaml` ↔ `__init__.py` | Chaque service déclaré a-t-il un `async_register` ET un `async_remove` au unload ? |
| P2 | `translations/*.json` ↔ `*_flow.py` | Les clés `options.step.init.data.*` matchent-elles **exactement** les noms de champs du `vol.Schema` ? |
| P3 | `__init__.py` imports ↔ modules réels | Chaque `from .X import Y` : la classe/fonction `Y` existe-t-elle **sous ce nom exact** dans `X` ? |
| P4 | `const.py` constantes ↔ consommateurs | Chaque constante définie est-elle importée et utilisée ? |
| P5 | `manifest.json` ↔ imports runtime | Les dépendances HA utilisées sont-elles dans `after_dependencies` ? |

---

## 🗂️ Carte du repo — état réel au 2026-05-16

```
hsev3/
├── README.md                                    ✅
├── hse_v3_synthese.md                           ✅
└── custom_components/hse/
    ├── __init__.py                              ✅ embed_iframe=False + module_url→hse_panel.js
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅
    ├── api/base.py + views/* (13 views)         ✅
    │   └── api/views/scan.py                   🟡 DELTA-053 CORRECTIF_DEPLOYÉ — non validé en prod
    ├── catalogue/scan_engine.py                 ✅ expose integration_domain + integration_label
    ├── catalogue/* (4 autres fichiers)          ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static_old/                          ⭐ Archive — référence uniquement, ne pas toucher
    ├── web_static/panel/
    │   ├── hse_panel.js                         ✅ Wrapper Custom Element HA + guard bureau virtuel macOS
    │   ├── hse_panel.html                       ✅ Page HTML bootstrap + 4 <link> CSS V5 (validé 2026-04-19)
    │   ├── style.hse.panel.css                  ✅ conservé
    │   └── shared/
    │       ├── hse_fetch.js                     ✅ conservé
    │       ├── hse_shell.js                     🟡 Commité 2026-04-18 — en attente de validation
    │       ├── hse_store.js                     ✅ conservé (à valider lors des tests)
    │       ├── styles/
    │       │   ├── hse_alias.v2.css             ✅ conservé
    │       │   ├── hse_components.shadow.css    ✅ conservé
    │       │   ├── hse_themes.shadow.css        ✅ conservé
    │       │   ├── hse_tokens.shadow.css        ✅ conservé
    │       │   ├── tokens.css                   ✅ conservé
    │       │   ├── hse.tokens.css               ✅ tokens globaux V5
    │       │   ├── hse.themes.css               ✅ 12 thèmes V5 + data-theme="default" alias light (validé 2026-04-19)
    │       │   ├── hse.glass.css                ✅ effet glass
    │       │   └── hse.base.css                 ✅ reset + base layout iframe
    │       ├── ui/                              ✅ conservé (dom.js, table.js)
    │       └── features/
    │           ├── scan/
    │           │   └── scan_view.js             🟡 DELTA-053 CORRECTIF_DEPLOYÉ — non validé en prod
    │           └── custom/
    │               └── custom_view.js           ✅ Onglet Custom/Personnalisation (validé 2026-04-19)
    └── doc/                                     ✅
```

---

## 📋 Index des décisions tranchées

| Sujet | Décision | Source |
|---|---|---|
| Domaine HA | `hse` | `hse_v3_synthese.md` §1 |
| Préfixe API | `/api/hse/` | `hse_v3_synthese.md` §3.1 |
| Auth token | `hse_fetch.js` injecte `Bearer` auto | Règle R4 |
| Persistance préfs UI | `PATCH /api/hse/user_prefs` — jamais localStorage | Règle R4 |
| Structure backend | Sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/` | `hse_v3_synthese.md` §3.2 |
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT, ne pas toucher | `hse_v3_synthese.md` §7 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| **Mode intégration HA** | **`embed_iframe: False`** — `hse_panel.js` (Custom Element) crée lui-même l'`<iframe>` et gère le postMessage token. | DELTA-052 (validé 2026-04-19) |
| **Front à refaire** | **Refonte complète page par page** — décision 2026-04-16 | DELTA-052 |
| **Système de thèmes** | **12 thèmes via `html[data-theme]`** — `hse.themes.css` V5. Glass via `html[data-glass="true"]`. Chargés via `<link>` statiques dans `hse_panel.html`. | DELTA-052 (validé 2026-04-19) |
| **CSS thèmes — fonds opaques** | `--hse-bg` (toujours opaque) sur les cards/panels racines. `--hse-surface` (semi-transparent) réservé aux cartes intérieures avec `backdrop-filter`. | DELTA-052 correctif 2026-04-19 |
| **Re-scan endpoint** | `POST /api/hse/scan` (pas `/catalogue/refresh`) | F1 — 2026-04-20 |
| **Inbox scan groupement** | Groupé par `integration_domain` (domaine technique stable) via `<details>` collapsibles. `integration_label` affiché en sous-titre si différent du domain. Catalogue aussi groupé. | F3 — DELTA-053 — 2026-05-16 |
| **scan_engine scope** | Scanne uniquement `sensor.*` avec `kind = energy \| power`. Entités sans état HA exclues. | `catalogue/scan_engine.py` |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | Réflexion en cours, rien de commité |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée, résultats à venir |
| 🟡 | `CORRECTIF_DEPLOYÉ` | Patch commité — **en attente de validation humaine** |
| ⭐ | `ABANDON` | Écart abandonné — problème noyé dans une refonte plus large |
| ✅ | `ALIGNED` | Fermé — **uniquement après confirmation humaine** |

---

## Écarts actifs

| ID | Statut | Titre | Fichiers impactés | Date |
|---|---|---|---|---|
| DELTA-053 | 🟡 `CORRECTIF_DEPLOYÉ` | Groupement scan par `integration_domain` (pas `integration_label`) | `api/views/scan.py` + `scan_view.js` | 2026-05-16 |
| DELTA-054 | 🟠 `EN_DISCUSSION` | Onglet Détection n'affiche pas les capteurs groupés par intégration | `hse_shell.js` + `scan_view.js` + possiblement `hse_panel.html` | 2026-05-16 |

---

## 🟠 DELTA-054 — Onglet Détection ne s'affiche pas (2026-05-16)

### Symptôme rapporté
L'onglet Détection ne montre pas les capteurs groupés par intégration, malgré le correctif DELTA-053 commité.

### Analyse des causes possibles (EXPLORATION — non encore confirmé)

Le backend est sain : `scan_engine.py` expose correctement `integration_domain` et `integration_label`
depuis la config entry réelle (`hass.config_entries.async_get_entry()`). `scan.py` les transmet tels quels.

Les hypothèses à vérifier par ordre de priorité :

#### H1 — `hse_shell.js` ne monte pas `scan_view.js` (priorité HAUTE)
`hse_shell.js` est 🟡 `CORRECTIF_DEPLOYÉ` mais **non validé en prod**. Si le shell ne charge pas
`ScanView` ou ne l'enregistre pas sur l'onglet "Détection", l'onglet affiche un écran vide
ou le skeleton ne disparaît jamais.

**Vérification** : ouvrir la console JS dans l'iframe et chercher :
- `import('./features/scan/scan_view.js')` — s'exécute-t-il ?
- `Uncaught SyntaxError` ou `404` sur le fichier JS ?
- `ScanView.mount()` — est-il appelé ?

#### H2 — `hse_panel.html` ne déclare pas le bon chemin pour `scan_view.js` (priorité HAUTE)
Si `hse_panel.html` importe `hse_shell.js` avec un chemin relatif incorrect, ou si `hse_shell.js`
fait un `import()` dynamique vers un chemin qui ne correspond pas au chemin servi par HA
(`/hse-static/...`), le fichier ne charge pas silencieusement.

**Vérification** : dans la console, onglet Network — chercher une requête 404 vers `scan_view.js`.

#### H3 — HA n'a pas redémarré depuis le commit DELTA-053 (priorité MOYENNE)
`scan.py` et `scan_view.js` ont été commités mais si HA n'a pas rechargé l'intégration, l'ancien
code (sans `integration_domain`) tourne encore. Le front reçoit alors `undefined` pour ce champ
et le fallback `|| 'unknown'` groupe tout sous `"unknown"`.

**Vérification** : appeler `GET /api/hse/scan` directement (curl ou DevTools) et inspecter
le JSON — les items ont-ils le champ `integration_domain` avec une valeur non-`"unknown"` ?

#### H4 — `scan_engine.py` retourne 0 candidats (priorité FAIBLE)
`scan_engine.py` filtre strict : uniquement `sensor.*` avec `device_class = energy/power`
OU `unit ∈ {kWh, Wh, W, kW}`. Si les capteurs de l'installation ne matchent pas ces critères,
`candidates` est vide et l'inbox affiche "Aucune entité non triée" — ce qui est correct mais
peut sembler bugué.

**Vérification** : inspecter la réponse JSON de `GET /api/hse/scan` — `total` vaut-il 0 ?

### ⚠️ Blocage actuel
Impossible de trancher sans les logs de la console JS dans l'iframe ET le JSON brut de
`GET /api/hse/scan`. Les deux sont nécessaires.

### Plan de debug
1. Ouvrir les DevTools HA → onglet panel HSE → inspecter l'iframe
2. Console : chercher erreurs JS (404, SyntaxError, TypeError)
3. Network : chercher requête vers `/api/hse/scan` — status + réponse JSON
4. Si JSON OK et `integration_domain` présent → bug dans `hse_shell.js` (H1)
5. Si JSON OK mais `integration_domain = "unknown"` partout → redémarrer HA (H3)
6. Si JSON absent (404 ou erreur auth) → problème de routing API ou token

### Statut
🟠 `EN_DISCUSSION` — en attente des logs de debug. Ne pas commiter de correctif avant confirmation.

---

## 🟡 DELTA-053 — Groupement scan par integration_domain (2026-05-16)

### Symptôme
Les entités s'affichaient groupées par `integration_label` (ex: `tuya@ftoure.net` = titre d'instance HA)
au lieu de `integration_domain` (ex: `tuya` = nom technique de l'intégration).

### Cause racine
`api/views/scan.py` fusionnait les deux champs en un seul champ `integration` :
```python
# AVANT (incorrect)
"integration": c.get("integration_label") or c.get("platform") or "unknown"
```
Et `scan_view.js` groupait sur ce champ unique :
```js
const key = item.integration || 'unknown';  // recevait le label d'instance
```

### Correction appliquée
1. **`scan.py`** — expose deux champs séparés :
   - `integration_domain` : domaine technique = clé de groupement stable (`"tuya"`, `"tplink"`)
   - `integration_label` : titre de l'instance (`"tuya@ftoure.net"`) — affiché en sous-titre
2. **`scan_view.js` `_groupByIntegration()`** — groupe sur `item.integration_domain`
3. **`scan_view.js` `_buildGroupsHTML()`** — affiche `integration_label` en sous-titre grisé si ≠ domain
4. **`scan_view.js` `_buildCatGroups()`** — catalogue aussi groupé par intégration (remplace `_buildCatTable()` plate)
5. **Rétrocompat** : fallback sur `item.integration` si champs absents (migration partielle)

### Statut
🟡 `CORRECTIF_DEPLOYÉ` — commité 2026-05-16. Non validé en prod (bloqué par DELTA-054).
Fermer uniquement après confirmation que l'onglet Détection affiche bien les groupes.

---

## ✅ DELTA-052 — Refonte complète du frontend (fermé 2026-04-19)

### Contexte

Le front existant (`web_static/panel/`) a accumulé trop de dette :

- Shadow DOM sans style malgré plusieurs tentatives de correctif
- CSS inliné non appliqué (fond noir persistant)
- Architecture de chargement fragile (imports dynamiques échouent silencieusement)
- Bug irréductible : écran noir au retour de bureau virtuel macOS — non résolu en V2 malgré plusieurs tentatives

**Décision 2026-04-16 :** on efface et on repart de zéro, page par page.

### Ordre de reconstruction — mis à jour 2026-05-16

| Ordre | Fichier | Description | Statut |
|-------|---------|-------------|--------|
| 0a | `__init__.py` | `embed_iframe: False` + `module_url` → `hse_panel.js` | ✅ Validé |
| 0b | `web_static/panel/hse_panel.js` | Wrapper Custom Element HA + guard bureau virtuel | ✅ Validé |
| 0c | `web_static/panel/hse_panel.html` | Bootstrap iframe + 4 `<link>` CSS V5 | ✅ Validé 2026-04-19 |
| 0d | `shared/styles/hse.tokens.css` | Tokens globaux V5 | ✅ Validé |
| 0d | `shared/styles/hse.themes.css` | 12 thèmes V5 + alias `default` | ✅ Validé 2026-04-19 |
| 0d | `shared/styles/hse.glass.css` | Effet glass V5 | ✅ Validé |
| 0d | `shared/styles/hse.base.css` | Reset + base layout V5 | ✅ Validé |
| 1 | `shared/hse_shell.js` | Shell principal — routing onglets | 🟡 Commité — **bloqué DELTA-054** |
| 2 | `features/overview/overview_view.js` | Onglet Overview | ❓ À faire — **bloqué DELTA-054** |
| 3 | `features/diagnostic/diagnostic_view.js` | Onglet Diagnostic | ❓ À faire |
| 4 | `features/scan/scan_view.js` | Onglet Scan | 🟡 DELTA-053 — **bloqué DELTA-054** |
| 5 | `features/config/config_view.js` | Onglet Config | ❓ À faire |
| 6 | `features/costs/costs_view.js` | Onglet Costs | ❓ À faire |
| 7 | `features/migration/migration_view.js` | Onglet Migration | ❓ À faire |
| 8 | `features/cards/cards_view.js` | Onglet Cards | ❓ À faire |
| 9 | `features/custom/custom_view.js` | Onglet Custom/Personnalisation | ✅ Validé 2026-04-19 |

### Correctifs appliqués dans scan_view.js

| ID | Nature | Détail |
|----|--------|--------|
| F1 | Bug URL | `_triggerRescan()` appelait `POST /api/hse/catalogue/refresh` → corrigé en `POST /api/hse/scan`. La réponse du POST est injectée directement sans second GET. Gestion 409. |
| F2 | UX inbox | Inbox groupée par `item.integration` via `<details>` collapsibles (remplacé par F3). |
| F3 | Bug groupement | Groupement sur `integration_domain` (domaine technique) au lieu de `integration_label` (titre d'instance). Catalogue aussi groupé. Voir DELTA-053. |

### Contraintes non négociables (permanentes)

- **R1** — `mount()` construit le DOM une fois. `update_hass()` ne touche jamais le DOM. `unmount()` nettoie tout.
- **R2** — Flag `_fetching` sur chaque fetch
- **R3** — Signature `JSON.stringify` avant tout `_render()`
- **R4** — Zéro `localStorage` — tout passe par `PATCH /api/hse/user_prefs`
- **R5** — Skeleton `.hse-skeleton` posé dans `mount()` avant le premier fetch
- Tous les appels HTTP via `ctx.hseFetch`
- Vanilla JS uniquement
- **Fonds racines** : `var(--hse-bg)` toujours opaque — `var(--hse-surface)` réservé aux cartes avec `backdrop-filter`

---

## Écarts abandonnés (2026-04-16)

Tous les écarts suivants sont abandonnés car noyés dans DELTA-052 (refonte complète du front).

| ID | Titre original | Raison de l'abandon |
|---|---|---|
| DELTA-045 | `HseSettingsView` → `HseSettingsPricingView` | Front à recoder — problème de nommage irrelevant avec la refonte |
| DELTA-046 | CSS Shadow DOM non injecté | Absorbé par DELTA-052 |
| DELTA-047 | `hse_components.shadow.css` manquant | Absorbé par DELTA-052 |
| DELTA-048 | Fond noir résiduel | Absorbé par DELTA-052 |
| DELTA-049 | Guard navigation rapide | Absorbé par DELTA-052 |
| DELTA-050 | CSS inliné dans `hse_shell.js` | Absorbé par DELTA-052 |
| DELTA-051 | `HseMigrationExportView` + `HseMigrationApplyView` non enregistrées | `__init__.py` corrigé — sera vérifié lors du test onglet migration |

---

## Phases de l'audit statique V3 (toutes ✅)

| ID | Statut | Phase |
|---|---|---|
| DELTA-027 | ✅ | Phase 1 — Bootstrapping HA |
| DELTA-028 | ✅ | Phase 2 — Sécurité & Auth |
| DELTA-029 | ✅ | Phase 3 — Moteurs backend |
| DELTA-030 | ✅ | Phase 4 — Contrat API ↔ Frontend |
| DELTA-031 | ✅ | Phase 5 — Frontend logique |
| DELTA-032 | ✅ | Phase 6 — Catalogue & Méta |
| DELTA-033 | ✅ | Phase 7 — Cas limites & robustesse |

---

## Anomalies hors-audit (fermées ✅)

| ID | Titre | Fichier(s) |
|---|---|---|
| DELTA-034 | Panel HA doublon sur reload | `__init__.py` |
| DELTA-035 | 9 services sans handler | `__init__.py` |
| DELTA-036 | Migration V2→V3 no-action | `config_flow.py` |
| DELTA-037 | `HseMigrationView` inexistante | `migration.py` |
| DELTA-038 | `default_settings()` absente | `storage/manager.py` |
| DELTA-039 | Clés traduction options erronées | `fr.json` + `en.json` |
| DELTA-040 | `LEGACY_V1_PREFIX` non utilisé | `migration.py` + `const.py` |
| DELTA-041 | `recorder` absent de `manifest.json` | `manifest.json` |
| DELTA-042 | `CATALOGUE_REFRESH_INTERVAL_S` non planifié | `const.py` |
| DELTA-043 | Clé `config.step.user.data.name` orpheline | `fr.json` + `en.json` |
| DELTA-044 | `default_catalogue()` + `default_meta()` absentes | `storage/manager.py` |

---

## Workflow rapide

```
Début de session  : lire DELTA.md → identifier les écarts actifs
EXPLORATION      : pas de commit → statut EN_DISCUSSION si > 1 tour
COMMIT           : patch code + doc → statut CORRECTIF_DEPLOYÉ
Validation human : "ok ça marche" → statut ALIGNED (✅) + historique
```
