# 🔴 DELTA — Écarts actifs

> Source : `custom_components/hse/doc/DELTA.md`
> Règle : aucun patch ne contredit un écart EN_DISCUSSION.

## Actifs

### DELTA-059 — POST /api/hse/meta manquant
- **Statut** : `EN_DISCUSSION`
- **Priorité** : Faible
- **Impact** : Bouton "Créer" pièce/type grisé dans `config_view.js`
- **Solution** : `POST /api/hse/meta` avec `{action: "create_room"|"create_type", name}`
- **Décision** : En attente — Vague 3

### DELTA-062 — cards_view.js stub seulement
- **Statut** : `PARTIELLEMENT FERMÉ`
- **Priorité** : Basse
- **Impact** : Onglet Cartes YAML affiche placeholder
- **Reste** : `yamlComposer.js` + implémentation complète — Vague 3

## Fermés récemment
| ID | Titre | Date |
|----|-------|------|
| DELTA-066 | POST triage/bulk → 404 | 2026-07-04 |
| DELTA-058 | PATCH/DELETE catalogue manquants | 2026-07-04 |
| DELTA-051-PANEL | Bug iframe macOS | 2026-07-04 |
| DELTA-065 | config_view.js sous-onglet C champs cassés | 2026-05-21 |

## Règle de workflow
```
Discussion → EN_DISCUSSION dans DELTA.md
Décision   → DOC_AHEAD ou CODE_AHEAD
Commi      → Supprimer la ligne de DELTA.md
Vide       → doc et code alignés ✅
```
