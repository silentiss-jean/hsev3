# HSE V3 — Onglet 7 : `migration` (Migration capteurs legacy)

## Mission
Guider l'utilisateur à travers la migration des capteurs V1 `sensor.home_suivi_elec_*`
vers les capteurs V3 `sensor.hse_*`. Wizard guidé, utilisé une seule fois par installation.

---

## Ce que cet onglet doit faire
- Détecter les entités legacy présentes dans HA
- Proposer un mapping automatique vers `sensor.hse_*`
- Permettre de valider, corriger ou exclure chaque mapping
- Appliquer le mapping après confirmation explicite
- Afficher un rapport post-migration (succès / échecs / ignorés)
- Proposer le nettoyage des anciens capteurs (étape distincte et optionnelle)

## Ce que cet onglet ne doit PAS faire
- Appliquer la migration sans confirmation explicite
- Supprimer les capteurs legacy sans étape de confirmation séparée
- Faire de polling live

---

## Sources de données

| Données | Endpoint | Méthode |
|---|---|---|
| Détection entités legacy | `GET /api/hse/migration/export` | GET |
| Appliquer le mapping | `POST /api/hse/migration/apply` | POST |
| Nettoyage legacy | `POST /api/hse/migration/cleanup` | POST |

Les données intermédiaires (étape 2) sont **persistées dans le store local en mémoire**.
Si l'utilisateur quitte et revient, les données de l'étape en cours sont restaurées.

### Forme de `/api/hse/migration/export`
```json
{
  "legacy_count": 12,
  "mappings": [
    {
      "legacy_entity_id": "sensor.home_suivi_elec_clim_salon_power",
      "legacy_friendly_name": "HSE Clim Salon Power",
      "proposed_entity_id": "sensor.hse_clim_salon",
      "proposed_name": "Clim Salon",
      "confidence": "high",
      "status": "proposed"
    }
  ]
}
```

---

## Structure du wizard (3 étapes)

**Étape 1 — Détection :** résumé des entités legacy trouvées + compteur correspondances  
**Étape 2 — Validation :** tableau des mappings éditables (sélecteur + action skip/migrate)  
**Étape 3 — Rapport :** compteurs succès/erreur/ignoré + option nettoyage

---

## États UX

| État | Affichage |
|---|---|
| Aucune entité legacy | Message "Aucun capteur V1 détecté — migration non nécessaire" |
| Chargement étape 1 | Skeleton + "Analyse de votre installation…" |
| Application en cours | Spinner + "Migration en cours…" + bouton désactivé |
| Erreur partielle | Rapport avec détail des erreurs + retry possible |

---

## Règles métier
- La migration modifie uniquement la config HSE — elle ne supprime pas les entités HA
- `confidence: "high"` → pré-coché ; `"low"` ou `"none"` → action explicite requise
- Le bouton "Appliquer" est conditionné à au moins un mapping avec action `migrate`
- Le store local survit à l'`unmount()` (les données du wizard ne sont pas effacées)

---

## Fichiers concernés
web_static/panel/features/migration/
├── migration.view.js
├── migration.step1.js
├── migration.step2.js
├── migration.step3.js
├── migration.html.js
└── migration.css


---

## Definition of Done
- [ ] Wizard 3 étapes avec navigation avant/arrière
- [ ] Données préservées dans le store local entre les étapes
- [ ] Données restaurées si l'utilisateur revient sur l'onglet
- [ ] Confirmation modale avant application
- [ ] Rapport post-migration avec compteurs et détails d'erreurs
- [ ] Étape "Nettoyage" distincte et optionnelle
- [ ] État "Aucune entité legacy" géré
- [ ] Skeleton étape 1 (R5)
- [ ] Aucun localStorage (R4 — store en mémoire uniquement)