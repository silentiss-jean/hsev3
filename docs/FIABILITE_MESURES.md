# HSE V3.1 — Fiabilité des mesures énergie

Objectif : chaque chiffre affiché (W, kWh, €) est **traçable**, **normalisé** et
**recoupé avec le compteur général** (ZLinky / Lixee / Leexi…). Principe : *refuser plutôt que deviner*.

## Bugs V3.0 corrigés

| # | Problème | Effet | Correction |
|---|----------|-------|------------|
| 1 | `get_power_w` ne vérifiait pas le type : un capteur **kWh** était lu comme des **W** (ex. « salon tv Month Energy » = 42 W) | puissance totale, top 5, pièces faussés ; énergie jamais comptée en live | `engine/measure.py` : type déduit de l'unité (W/kW/MW/mW, Wh/kWh/MWh) |
| 2 | Unité inconnue = « on suppose W / kWh » | erreur silencieuse ×1000 | rejet + raison (`unit_missing`, `unit_unsupported:X`) |
| 3 | VA (puissance apparente du Linky) pouvait être pris pour des W | surestimation | `unit_not_active_power:VA` |
| 4 | Énergie période = dernier − premier état sur **toutes** les entités (y compris des capteurs de puissance) | valeurs absurdes / 0 | routage par type : compteur → stats, puissance → intégration |
| 5 | Le recorder purge les états bruts (10 j par défaut) | mois / année faux | **statistiques long terme** en méthode n°1 |
| 6 | Remise à zéro du compteur → `0.0` pour toute la période ; Wh non converti | énergie perdue / ×1000 | incréments avec re-base + anti-glitch ; conversion d'unité |
| 7 | Fenêtres « aujourd'hui / semaine / mois » en **UTC** | décalage 1–2 h en France | calendrier **local** (`dt_util.DEFAULT_TIME_ZONE`) |
| 8 | Compteurs « today / month energy » d'un même appareil additionnés avec le total | double comptage | `engine/sources.py` |
| 9 | Compteur de référence possiblement additionné aux appareils | double comptage | référence toujours exclue des totaux |

## Règles de calcul

- Puissance canonique : **W**. Énergie canonique : **kWh**.
- Puissance négative ou > 100 kW : exclue (raison remontée).
- Compteur cumulatif : somme des hausses ; une baisse = remise à zéro (re-base, **aucune énergie inventée**) ;
  hausse > 100 kW de débit = glitch ignoré.
- Appareil sans compteur cumulatif : énergie par intégration de la puissance (moyennes horaires des statistiques
  + résiduel de l'heure en cours). Indisponible = 0 (jamais de consommation devinée).
- Appareil avec compteur cumulatif **et** puissance : puissance pour le live, compteur pour l'énergie.
- Multi-voies (prises multiples sur un même appareil) : conservées mais signalées (`multiple_*_same_device`).

## Compteur de référence (ZLinky / Lixee / Leexi)

Réglages (`PUT /api/hse/settings`) :
- `reference_entity_id` : puissance **active** (W) du compteur ;
- `reference_energy_entity_id` : **index** cumulatif (kWh).

`GET /api/hse/diagnostic` → `reference.candidates` propose automatiquement les capteurs probables
(score + raisons). `GET /api/hse/overview` → `quality` indique la couverture :

| statut | sens |
|--------|------|
| `ok` | appareils ≤ compteur (+10 %) ; le reste est la consommation **non suivie** |
| `tracked_exceeds_ref` | appareils > compteur +10 % : double comptage, mauvaise unité ou capteur figé → niveau `error` |
| `reference_too_low` | compteur < 50 W (puissance) ou ≤ 0,05 kWh (énergie) : ratio non significatif |
| `no_reference` | aucun compteur configuré |

Réponse additive (rien de supprimé) : `reference_consumption`, `quality`, et par appareil dans `/api/hse/costs`
`method`, `quality`, `excluded_reason`.

### Écart signé (Q7-R4)

L'écart n'est jamais écrêté silencieusement :

- `delta_kwh` / `delta_w` = **référence − mesuré**, signé ;
- `untracked_kwh` / `untracked_w` = la même valeur plancher à 0 (part non suivie) ;
- `surplus_kwh` / `surplus_w` = le dépassement quand le mesuré dépasse la référence.

Un `untracked_kwh = 0` ne prouve donc pas la conformité : il faut lire `delta_kwh`
(0 = exactement couvert, > 0 = non suivi, < 0 = mesuré > référence) et `surplus_kwh`.

### Filtre des candidats (Q7-R5)

`reference.candidates` ne propose pas n'importe quel capteur :

- les entités **déjà présentes au catalogue** sont exclues (`exclude=`), pour ne pas reproposer un appareil suivi ;
- `_DEVICE_HINTS` couvre les appareils individuels (`aspirateur`, `plaque`, `hotte`, `four`, `seche_linge`,
  `piscine`, `vmc`, `pac`, `robot`, `cave`, `garage`…) : leurs `total_energy` sortent avec un score négatif ;
- un candidat sans indice de compteur (`linky`, `lixee`, `teleinfo`, `compteur`, `slot_`, `general`, `maison`…)
  n'est retenu que si `score >= 25`. Un `total_energy` nu (aspirateur, plaque) est donc rejeté.

### Bloc `reference` de `/api/hse/costs`

Depuis DELTA-067, `/api/hse/costs` expose le même contrôle que l'overview, dans un bloc `reference` :

```json
"reference": {
  "entity_id": "sensor.linky_index",
  "status": "ok",
  "reference_kwh": 420.5, "reference_eur": 128.11,
  "tracked_kwh": 375.8,
  "delta_kwh": 44.7, "surplus_kwh": 0.0, "untracked_kwh": 44.7,
  "coverage_pct": 89.4
}
```

- `reference_kwh` vient de l'**index** (`reference_energy_entity_id`), pas de la puissance ;
- `reference_eur` = coût de l'énergie de la référence **+ prorata d'abonnement**, donc directement
  comparable à `total_ttc_eur` ;
- `tracked_kwh` est le total des appareils — le compteur de référence n'y est **jamais** inclus
  (`plan.reference_ids`), même s'il figure au catalogue ;
- `status` vaut `no_reference` (rien de configuré), `reference_unavailable` (entité introuvable ou
  sans statistiques), `reference_too_low`, `ok` ou `tracked_exceeds_ref`.

### Qualité remontée (Q7-R3)

Un dépassement de plus de 10 % ne se contente pas d'un statut : il remonte en
`reference.quality = {"level": "error", "notes": ["tracked_exceeds_reference"]}`
sur `/api/hse/costs` **en plus** de `/overview`. L'écran coûts affiche donc le
chiffre faux **et** le motif, au lieu de laisser croire qu'il est juste.

### Validation du capteur de référence à la saisie (Q7-R1)

`PUT /api/hse/settings` refuse (422, message explicite) :

| champ | exige | sert à |
|-------|-------|--------|
| `reference_energy_entity_id` | unité kWh/Wh/MWh **et** `state_class` `total`/`total_increasing` | base de facturation, réconciliation |
| `reference_entity_id` | unité W/kW | contrôle instantané uniquement |

Un index sans `state_class` cumulatif, un `today_energy`, ou une puissance W
dans le champ énergie sont refusés : mieux vaut un refus explicite qu'une
facture fausse. Un champ vide efface la référence (retour à `no_reference`).

### Verdicts du diagnostic (Q7-R8)

`/api/hse/diagnostic` renvoie `reference.candidates` (verdict `propose`),
`reference.rejected` (chaque entité écartée avec son `verdict` + `reasons[]`)
et `reference.counts`. Verdicts : `propose`, `rejete_device`,
`rejete_periodique`, `deja_au_catalogue`, `rejete_score`, `rejete_role`.

### Statut du catalogue : `pending` (D3)

Le vocabulaire est unifié sur `pending` (celui du frontend, des badges et des
compteurs). Les catalogues existants en `normal` sont migrés à l'ouverture
(`storage/manager.py`, auto-hérissant, idempotent) ; `?status=normal` reste
accepté en lecture et renvoie le même ensemble que `?status=pending`.

### `enrichment.active` est un affichage (D4)

`enrichment.active` est la projection d'affichage de `triage.policy`. La
source de vérité pour les calculs (`costs.py`, `group_totals.py`) reste
`triage.policy` : un item `selected` avec `active=false` est réaligné au
chargement, mais `active` ne coupe jamais un calcul tout seul.

## Protocole de validation en préprod

1. `GET /api/hse/diagnostic` : choisir le capteur ZLinky (W actif + index kWh) dans `reference.candidates`.
2. Renseigner les deux `reference_*` via `PUT /api/hse/settings`.
3. Ouvrir `/api/hse/overview` : `quality.level` doit être `ok` ou `warning` explicable, jamais `error`.
4. Allumer le ballon (ou la clim) : `power_now_w` doit monter de sa puissance nominale (±10 %).
5. Après 1 h : énergie ballon ≈ puissance × 1 h ; `coverage_energy.day.status` = `ok`.
6. Comparer `reference_consumption.month.eur` à la facture : l'écart doit venir de l'abonnement/taxes.
7. Côté UI, vérifier les trois écrans : **Coûts** affiche le bloc réconciliation (référence,
   suivi, écart signé, non suivi, surplus, couverture) avec un badge `Conforme` /
   `Dépasse la référence` ; **Diagnostic** liste les candidats retenus et les motifs de rejet ;
   **Configuration** montre deux selects distincts (index kWh vs puissance W).
8. Tenter d'enregistrer une puissance W dans le champ « index d'énergie » : le refus 422 et son
   message doivent s'afficher sous le select (preuve que Q7-R1 protège la facturation).

## Limites connues (volontairement documentées)

- **HP/HC** : en mode `hphc` les coûts sont calculés au tarif HP (note `hphc_costs_at_hp_rate`,
  niveau `warning`). Le découpage horaire HP/HC est la prochaine étape.
- `engine/analytics.py` (historique 12 mois) utilise encore l'ancienne logique recorder.
- Les statistiques long terme n'existent que pour les capteurs ayant un `state_class` ; sans cela repli
  sur l'historique brut (`quality: partial`, fiable seulement sur la fenêtre de purge).
- Code dépendant de Home Assistant (`async_energy_detail`) non exécutable hors HA : la logique pure est testée
  (`python3 -m unittest discover -s tests -v`), l'accès recorder doit être validé en préprod.
- Le frontend n'affiche pas encore le bloc `quality` de l'overview (données disponibles via l'API).
- `custom_components/hse/web_static/panel/app.js` n'existe pas : toute vérification JS doit cibler les
  fichiers réellement présents (`features/*/*_view.js`) via `node --check`.
