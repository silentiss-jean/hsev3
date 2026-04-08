# HSE V3 — Onglet 4 : `config` (Configuration)

## Mission
Gérer les appareils du catalogue, l'assignation pièces/types, et le contrat tarifaire.
Onglet le plus riche fonctionnellement — découpé en 3 sous-sections.

---

## Ce que cet onglet doit faire

### Sous-section A — Appareils
- Lister les capteurs du catalogue avec leur statut
- Activer / désactiver / éditer nom+icône / supprimer individuellement
- Triage en masse (activer tous / désactiver tous / supprimer sélection)
- Synchroniser les métadonnées HA

### Sous-section B — Pièces & Types
- Lister pièces créées et types d'appareils
- Créer, renommer, supprimer une pièce ou un type
- Afficher et éditer l'assignation capteur → pièce / capteur → type
- Afficher le diff pending et l'appliquer avec confirmation

### Sous-section C — Tarification
- Formulaire contrat électrique (fixe / HP-HC, prix HT, taxes, abonnement)
- Prévisualisation coût mensuel en temps réel
- Sauvegarder le contrat

## Ce que cet onglet ne doit PAS faire
- Scanner de nouvelles entités (→ `scan`)
- Afficher des coûts historiques (→ `costs`)
- Générer du YAML (→ `cards`)

---

## Sources de données

| Données | Endpoint | Méthode |
|---|---|---|
| Liste catalogue | `GET /api/hse/catalogue` | GET |
| Activer/éditer/supprimer | `PATCH` / `DELETE /api/hse/catalogue/{entity_id}` | PATCH/DELETE |
| Triage bulk | `POST /api/hse/catalogue/bulk` | POST |
| Sync metadata | `POST /api/hse/catalogue/refresh` | POST |
| Pièces & types | `GET /api/hse/meta` | GET |
| Créer pièce/type | `POST /api/hse/meta` | POST |
| Diff preview | `GET /api/hse/meta/sync/preview` | GET |
| Appliquer diff | `POST /api/hse/meta/sync/apply` | POST |
| Tarif (lecture) | `GET /api/hse/settings/pricing` | GET |
| Tarif (écriture) | `PUT /api/hse/settings/pricing` | PUT |

---

## États UX

| État | Affichage |
|---|---|
| Chargement initial | Skeleton liste + skeleton formulaire tarif |
| Catalogue vide | Message "Aucun appareil — allez dans Scan" + bouton |
| Édition inline nom | Champ input remplace le span |
| Diff pending = 0 | Bouton "Appliquer" masqué |
| Diff pending > 0 | Bandeau indiquant le nombre de changements |

---

## Règles métier
- Capteur désactivé : reste dans le catalogue mais exclu des calculs
- Capteur ignoré : masqué par défaut (filtre "Afficher ignorés")
- Édition du nom : modifie uniquement le `display_name` HSE, jamais le `friendly_name` HA
- Diff calculé côté client en comparant l'état initial (au `mount()`) avec les modifications
- Prévisualisation tarif calculée côté client : `(energy_month_kwh × prix_ttc) + abonnement_ttc`
- Contrat HP-HC → champs additionnels apparaissent dynamiquement

---

## Fichiers concernés
web_static/panel/features/config/
├── config.view.js
├── config.appareils.js
├── config.rooms.js
├── config.pricing.js
├── config.html.js
└── config.css


---

## Definition of Done
- [ ] 3 sous-onglets avec navigation interne
- [ ] Activer/désactiver/éditer/supprimer sans reload de la liste
- [ ] Sélection multiple + actions bulk
- [ ] Diff calculé client, appliqué avec confirmation
- [ ] Prévisualisation tarif en temps réel
- [ ] Skeleton avant chaque fetch initial (R5)
- [ ] Aucun localStorage (R4)
- [ ] Aucun re-render complet de la liste sur modification individuelle
- [ ] Confirmation avant toute suppression destructive