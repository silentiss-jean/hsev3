# HSE V3 — Onglet 5 : `custom` (Customisation visuelle)

## Mission
Personnaliser l'apparence du panel HSE (thème, fond, effets) avec prévisualisation immédiate.
Onglet le plus léger techniquement — aucun fetch de données métier.

---

## Ce que cet onglet doit faire
- Sélectionner un thème de couleur avec prévisualisation live
- Toggler : fond dynamique, glassmorphism, densité
- Appliquer les changements via `data-theme` sur le panel entier
- Persister les préférences via `PATCH /api/hse/user_prefs` (R4)
- Bouton "Réinitialiser" vers les valeurs par défaut

## Ce que cet onglet ne doit PAS faire
- Charger des données métier
- Utiliser `localStorage` (R4)
- Affecter les styles autrement que via les variables CSS

---

## Sources de données

| Données | Endpoint | Usage |
|---|---|---|
| Préférences actuelles | `GET /api/hse/user_prefs` | Chargement initial |
| Sauvegarder | `PATCH /api/hse/user_prefs` | À chaque sauvegarde explicite |

### Payload PATCH
```json
{ "theme": "dark-teal", "bg_dynamic": true, "glassmorphism": false, "density": "comfortable" }
```

---

## États UX

| État | Affichage |
|---|---|
| Chargement initial | Skeleton sélecteurs |
| Préférences chargées | Sélecteurs sur les valeurs actuelles |
| Changement thème | Application immédiate (`document.documentElement.setAttribute('data-theme', val)`) |
| Sauvegarde réussie | Toast "Préférences enregistrées" 2 s |

---

## Règles métier
- Changements appliqués visuellement en temps réel mais **non auto-sauvegardés**
- Bouton "Sauvegarder" explicite pour valider
- "Réinitialiser" → restore `DEFAULT_PREFS` + sauvegarde
- Les thèmes correspondent aux classes CSS de `hse_themes.shadow.css`

---

## Fichiers concernés
web_static/panel/features/custom/
├── custom.view.js
├── custom.html.js
└── custom.css

---

## Definition of Done
- [ ] Chargement des prefs au `mount()`
- [ ] Application thème en temps réel sans sauvegarde immédiate
- [ ] Sauvegarde explicite via `PATCH /api/hse/user_prefs`
- [ ] "Réinitialiser" : remet defaults + sauvegarde
- [ ] Skeleton avant premier fetch (R5)
- [ ] Zéro `localStorage` (R4)
- [ ] Toast de confirmation après sauvegarde