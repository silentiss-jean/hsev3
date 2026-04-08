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
| Liste appareils | `hse.store.js` (synchrone, déjà chargé au boot) |
| Génération YAML | `yamlComposer.js` (calcul local) |

Aucun fetch API. Si le store n'est pas prêt au `mount()`, attendre le signal `store:catalogue:ready`.

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
- `yamlComposer.js` V2 est conservé intact — ne pas réécrire
- Les `entity_id` dans le YAML sont ceux du catalogue HSE (`sensor.hse_*`)
- Appareil inactif : grisé mais sélectionnable
- Option "coût" ajoute un `secondary_info` vers `sensor.hse_*_cost`

---

## Fichiers concernés
web_static/panel/features/cards/
├── cards.view.js
├── cards.html.js
└── cards.css

web_static/panel/shared/
└── yamlComposer.js ← conservé intact V2


---

## Definition of Done
- [ ] Lecture catalogue depuis le store (aucun fetch)
- [ ] Génération YAML en temps réel à chaque changement
- [ ] Coloration syntaxique dans la zone de prévisualisation
- [ ] Copie presse-papier fonctionnelle
- [ ] Téléchargement `.yaml` fonctionnel
- [ ] Skeleton si store pas encore prêt (R5)
- [ ] Aucun localStorage (R4)