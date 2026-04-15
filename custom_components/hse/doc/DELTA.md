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
5. **Ne jamais passer à `✅ ALIGNED`** sans que l'humain ait explicitément confirmé que le correctif fonctionne
6. **Vérifier la 🗂️ Carte du repo** ci-dessous pour connaître l'état réel de chaque fichier

### 📚 Documents de référence IA — lire dans cet ordre avant tout

| Priorité | Fichier | Rôle |
|---|---|---|
| 1 | `DELTA.md` (ce fichier) | Écarts actifs — **priorité absolue** |
| 2 | `00_methode_front_commune.md` | Contrat frontend V3 (règles R1–R5, hse_fetch, user_prefs) |
| 3 | `10_api_contrat.md` | Shape exact de tous les endpoints — source de vérité API |
| 4 | `hse_v3_synthese.md` | **Toutes les décisions architecturales tranchées** (V1+V2 → V3) |

---

## 🔒 Règle permanente — Cohérence inter-fichiers (ajoutée 2026-04-14)

| # | Paire | Question à poser systématiquement |
|---|---|---|
| P1 | `services.yaml` ↔ `__init__.py` | Chaque service déclaré a-t-il un `async_register` ET un `async_remove` au unload ? |
| P2 | `translations/*.json` ↔ `*_flow.py` | Les clés `options.step.init.data.*` matchent-elles **exactement** les noms de champs du `vol.Schema` ? |
| P3 | `__init__.py` imports ↔ modules réels | Chaque `from .X import Y` : la classe/fonction `Y` existe-t-elle **sous ce nom exact** dans `X` ? (cf. DELTA-045 : `HseSettingsView` ≠ `HseSettingsPricingView`) |
| P4 | `const.py` constantes ↔ consommateurs | Chaque constante définie est-elle importée et utilisée ? |
| P5 | `manifest.json` ↔ imports runtime | Les dépendances HA utilisées sont-elles dans `after_dependencies` ? |

---

## 🗂️ Carte du repo — état réel au 2026-04-15

```
hsev3/
├── README.md                                    ✅
├── hse_v3_synthese.md                           ✅
└── custom_components/hse/
    ├── __init__.py                              🟡  (DELTA-045 correctif déployé, validation en attente)
    ├── manifest.json                            ✅  (DELTA-041)
    ├── config_flow.py                           ✅
    ├── options_flow.py                          ✅
    ├── const.py                                 ✅
    ├── time_utils.py                            ✅
    ├── repairs.py                               ✅
    ├── services.yaml                            ✅
    ├── translations/fr.json + en.json           ✅  (DELTA-039/043)
    ├── api/base.py + views/* (13 views)         ✅
    ├── api/views/settings.py                    ✅  classe = HseSettingsPricingView
    ├── api/views/migration.py                   ✅  (DELTA-037/040)
    ├── catalogue/* (5 fichiers)                 ✅
    ├── meta/* (5 fichiers)                      ✅
    ├── storage/manager.py                       ✅  (DELTA-038/044)
    ├── engine/* (6 fichiers)                    ✅
    ├── sensors/* (4 fichiers)                   ✅
    ├── web_static/panel/shared/hse_shell.js     🟡  (DELTA-046/048/049 correctifs déployés, validation en attente)
    ├── web_static/panel/shared/styles/          🟡  (DELTA-047 correctif déployé, validation en attente)
    └── web_static/panel/features/* (8 views JS) ✅
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
| `engine/cost.py` | `shared_cost_engine.py` V2 — INTACT | `hse_v3_synthese.md` §7 |
| Sécurité | `requires_auth=True` + `cors_allowed=False` partout | `hse_v3_synthese.md` §4 |
| Panel HA | `require_admin=True` | `hse_v3_synthese.md` §4 |
| Nommage frontend | Séparateur `_` | DELTA-006 |
| `async_scan_hass` | Dans `catalogue/scan_engine.py` | DELTA-032a |
| `_build_costs_data` | Extraite de `HseCostsView` | DELTA-033d |
| Migration V2→V3 | No-action | DELTA-036 |
| Panel reload | `async_remove_panel` + `try/except` | DELTA-034 |
| Services HA | 9 handlers dans `_register_services()` | DELTA-035 |
| `default_settings()` | Exportée depuis `storage/manager.py` | DELTA-038 |
| `recorder` dépendance | Dans `after_dependencies` | DELTA-041 |
| `default_catalogue()` / `default_meta()` | Proxies dans `storage/manager.py` | DELTA-044 |
| Classe settings view | `HseSettingsPricingView` (correctif déployé, validation en attente) | DELTA-045 |
| CSS Shadow DOM | Injection `hse_tokens` + `hse_themes` + `hse_components` via `_injectShadowStyles()` | DELTA-046/047 |
| Background shell | `background: var(--hse-bg)` sur `:host` + `.hse-view-container` | DELTA-048 |
| Guard navigation rapide | `if (!this.shadowRoot \|\| !this._viewContainer) return;` dans `_updateTabIndicator` | DELTA-049 |
| `nav.hse-tabs` | `flex-shrink: 0` pour empêcher la nav de disparaître | DELTA-049 |

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | Réflexion en cours, rien de commité |
| 🔴 | `AUDIT_EN_COURS` | Phase d'audit démarrée, résultats à venir |
| 🟡 | `CORRECTIF_DEPLOYÉ` | Patch commité — **en attente de validation humaine** |
| ✅ | `ALIGNED` | Fermé — **uniquement après confirmation humaine** |

---

## Écarts actifs

| ID | Statut | Titre | Fichier(s) | Prochaine action |
|---|---|---|---|---|
| DELTA-045 | 🟡 `CORRECTIF_DEPLOYÉ` | `HseSettingsView` → `HseSettingsPricingView` | `__init__.py` | Valider au prochain reload HA |
| DELTA-046 | 🟡 `CORRECTIF_DEPLOYÉ` | CSS Shadow DOM non injecté dans `hse_shell.js` | `hse_shell.js` | Valider visuellement |
| DELTA-047 | 🟡 `CORRECTIF_DEPLOYÉ` | `hse_components.shadow.css` créé — 9 classes utilitaires | `styles/hse_components.shadow.css` + `hse_shell.js` | Valider visuellement |
| DELTA-048 | 🟡 `CORRECTIF_DEPLOYÉ` | Fond noir résiduel sous les views (background HA perçait) | `hse_shell.js` | Valider visuellement après reload |
| DELTA-049 | 🟡 `CORRECTIF_DEPLOYÉ` | Menu onglets disparu sur navigation rapide — guard manquant dans `_updateTabIndicator` + `flex-shrink:0` sur nav | `hse_shell.js` | Valider en naviguant rapidement entre onglets |

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
