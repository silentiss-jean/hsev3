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

## 🗂️ Carte du repo — état réel au 2026-04-17

```
hsev3/
├── README.md                                    ✅
├── hse_v3_synthese.md                           ✅
└── custom_components/hse/
    ├── __init__.py                              🟡 À modifier — embed_iframe=True + module_url→hse_panel.html
    ├── manifest.json                            ✅
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅
    ├── api/base.py + views/* (13 views)         ✅
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static_old/                          ⭐ Archive — référence uniquement, ne pas toucher
    ├── web_static/panel/
    │   ├── hse_panel.js                         ❓ À créer — wrapper Custom Element HA (postMessage token)
    │   ├── hse_panel.html                       ❓ À créer — page HTML bootstrap iframe
    │   ├── style.hse.panel.css                  ✅ conservé
    │   └── shared/
    │       ├── hse_fetch.js                     ✅ conservé
    │       ├── hse_shell.js                     🔴 À réécrire entièrement (DELTA-052 étape 1)
    │       ├── hse_store.js                     ✅ conservé (à valider lors des tests)
    │       ├── styles/                          ✅ conservé (tokens CSS)
    │       ├── ui/                              ✅ conservé (dom.js, table.js)
    │       └── features/                        ❓ Dossier à créer — un sous-dossier par onglet
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
| **Mode intégration HA** | **`embed_iframe: True`** — immune au cycle connectedCallback/disconnectedCallback | DELTA-052 |
| **Front à refaire** | **Refonte complète page par page** — décision 2026-04-16 | DELTA-052 |

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

| ID | Statut | Titre | Fichier(s) | Prochaine action |
|---|---|---|---|---|
| DELTA-052 | 🔴 `AUDIT_EN_COURS` | **REFONTE COMPLÈTE DU FRONT** — recoder toutes les pages JS une par une | `web_static/panel/` — tout | Voir section DELTA-052 ci-dessous |

---

## 🔴 DELTA-052 — Refonte complète du frontend (ouvert 2026-04-16)

### Contexte

Le front existant (`web_static/panel/`) a accumulé trop de dette :

- Shadow DOM sans style malgré plusieurs tentatives de correctif
- CSS inliné non appliqué (fond noir persistant)
- Architecture de chargement fragile (imports dynamiques échouent silencieusement)
- Bug irréductible : écran noir au retour de bureau virtuel macOS — non résolu en V2 malgré plusieurs tentatives

**Décision 2026-04-16 :** on efface et on repart de zéro, page par page.

**Actions réalisées au 2026-04-17 :**
- `web_static/panel/features/` supprimé (onglets JS vidés)
- `web_static/panel/hse_panel.html` + `hse_panel.js` supprimés
- `web_static_old/` créé — archive de l'ancien front (référence, ne pas modifier)

### Décision architecture — 2026-04-17

**Mode d'intégration HA retenu : `embed_iframe: True`**

Raison : le bug "écran noir au retour de bureau virtuel" est causé par le cycle
`connectedCallback`/`disconnectedCallback` de HA qui détruit l'état Shadow DOM.
L'iframe est immune à ce cycle — elle reste stable quand HA perd le focus.

**Auth :** token récupéré via `postMessage` depuis `hse_panel.js` (wrapper Custom Element
minimaliste côté HA, ~50 lignes) → injecté dans `window.__hseToken` dans l'iframe.
Zéro demande d'auth à l'utilisateur — le token de session HA est utilisé directement.

**Point d'entrée :** `hse_panel.html` servi via `StaticPathConfig` (`/hse-static/`)

**Flux de démarrage :**
```
HA charge hse_panel.js (module_url)
→ HsePanel (Custom Element) crée une <iframe src="/hse-static/hse_panel.html">
→ L'iframe envoie postMessage {type:'hse-ready'} au parent
→ hse_panel.js répond avec postMessage {type:'hse-auth', token}
→ hse_panel.html injecte window.__hseToken et importe hse_shell.js
→ hse_shell.js démarre le routing des onglets
```

### Contraintes non négociables (inchangées)

- **R1** — `mount()` construit le DOM une fois. `update_hass()` ne touche jamais le DOM. `unmount()` nettoie tout.
- **R2** — Flag `_fetching` sur chaque fetch (anti race condition)
- **R3** — Signature `JSON.stringify` avant tout `_render()` (anti re-render inutile)
- **R4** — Zéro `localStorage` — tout passe par `PATCH /api/hse/user_prefs`
- **R5** — Skeleton `.hse-skeleton` posé dans `mount()` avant le premier fetch
- Tous les appels HTTP via `ctx.hseFetch` (jamais `fetch` direct)
- Vanilla JS uniquement — zéro framework
- CSS **dans `hse_shell.js`** ou dans `hse_panel.html` — aucun fetch de CSS au runtime

### Ordre de reconstruction — mis à jour 2026-04-17

| Ordre | Fichier | Description | Statut |
|-------|---------|-------------|--------|
| 0a | `__init__.py` | `embed_iframe: True` + `module_url` → `/hse-static/hse_panel.html` | ❓ À faire |
| 0b | `web_static/panel/hse_panel.js` | Wrapper Custom Element HA — crée l'iframe, envoie le token via `postMessage` | ❓ À faire |
| 0c | `web_static/panel/hse_panel.html` | Page HTML bootstrap — écoute `hse-auth`, injecte `window.__hseToken`, importe `hse_shell.js` | ❓ À faire |
| 1 | `web_static/panel/shared/hse_shell.js` | Shell principal — routing onglets, `/api/hse/ping`, `/api/hse/frontend_manifest` | ❓ À faire |
| 2 | `web_static/panel/features/overview/overview_view.js` | Onglet Overview — `/api/hse/overview` | ❓ À faire |
| 3 | `web_static/panel/features/diagnostic/diagnostic_view.js` | Onglet Diagnostic — `/api/hse/diagnostic` | ❓ À faire |
| 4 | `web_static/panel/features/scan/scan_view.js` | Onglet Scan — `/api/hse/scan` | ❓ À faire |
| 5 | `web_static/panel/features/config/config_view.js` | Onglet Config — `/api/hse/settings` | ❓ À faire |
| 6 | `web_static/panel/features/costs/costs_view.js` | Onglet Costs — `/api/hse/costs`, `/api/hse/history`, `/api/hse/export` | ❓ À faire |
| 7 | `web_static/panel/features/migration/migration_view.js` | Onglet Migration — `/api/hse/migration`, export, apply | ❓ À faire |
| 8 | `web_static/panel/features/cards/cards_view.js` | Onglet Cards — `/api/hse/catalogue` | ❓ À faire |
| 9 | `web_static/panel/features/custom/custom_view.js` | Onglet Custom — `/api/hse/user_prefs` | ❓ À faire |

### Règles de session pour l'IA

- **Démarrer par l'étape 0a → 0b → 0c → 1** dans cet ordre strict — le shell doit fonctionner avant tout onglet
- **Une étape à la fois** — ne pas passer à la suivante avant validation humaine
- **Tester le backend** à chaque étape : si un endpoint ne répond pas, ouvrir un écart DELTA dans "Backend à corriger"
- **Mode COMMIT uniquement** : chaque réponse est un patch complet testable
- Le CSS reste dans `hse_panel.html` (global) ou inliné dans chaque view — aucun fichier CSS chargé séparément au runtime
- Les fichiers dans `web_static_old/` sont en lecture seule — référence uniquement

### Spécifications techniques des étapes 0a–0c

**0a — `__init__.py` (modification)**
- Changer `_PANEL_MODULE_URL` : `hse_panel.js` → `hse_panel.html`
- Changer dans `async_register_built_in_panel` : `embed_iframe: False` → `embed_iframe: True`
- Aucune autre modification

**0b — `hse_panel.js` (création)**
- Custom Element `hse-panel` minimaliste (~50 lignes)
- `connectedCallback` : crée `<iframe src="/hse-static/hse_panel.html">` plein écran, écoute `postMessage`
- `set hass(hass)` : récupère `hass.auth.data.access_token`, l'envoie via `postMessage {type:'hse-auth', token}` dès que l'iframe signale `hse-ready`
- `disconnectedCallback` : retire le listener `message`
- Guard `embed_iframe` double-mount dans `connectedCallback`

**0c — `hse_panel.html` (création)**
- Page HTML autonome, CSS global (pas de Shadow DOM)
- Au chargement : envoie `postMessage {type:'hse-ready'}` au parent
- Écoute `postMessage {type:'hse-auth', token}` → stocke dans `window.__hseToken`
- Puis `import('/hse-static/shared/hse_shell.js')` en dynamique → `new HseShell().mount(root)`
- Affiche un état "Initialisation…" pendant l'attente du token
- Gère le cas d'erreur si `hse_shell.js` échoue à charger

### Backend à corriger (ouvert au fil des tests)

| ID | Endpoint | Problème | Statut |
|----|----------|----------|--------|
| (vide — à compléter lors des tests) | | | |

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
| DELTA-050 | CSS inliné dans `hse_shell.js` | Absorbé par DELTA-052 — la décision d'inliner reste valide |
| DELTA-051 | `HseMigrationExportView` + `HseMigrationApplyView` non enregistrées | `__init__.py` corrigé, backend OK — sera vérifié lors du test de l'onglet migration |

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
