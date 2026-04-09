# HSE V3 — Home Suivi Élec (version 3)

Custom integration Home Assistant pour le suivi de consommation électrique.

---

## 🚀 Brief de démarrage — à coller en début de chaque thread IA

```
Repo : https://github.com/silentiss-jean/hsev3
Stack : Home Assistant custom integration, Python backend, JS frontend (vanilla, pas de framework)
Domaine HA : hse

Avant toute chose, lis ces fichiers dans l'ordre :
1. custom_componment/hse/doc/DELTA.md         → écarts doc/code actifs (priorité absolue)
2. custom_componment/hse/doc/00_methode_front_commune.md → contrat frontend V3
3. hse_v3_synthese.md                           → synthèse architecture V3

Règles pour l'IA :
- Ne jamais proposer de code ou de doc qui contredit un écart non résolu dans DELTA.md
- Signaler explicitement si une demande entre en collision avec un écart EN_DISCUSSION
- Proposer de fermer un écart dans DELTA.md dès que la solution est validée
- Toujours distinguer : mode EXPLORATION (on réfléchit) vs mode COMMIT (on génère le patch final)
```

---

```
## 🧵 État courant de la session (à mettre à jour si thread long)
- Sujet du jour : [ex: implémentation overview.view.js]
- Décisions prises : [ex: polling 30s endpoint unique, pas de double fetch]
- Prochaine étape : [ex: générer le patch _render()]
```

---

## Structure du repo

```
hsev3/
├── README.md                        ← ce fichier + brief IA
├── analyse.md                       ← analyse V1/V2 (frontend)
├── analyse0.md                      ← analyse V1/V2 (backend)
├── hse_v3_synthese.md               ← synthèse des deux analyses → base V3
└── custom_componment/
    └── hse/
        ├── doc/
        │   ├── DELTA.md             ← 🔴 écarts doc/code actifs
        │   ├── 00_methode_front_commune.md
        │   ├── 01_onglet_overview.md
        │   ├── 02_onglet_diagnostic.md
        │   ├── 03_onglet_scan.md
        │   ├── 04_onglet_config.md
        │   ├── 05_onglet_custom.md
        │   ├── 06_onglet_cards.md
        │   ├── 07_onglet_migration.md
        │   ├── 08_onglet_costs.md
        │   └── 09_squelette_hse_tab_base.md
        ├── backend/                 ← (à créer)
        └── web_static/             ← (à créer)
```

---

## Workflow doc ↔ code

Voir `custom_componment/hse/doc/DELTA.md` pour l'état d'alignement en temps réel.

| Phase | Action |
|---|---|
| Discussion en cours | Ajouter ligne `EN_DISCUSSION` dans DELTA.md |
| Décision prise, pas encore codée | Passer à `DOC_AHEAD` ou `CODE_AHEAD` |
| Doc + code committés ensemble | Supprimer la ligne de DELTA.md |

**Règle d'or : si DELTA.md est vide → doc et code sont alignés.**
