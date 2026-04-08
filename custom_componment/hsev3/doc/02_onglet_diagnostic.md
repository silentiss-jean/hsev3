# HSE V3 — Onglet 2 : `diagnostic` (Diagnostic)

## Mission
Vue complète de la santé du système : qualité des capteurs, alertes HA Repairs, état du storage.
Outil de debug et de maintenance de l'utilisateur avancé.

---

## Ce que cet onglet doit faire
- Afficher le score de qualité global en %
- Lister tous les capteurs du catalogue avec leur statut détaillé
- Afficher les alertes HA Repairs natives
- Afficher les stats du Storage (catalogués / sélectionnés / ignorés / introuvables)
- Afficher le résultat et la date du dernier diagnostic
- Permettre de relancer un diagnostic manuellement

## Ce que cet onglet ne doit PAS faire
- Modifier la configuration des capteurs (→ `config`)
- Scanner les nouvelles entités (→ `scan`)
- Afficher les coûts ou l'historique
- Faire de polling automatique

---

## Sources de données

| Données | Endpoint | Polling |
|---|---|---|
| Résultat diagnostic + alertes + stats | `GET /api/hse/diagnostic` | Aucun |
| Liste catalogue + statuts | `GET /api/hse/catalogue` | Aucun |
| Relancer le diagnostic | `POST /api/hse/diagnostic` | — |

### Forme attendue de `/api/hse/diagnostic`
```json
{
  "score_global_pct": 84,
  "last_run": "2026-04-07T18:32:00",
  "sensors": [
    { "entity_id": "sensor.hse_clim_salon", "name": "Clim Salon",
      "status": "ok", "score": 95, "issues": [] },
    { "entity_id": "sensor.hse_chauffe_eau", "name": "Chauffe-eau",
      "status": "helper_missing", "score": 40, "issues": ["utility_meter manquant"] },
    { "entity_id": "sensor.hse_four", "name": "Four",
      "status": "not_found", "score": 0, "issues": ["entité absente de hass.states"] }
  ],
  "storage": { "total": 24, "selected": 18, "ignored": 4, "not_found": 2 },
  "repairs": [
    { "issue_id": "hse_001", "severity": "warning",
      "title": "Helper manquant", "description": "..." }
  ]
}
```

---

## États UX

| État | Affichage |
|---|---|
| Chargement initial | Skeleton barre score + liste lignes |
| Diagnostic chargé | Layout complet |
| Aucune alerte Repairs | Section "Alertes" masquée |
| Relance en cours | Bouton désactivé + spinner |
| Tous les capteurs OK | Message positif "Tout est en ordre" |

---

## Règles métier
- Score global = moyenne pondérée des scores des capteurs sélectionnés (ignorés exclus)
- `not_found` → score 0, alerte critique
- `helper_missing` → score réduit, capteur fonctionnel
- Bouton "Relancer" désactivé pendant l'exécution (flag `_running`)
- Alertes HA Repairs affichées telles quelles (pas de reformulation)

---

## Fichiers concernés

web_static/panel/features/diagnostic/
├── diagnostic.view.js
├── diagnostic.html.js
└── diagnostic.css


---

## Definition of Done
- [ ] `mount()` déclenche un seul fetch au chargement
- [ ] Aucun timer de polling
- [ ] Bouton "Relancer" désactivé pendant la requête
- [ ] Filtre texte côté client, sans re-fetch
- [ ] Section "Alertes Repairs" masquée si vide
- [ ] Capteurs colorés selon statut (ok=vert, warning=orange, error=rouge)
- [ ] Skeleton avant premier fetch (R5)
- [ ] Aucun localStorage (R4)