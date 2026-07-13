# 🗺️ Roadmap — Vagues de livraison

## Vague 1 — "Ça marche" ✅ COMPLÈTE
| # | Tâche | Fichier | Statut |
|---|-------|---------|--------|
| 1.1 | Fix DELTA-065 tarification | `config_view.js` C | ✅ Fermé 2026-05-21 |
| 1.2 | `overview_view.js` | Aperçu live | ✅ 229 lignes, polling 30s |
| 1.3 | `costs_view.js` | Coûts + export | ✅ 220 lignes, polling 60s |

## Vague 2 — "C'est fiable" 🟡 EN COURS
| # | Tâche | Fichier | Dépendance |
|---|-------|---------|------------|
| 2.1 | `diagnostic_view.js` | Score qualité, alertes | `GET /api/hse/diagnostic` ✅ |
| 2.2 | `migration_view.js` | Wizard 3 étapes | `GET/POST /api/hse/migration` ✅ |
| 2.3 | `custom_view.js` | Thème + toggles | `GET/PATCH /api/hse/user_prefs` ✅ |

**Toutes les routes backend existent → juste le JS à écrire.**

## Vague 3 — "C'est complet" ❌ NON DÉMARRÉE
| # | Tâche | Fichier | Note |
|---|-------|---------|------|
| 3.1 | `cards_view.js` + `yamlComposer.js` | Cartes YAML | Stub en place |
| 3.2 | PATCH/DELETE catalogue inline | `catalogue.py` | ✅ Déjà implémenté |
| 3.3 | POST /api/hse/meta | `meta.py` | DELTA-059 |

## Règle
> Ne pas démarrer Vague N+1 avant validation Vague N en navigateur.
