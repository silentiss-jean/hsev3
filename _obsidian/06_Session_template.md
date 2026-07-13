# 🧵 Template session IA — À copier avant chaque thread

```
Repo : https://github.com/silentiss-jean/hsev3
Stack : Home Assistant custom integration, Python backend, JS frontend (vanilla, pas de framework)
Domaine HA : hse

Avant toute chose, lis ces fichiers dans l'ordre :
1. ROADMAP_TO_PROD.md
2. custom_components/hse/doc/DELTA.md
3. custom_components/hse/doc/00_methode_front_commune.md
4. hse_v3_synthese.md

État courant :
- Vague en cours : [1 / 2 / 3]
- Sujet du jour : [ex: implémenter diagnostic_view.js]
- Décisions prises : [ex: polling 30s, squelette R1-R5]
- Prochaine étape : [ex: générer le patch _render()]

Règles :
- LIRE ROADMAP_TO_PROD.md AVANT TOUTE PROPOSITION DE CODE
- Ne pas proposer de tâche Vague 3 si Vague 2 non validée
- Signaler si une demande entre en collision avec un DELTA EN_DISCUSSION
- Distinguer mode EXPLORATION vs mode COMMIT
```

---

## Sessions passées

| Date | Sujet | Résultat |
|------|-------|----------|
| 2026-05-16 | Scan view + config view A/B | ✅ Validé |
| 2026-05-17 | config_view.js DELTA-063/064 | ✅ Validé |
| 2026-05-21 | Fix DELTA-065 (sous-onglet C tarification) | ✅ Fermé |
| 2026-07-04 | Fermeture DELTA-066/058/051-PANEL, stub cards | ✅ Fermé |
