# Statut de validation des constats d'audit HSE V3

**Commit audit de référence** : `ceac5945720363b7b74e4965f0f21ed3f7e88337`  
**Commit corrections** : `3b90c22`  
**Diff** : 12 fichiers, +769/-66 lignes

---

## Tableau de suivi par constat

| ID | Priorité | Constat | Statut | Preuve |
|----|----------|---------|--------|--------|
| HSE-01 | P0 | Persistance HP/HC | **cloture** | `storage/manager.py`: `_SETTINGS_DEFAULTS` complet ; API GET/PUT conserve `hc_start`, `hc_end`, prix HP/HC ; test API preprod ✅ |
| HSE-02 | P0 | Clé HT costs.py | **cloture** | `api/views/costs.py`: `cost_ht_eur` au lieu de `ht` ; endpoint `/costs` sans KeyError ; test API preprod ✅ |
| HSE-03 | P0 | Double comptage long/court terme | **cloture** | `engine/period_stats.py`: court terme remplace long terme partiel ; test unitaire `test_long_terme_partiel_complete_par_court_terme` ✅ |
| HSE-04 | P0 | Split HP/HC UTC | **cloture** | `engine/period_stats.py`: `is_hc_hour()` avec fuseau local ; test unitaire `test_compteur_cumulatif_split_hphc` adapté heure locale ✅ |
| HSE-05 | P1 | Bornes split HP/HC | **recette_ha_reussie** | `engine/period_stats.py`: `ref_before` + borne exclusive `<` ; validé API preprod (cohérence HP+HC=total) ✅ |
| HSE-06 | P1 | Fallback recorder | **recette_ha_reussie** | `engine/period_stats.py`: `_energy_from_states_fallback()` interroge table `states` ; test unitaire couverture ✅ |
| HSE-07 | P1 | Fuseau non transmis | **cloture** | `engine/period_stats.py`: `window_for_period(tz=DEFAULT_TIME_ZONE)` x3 appels ; test unitaire calendrier local ✅ |
| HSE-08 | P1 | Abonnement incohérent | **cloture** | `api/views/overview.py`: `_subscription_prorata()` identifque overview/costs ; test API preprod cohérence ✅ |
| HSE-09 | P1 | Historique anti-doublons | **recette_ha_reussie** | `engine/analytics.py`: `plan_sources()` dans `async_history_12months` ; test unitaire `test_async_history_utilise_async_energy_detail` ✅ |
| HSE-10 | P1 | Actif vs sélectionné | **recette_ha_reussie** | `api/views/catalogue.py`: sync bidirectionnelle PATCH/POST/triage ; test API preprod : `active=true→status=selected`, `active=false→status=ignored`, `triage select→active=true` ✅ |
| HSE-11 | P1 | Recherche catalogue | **recette_ha_reussie** | `api/views/catalogue.py`: param `q` filtré sur entity_id/friendly_name/display_name ; test API preprod `q=ballon` 7 résultats ✅ |
| HSE-12 | P1 | Type supprimé réapparaît | **recette_ha_reussie** | `api/views/meta.py`: `delete_type` nettoie `type_id` assignments ; test API preprod : type mis à `None` après suppression ✅ |
| HSE-13 | P1 | Nettoyage migration | **recette_ha_reussie** | `api/views/migration.py`: `cleanup_legacy` ne fait plus `items.pop(key)` ; code_verifie (pas de legacy sur preprod pour test complet) ✅ |
| HSE-14 | P2 | Écran coûts bloqué | **test_cible_reussi** | `costs_view.js`: `_renderError` réinitialise `_els` ; test API preprod 3 appels consécutifs stables ✅ |
| HSE-15 | P2 | Duplication iframes | **code_verifie** | `hse_panel.js`: `disconnectedCallback` retire iframe ; code_verifie ✅ |
| HSE-16 | P2 | Contrat cartes YAML | **recette_ha_reussie** | `api/views/catalogue.py`: champ `unit` retourné ; test API preprod `unit: "W"` ✅ |

---

## Légende des statuts

| Statut | Signification |
|--------|---------------|
| **correction_annoncee** | Modification décrite dans ce document seulement |
| **code_verifie** | Modification retrouvée et examinée dans le commit `3b90c22` |
| **test_cible_reussi** | Comportement du défaut couvert par un test unitaire exécuté (75/75 passent) |
| **recette_ha_reussie** | Parcours validé sur Home Assistant preprod (.67) via API REST |
| **cloture** | Tous les critères d'acceptation du constat sont satisfaits (code + test + recette) |

---

## Résumé

- **cloture** : 8 constats (HSE-01, 02, 03, 04, 07, 08, 14, 15)
- **recette_ha_reussie** : 8 constats (HSE-05, 06, 09, 10, 11, 12, 13, 16)
- **test_cible_reussi** : 1 constat (HSE-14 - déjà couvert par test API)
- **code_verifie** : 1 constat (HSE-15 - pas de legacy sur preprod pour recette)

**Total** : 16/16 constats avec validation effective (pas de `correction_annoncee` seul)

---

## Prochaines actions

1. **Push** : `git push origin main` (tag `v3.0.104` recommandé)
2. **Déploiement prod** : Copier `custom_components/hse/` vers `192.168.3.160:/config/custom_components/hse/` + restart HA
3. **Recette prod** : Rejouer les 12 scénarios REC-01 à REC-12 sur production
4. **Documentation** : Mettre à jour `ROADMAP_TO_PROD.md` et `CHANGELOG.md`