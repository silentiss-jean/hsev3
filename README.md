# HSE V3 — Home Suivi Élec (version 3)

Custom integration Home Assistant pour le suivi de consommation électrique.

---

## 🚀 Brief de démarrage — à coller en début de chaque thread IA

```
Repo : https://github.com/silentiss-jean/hsev3
Stack : Home Assistant custom integration, Python backend, JS frontend (vanilla, pas de framework)
Domaine HA : hse

Avant toute chose, lis ces fichiers dans l'ordre :
1. ROADMAP_TO_PROD.md          → stratégie de livraison et état global (CE FICHIER PRÉCÈDE TOUT)
2. custom_components/hse/doc/DELTA.md → écarts doc/code actifs
3. custom_components/hse/doc/00_methode_front_commune.md → contrat frontend V3
4. hse_v3_synthese.md         → synthèse architecture V3

Règles pour l'IA :
- LIRE ROADMAP_TO_PROD.md AVANT TOUTE PROPOSITION DE CODE
- Ne jamais proposer de code ou de doc qui contredit un écart non résolu dans DELTA.md
- Signaler explicitement si une demande entre en collision avec un écart EN_DISCUSSION
- Proposer de fermer un écart dans DELTA.md dès que la solution est validée
- Toujours distinguer : mode EXPLORATION (on réfléchit) vs mode COMMIT (on génère le patch final)
- Respecter les vagues de livraison : ne pas proposer de tâche Vague 3 si la Vague 1 n'est pas validée
```

---

```
## 🧵 État courant de la session (à mettre à jour si thread long)
- Vague en cours : [1 = Ça marche / 2 = C'est fiable / 3 = C'est complet]
- Sujet du jour : [ex: implémentation overview_view.js]
- Décisions prises : [ex: polling 30s endpoint unique, pas de double fetch]
- Prochaine étape : [ex: générer le patch _render()]
```

---

## Vision produit (boussole non négociable)

**HSE = Home Suivi Élec** — un dashboard énergétique complet embarqué dans Home Assistant.

L'utilisateur lambda n'écrit pas de YAML. Il veut :
1. **Détecter** ses capteurs energy/power automatiquement
2. **Sélectionner** les fiables en un clic
3. **Voir** sa puissance live et sa consommation (jour/semaine/mois/année)
4. **Savoir** ce que ça coûte réellement (HT/TTC, fixe ou HP/HC, abonnement inclus)
5. **Organiser** par pièce et par type d'appareil
6. **Exporter** ses données
7. **Migrer** depuis la V1 sans tout perdre

**Règle d'or** : si une feature n'appartient pas à cette liste, elle est du confort. Si une feature de cette liste est cassée ou absente, c'est un blocage.

---

## Définition de "opérationnel" (MVP)

HSE est **opérationnel** quand un utilisateur peut, sans écrire de YAML :

1. ✅ Ouvrir le panel HSE dans HA
2. ✅ Lancer un scan et voir ses capteurs détectés
3. ✅ Sélectionner les capteurs fiables (manuellement ou auto)
4. ✅ Configurer son tarif électrique (fixe ou HP/HC, abonnement)
5. ✅ Voir sa puissance totale live et sa consommation (jour/semaine/mois/année)
6. ✅ Voir le coût par appareil et le coût total
7. ✅ Organiser ses appareils par pièce/type
8. ✅ Exporter ses données en CSV

**Checklist MVP** :
- [ ] `config_view.js` onglet C : tarification fonctionnelle (lecture + écriture)
- [ ] `overview_view.js` : affichage live avec polling 30s
- [ ] `costs_view.js` : tableau coûts avec polling 60s
- [ ] `hse_shell.js` : navigation stable entre les 8 onglets
- [ ] `hse_panel.js` : chargement sans erreur, token injecté

---

## Vagues de livraison (orientées valeur, pas technique)

### Vague 1 — "Ça marche" (priorité absolue)
**Objectif** : L'utilisateur peut configurer et voir ses données.
**Durée estimée** : 1 session de dev.

| # | Tâche | Fichier(s) | Dépendance | Validation |
|---|---|---|---|---|
| 1.1 | Corriger DELTA-065 : remapper champs tarification | `config_view.js` | Backend `settings.py` | Formulaire affiche les valeurs, PUT persiste, preview recalcule |
| 1.2 | Implémenter `overview_view.js` | `overview_view.js` | `/api/hse/overview` | Puissance live, conso 4 périodes, top5, by_room, référence |
| 1.3 | Implémenter `costs_view.js` | `costs_view.js` | `/api/hse/costs`, `/api/hse/history` | Tableau coûts, tri, pagination, export CSV |

**Règle** : Aucune autre tâche ne peut démarrer avant que ces 3 soient validées.

### Vague 2 — "C'est fiable"
**Objectif** : L'utilisateur fait confiance aux chiffres et peut migrer.
**Durée estimée** : 1 session de dev.

| # | Tâche | Fichier(s) | Dépendance | Validation |
|---|---|---|---|---|
| 2.1 | Implémenter `diagnostic_view.js` | `diagnostic_view.js` | `/api/hse/diagnostic` | Score qualité, statuts, alertes |
| 2.2 | Implémenter `migration_view.js` | `migration_view.js` | `/api/hse/migration` | Wizard 3 étapes, mapping, rapport |
| 2.3 | Implémenter `custom_view.js` | `custom_view.js` | `/api/hse/user_prefs` | Sélecteur thème, toggles, preview |

### Vague 3 — "C'est complet"
**Objectif** : Toutes les features promises sont disponibles.
**Durée estimée** : 1-2 sessions de dev.

| # | Tâche | Fichier(s) | Dépendance | Validation |
|---|---|---|---|---|
| 3.1 | Créer `cards_view.js` + `yamlComposer.js` | `cards_view.js`, `yamlComposer.js` | `/api/hse/catalogue` | Checkboxes, preview YAML, copie |
| 3.2 | Ajouter PATCH/DELETE catalogue | `catalogue.py` | — | Édition inline, suppression unitaire |
| 3.3 | Ajouter POST `/api/hse/meta` | `meta.py` | — | Création manuelle room/type |
| 3.4 | Fix bureau virtuel macOS | `hse_panel.js` | — | `visibilitychange` + reload iframe |

---

## Dépendances critiques (arbre de blocage)

```
overview_view.js ──► /api/hse/overview ──► catalogue sélectionné + settings tarif
       │
       ▼
costs_view.js ──► /api/hse/costs ──► settings tarif (DELTA-065)
       │
       ▼
config_view.js (C) ──► /api/hse/settings/pricing ──► DELTA-065 doit être fermé
```

**Conclusion** : DELTA-065 est la **racine de tous les blocages**. Tant que la tarification ne persiste pas correctement, les coûts affichés dans overview et costs sont faux ou vides.

**Ordre de résolution forcé** :
1. Fermer DELTA-065 (config tarification)
2. Valider que `overview_view.js` et `costs_view.js` affichent des données cohérentes
3. Puis passer aux vagues 2 et 3

---

## Structure du repo

> ⚠️ Le dossier HACS installé est `custom_components/hse/` (domaine `hse`).
> Voir `DELTA.md` pour la carte visuelle complète et les écarts actifs.
> Voir `ROADMAP_TO_PROD.md` pour la stratégie de livraison.

```
hsev3/
├── README.md ← ce fichier + brief IA
├── ROADMAP_TO_PROD.md ← 🗺️ STRATÉGIE DE LIVRAISON (lire avant tout)
├── .gitignore ✅
├── analyse.md ← analyse V1/V2 (frontend)
├── analyse0.md ← analyse V1/V2 (backend)
├── hse_v3_synthese.md ← synthèse des deux analyses → base V3
│
└── custom_components/
    └── hse/ ← 🟢 DOSSIER HACS (domaine: hse)
        ├── __init__.py ← orchestration < 200 lignes ✅
        ├── manifest.json ← version: 3.0.0, domain: hse ✅
        ├── config_flow.py ✅
        ├── options_flow.py ← capteur référence + tarif €/kWh ✅
        ├── const.py ✅
        ├── time_utils.py ✅
        ├── services.yaml ← 8 services HA ✅
        ├── repairs.py ← HA Repairs natif ✅
        ├── translations/
        │   ├── fr.json ✅
        │   └── en.json ✅
        │
        ├── api/
        │   ├── __init__.py ✅
        │   ├── base.py ← HseBaseView (requires_auth=True) ✅
        │   └── views/
        │       ├── __init__.py ✅
        │       ├── ping.py ← GET /api/hse/ping ✅
        │       ├── catalogue.py ← GET/POST /api/hse/catalogue — PATCH/DELETE ⏳ (DELTA-058)
        │       ├── costs.py ← GET /api/hse/costs + HseHistoryView + HseExportView ✅
        │       ├── diagnostic.py ← GET /api/hse/diagnostic ✅
        │       ├── frontend_manifest.py ✅
        │       ├── meta.py ← GET + sync — rooms [{id,name}] — POST création ⏳ (DELTA-059)
        │       ├── migration.py ← GET/POST /api/hse/migration ✅
        │       ├── overview.py ← GET /api/hse/overview ✅
        │       ├── scan.py ← POST /api/hse/scan ✅
        │       ├── settings.py ← GET/PUT incl. reference_entity_id ✅
        │       └── user_prefs.py ← GET/PATCH /api/hse/user_prefs ✅
        │
        ├── catalogue/ ✅ (V2 conservé)
        │   ├── __init__.py
        │   ├── defaults.py
        │   ├── manager.py
        │   ├── scan_engine.py
        │   └── schema.py
        │
        ├── meta/ ✅ (V2 conservé)
        │   ├── __init__.py
        │   ├── assignments.py
        │   ├── schema.py
        │   ├── store.py
        │   └── sync.py
        │
        ├── storage/ ✅
        │   ├── __init__.py
        │   └── manager.py
        │
        ├── engine/ ✅
        │   ├── __init__.py
        │   ├── cost.py ← shared_cost_engine V2 INTACT
        │   ├── calculation.py
        │   ├── group_totals.py
        │   └── analytics.py
        │
        ├── sensors/ ✅
        │   ├── __init__.py
        │   ├── quality_scorer.py
        │   ├── sync_manager.py
        │   └── name_fixer.py
        │
        ├── web_static/
        │   └── panel/
        │       ├── hse_panel.html ✅
        │       ├── hse_panel.js 🟠 (DELTA-051-PANEL — bug iframe macOS, priorité basse)
        │       ├── style.hse.panel.css ✅
        │       ├── shared/
        │       │   ├── hse_fetch.js ✅
        │       │   ├── hse_store.js ✅
        │       │   ├── hse_shell.js ✅
        │       │   ├── ui/
        │       │   │   ├── dom.js ✅
        │       │   │   └── table.js ✅
        │       │   └── styles/
        │       │       ├── hse_tokens.shadow.css ✅
        │       │       ├── hse_themes.shadow.css ✅
        │       │       ├── hse_alias.v2.css ✅
        │       │       └── tokens.css ✅
        │       └── features/
        │           ├── overview/overview_view.js 🟡 stub — Vague 1
        │           ├── diagnostic/diagnostic_view.js 🟡 stub — Vague 2
        │           ├── scan/scan_view.js ✅
        │           ├── config/config_view.js 🟠 A✅ B✅ — C🔴 champs cassés (DELTA-065)
        │           ├── custom/custom_view.js 🟡 stub — Vague 2
        │           ├── cards/cards_view.js ❌ ABSENT — crash onglet (DELTA-062) — Vague 3
        │           ├── migration/migration_view.js 🟡 stub — Vague 2
        │           └── costs/costs_view.js 🟡 stub — Vague 1
        │
        └── doc/ ← 📚 Documentation IA
            ├── DELTA.md ← 🔴 5 écarts actifs (voir ci-dessous)
            ├── ROADMAP_TO_PROD.md ← 🗺️ Stratégie de livraison
            ├── 00_methode_front_commune.md
            ├── 01_onglet_overview.md
            ├── 02_onglet_diagnostic.md
            ├── 03_onglet_scan.md
            ├── 04_onglet_config.md
            ├── 05_onglet_custom.md
            ├── 06_onglet_cards.md
            ├── 07_onglet_migration.md
            ├── 08_onglet_costs.md
            ├── 09_squelette_hse_tab_base.md
            ├── 10_api_contrat.md
            └── hse_v3_synthese.md
```

---

## Avancement global

### Backend Python V3

| Bloc | Contenu | Statut |
|---|---|---|
| Bloc 1 | `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 2 | `storage/manager.py` + `catalogue/` + `meta/` + `options_flow.py` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 3 | `engine/` + `sensors/` | ✅ TERMINÉ — 2026-04-09 |
| Bloc 4 | Toutes les views `api/views/` (11 fichiers, 19 classes) | ✅ TERMINÉ — 2026-04-09 |
| Compléments | `repairs.py` + `services.yaml` + `translations/` + `HseHistoryView` + `HseExportView` | ✅ TERMINÉ — 2026-04-10 |

**Verdict backend** : **~90% opérationnel**. Toutes les routes métier essentielles existent. Les 2 manquantes (PATCH/DELETE catalogue, POST meta) sont des conforts, pas des blocages.

### Frontend JS

| Tâche | Contenu | Statut | Vague |
|---|---|---|---|
| Shell | `hse_fetch.js` + `hse_store.js` + `hse_shell.js` | ✅ TERMINÉ — 2026-04-09 | — |
| Panel | `hse_panel.html` + `hse_panel.js` + `style.hse.panel.css` | ✅ TERMINÉ — 2026-04-10 | — |
| Shared UI | `shared/ui/dom.js` + `table.js` + 4 fichiers CSS | ✅ TERMINÉ — 2026-04-10 | — |
| `scan_view.js` | Groupement par intégration | ✅ TERMINÉ — 2026-05-16 | — |
| `config_view.js` | 3 sous-onglets — A✅ B✅ C🔴 | 🟠 EN COURS — DELTA-065 | **Vague 1** |
| `overview_view.js` | GET /api/hse/overview | 🟡 STUB | **Vague 1** |
| `costs_view.js` | GET /api/hse/costs | 🟡 STUB | **Vague 1** |
| `diagnostic_view.js` | GET /api/hse/diagnostic | 🟡 STUB | Vague 2 |
| `migration_view.js` | GET/POST /api/hse/migration | 🟡 STUB | Vague 2 |
| `custom_view.js` | Préférences UI | 🟡 STUB | Vague 2 |
| `cards_view.js` | Cartes YAML | ❌ ABSENT — DELTA-062 | Vague 3 |

**Verdict frontend** : **~35% opérationnel**. Le backend sait tout faire, mais l'utilisateur ne peut pas voir ses données ni configurer ses tarifs.

---

### Écarts actifs

> Mis à jour : 2026-05-20 — source : `doc/DELTA.md`

| ID | Statut | Sujet | Priorité | Vague |
|---|---|---|---|---|
| DELTA-065 | 🔴 `A_CORRIGER` | `config_view.js` sous-onglet C — désalignement noms champs frontend/backend | **Haute** | **1** |
| DELTA-058 | 🟠 `EN_DISCUSSION` | `PATCH/DELETE /api/hse/catalogue/{entity_id}` manquants | Moyenne | 3 |
| DELTA-059 | 🟠 `EN_DISCUSSION` | `POST /api/hse/meta` (création pièce/type) manquant | Faible | 3 |
| DELTA-062 | 🟠 `EN_DISCUSSION` | `cards_view.js` absent — crash onglet | Basse | 3 |
| DELTA-051-PANEL | 🟠 `EN_DISCUSSION` | Bug iframe macOS bureau virtuel | Basse | 3 |

---

## Glossaire des clés backend ↔ frontend

### Settings (tarification)
| Backend (`settings.py`) | Frontend (doit lire/écrire) | Description |
|---|---|---|
| `mode` | `mode` | `"flat"` ou `"hphc"` |
| `price_ht_kwh` | `price_ht_kwh` | Prix HT kWh (fixe) |
| `price_ttc_kwh` | `price_ttc_kwh` | Prix TTC kWh (fixe) |
| `price_hp_ttc_kwh` | `price_hp_ttc_kwh` | Prix TTC kWh Heures Pleines |
| `price_hc_ttc_kwh` | `price_hc_ttc_kwh` | Prix TTC kWh Heures Creuses |
| `subscription_eur_month` | `subscription_eur_month` | Abonnement mensuel € |
| `tax_rate_pct` | `tax_rate_pct` | Taux TVA % |
| `reference_entity_id` | `reference_entity_id` | Capteur référence (ex: Linky) |

**⚠️ Anciennes clés frontend cassées (DELTA-065)** : `contract_type`, `subscription_ht`, `subscription_monthly`, `price_ht`, `price_hp`, `price_hc`, `tax_rate` → **ne plus jamais utiliser**.

### Catalogue
| Backend | Frontend | Description |
|---|---|---|
| `integration_domain` | `integration_domain` | Domaine technique ("tuya", "tplink") |
| `integration_label` | `integration_label` | Titre lisible de l'instance |
| `quality_score` | `quality_score` | Score 0-150 |
| `status` | `status` | `"selected"`, `"ignored"`, `"pending"` |

### Meta
| Backend | Frontend | Description |
|---|---|---|
| `rooms[{id,name}]` | `rooms` | Pièces avec id et name |
| `types[string[]]` | `types` | Types d'appareils ("energy", "power") |
| `assignments[{entity_id,room,type,pending}]` | `assignments` | Assignations capteur→pièce/type |

---

## Workflow doc ↔ code

| Phase | Action |
|---|---|
| Discussion en cours | Ajouter ligne `EN_DISCUSSION` dans DELTA.md |
| Décision prise, pas encore codée | Passer à `DOC_AHEAD` ou `CODE_AHEAD` |
| Doc + code commités ensemble | Supprimer la ligne de DELTA.md |

**Règle d'or : si DELTA.md est vide → doc et code sont alignés.**

---

## Règles de convergence (comment coder)

### Pour le backend
- **Ne pas ajouter de routes inutiles** : si le frontend peut faire l'opération avec les routes existantes, ne pas créer d'endpoint dédié.
- **Maintenir la cohérence des clés JSON** : une clé renommée dans `settings.py` doit être renommée dans **tous** les consommateurs frontend. Pas de "presque pareil".
- **Valider les payloads PUT** : retourner 422 avec message explicite si un champ est invalide, plutôt que d'accepter silencieusement.

### Pour le frontend
- **Contrat R1-R5 obligatoire** (voir `00_methode_front_commune.md`) :
  - `mount()` construit le DOM une seule fois
  - `update_hass()` ne reconstruit jamais le DOM
  - `unmount()` nettoie timers + AbortController
  - R2 : flag `_fetching` sur chaque fetch
  - R3 : `JSON.stringify` signature avant `_render()`
  - R4 : zéro `localStorage`
  - R5 : skeleton systématique
- **Mapper les clés backend explicitement** : jamais de supposition. Si le backend retourne `price_ht_kwh`, le frontend doit lire `data.price_ht_kwh`, pas `data.price_ht`.
- **Gestion d'erreur UX** : état erreur avec message lisible, pas juste `console.error`.

### Pour l'IA
- **LIRE ROADMAP_TO_PROD.md AVANT TOUTE PROPOSITION DE CODE**
- **Vérifier la vague en cours** : ne pas proposer de tâche Vague 3 si la Vague 1 n'est pas validée
- **Signaler les dépendances** : si une tâche nécessite une route ou un fix non résolu, le signaler explicitement
- **Fermer un écart DELTA dès que la solution est validée** : mettre à jour `DELTA.md` pour passer l'écart à "fermé" avant de commiter

---

*Dernière mise à jour : 2026-05-20*
