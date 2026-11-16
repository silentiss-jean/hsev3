# HSE V3 — Décisions Q1→Q7 et spécification d'implémentation

> **Origine** : échange du 16/11/2026 — réponses Q1→Q6 aux questions ouvertes + Q7 (réconciliation
> avec le compteur de référence) ajoutée le 16/11/2026 après vérification du code et de la préprod
> `192.168.3.67:8123`.
> **Statut** : spécification d'implémentation, aucune modification de code effectuée.
> **Source de vérité** : ce document. Compagnon JSON : `hse_v3_decisions_q1_q6.json` (nom de fichier
> historique — il couvre désormais Q1→Q7).
> **Décisions** : Q1 à Q6 = réponses utilisateur du 16/11/2026. Q7 = décision d'architecture
> d'après les réponses utilisateur, vérifiée ligne par ligne dans le code et sur la préprod.

---

## 0. Rappel du problème

`_identify()` détecte 111 items (29 `selected`, 77 `normal`, 5 `ignored`). Chaque `_Sweep` en
archive 5 de plus et n'en re-propose aucun → la détection des 77 restants n'aura jamais lieu.

Les questions Q1–Q6 portaient sur le cycle de vie d'un capteur, la sélection multiple, les
comparaisons de période, le weekend, les orphelins et le remplacement d'un capteur.
**Q7** traite d'un sujet distinct mais complémentaire : le compteur de référence (Linky) et la
réconciliation avec la facture.

Les réponses Q1→Q6 sont **intégrées** dans ce document. La Q7 décrit l'état réel du mécanisme de
référence, son point de rupture et les règles d'implémentation.

---

## 1. Synthèse des décisions

| # | Sujet | Décision |
|---|---|---|
| **Q1** | Compteur vide → repli automatique | **Automatique** — si `total_increasing` ne renvoie rien : `energy_from_power`. Tracé dans `quality.degradation_notes`. Fenêtre 7 j. |
| **Q2** | Plusieurs capteurs du même appareil | **Empêcher structurellement** — 1 seul `energy_source` par `device_id` (+ garde-fou puissance). |
| **Q3** | Comparaisons de période | **Week-end inclus** + **plages à la demande** (`custom_week_start_day`, `POST /api/hse/compare`). |
| **Q4** | Documenter le mode weekend | **Documenté** : `config_view.js` + `weekend_summary.py` — **pas** dans la spec. |
| **Q5** | Nettoyage des orphelins | **Manuel si panne, auto-archive si disparu > 3 mois** — `orphan_since`, `removal_grace_days: 90`, re-détection des items archivés. |
| **Q6** | Choisir l'intégration quand on sélectionne | **1 seul item** : basculer l'exclu en `ignored(reason=selected:other)`. |
| **Q7** | **Compteur de référence (Linky)** | **Index kWh = référence de facturation, puissance W = référence instantanée** — réconciliation dans `costs.py`, delta signé, garde-fou anti-faux-positif. |

**Toutes les questions Q1→Q7 sont tranchées.** Les 8 arbitrages restants (QM1→QM8, §13) sont
des choix à soumettre — aucun ne bloque le démarrage de l'implémentation.

---

## CONSTAT VÉRIFIÉ (16/11/2026)

Établi **avant** toute implémentation : lecture du code source avec ancres `fichier:ligne`
contrôlées ce jour, et appels HTTP réels sur la préprod `192.168.3.67:8123`.

### Ce qui est déjà livré et fonctionne

| Brique | Ancre | État |
|---|---|---|
| Champs de référence persistés | `storage/manager.py:57` (W), `:59` (kWh) | ✅ existent |
| Formulaire de saisie | `options_flow.py:31` et `:45-48` | ✅ existe |
| Détection de candidats | `engine/reference.py:48` `find_reference_candidates()` | ⚠️ mal alimentée (D2) |
| Couverture d'énergie | `engine/reference.py:135` `energy_coverage()` | ✅ existe |
| Exclusion anti-double-comptage | `engine/sources.py:81`, `api/views/costs.py:85` | ✅ fonctionne |
| Refus du dépassement | `engine/reference.py:144`, `overview.py:198-201` | ✅ existe |

**Le point le plus solide est l'exclusion de la référence** : `plan_sources()` écarte les
`ref_ids`, `costs.py:85` saute `plan.reference_ids`, `overview.py:227` les retire du `by_type`.
La référence n'est comptée nulle part en double — c'est du code livré, pas une hypothèse.

### Ce qui manque

| Défaut | Gravité | Preuve |
|---|---|---|
| **D1** Aucune réconciliation dans les coûts | critique | `costs.py:1-28` n'importe pas `engine.reference`, zéro appel à `energy_coverage` |
| **D2** Détecteur alimenté par tous les capteurs | critique | `diagnostic.py:126-131` → `find_reference_candidates`, sans exclure le catalogue |
| **D3** Valeur `normal` hors contrat d'API | majeur | `defaults.py:54` écrit `normal` ; `catalogue.py:25` n'accepte que `all/selected/ignored/pending` |
| **D4** `enrichment.active` jamais lu | majeur | 28 items `selected` à `active=false`, `costs.py:83-85` ne teste que `reference_ids` |
| **D5** Delta écrêté à zéro | majeur | `reference.py:130` et `:149` : `max(reference - tracked, 0.0)` |
| **D6** `reference_consumption` null structurel | mineur | `overview.py:242-244` : `... if ref_energy_id else None` |

### D3 — le filtre catalogue est inutilisable pour les non-classés

`defaults.py:51-59` pose `triage.policy = "normal"` par défaut. `catalogue.py:25` déclare
`_VALID_STATUS = ("all", "selected", "ignored", "pending")`.

| Appel | Résultat |
|---|---|
| `GET /api/hse/catalogue?status=pending` | 200, **0 item** |
| `GET /api/hse/catalogue?status=normal` | **422** — valeur refusée |
| `GET /api/hse/catalogue?status=all` | 200, 111 items dont **77 `normal`** |

Les 77 items non classés ne sont donc atteignables que par `status=all` : l'interface ne peut
pas les filtrer. **C'est la divergence la plus structurante du lot** — la spec parle de
`pending`, le code stocke `normal`.

### D4 — un champ qui promet ce qu'il ne fait pas

Sur les 29 items `selected`, **28 ont `enrichment.active = false`** et sont **quand même
comptés**. `costs.py:83-85` ne teste que l'appartenance à `reference_ids` ; aucun lecteur de
`active` n'existe dans `catalogue/` ni `engine/`.

### État réel de la préprod

| Mesure | Valeur |
|---|---|
| Entités HA | 253 |
| Capteurs d'énergie cumulatifs | 19 |
| Entité Linky / Zlinky / Téléinfo | **0** |
| Catalogue | 111 items → **29 `selected`, 77 `normal`, 5 `ignored`** |
| `reference_entity_id` | `""` |
| `reference_energy_entity_id` | `null` |
| `reference.configured` (diagnostic) | `[]` |
| `coverage_power.status` | `no_reference` |
| `quality.level` | `warning` — note `no_reference_configured` |
| `tracked_w` | 1686,5 |
| `/api/hse/costs` | 29 items, 375,085 kWh, 83,01 € TTC, **aucune clé `reference`** |

Les 5 items `ignored` sont tous des doublons d'énergie (`salon_tv_today_energy`,
`salon_tv_month_energy`, `clim_appart_1_kwh_total`, `ballon_buanderie_kwh_total`,
`cuisine_chauffe_eau_kwh_total`) : la politique de dédoublonnage Q2-R2 a déjà produit son effet.

### Faux positifs du diagnostic, chiffres à l'appui

| Candidat | Score | Rôle | Verdict |
|---|---|---|---|
| `sensor.buanderie_aspirateur_total_energy` | 20 | energy_index | ❌ appareil |
| `sensor.plaque_cuisine_total_energy` | 20 | energy_index | ❌ appareil |
| `sensor.buanderie_aspirateur_power` | 5 | active_power | ❌ appareil |
| `sensor.plaque_cuisine_power` | 5 | active_power | ❌ appareil |

Mécanique exacte : `total_energy` (+10, `_ENERGY_HINTS`) et `power` (+5) donnent 15, puis un
second token porte le total à 20. Ni « aspirateur » ni « plaque » ne figurent dans
`_DEVICE_HINTS` (`reference.py:25`), qui ne connaît que chauffe_eau, clim, radiateur, four,
frigo, seche_linge, lave, tv.

### Divergences spec ↔ code

| Id | Sujet | Spec | Code réel |
|---|---|---|---|
| **S1** | Vocabulaire des états | `pending \| selected \| ignored` | `normal \| selected \| ignored` |
| **S2** | Champs de santé | `health.reason`, `orphan`, `orphan_since`, `reappeared_at` | `defaults.py:42-49` : `first_unavailable_at`, `last_ok_at`, `escalation` |
| **S3** | Grâce de suppression | `triage.removal_grace_days = 90` | absent |
| **S4** | Sens du mot *pending* | état d'attente de décision | état par défaut du scan, nommé `normal` |

### Ce qui n'est pas testable en préprod

| Inconnu | Pourquoi |
|---|---|
| **U1** Le Linky prod expose-t-il un index kWh, une puissance W, ou les deux ? | 0 entité Linky en préprod. Le choix index + puissance est fait **par conception**, pas par observation. |
| **U2** Le Linky expose-t-il un index par période en plus du cumulatif ? | Détermine si `reference_kwh` par jour/mois vient d'un capteur dédié ou d'une différence d'index. |
| **U3** Quelle sémantique pour `enrichment.active` ? | Le champ existe, s'affiche, et n'a aucun effet. |

---

## 2. Q1 — Cycle de vie du capteur et repli automatique

**Réponse** : automatique. Si le capteur renvoie une valeur nulle ou absente (cible d'un
`total_increasing` qui n'existe pas, mis à zéro par HA), le système se replie automatiquement sur
la puissance. Une trace est conservée dans `quality` pour que l'UI affiche « mode dégradé ».

### 2.1 Règle de repli

```
pour chaque capteur énergie sélectionné :
    1. lire l'entité d'énergie (source_mode = "energy_index")
    2. si la série de la fenêtre est vide OU toutes les valeurs sont 0 :
         → basculer sur energy_from_power
         → incrementer degradation_count
         → ajouter une note quality : "energy_from_power:<entity_id>:<raison>"
    3. sinon : conserver
```

### 2.2 Points d'implémentation

| Fichier | Modification |
|---|---|
| `engine/sources.py` | `plan_sources()` : après résolution, tester la série 7 j ; basculer si vide. |
| `engine/health.py` | Ajouter champ `degradation_notes: [string]`. |
| `api/views/overview.py` | Afficher `degradation_count > 0` → badge « mode dégradé ». |

### 2.3 Critères d'acceptation

- [ ] `plan_sources()` renvoie `energy_from_power` quand `energy_index` est vide
- [ ] `quality.degradation_notes` contient l'id du capteur et la raison du repli
- [ ] L'UI affiche un badge « mode dégradé » quand `degradation_count > 0`
- [ ] Le repli est réversible : si le capteur revient, `energy_index` est repris automatiquement
      au prochain `_Sweep`

---

## 3. Q2 — Invariant structurel : un seul capteur énergie par appareil

**Réponse** : l'invariant est structurel. Le catalogue n'accepte qu'un seul `energy_source` par
`device_id`. La garde-fou de puissance est un filet de sécurité complémentaire.

### 3.1 Règle

```
Pour chaque device_id :
    - un seul item avec role="energy_source" autorisé (garantie par le schéma)
    - si 2 items détectent la même entité → second bloqué, message repair
    - si 2 entités candidates pour un même device → l'utilisateur choisit
      (l'API expose energy_source_candidates par device_id)
```

### 3.2 Modification du schéma

```jsonc
// Catalogue item — specification §3.1
{
  "id": "item_...",
  "entity_id": "sensor.washing_machine_total_energy",
  "device_id": "device_...",
  "integration": "tplink",
  "domain": "sensor",
  "role": "energy_source",          // | active_power
  "state_class": "total_increasing",
  "selected": false
}
```

**Contrainte** : unicité de `(device_id, role)` pour `role="energy_source"`. La validation se fait
dans `catalogue/manager.py::validate_catalogue()`.

### 3.3 Critères d'acceptation

- [ ] `validate_catalogue()` rejette 2 items avec même `(device_id, role)` si `role="energy_source"`
- [ ] `api/views/diagnostic.py` expose `energy_source_candidates` par `device_id`
- [ ] Message repair `dual_source` si la contrainte est violée (legacy)

---

## 4. Q3 — Comparaisons de période : week-ends inclus + plages à la demande

**Réponse** : les week-ends sont inclus dans les comparaisons. Des plages à la demande sont
également prévues (`custom_week_start_day`, `POST /api/hse/compare`).

### 4.1 Plages prédéfinies

| Identifiant | Plage |
|---|---|
| `last_full_week` | Lundi → dimanche de la semaine passée |
| `week` | Lundi → aujourd'hui (ou dimanche si passé) |
| `weekend` | Samedi → dimanche |
| `month` | 1er → aujourd'hui (ou fin si passée) |
| `last_month` | Mois précédent en entier |
| `last_full_week_prev_month` | Dernière semaine complète du mois précédent |
| `last_month_prev_year` | Même période il y a un an |
| `last_year` | 365 derniers jours |
| `all` | 2020-01-01 → aujourd'hui |

### 4.2 Plages à la demande

```json
POST /api/hse/compare
{
  "ranges": [
    { "id": "custom_1", "from": "2026-06-01", "to": "2026-06-15", "label": "comparaison" }
  ]
}
```

### 4.3 Configuration du début de semaine

```json
"catalogue": {
  "settings": {
    "custom_week_start_day": 0   // 0 = lundi, 6 = dimanche
  }
}
```

### 4.4 Critères d'acceptation

- [ ] 9 plages pré-calculées (week-ends inclus)
- [ ] Support `custom_week_start_day`
- [ ] Endpoint `POST /api/hse/compare` avec plages custom
- [ ] Données renvoyées : période + label + consommation kWh + coût €

---

## 5. Q4 — Documenter le mode weekend (pas dans la spec)

Le mode weekend est **déjà implémenté** et documenté :
`custom_components/hse/www/js/views/config_view.js` + `engine/weekend_summary.py`.

Il ne fait pas partie des évolutions à implémenter.

---

## 6. Q5 — Garde-fou orphelins et escalade qualité

### 6.1 Escalade_quality

| Condition | Seuil | Note qualité | Criticité |
|---|---|---|---|
| Aucune donnée | — | `no_data:<domain>:<entity_id>` | `critical` |
| Couverture < 0,90 **et** `energy_source` = `energy_index` | 0,90 | `low_coverage:<domain>:<entity_id>:<coverage>` | `warning` → `critical` si 3 jours consécutifs |
| `orphan=True` (entité absente de `hass.states`) | — | `orphaned:<domain>:<entity_id>` | `critical` |
| `degradation_count > 0` | — | `degradation_count:<n>` | `warning` |
| `quality.level = degraded` | — | — | Alerte 48 h |

### 6.2 Politique `removal_mode` par cas

**Définition** : un capteur peut être **présent** dans Home Assistant (l'entité existe mais elle
est en panne, débranchée, à 0 W, indisponible) ou **absent** (l'entité n'existe plus dans
`hass.states` : appareil désinstallé, reconfiguré, supprimé de HA).

| Cas | `removal_mode` | Comportement |
|---|---|---|
| **Entité présente** mais indisponible / 0 W / panne | **manuel** | Reste `selected`, passe `degraded`, alerte à 48 h. **Aucune suppression.** |
| **Absente de HA** depuis moins de 3 mois | **manuel** | Reste orphelin visible, rien n'est supprimé. |
| **Absente de HA** depuis plus de 3 mois | **auto** | Archive automatique → `ignored` avec `reason="removed"`, retiré des calculs. |
| Entité recréée entre-temps | — | Détecté au prochain balayage : `orphan=False`, `orphan_scan_count=0`, repasse `ok` et revient dans les calculs. Si la ligne est en `ignored(removed)`, elle repasse en `pending` avec `reappeared_at` — **jamais** en `selected` automatiquement. |

**Règle** : le mode manuel n'est **jamais** déclenché automatiquement, quelle que soit la
durée d'indisponibilité. Le mode auto n'archive que les entités réellement disparues de HA
depuis plus de 3 mois — il ne touche jamais à un capteur présent mais en panne.

**Champs ajoutés** : `removal_grace_days: 90` (dans `catalogue.settings`), `orphan_since`
(iso, première date d'absence), `reappeared_at` (iso, null par défaut) dans
`items[id].health`.

**Seuil de couverture** : la règle s'applique aux capteurs dont `energy_source` vaut
`energy_index` — c'est-à-dire les **compteurs par appareil**. Le capteur de référence (Linky,
`reference_energy_entity_id`) est traité séparément (cf. §8).

### 6.3 Règle de re-détection des items archivés

**Condition** : la logique de `_identify()` vérifie **d'abord** si un item `ignored(removed)`
correspond à une entité de nouveau présente dans `hass.states`. Si oui :
1. Extraire la ligne du catalogue
2. Changer `triage.policy` → `restore_from_archive` (ou équivalent)
3. Mettre `health.reappeared_at = now().isoformat()`
4. `state` → `pending` (l'utilisateur re-décide)
5. Logger un événement `item_reappeared:<item_id>`

### 6.4 Rétention des items `ignored(removed)`

Les items `removed` **ne sont pas supprimés** du JSON : ils constituent la **mémoire de
détection** qui empêche `_identify()` de re-proposer chaque `_Sweep` une entité qui a
réellement disparu de HA.

- **Détection d'abord** : à chaque `_Sweep`, avant tout archivage, la logique cherche si une
  entité archivée est réapparue dans `hass.states`. Si oui → `reappeared_at`, passage en
  `pending`, jamais en `selected`.
- **Purge ensuite** : au-delà de **12 mois** sans réapparition, l'item est retiré du JSON par
  `_purge_archived_items()` (appelé en fin de `_Sweep`). Le seuil de 12 mois est une constante
  `ARCHIVE_RETENTION_DAYS` dans `catalogue/manager.py`.
- **Jamais purgés** : les items `selected`, les `ignored` posés par l'utilisateur
  (`reason` != `removed`) et les items `pending`.

### 6.5 Critères d'acceptation

- [ ] `quality.notes` contient une entrée par condition violée
- [ ] `quality.level` monte à `critical` si `orphaned` ou si couverture < 0,90 pendant 3 j
- [ ] Un capteur `no_data` est remonté dans `api/views/diagnostic.py` → `quality_alerts`
- [ ] `removal_mode=auto` → item `ignored` avec `reason="removed"` et `health.orphan_since`
- [ ] Item `ignored(removed)` dont l'entité réapparaît → repasse `pending` avec `reappeared_at`
- [ ] Purge à 12 mois appliquée pour les `ignored(removed)` jamais réapparus

---

## 7. Q6 — Choix de l'intégration lors de la sélection

**Réponse** : un seul item peut être sélectionné à la fois par entité physique.

### 7.1 Règle

Quand l'utilisateur sélectionne un item, si un autre item du même `device_id` était sélectionné :
- Le précédent passe automatiquement en `ignored`
- `health.reason` = `selected:other`
- Message repair : `Item X replaced by Y for device Z`

### 7.2 Critères d'acceptation

- [ ] `set_selection()` dans `catalogue/manager.py` implémente la règle
- [ ] Diagnostic affiche la liste des `replaced_items` pour traçabilité

---

## 8. Q7 — Réconciliation avec le compteur de référence (Linky)

### 8.1 Le besoin

Le capteur de référence est le **Linky** : la valeur relevée au compteur, celle qui sera
facturée par le fournisseur en fin de mois si le prix du kWh et l'abonnement sont correctement
renseignés. Ce capteur doit permettre de calculer un **delta** avec ce que la maison mesure via
les capteurs HA, afin de détailler la consommation par pièce et par type d'appareil.

**Règle métier** : en théorie, le compteur de référence ne doit **jamais** être inférieur à la
consommation mesurée. Si c'est le cas, ce n'est pas une question de précision — c'est le signe
d'un **doublon**, d'une **mauvaise conversion d'unité**, d'un **compteur figé**, d'un
**décalage de période** ou d'une **référence qui n'est pas le compteur général** (aspirateur,
plaque…).

### 8.2 Décision d'architecture — index kWh + puissance W

| Champ `settings` | Rôle | Type attendu | Usage |
|---|---|---|---|
| `reference_energy_entity_id` | **Référence de facturation** | `sensor` · `device_class=energy` · `state_class ∈ {total, total_increasing}` · kWh | Delta en kWh, réconciliation de la facture |
| `reference_entity_id` | Référence instantanée | `sensor` · `device_class=power` · W | Delta en W, détection de dépassement et de capteur figé |

**Justification du choix** :

1. Une facture est un **cumul d'énergie**. Seul un index en kWh peut être comparé à une facture.
   La puissance en W ne se compare pas à une facture.
2. La puissance reste utile en complément : elle détecte **en direct** un dépassement ou un
   capteur bloqué (une valeur qui ne bouge plus alors que la maison consomme).
3. Les deux champs existent déjà dans le schéma (`storage/manager.py:57` et `storage/manager.py:59`) et dans
   `_SETTINGS_KEYS` (`api/views/settings.py:35-37`). **Rien à créer** : il manque la
   réconciliation et le garde-fou du détecteur.

### 8.3 L'invariant de cohérence

`tracked_kwh <= reference_kwh × 1,10` (`OVER_TOLERANCE`, `engine/reference.py:30`)

| `status` | Condition | Interprétation |
|---|---|---|
| `no_reference` | aucune référence configurée | rien à comparer |
| `reference_too_low` | `reference_kwh <= 0.05` | période trop courte ou compteur à zéro |
| `ok` | `tracked_kwh <= reference_kwh × 1,10` | normal — l'écart est l'énergie non suivie |
| `tracked_exceeds_ref` | `tracked_kwh > reference_kwh × 1,10` | **anomalie structurelle** |

**Pourquoi une tolérance de 10 % et pas 0 %** : elle absorbe le décalage d'indexation entre le
relevé Linky et l'agrégation HA (pas de 15 min vs pas horaire, arrondis, index relevé à minuit
pile vs moyenne glissante). En dessous de 10 %, l'écart est du bruit. Au-delà, c'est structurel.

**Causes possibles d'un `tracked_exceeds_ref` — à afficher dans le diagnostic** :

1. **Doublon** : deux capteurs mesurent le même appareil (cf. §3, Q2).
2. **Mauvaise conversion d'unité** : Wh comptés comme des kWh (facteur 1000).
3. **Compteur figé** : un `total_increasing` qui ne progresse plus (cf. §2, Q1).
4. **Décalage de période** : la référence couvre un mois civil, les capteurs une fenêtre
   glissante.
5. **Mauvaise référence** : l'`entity_id` renseigné n'est pas le Linky mais un appareil
   (aspirateur, plaque) — c'est exactement le faux positif du détecteur (§8.6).

### 8.4 Ce qui existe déjà (vérifié le 16/11/2026)

| Brique | Fichier | État |
|---|---|---|
| `find_reference_candidates()` | `engine/reference.py:48` | ✅ existe |
| `coverage()` — contrôle en W | `engine/reference.py:107` | ✅ existe |
| `energy_coverage()` — contrôle en kWh | `engine/reference.py:135` | ✅ existe |
| `OVER_TOLERANCE = 1.10` | `engine/reference.py:30` | ✅ existe |
| `MIN_REFERENCE_W = 50.0` | `engine/reference.py:31` | ✅ existe |
| Exclusion de la référence du calcul | `engine/sources.py:81` (`if eid in ref_ids`) | ✅ existe |
| `_STRONG` / `_MEDIUM` / `_DEVICE_HINTS` | `engine/reference.py:20-27` | ✅ existe |
| Champs `settings` | `storage/manager.py:57` et `:59` | ✅ existe |
| `_SETTINGS_KEYS` | `api/views/settings.py:35-37` | ✅ existe |
| Delta par période | `api/views/overview.py:135-141` | ✅ existe |
| Bloc `quality.coverage_energy` | `api/views/overview.py:223` | ✅ existe |
| `reference_consumption` | `api/views/overview.py:242-244` | ⚠️ existe mais **inerte** (conditionné à `ref_energy_id`, qui est vide) |
| **Réconciliation dans les coûts** | `api/views/costs.py` | ❌ **absente** — aucun appel à `energy_coverage` |
| **`reference_energy_entity_id` dans l'options flow** | `options_flow.py:31` et `45-48` | ❌ **absent** — seul `reference_entity_id` est réglable |
| **Exclusion des entités du catalogue dans le détecteur** | `engine/reference.py:48` | ❌ **absente** |
| **Delta signé** | `engine/reference.py:149` | ❌ écrêté à 0 par `max(reference - tracked, 0)` |

### 8.5 Constat de non-fonctionnement (préprod, 16/11/2026)

Réglages relevés sur `192.168.3.67:8123` :

```
reference_entity_id          = ""      (vide)
reference_energy_entity_id   = null    (vide)
```

| Appel | Résultat observé |
|---|---|
| `GET /api/hse/diagnostic` | `reference.configured = []` |
| `GET /api/hse/overview` | `reference_sensor = null`, `reference_consumption = null`, `quality.level = "warning"`, `quality.notes = ["no_reference_configured"]`, `coverage_power.status = "no_reference"`, `tracked_w = 1686.5` |
| `GET /api/hse/costs` | **aucune clé `reference`** ; `total_kwh = 375.085`, `total_ttc_eur = 83.01`, 29 items |

HA expose 253 entités, dont 19 index cumulatifs — **tous des appareils**, aucun Linky / Zlinky /
Téléinfo. La préprod ne permet donc **pas** de valider la réconciliation : elle permet seulement
de valider le garde-fou anti-faux-positif.

### 8.6 Le défaut critique : faux positifs du détecteur

`find_reference_candidates()` lit **toutes** les entités de HA (`api/views/diagnostic.py:132`).
`_ENERGY_HINTS` contient `total_energy` (+10) : tout capteur d'appareil exposant un index
cumulatif marque donc 20, sans qu'aucun indice d'appareil ne le pénalise — `aspirateur` et
`plaque` sont absents de `_DEVICE_HINTS` (`engine/reference.py:25-27`).

Candidats actuellement proposés par la préprod :

| Score | Rôle | Entité | Pourquoi |
|---|---|---|---|
| 20 | `energy_index` | `sensor.buanderie_aspirateur_total_energy` | `total_energy` (+10) + `energy_index` (+10) ; « aspirateur » inconnu de `_DEVICE_HINTS` |
| 20 | `energy_index` | `sensor.plaque_cuisine_total_energy` | idem ; « plaque » inconnu |
| 5 | `active_power` | `sensor.buanderie_aspirateur_power` | `power` (+5) |
| 5 | `active_power` | `sensor.plaque_cuisine_power` | `power` (+5) |

**Conséquence** : si l'utilisateur valide le candidat en tête, l'aspirateur devient le compteur de
référence. L'écart sera faux en permanence et `tracked_exceeds_ref` se déclenchera à chaque
sweep — le pire cas, parce qu'une réconciliation qui « fonctionne » sur la mauvaise référence est
plus dangereuse qu'une réconciliation absente.

### 8.7 Règles d'implémentation

| ID | Règle | Fichiers |
|---|---|---|
| **Q7-R1** | La réconciliation s'appuie **exclusivement** sur `reference_energy_entity_id`, index cumulatif (energy / total* / kWh). `reference_entity_id` (W) ne peut jamais servir de base de facturation. Refus à l'écriture (422) si le capteur pointé n'est pas cumulatif. | `engine/reference.py`, `storage/manager.py`, `api/views/costs.py` |
| **Q7-R2** | `_build_costs_data` expose un bloc `reference` par période : `reference_kwh`, `reference_eur`, `tracked_kwh`, `delta_kwh` (signé), `untracked_kwh`, `surplus_kwh`, `status`, `coverage_pct`. | `api/views/costs.py` |
| **Q7-R3** | Invariant : `tracked > reference × 1,10` → `status="tracked_exceeds_ref"`, `quality.level="error"`, note `tracked_exceeds_reference`. L'erreur est émise sur **`/costs` en plus de `/overview`**. | `engine/reference.py`, `api/views/overview.py`, `api/views/costs.py` |
| **Q7-R4** | `delta_kwh = reference_kwh - tracked_kwh`, **signé**. `untracked_kwh = max(delta,0)`. `surplus_kwh = max(-delta,0)`. Aucun écrêtage silencieux : un delta négatif est affiché négatif. | `engine/reference.py`, `api/views/overview.py`, `api/views/costs.py` |
| **Q7-R5** | Durcissement du détecteur : un candidat dont le score vient **uniquement** de `_ENERGY_HINTS` (20) n'est **jamais** proposé. Un candidat doit porter un token `_STRONG`/`_MEDIUM` ou atteindre `score >= 25`. Toute entité déjà au catalogue (quel que soit son état) est exclue. | `engine/reference.py`, `api/views/diagnostic.py` |
| **Q7-R6** | `overview` expose `reference_consumption` par période dès que `reference_energy_entity_id` est renseigné ; `reference_sensor` reste non nul même sans `reference_entity_id`. | `api/views/overview.py` |
| **Q7-R7** | `options_flow` expose `reference_energy_entity_id` en plus de `reference_entity_id`, persisté via `HseStorageManager`. | `options_flow.py`, `api/views/settings.py` |
| **Q7-R8** | `/api/hse/diagnostic` expose `reference.configured` (ids réellement configurés) et une liste `candidates` filtrée par Q7-R5, chaque entrée portant un `verdict` ∈ {`propose`, `rejete_device`, `rejete_periodique`, `deja_au_catalogue`}. | `api/views/diagnostic.py` |

### 8.8 Format de sortie attendu

```
GET /api/hse/costs?period=month

{
  "period": "month",
  "period_start": "2026-11-01",
  "period_end":   "2026-11-16",
  "total_kwh":    375.085,
  "total_ttc_eur": 83.01,

  "reference": {
    "reference_kwh":  412.9,
    "reference_eur":   89.82,
    "tracked_kwh":    375.085,
    "delta_kwh":       37.815,
    "untracked_kwh":   37.815,
    "surplus_kwh":      0.0,
    "status":          "ok",
    "coverage_pct":    90.84
  },

  "quality": {
    "level": "ok",
    "notes": []
  }
}
```

Cas d'anomalie (doublon, mauvaise conversion, mauvaise référence) :

```
"reference": {
  "reference_kwh": 412.9,
  "tracked_kwh":   1150.0,
  "delta_kwh":    -737.1,
  "untracked_kwh":   0.0,
  "surplus_kwh":   737.1,
  "status": "tracked_exceeds_ref",
  "coverage_pct": 278.5
},
"quality": {
  "level": "error",
  "notes": ["tracked_exceeds_reference"]
}
```

### 8.9 UI

| Élément | Comportement |
|---|---|
| Delta kWh du mois | `reference_kwh - tracked_kwh`, signé ; négatif → rouge + tooltip listant les causes de §8.3 |
| `untracked_kwh` | Énergie comptée par Linky et non expliquée par les capteurs HA — c'est l'angle mort à combler |
| `surplus_kwh` | **Alarme** : mesuré > référence |
| `coverage_pct` | Part de la facture expliquée par les capteurs HA |
| `quality.level = error` | Badge rouge « dépassement de la référence » |
| `quality.level = warning` + `no_reference_configured` | Badge gris « référence non configurée » |
| Réglage | Champ `reference_energy_entity_id` avec autocomplétion filtrée sur `device_class=energy` |

### 8.10 Critères d'acceptation

- [ ] `reference_energy_entity_id` refusé (422) s'il n'est pas un index cumulatif
- [ ] `GET /api/hse/costs` renvoie un bloc `reference` non nul dès que l'index est renseigné
- [ ] `untracked_kwh + surplus_kwh == |delta_kwh|`
- [ ] `tracked = 1,11 × reference` → `status = tracked_exceeds_ref` **et** `quality.level = error`
      sur `/costs` **et** `/overview`
- [ ] `sensor.buanderie_aspirateur_total_energy` et `sensor.plaque_cuisine_total_energy` ne
      figurent plus dans `candidates`
- [ ] Un `sensor.zlinky_*_index` reste proposé en tête
- [ ] Une entité déjà au catalogue n'apparaît jamais dans `candidates`
- [ ] `reference_energy_entity_id` réglable depuis l'UI et persisté
- [ ] Delta négatif affiché négatif en rouge, jamais à 0

---

## 9. Champs de données à ajouter

### 9.1 `catalogue.items[id].health` — extension

```jsonc
"health": {
  "orphan": false,
  "orphan_since": "2026-11-16T00:00:00+01:00",   // null tant que l'entité est présente
  "reappeared_at": null,                          // renseigné si l'entité revient
  "degradation_count": 0,
  "degradation_notes": [],
  "reason": null                                  // "removed", "selected:other", ...
}
```

### 9.2 `catalogue.settings` — extension

```jsonc
{
  "mode": "flat",                        // | "HC/HP" | "TEMPO" | "WEEKEND"
  "price_ttc_kwh": 0.2204,               // "flat"
  "price_hc_ttc_kwh": 0.1809,            // "HC/HP"
  "price_hp_ttc_kwh": 0.2475,            // "HC/HP"
  "subscription_eur_month": 15.19,
  "tempo": {
    "price_blue_days":    0.1827,
    "price_white_days":   0.2595,
    "price_red_days":     0.7226
  },
  "removal_grace_days": 90,              // délai avant auto-archive (absent > 3 mois)
  "custom_week_start_day": 0,            // 0 = lundi, 6 = dimanche
  "reference_entity_id": "sensor.xxx_power",        // puissance W — référence instantanée
  "reference_energy_entity_id": "sensor.xxx_index_kwh" // index kWh — référence de FACTURATION
}
```

`removal_grace_days` est un réglage global (pas par item). `reference_entity_id` et
`reference_energy_entity_id` sont indépendants et déjà persistés (`storage/manager.py:57,59`).

### 9.3 `api /api/hse/costs` → objet `reference`

| Champ | Type | Description |
|---|---|---|
| `reference_kwh` | `float \| null` | Index Linky sur la période |
| `reference_eur` | `float \| null` | `reference_kwh × tarif`, abonnement au prorata |
| `tracked_kwh` | `float` | Somme des capteurs HA (référence exclue) |
| `delta_kwh` | `float` | **Signé** : `reference_kwh - tracked_kwh` |
| `untracked_kwh` | `float` | `max(delta_kwh, 0)` — angle mort |
| `surplus_kwh` | `float` | `max(-delta_kwh, 0)` — **anomalie** |
| `status` | `string` | `no_reference \| reference_too_low \| ok \| tracked_exceeds_ref` |
| `coverage_pct` | `float \| null` | `tracked_kwh / reference_kwh × 100` |

### 9.4 `api /api/hse/diagnostic` → objet `reference`

| Champ | Type | Description |
|---|---|---|
| `configured` | `[string]` | Ids réellement configurés (les deux références) |
| `candidates` | `[{entity_id, role, score, verdict}]` | Candidats filtrés par Q7-R5, avec verdict |

---

## 10. Plan d'implémentation

| Phase | Contenu | Exigences | Fichiers |
|---|---|---|---|
| **P0** | Corriger le JSON de bug (retrait de l'affirmation « remise à zéro ») | — | `docs/hse_v3_bug_report_2026-11-13.json` |
| **P1** | `has_live_energy()` + repli par fenêtre + `quality` | Q1-R1, Q1-R2, Q1-R3, Q5-R2 | `engine/sources.py`, `engine/health.py`, `api/views/overview.py` |
| **P2** | Balayage orphelins + escalade `no_data`/`low_coverage` + `removal_mode` (manuel si panne, auto-archive si disparu > 3 mois) + re-détection des items archivés | Q5-R1, Q5-R3, Q5-R4 | `catalogue/manager.py`, `repairs.py`, `api/views/diagnostic.py` |
| **P3** | Invariant `UNIQUE(device_id)` + 409 + modale Q6 | Q2-R1, Q6-R1 | `catalogue/manager.py`, `api/views/diagnostic.py`, `repairs.py` |
| **P4** | Nettoyage du catalogue | Q2-R2 | `catalogue/manager.py` |
| **P5** | `custom_week_start_day` opérationnel | Q3-R1 | `engine/ranges.py`, `api/views/compare.py` |
| **P6** | `ranges.py` + `period=range` + `/api/hse/compare` | Q3-R2, Q3-R3 | `engine/ranges.py`, `api/views/compare.py` |
| **P7** | Documentation mode weekend + 3e option UI | Q4-R1 | `docs/backend/05_settings.md`, `docs/architecture/API_CONTRACT.md`, `www/js/views/config_view.js` |
| **P8** | **Réconciliation du compteur de référence dans les coûts** (référence = index kWh) + delta signé | Q7-R1, Q7-R2, Q7-R3, Q7-R4, Q7-R6 | `api/views/costs.py`, `engine/reference.py`, `api/views/overview.py` |
| **P9** | **Durcissement du détecteur de référence** + exclusion des entités du catalogue + `reference_energy_entity_id` dans l'options flow + verdicts diagnostic | Q7-R5, Q7-R7, Q7-R8 | `engine/reference.py`, `api/views/diagnostic.py`, `options_flow.py` |
| **P10** | Tests non-régression (double comptage, plages, orphelins, réconciliation) | Q2-R1, Q3-R2, Q5-R1, Q7-R3, Q7-R5 | `tests/` |

**Dépendances** : P9 dépend de P8 ; P10 dépend de P8 et P9. Les autres phases sont indépendantes.

**Ordre recommandé** : P0 → P1 → P2 → P3 → P4 → P5 → P6 → **P8 → P9** → P7 → P10.

P8 et P9 avant P7 : la réconciliation conditionne la lisibilité de tout le reste — un dashboard
qui affiche des kWh non réconciliés avec la facture n'est pas exploitable.

---

## 11. Points à trancher — tous tranchés le 16/11/2026

### 11.1 Seuil `low_coverage` (0,90) — **TRANCHÉ : option A**

**Définition** : la couverture est la **part des pas de temps d'une période où le compteur a
répondu**. 27 jours sur 30 → 90 %.

| Option | Description | Inconvénient |
|---|---|---|
| **A. Repli total** *(retenue)* | Couverture ≥ 0,90 → compteur pour **toute** la fenêtre. Couverture < 0,90 → basculer **toute** la fenêtre sur la puissance. | Perte du détail compteur sur la fenêtre |
| B. Appoint mixte | Partie compteur (90 %) + complément puissance (10 %) | Chiffre mixte, raccord inexplicable |
| C. Garder quand même | Conserver le compteur avec avertissement | Risque de sous-estimation si compteur figé / remis à zéro |

**Décision** : **A — repli total**. Un chiffre entièrement compteur ou entièrement puissance se
défend ; un chiffre mixte ne se justifie pas.

**Caractérisation** : règle de la §6.1, ligne « Couverture < 0,90 ». S'applique à
`energy_source = "energy_index"` (compteurs **par appareil**). Le capteur de référence
(Linky, `reference_energy_entity_id`) est hors périmètre de cette règle : une couverture
partielle du Linky se traduit par un `reference_kwh` plus petit que la réalité, donc par un
delta plus petit — pas par une alarme. C'est le `coverage_pct` de §8.8 qui le signale.

### 11.2 `removal_mode` (manuel / auto) — **TRANCHÉ**

- **Manuel si le capteur est cassé, débranché, à 0 W** : il reste sélectionné, dégradé, avec
  alerte. Aucune suppression automatique.
- **Auto si l'entité a réellement disparu de HA depuis plus de 3 mois** : archivage dans
  `ignored`, `reason="removed"`, avec `orphan_since` et re-détection au retour.
- **Jamais** d'auto-suppression d'un capteur encore présent dans HA.

### 11.3 Purge des items `ignored(removed)` — **TRANCHÉE**

- Pas de purge à 90 jours.
- Détection de réapparition **d'abord** (§6.3).
- Purge **après 12 mois** pour les lignes jamais réapparues (`ARCHIVE_RETENTION_DAYS` dans
  `catalogue/manager.py`).
- Jamais de purge sur `selected`, `ignored` utilisateur, `pending`.

### 11.4 Choix du capteur de référence — **TRANCHÉ : A (index) + C (puissance)**

- `reference_energy_entity_id` = index kWh → **référence de facturation** (§8.2).
- `reference_entity_id` = puissance W → **référence instantanée**, détection de dépassement et
  de capteur figé.
- Invariant : `tracked_kwh <= reference_kwh × 1,10` (§8.3).
- Garde-fou du détecteur : aucun candidat issu des seuls `_ENERGY_HINTS` (§8.7, Q7-R5).

---

## 12. Ce qui n'est pas dans ce document

- L'implémentation elle-même (aucune ligne de code modifiée).
- Le choix du capteur de référence à ta place : le document définit ce qu'il doit être et
  comment le vérifier, pas *lequel* de tes capteurs le Linky expose.
- La validation de la réconciliation sur la préprod : **impossible** — aucun capteur
  Linky/Zlinky/Téléinfo n'y existe (253 entités, 19 index cumulatifs, tous des appareils).
- La validation du calcul de facture : les tarifs préprod sont à 0
  (`price_ttc_kwh: 0`, `price_hc_ttc_kwh: 0`, `price_hp_ttc_kwh: 0`).

---

## 13. Questions à soumettre au modèle

Ces huit points ne sont pas tranchables sans arbitrage. Tout le reste du document est décidé.
Ils sont destinés à être soumis tels quels, avec le JSON.

| Id | Sujet | Contexte factuel | Question | Enjeu |
|---|---|---|---|---|
| **QM1** | Vocabulaire des états | `defaults.py:54` écrit `normal` ; `catalogue.py:25` refuse `normal`, et `pending` renvoie 0 | Renommer `normal` en `pending` partout, ou ajouter `pending` comme alias ? | Renomage = UI + API + migration des 77 items. Alias = deux mots pour une seule chose. |
| **QM2** | `enrichment.active` | 28/29 `selected` à `active=false`, tous comptés | `active` doit-il exclure du calcul, ou être retiré du schéma ? | Le faire respecter change la consommation affichée du jour au lendemain. |
| **QM3** | Tolérance de dépassement | `OVER_TOLERANCE = 1,10` (`reference.py:30`) | 10 % est-il le bon seuil pour un Linky ? | Trop bas = fausses alertes. Trop haut = dépassements réels noyés. |
| **QM4** | Exposition du delta | Écrêtage `max(ref - tracked, 0)` en `:130` et `:149` | Exposer un `delta_kwh` signé en plus du `status` ? | Un delta signé dimensionne l'anomalie mais change le contrat d'API. |
| **QM5** | Index par période | `overview.py:242-244` dérive `reference_consumption` des périodes | Si le Linky n'a qu'un cumulatif, dériver les périodes par différence d'index ? | Sans stockage d'index horodaté, aucune réconciliation jour/mois n'est possible. |
| **QM6** | `low_coverage` | Option A (repli total) retenue | Confirmer A, ou moduler selon le type de compteur ? | Un compteur réellement cumulatif ne devrait pas basculer sur la puissance. |
| **QM7** | Purge des `ignored(removed)` | Purge à 12 mois (§11.3) | 12 mois est-il cohérent avec la rétention attendue ? | Trop court = capteur absent oublié. Trop long = catalogue qui enfle. |
| **QM8** | Périmètre | D3 et D4 sont hors Q7 mais bloquent sa lisibilité | Les traiter dans la même passe que Q7, ou en dette séparée ? | Mélanger augmente le risque de régression sur un lot déjà livré. |
