# HSE V3 — Onglet 6 : `cards` (Génération YAML Lovelace)

## Mission
Générer automatiquement du YAML prêt à coller dans un dashboard Lovelace HA.
Outil de productivité pure — aucune donnée live, aucun calcul métier, aucun fetch.

---

## Ce que cet onglet doit faire
- Afficher les appareils du catalogue (depuis le store, pas de fetch direct)
- Sélectionner les appareils à inclure
- Options : type de carte, affichage coût, période
- Prévisualiser le YAML généré (éditeur read-only + coloration syntaxique)
- Copier le YAML dans le presse-papier
- Télécharger le YAML en `.yaml`

## Ce que cet onglet ne doit PAS faire
- Charger des données live
- Envoyer quoi que ce soit au backend (100% client)
- Modifier le catalogue
- Faire de polling

---

## Sources de données

| Données | Source |
|---|---|
| Liste appareils | `GET /api/hse/catalogue` (fetch direct) |
| Génération YAML | `cards_view.js` (calcul local, à implémenter) |

> ⚠️ **Note (2026-07-04)** : `yamlComposer.js` n'existe pas dans le code actuel.
> La génération YAML sera implémentée directement dans `cards_view.js` (Commit 4 / S3).

Aucun fetch d'écriture. Le catalogue est lu via l'API au `mount()`.

---

## États UX

| État | Affichage |
|---|---|
| Store pas encore prêt | Skeleton + "Chargement du catalogue…" |
| Catalogue vide | Message + bouton vers Scan |
| Aucun appareil sélectionné | Zone YAML vide + boutons désactivés |
| YAML généré | Prévisualisation + boutons actifs |
| Copie réussie | Bouton → "✓ Copié !" pendant 2 s |

---

## Règles métier
- La génération YAML est implémentée dans `cards_view.js` (à faire en S3)
- Les `entity_id` dans le YAML sont ceux du catalogue HSE (`sensor.hse_*`)
- Appareil inactif : grisé mais sélectionnable
- Option "coût" ajoute un `secondary_info` vers `sensor.hse_*_cost`

---

## Fichiers concernés
web_static/panel/features/cards/
└── cards_view.js


---

## Definition of Done
- [ ] Lecture catalogue depuis le store (aucun fetch)
- [ ] Génération YAML en temps réel à chaque changement
- [ ] Coloration syntaxique dans la zone de prévisualisation
- [ ] Copie presse-papier fonctionnelle
- [ ] Téléchargement `.yaml` fonctionnel
- [ ] Skeleton si store pas encore prêt (R5)
- [ ] Aucun localStorage (R4)