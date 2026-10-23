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
| `reference_too_low` | compteur < 50 W : ratio non significatif |
| `no_reference` | aucun compteur configuré |

Réponse additive (rien de supprimé) : `reference_consumption`, `quality`, et par appareil dans `/api/hse/costs`
`method`, `quality`, `excluded_reason`.

## Protocole de validation en préprod

1. `GET /api/hse/diagnostic` : choisir le capteur ZLinky (W actif + index kWh) dans `reference.candidates`.
2. Renseigner les deux `reference_*` via `PUT /api/hse/settings`.
3. Ouvrir `/api/hse/overview` : `quality.level` doit être `ok` ou `warning` explicable, jamais `error`.
4. Allumer le ballon (ou la clim) : `power_now_w` doit monter de sa puissance nominale (±10 %).
5. Après 1 h : énergie ballon ≈ puissance × 1 h ; `coverage_energy.day.status` = `ok`.
6. Comparer `reference_consumption.month.eur` à la facture : l'écart doit venir de l'abonnement/taxes.

## Limites connues (volontairement documentées)

- **HP/HC** : en mode `hphc` les coûts sont calculés au tarif HP (note `hphc_costs_at_hp_rate`,
  niveau `warning`). Le découpage horaire HP/HC est la prochaine étape.
- `engine/analytics.py` (historique 12 mois) utilise encore l'ancienne logique recorder.
- Les statistiques long terme n'existent que pour les capteurs ayant un `state_class` ; sans cela repli
  sur l'historique brut (`quality: partial`, fiable seulement sur la fenêtre de purge).
- Code dépendant de Home Assistant (`async_energy_detail`) non exécutable hors HA : la logique pure est testée
  (`python3 -m unittest discover -s tests -v`), l'accès recorder doit être validé en préprod.
- Le frontend n'affiche pas encore le bloc `quality` (données disponibles via l'API).
