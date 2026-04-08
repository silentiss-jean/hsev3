# HSE V3 — Onglet 3 : `scan` (Détection d'entités)

## Mission
Trouver les entités HA non encore dans le catalogue HSE et permettre de les ajouter.
Porte d'entrée du premier paramétrage et des ajouts ultérieurs.

---

## Ce que cet onglet doit faire
- Lancer un scan des entités HA **à la demande** (pas au chargement)
- Afficher les entités détectées hors catalogue avec un score de qualité
- Ajouter une entité individuellement ou en masse
- Proposer automatiquement le "meilleur capteur par device"
- Fournir un filtre par domaine, device, mot-clé
- Paginer les résultats au-delà de 50 entités

## Ce que cet onglet ne doit PAS faire
- Lancer le scan automatiquement à chaque `mount()` (action explicite uniquement)
- Modifier des capteurs déjà dans le catalogue (→ `config`)
- Reconstruire la liste entière à chaque ajout individuel

---

## Sources de données

| Données | Endpoint | Méthode |
|---|---|---|
| Lancer le scan | `POST /api/hse/scan` | POST |
| Résultats paginés | `GET /api/hse/scan?page=N&q=...` | GET |
| Ajouter au catalogue | `POST /api/hse/catalogue/add` | POST |

### Forme de la réponse GET `/api/hse/scan`
```json
{
  "total": 143, "page": 1, "per_page": 50,
  "results": [
    {
      "entity_id": "sensor.tuya_bureau_power",
      "friendly_name": "Bureau - Puissance",
      "device_name": "Tuya Bureau",
      "domain": "sensor",
      "score": 88,
      "best_for_device": true,
      "unit": "W",
      "state": "42.3",
      "already_in_catalogue": false
    }
  ]
}
```

---

## États UX

| État | Affichage |
|---|---|
| Avant premier scan | Message d'invitation + bouton "Lancer le scan" proéminent |
| Scan en cours | Bouton désactivé + spinner |
| Résultats disponibles | Liste avec scores |
| Aucune entité | Message "Aucune nouvelle entité détectée" |
| Ajout en cours | Bouton de la ligne → spinner |
| Ajout réussi | Ligne retirée sans re-render complet |

---

## Règles métier
- Heuristique "meilleur capteur" : unité W ou kWh + score max + préférence power vs energy
- L'ajout en masse est limité à 50 entités par requête
- Après ajout, la ligne est supprimée du DOM localement sans re-lancer le scan
- Le score est calculé côté backend (`sensors/quality_scorer.py`) — le frontend ne recalcule rien

---

## Fichiers concernés

web_static/panel/features/scan/
├── scan.view.js
├── scan.html.js
└── scan.css


---

## Definition of Done
- [ ] Scan déclenché uniquement par action explicite (jamais au `mount()`)
- [ ] Spinner pendant le scan, bouton désactivé
- [ ] Étoile ★ sur les capteurs `best_for_device`
- [ ] Ajout individuel : retire la ligne sans reconstruire la liste
- [ ] Pagination fonctionnelle
- [ ] État "Aucune entité" géré
- [ ] Skeleton si premier scan en cours (R5)
- [ ] Aucun localStorage (R4)
- [ ] `unmount()` annule le fetch en cours (AbortController)