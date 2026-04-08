# HSE V3 — Onglet 1 : `overview` (Accueil / Dashboard)

## Mission
Donner en un coup d'œil l'état électrique de l'installation.
C'est le seul onglet compréhensible sans connaître l'interface.

---

## Ce que cet onglet doit faire
- Afficher la puissance totale instantanée (W), rafraîchissement toutes les 10 s
- Afficher la consommation kWh + coût TTC € pour : jour, semaine, mois, année
- Afficher le Top 5 des appareils les plus consommateurs
- Afficher les totaux par pièce et par type d'appareil (rings/bento)
- Afficher le capteur de référence + comparaison vs somme des capteurs HSE
- Afficher un bandeau de statut global (OK / warning / erreur) avec lien vers Diagnostic

## Ce que cet onglet ne doit PAS faire
- Modifier des données
- Charger les données du catalogue ou de la configuration
- Afficher des détails de capteur individuels
- Reconstruire le DOM au-delà du premier render
- Faire des appels fetch dans `update_hass()`

---

## Sources de données

| Données | Endpoint | Polling |
|---|---|---|
| Vue complète dashboard | `GET /api/hse/overview` | 30 s |
| Puissance instantanée | inclus dans `/overview` | 10 s (timer interne) |

### Forme attendue de `/api/hse/overview`
```json
{
  "power_w": 1420,
  "consumption": {
    "day_kwh": 12.4, "day_cost_ttc": 2.48,
    "week_kwh": 78.2, "week_cost_ttc": 15.64,
    "month_kwh": 312.0, "month_cost_ttc": 62.40,
    "year_kwh": 3744.0, "year_cost_ttc": 748.80
  },
  "top5": [
    { "name": "Clim Salon", "power_w": 520, "entity_id": "sensor.hse_clim_salon" }
  ],
  "by_room": [ { "room": "Salon", "kwh": 4.2 } ],
  "by_type": [ { "type": "Climatisation", "kwh": 5.1 } ],
  "reference": {
    "active": true, "source": "external",
    "reference_w": 1450, "sum_hse_w": 1420, "delta_pct": 2.1, "alert": false
  },
  "global_status": "ok",
  "global_status_detail": ""
}
```

---

## États UX

| État | Affichage |
|---|---|
| Chargement initial | Skeleton blocs puissance + KPIs + top5 |
| Données disponibles | Layout complet |
| Aucun capteur configuré | Message + bouton vers Scan |
| Erreur fetch | Bandeau erreur + bouton "Réessayer" |
| Écart référence > seuil | Badge orange sur le bloc référence |

---

## Actions utilisateur

| Action | Effet |
|---|---|
| Sélecteur Jour/Sem/Mois/An | Change la période, persisté dans user_prefs (R4) |
| Clic statut global | Navigation vers `diagnostic` |
| Clic appareil Top 5 | Navigation vers `costs` filtré |
| Clic pièce | Navigation vers `costs` filtré |

---

## Règles métier
- Puissance totale = somme des `current_power_w` des capteurs sélectionnés
- Si `delta_pct > 10%` → `alert: true` → badge orange
- Coût affiché = TTC, abonnement proratisé inclus
- Si aucun tarif configuré → afficher "—" à la place du coût

---

## Fichiers concernés

web_static/panel/features/overview/
├── overview.view.js
├── overview.html.js
└── overview.css


---

## Definition of Done
- [ ] `mount()` construit skeleton puis layout complet après premier fetch
- [ ] `update_hass()` ne fait rien de plus que `this._hass = hass`
- [ ] `unmount()` annule le `setInterval` du polling 10 s
- [ ] KPIs mis à jour via `textContent` uniquement
- [ ] Sélecteur de période persisté via `user_prefs` (R4)
- [ ] État vide si aucun capteur actif
- [ ] État erreur + bouton "Réessayer"
- [ ] Skeleton avant premier fetch (R5)
- [ ] Signature JSON vérifiée (R3)
- [ ] Navigation vers `diagnostic` et `costs` fonctionnelle