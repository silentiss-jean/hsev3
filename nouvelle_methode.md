# Nouvelle méthode — rendre HSE V3 fiable et cohérent

> Objectif : passer d’un tableau de bord visuellement abouti à un outil auquel on peut faire confiance pour la puissance, l’énergie et les coûts.
>
> Périmètre : cette méthode ne modifie pas le produit. Elle décrit quoi vérifier, dans quel ordre, et quels résultats conserver.

---

## 1. Ce que fait le projet aujourd’hui

HSE V3 est une intégration Home Assistant pour suivre l’électricité sans YAML : détection de capteurs, sélection des sources fiables, puissance instantanée, énergie par période, coûts, organisation par pièce/type et export CSV.

Architecture utile pour les vérifications :

- `catalogue/` : détecte et sélectionne les entités utilisables.
- `sensors/` : évalue la qualité et synchronise les capteurs.
- `engine/` : produit les calculs (coûts, groupes, analytics).
- `api/` : expose les résultats au frontend.
- `web_static/panel/` : affiche les résultats dans les vues Aperçu, Coûts, Diagnostic, Configuration, etc.
- `_obsidian/` : documentation et suivi de projet déjà prévus.

La priorité fonctionnelle est la suivante : **la source de mesure et les unités doivent être correctes avant de travailler les écrans, les graphiques ou l’export.**

---

## 2. Les concepts à ne jamais mélanger

| Mesure | Unités acceptées | Signification | Exemple |
|---|---|---|---|
| Puissance instantanée | W, kW | Ce qui est consommé maintenant | Un climatiseur tire 668 W à cet instant |
| Énergie cumulée | Wh, kWh | Ce qui a été consommé pendant une durée | Le climatiseur a consommé 4,2 kWh aujourd’hui |
| Coût | EUR ou € | Énergie x tarif (+ abonnement, taxes selon règle) | 4,2 kWh x 0,20 €/kWh = 0,84 € |
| Courant | A | Intensité électrique, ce n’est pas une puissance | 3 A ne deviennent pas automatiquement 690 W |
| Tension | V | Tension réseau, ce n’est pas une puissance | Environ 230 V en monophasé |

### Règles de conversion

- 1 kW = 1 000 W.
- 1 kWh = 1 000 Wh.
- Une valeur en W ne doit jamais être ajoutée directement à une valeur en kWh.
- Une puissance devient une énergie uniquement après intégration dans le temps : `énergie (Wh) = puissance moyenne (W) x durée (h)`.
- Exemple : 500 W pendant 2 heures = 1 000 Wh = 1 kWh.
- Un capteur en A ne doit servir à calculer une puissance que si la formule et les hypothèses sont explicites : en monophasé, `P ≈ U x I x facteur de puissance`. Sans facteur de puissance mesuré, ce résultat est estimé, pas une mesure exacte.

---

## 3. Contrat de données à imposer

Chaque entité retenue dans HSE doit posséder une fiche de contrôle, même si elle est générée automatiquement.

Champs minimaux à contrôler :

- `entity_id` et nom lisible.
- Rôle : `power`, `energy`, `current`, `voltage`, ou autre.
- Unité d’origine exacte : `W`, `kW`, `Wh`, `kWh`, `A`, `V`.
- `device_class` Home Assistant.
- `state_class` Home Assistant.
- Sens de la mesure : consommation, production, net, inconnu.
- Fréquence réelle de mise à jour.
- Source : prise connectée, Linky, intégration cloud, MQTT, capteur virtuel, etc.
- Règle de conversion appliquée par HSE, si nécessaire.
- Niveau de confiance : mesuré, calculé, estimé, exclu.

### Décision de sélection

- **Accepté sans conversion** : puissance en W ou énergie en kWh, avec métadonnées cohérentes.
- **Accepté avec conversion documentée** : puissance en kW convertie une seule fois en W, énergie en Wh convertie une seule fois en kWh.
- **Accepté comme estimation** : courant/tension seulement si l’utilisateur valide la méthode de calcul et ses limites.
- **Refusé / ignoré** : unité inconnue, valeur texte, état indisponible, doublon, capteur cumulatif remis à zéro sans stratégie de gestion, ou capteur qui mélange production et consommation.

La règle fondamentale : **une unité est normalisée à l’entrée, jamais au hasard dans plusieurs vues frontend.** Le moteur et les API doivent travailler dans des unités canoniques uniques.

---

## 4. Unités canoniques recommandées

| Domaine | Unité interne recommandée | Unité affichée | Règle |
|---|---|---|---|
| Puissance | W | W sous 1 000 W, kW à partir de 1 000 W | Conserver la valeur interne en W |
| Énergie | Wh ou kWh, mais une seule norme choisie | kWh | Choisir une seule norme dans le moteur et la documenter |
| Tarif variable | EUR/kWh | €/kWh | Ne jamais stocker en centimes dans certains écrans et euros dans d’autres |
| Coût | EUR | € | Arrondir uniquement à l’affichage, pas pendant les calculs |
| Abonnement | EUR/mois | €/mois | Définir clairement la proratisation jour/mois/année |

Proposition simple : garder la puissance en **W**, l’énergie en **kWh**, les tarifs et coûts en **EUR** dans les réponses d’API. Le frontend ne fait que formater (`925 W`, `1,25 kW`, `0,84 €`) ; il ne doit pas décider les conversions métier.

---

## 5. Plan de vérification, dans l’ordre

### Étape A — Inventaire des sources

1. Exporter ou lister toutes les entités proposées par la détection HSE.
2. Pour chaque entité sélectionnée, relever unité, `device_class`, `state_class`, dernière valeur et fréquence de mise à jour.
3. Identifier les doublons : par exemple une prise avec un capteur `power` et un capteur `energy`, ce qui est normal ; mais deux capteurs de puissance décrivant la même prise ne doivent pas être additionnés.
4. Identifier la référence globale (Linky ou compteur principal) et les sous-compteurs.
5. Étiqueter chaque source comme : principale, sous-compteur, appareil, production solaire, inconnu.

**Sortie attendue :** une table de vérité des capteurs, avec unité et rôle validés.

### Étape B — Test de réalité instantané

1. Relever la puissance totale HSE à une heure précise.
2. Relever, au même instant, la référence Linky/compteur principal.
3. Allumer une charge facile à connaître : bouilloire, radiateur, sèche-cheveux ou chauffage d’environ 1 000 à 2 000 W.
4. Vérifier que la puissance HSE et la référence augmentent dans le même ordre de grandeur.
5. Éteindre la charge et vérifier le retour à la valeur précédente.

**Tolérance de départ :** un écart de quelques dizaines de watts est normal. Un écart durable de centaines de watts, un facteur 1 000 ou un signe inversé est un défaut à analyser.

### Étape C — Vérification des conversions

Créer au moins ces cas de test contrôlés :

| Cas | Entrée | Résultat HSE attendu |
|---|---:|---:|
| Puissance native | 925 W | 925 W |
| Puissance en kW | 0,925 kW | 925 W en interne, 925 W affichés |
| Puissance élevée | 1,250 kW | 1 250 W en interne, 1,25 kW affichés si formatage compact |
| Énergie native | 2,5 kWh | 2,5 kWh |
| Énergie en Wh | 2 500 Wh | 2,5 kWh après une seule conversion |
| Coût fixe | 2,5 kWh à 0,20 €/kWh | 0,50 € hors abonnement |

Interdits à rechercher explicitement :

- Multiplication ou division par 1 000 réalisée plusieurs fois.
- Addition d’un `kW` avec un `W` sans normalisation.
- Addition d’un `Wh` avec un `kWh` sans normalisation.
- Affichage en kWh d’une puissance instantanée.
- Arrondi avant l’agrégation.
- Utilisation d’un capteur `A` comme s’il était un capteur `W`.

### Étape D — Vérification énergie dans le temps

1. Choisir un appareil à puissance stable, par exemple un radiateur de 1 000 W.
2. Le faire fonctionner environ une heure.
3. Comparer l’énergie HSE attendue avec l’énergie du capteur ou de la référence.
4. Calculer l’écart : `(valeur HSE - valeur référence) / valeur référence`.
5. Répéter sur 15 min, 1 h, 24 h et une semaine si possible.

Repères pratiques :

- 1 000 W pendant 1 h doit approcher 1 kWh.
- 100 W pendant 24 h doit approcher 2,4 kWh.
- Une valeur d’énergie journalière qui change brutalement par un facteur 1 000 indique presque toujours une erreur d’unité.

### Étape E — Vérification agrégation

1. Comparer la somme des appareils sélectionnés à la référence globale.
2. Accepter qu’ils ne soient pas identiques : les appareils non instrumentés et les décalages de rafraîchissement créent un écart.
3. Contrôler surtout la cohérence de tendance : quand la référence augmente, les appareils responsables doivent expliquer une partie crédible de l’augmentation.
4. Ne jamais ajouter deux fois une même consommation : référence globale + sous-compteurs ne constituent pas automatiquement une somme valable.

**Règle métier à décider :**

- Vue « Total maison » : référence principale en priorité.
- Vue « Appareils suivis » : somme des sous-compteurs sélectionnés.
- Vue « Couverture » : `somme appareils suivis / référence maison`, exprimée en pourcentage, sans prétendre que la somme des appareils est le total maison.

### Étape F — Vérification des coûts

1. Vérifier que le tarif configuré correspond à la facture : TTC ou HT, prix fixe ou HP/HC, abonnement mensuel, taxes.
2. Faire un calcul manuel avec une journée réelle : `énergie en kWh x prix TTC €/kWh`.
3. Vérifier séparément le coût énergie et la part abonnement.
4. Définir une seule convention de proratisation : abonnement mensuel / nombre de jours du mois, ou abonnement annuel / 365,25. La même convention doit être utilisée partout.
5. Vérifier les heures pleines/creuses avec les vrais créneaux du contrat, le fuseau horaire et les changements d’heure été/hiver.

**Test minimal :** pour 10 kWh à 0,20 €/kWh, la partie énergie doit être 2,00 €. Si HSE affiche 0,002 €, 2 000 € ou 20 €, il y a un défaut de conversion ou de tarif.

---

## 6. Tableau de contrôle récurrent

Créer une fiche mensuelle avec ces colonnes :

| Date | Référence Linky (kWh) | HSE total (kWh) | Écart % | Appareils suivis (kWh) | Couverture % | Coût HSE (€) | Coût facture estimé (€) | Décision / commentaire |
|---|---:|---:|---:|---:|---:|---:|---:|---|

Objectif : ne pas viser une égalité parfaite entre les sous-compteurs et le Linky ; viser une explication claire des écarts et la stabilité des calculs.

---

## 7. Tests automatisables à terme

Quand la méthode manuelle est validée, transformer les cas critiques en tests backend :

- Conversion W ↔ kW avec valeurs nulles, décimales et négatives.
- Conversion Wh ↔ kWh.
- Rejet des unités non supportées.
- Agrégation de capteurs mixtes après normalisation.
- Exclusion des `unknown`, `unavailable`, `None`, textes non numériques et valeurs aberrantes.
- Calcul coût fixe, HP/HC et abonnement proratisé.
- Cas changement de mois, année bissextile et changement d’heure.
- Garantie qu’une API indique son unité dans le payload ou dans le contrat documenté.

Les résultats de ces tests doivent devenir un prérequis avant toute modification de `engine/`, `catalogue/`, `sensors/` ou des API de coûts/aperçu.

---

## 8. Améliorations produit utiles

### Dans HSE

- Ajouter une page ou un bloc « Santé des mesures » : unité source, unité normalisée, dernière mise à jour, méthode de calcul, niveau de confiance.
- Afficher un badge « Mesuré », « Calculé » ou « Estimé » pour éviter de donner une fausse précision.
- Ajouter une alerte si une puissance est 1 000 fois supérieure ou inférieure à sa médiane récente.
- Afficher la couverture des appareils suivis par rapport au compteur de référence.
- Ajouter un bouton d’export de la table de contrôle en CSV.
- Dans l’écran Diagnostic, proposer des corrections de mapping sans les appliquer automatiquement.

### Dans la documentation

- Compléter le contrat API avec les unités de chaque champ numérique.
- Documenter explicitement l’unité interne de chaque calcul moteur.
- Ajouter les conventions d’arrondi et de proratisation.
- Relier chaque règle métier à un test automatisé ou à une checklist manuelle.

---

## 9. Utiliser Obsidian simplement

Le dépôt contient déjà un vault dans `_obsidian/`. Il est préférable de l’utiliser plutôt que de créer une documentation dispersée.

Usage recommandé :

1. Ouvrir `_obsidian/` comme vault Obsidian.
2. Créer une note par campagne de vérification, par exemple `09_Validation_mesures_2026-10.md`.
3. Utiliser un modèle court : date, capteurs testés, valeurs observées, référence, écart, décision, prochaine action.
4. Lier chaque anomalie à `02_DELTA_actifs.md` et chaque correction à la roadmap/vague concernée.
5. Conserver des captures de Home Assistant et les relevés Linky/facture uniquement comme preuves de validation, avec date et contexte.

Une base Obsidian est utile pour suivre les décisions et les écarts ; elle ne remplace pas les tests automatisés. La donnée de référence reste Home Assistant et la facture/compteur fournisseur.

---

## 10. Première session conseillée

1. Ne rien modifier dans le code.
2. Lister les capteurs sélectionnés par HSE et leurs unités.
3. Désigner le compteur de référence (souvent Linky).
4. Faire le test « charge connue » sur un appareil.
5. Vérifier les conversions W/kW et Wh/kWh sur les valeurs réelles.
6. Vérifier une journée de coût avec le tarif TTC réel.
7. Écrire les écarts constatés dans une note Obsidian et dans `DELTA.md` s’ils demandent une correction produit.
8. Seulement après cela, choisir les correctifs techniques prioritaires.

---

## Définition de “chiffres fiables”

HSE est prêt à devenir un outil de décision lorsque :

- chaque capteur sélectionné a une unité, un rôle et une source connus ;
- aucune conversion n’est appliquée plus d’une fois ;
- la puissance réagit correctement à une charge connue ;
- l’énergie est cohérente sur au moins une journée et une semaine ;
- le total maison et les appareils suivis sont clairement distingués ;
- les coûts peuvent être reproduits à la main à partir du tarif configuré ;
- les écarts restants sont expliqués, mesurés et documentés.
