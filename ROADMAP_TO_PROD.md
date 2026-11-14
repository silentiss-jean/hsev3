# HSE V3 — ROADMAP TO PROD

> Document stratégique de convergence backend/frontend.
> Remplace l'approche "patch par patch" du DELTA par une vision orientée valeur utilisateur.
> Toute IA travaillant sur ce repo doit lire ce fichier avant toute proposition de code.

---

## 1. Vision produit (boussole non négociable)

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

## 2. État actuel — Matrice backend × frontend

### 2.1 Backend (API REST)

| Endpoint | Méthode | État | Données retournées | Consommateur frontend |
|---|---|---|---|---|
| `/api/hse/scan` | GET/POST | ✅ | `candidates[]` avec `integration_domain`, `quality_score` | `scan_view.js` |
| `/api/hse/catalogue` | GET | ✅ | `items[]` paginés, `integration_domain`, `status`, `quality_score` | `scan_view.js`, `config_view.js` (onglet A) |
| `/api/hse/catalogue/triage` | POST | ✅ | Triage unitaire select/ignore/reset | `scan_view.js`, `config_view.js` |
| `/api/hse/catalogue/triage/bulk` | POST | ✅ | Triage en masse | `scan_view.js`, `config_view.js` |
| `/api/hse/catalogue/refresh` | POST | ✅ | Force re-scan | `scan_view.js` |
| `/api/hse/overview` | GET | ✅ | `power_now_w`, `consumption{day,week,month,year}`, `top5[]`, `by_room[]`, `by_type[]`, `reference_sensor` | `overview_view.js` |
| `/api/hse/costs?period=` | GET | ✅ | `items[]` avec `power_w`, `energy_kwh`, `cost_ht_eur`, `cost_ttc_eur`, `pct_total`, `room`, `type` | `costs_view.js` |
| `/api/hse/history` | GET | ✅ | Historique 12 mois par entité | `costs_view.js` (détail) |
| `/api/hse/export` | GET | ✅ | CSV/JSON des coûts | `costs_view.js` |
| `/api/hse/settings/pricing` | GET/PUT | ✅ | `mode`, `price_ht_kwh`, `price_ttc_kwh`, `price_hp_ttc_kwh`, `price_hc_ttc_kwh`, `subscription_eur_month`, `tax_rate_pct`, `reference_entity_id` | `config_view.js` (onglet C) |
| `/api/hse/meta` | GET | ✅ | `rooms[{id,name}]`, `types[string[]]`, `assignments[]` | `config_view.js` (onglet B) |
| `/api/hse/meta/sync/preview` | POST | ✅ | Diff rooms à créer/renommer | `config_view.js` (onglet B) |
| `/api/hse/meta/sync/apply` | POST | ✅ | Application du diff | `config_view.js` (onglet B) |
| `/api/hse/diagnostic` | GET | ✅ | Score qualité global, statuts capteurs | `diagnostic_view.js` |
| `/api/hse/migration` | GET/POST | ✅ | Wizard migration V1→V3 | `migration_view.js` |
| `/api/hse/user_prefs` | GET/PATCH | ✅ | Préférences UI (thème, etc.) | `custom_view.js` |
| `/api/hse/catalogue/{id}` | PATCH/DELETE | ❌ **Manquant** | Édition inline / suppression unitaire | `config_view.js` (onglet A) — contournement via `triage` |
| `/api/hse/meta` | POST | ❌ **Manquant** | Création manuelle room/type | `config_view.js` (onglet B) — bouton grisé |

**Verdict backend** : **Opérationnel**. Toutes les routes métier essentielles existent et répondent sur la preprod (200 OK). Les 2 routes manquantes (PATCH/DELETE catalogue/{id}, POST /api/hse/meta) sont des conforts non bloquants.

### 2.2 Frontend (onglets)

| Onglet | Fichier | État | Problème | Bloquant ? |
|---|---|---|---|---|
| **Détection** | `scan_view.js` | ✅ **Complet** | Fonctionnel | Non |
| **Config → Appareils** | `config_view.js` (A) | ✅ **Complet** | Référence, auto-select, groupes, triage | Non |
| **Config → Pièces & Types** | `config_view.js` (B) | ✅ **Complet** | Rooms, types, sync | Non |
| **Config → Tarification** | `config_view.js` (C) | ✅ **Complet** | Lecture + écriture, validation des valeurs (A09) | Non |
| **Overview** | `overview_view.js` | ✅ **Complet** | Puissance live, conso 4 périodes, top5, by_room, référence (A13 null-safe) | Non |
| **Coûts** | `costs_view.js` | ✅ **Complet** | Tableau coûts, abonnement inclus (A08), tri | Non |
| **Diagnostic** | `diagnostic_view.js` | ✅ **Complet** | Score qualité, statuts capteurs | Non |
| **Migration** | `migration_view.js` | ✅ **Complet** | Wizard V1→V3, mapping, apply (A14) | Non |
| **Personnalisation** | `custom_view.js` | ✅ **Complet** | `user_prefs` API (pas de localStorage) | Non |
| **Cartes YAML** | `cards_view.js` | ✅ **Complet** | Échappement YAML, unité dynamique W/kWh (A16) | Non |

**Verdict frontend** : **Opérationnel**. Les 8 onglets sont implémentés et fonctionnels. Le backend et le frontend sont cohérents.

---

## 3. Définition de "opérationnel" (MVP)

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

## 4. Vagues de livraison (orientées valeur, pas technique)

### Vague 1 — "Ça marche" (validée)
**Objectif** : L'utilisateur peut configurer et voir ses données.
**Statut** : ✅ Validé — tous les onglets fonctionnels, API répondant 200 sur preprod.

Les 3 blocs critiques sont opérationnels :
- `config_view.js` onglet C : tarification lecture + écriture, validation (A09)
- `overview_view.js` : affichage live polling 30s, référence null-safe (A13)
- `costs_view.js` : tableau coûts, abonnement inclus (A08)

### Vague 2 — "C'est fiable" (validée)
**Objectif** : L'utilisateur fait confiance aux chiffres et peut migrer.
**Statut** : ✅ Validé.

- `diagnostic_view.js` : score qualité, statuts
- `migration_view.js` : wizard V1→V3, mapping, apply
- `custom_view.js` : préférences via user_prefs
- Tests unitaires : 47/47 verts, CI configurée (.github/workflows/ci.yml)

### Vague 3 — "C'est complet" (en cours)
**Objectif** : Toutes les features promises sont disponibles.
**Statut** : 🔄 En cours.

| # | Tâche | Fichier(s) | Statut |
|---|---|---|---|
| 3.1 | Cartes YAML — échappement + unité dynamique | `cards_view.js` | ✅ Fait (A16) |
| 3.2 | Ajouter PATCH/DELETE catalogue/{id} | `catalogue.py` | À faire |
| 3.3 | Ajouter POST /api/hse/meta | `meta.py` | À faire |
| 3.4 | Fix bureau virtuel macOS | `hse_panel.js` | À faire |

---

## 5. Dépendances critiques (arbre de blocage)

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

## 6. Règles de convergence (comment coder)

### 6.1 Pour le backend
- **Ne pas ajouter de routes inutiles** : si le frontend peut faire l'opération avec les routes existantes, ne pas créer d'endpoint dédié.
- **Maintenir la cohérence des clés JSON** : une clé renommée dans `settings.py` doit être renommée dans **tous** les consommateurs frontend. Pas de "presque pareil".
- **Valider les payloads PUT** : retourner 422 avec message explicite si un champ est invalide, plutôt que d'accepter silencieusement.

### 6.2 Pour le frontend
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

### 6.3 Pour l'IA
- **Lire ce fichier avant toute proposition**.
- **Vérifier la vague en cours** : ne pas proposer de tâche Vague 3 si la Vague 1 n'est pas validée.
- **Signaler les dépendances** : si une tâche nécessite une route ou un fix non résolu, le signaler explicitement.
- **Fermer un écart DELTA dès que la solution est validée** : mettre à jour `DELTA.md` pour passer l'écart à "fermé" avant de commiter.

---

## 7. Checklist de validation par vague

### Vague 1 — "Ça marche"
- [ ] Config tarification : les champs s'affichent, se modifient, se sauvegardent, le preview recalcule
- [ ] Overview : puissance live qui change, conso 4 périodes non nulles, top5 peuplé, by_room cohérent
- [ ] Costs : tableau avec données, triable, export CSV téléchargeable
- [ ] Navigation : onglets 1-4 stables, pas de crash au changement

### Vague 2 — "C'est fiable"
- [ ] Diagnostic : score affiché, liste capteurs avec statut, bouton relancer fonctionnel
- [ ] Migration : wizard 3 étapes, détection legacy, mapping proposé, application
- [ ] Custom : thème changeable, préférences persistantes via `user_prefs`

### Vague 3 — "C'est complet"
- [ ] Cartes YAML : preview syntax-highlighted, copie dans presse-papiers
- [ ] Édition inline catalogue : PATCH/DELETE fonctionnels
- [ ] Création room/type : POST `/api/hse/meta` fonctionnel

---

## 8. Glossaire des clés backend ↔ frontend

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

## 9. Historique des décisions produit

| Date | Décision | Raison |
|---|---|---|
| 2026-04 | Domaine `hse` (pas `hsev3`) | Évite la casse des automations existantes |
| 2026-04 | Pas de `sensor.py` | Pattern `hse_sensors_ready` event pour éviter race conditions |
| 2026-04 | 8 onglets (pas 5) | Moins de surcharge par onglet, plus maintenable |
| 2026-04 | Règles R1-R5 frontend | Correction de la régression V2 (re-render complet, fuite mémoire) |
| 2026-05 | `hse_fetch.js` avec token auto | Centralisation auth, pas de token en clair |
| 2026-05 | `user_prefs` API remplace localStorage | Persistance serveur, cohérence multi-appareil |
| 2026-05-17 | DELTA-065 identifié | Désalignement champs tarification = blocage root |
| 2026-05-20 | Création ROADMAP_TO_PROD.md | Sortie de l'approche patch-by-patch vers livraison par vague |

---

## 10. Prochaine action immédiate

**Fermer DELTA-065** → implémenter `overview_view.js` → implémenter `costs_view.js`.

Ces 3 tâches rendent HSE **opérationnel**. Tout le reste est du polish.

---

*Document maintenu par l'IA. Dernière mise à jour : 2026-11-14.*
*État : HSE V3 opérationnel — tous les lots A01–A16 déployés sur main. A17 (CI + docs) en cours.*
