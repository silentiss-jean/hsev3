# HSE V3 — Onglet 8 : `costs` (Analyse de coûts)

> **Onglet prioritaire V3 : c'est ici que se trouvait la régression critique de V2.**

## Mission
Présenter l'analyse détaillée des coûts par appareil, avec historique, graphique et export.
Onglet le plus complexe techniquement — les règles R1–R5 y sont particulièrement critiques.

---

## Ce que cet onglet doit faire
- Tableau de coûts par appareil : puissance live, énergie + coût sur 4 périodes
- Graphique de répartition (camembert top 10)
- Historique des 12 derniers mois (barres)
- Filtre de période + comparaison deux périodes
- Export du tableau en CSV
- Rafraîchissement automatique toutes les 60 s

## Ce que cet onglet ne doit PAS faire
- **Reconstruire le tableau entier à chaque tick** (bug V2 — interdit)
- Calculer les coûts côté client (tout vient du backend)
- Utiliser `localStorage`

---

## Sources de données

| Données | Endpoint | Polling |
|---|---|---|
| Tableau coûts | `GET /api/hse/costs` | 60 s |
| Historique 12 mois | `GET /api/hse/history` | Aucun (une fois) |
| Export CSV | `GET /api/hse/costs/export?format=csv` | À la demande |

### Forme de `/api/hse/costs`
```json
{
  "updated_at": "2026-04-07T20:00:00",
  "devices": [
    {
      "entity_id": "sensor.hse_clim_salon",
      "name": "Clim Salon", "room": "Salon", "type": "Climatisation",
      "power_w": 520,
      "day":   { "kwh": 2.1, "cost_ht": 0.38, "cost_ttc": 0.46 },
      "week":  { "kwh": 14.7, "cost_ht": 2.67, "cost_ttc": 3.20 },
      "month": { "kwh": 63.0, "cost_ht": 11.43, "cost_ttc": 13.72 },
      "year":  { "kwh": 756.0, "cost_ht": 137.16, "cost_ttc": 164.59 }
    }
  ],
  "totals": { "power_w": 1420, "day": { "kwh": 12.4, "cost_ttc": 2.48 } }
}
```

---

## Règles de rendering spécifiques à `costs`

### Règle C1 — Construction unique du tableau

```javascript
// ❌ INTERDIT — c'était le bug V2
_render(data) {
  this._root.querySelector('tbody').innerHTML = buildRows(data);
}

// ✅ OBLIGATOIRE
_render(data) {
  for (const device of data.devices) {
    const row = this._root.querySelector(`tr[data-id="${device.entity_id}"]`);
    if (!row) continue;
    row.querySelector('.power').textContent     = `${device.power_w} W`;
    row.querySelector('.cost-day').textContent  = `${device.day.cost_ttc} €`;
  }
}
```

### Règle C2 — Flag `_isRendering`
```javascript
if (this._isRendering) return;
this._isRendering = true;
try { this._render(data); } finally { this._isRendering = false; }
```

### Règle C3 — Données UNIQUEMENT depuis le backend
Aucun calcul de coût côté client. Jamais d'extrapolation ou de proratisation dans le JS.

---

## États UX

| État | Affichage |
|---|---|
| Chargement initial | Skeleton tableau + skeleton graphiques |
| Données disponibles | Tableau + graphiques rendus |
| Polling 60 s | Mise à jour silencieuse via `textContent` |
| Aucun capteur configuré | Message + lien vers Scan |
| Erreur fetch | Bandeau erreur + "Réessayer" |

---

## Règles métier
- Colonne "W live" = seule colonne mise à jour en temps réel
- Graphique camembert : top 10 par coût, reste groupé en "Autres"
- Historique chargé une seule fois au `mount()`, non rafraîchi
- Changement de période → rebuild autorisé (action explicite, pas polling)

---

## Fichiers concernés
web_static/panel/features/costs/
├── costs.view.js
├── costs.table.js
├── costs.chart.js
├── costs.html.js
└── costs.css


---

## Definition of Done
- [ ] Tableau construit une seule fois dans `mount()` (C1)
- [ ] Cellules mises à jour par `textContent` au polling (C1)
- [ ] Flag `_isRendering` présent (C2)
- [ ] Aucun calcul coût côté client (C3)
- [ ] Skeleton tableau + graphiques avant premier fetch (R5)
- [ ] Flag `_fetching` (R2)
- [ ] Signature JSON (R3)
- [ ] Aucun localStorage (R4)
- [ ] `unmount()` annule timer 60 s + fetch en cours
- [ ] Export CSV fonctionnel
- [ ] Camembert top 10 + historique 12 mois