# HSE V3 — DELTA.md

> Référence d'alignement entre la documentation et le code.
> **Ce fichier est la première chose à lire avant chaque session de développement.**
>
> **Règle d'or : si ce fichier est vide (section "Écarts actifs" sans ligne) → doc et code sont parfaitement alignés.**

---

## 🧠 INSTRUCTION IA (lire systématiquement)

Si tu lis ce fichier, tu dois :
1. **Signaler** tous les écarts `EN_DISCUSSION` ou `DOC_AHEAD` ou `CODE_AHEAD` liés au sujet de la demande
2. **Ne jamais générer** de code ou de doc qui contredit un écart non résolu sans le signaler explicitement
3. **Proposer de fermer** un écart quand la solution est validée dans le thread
4. **Distinguer** les deux modes de travail :
   - **EXPLORATION** → on réfléchit, rien n'est écrit, on ajoute une ligne `EN_DISCUSSION` si la discussion dure
   - **COMMIT** → décision prise, on génère le patch doc + patch code + on ferme la ligne dans ce fichier

---

## Légende des statuts

| Symbole | Statut | Signification |
|---|---|---|
| 🟠 | `EN_DISCUSSION` | Évolution en cours de discussion dans un thread, rien de figé |
| 🔴 | `DOC_AHEAD` | La doc décrit quelque chose qui n'est pas encore codé |
| 🟡 | `CODE_AHEAD` | Le code a évolué mais la doc n'est pas mise à jour |
| ✅ | `ALIGNED` | Résolu et committé — à déplacer dans l'historique puis supprimer |

---

## Ordre de résolution décidé (session 2026-04-08)

La stratégie retenue est **backend-first**. Le frontend ne peut pas être codé proprement
sans que les contrats d'API soient définis. L'ordre de résolution des écarts est donc :

```
DELTA-005  →  DELTA-004 (blocs 1→2→3→4)  →  DELTA-001  →  DELTA-002  →  DELTA-003
(contrat API)  (code backend)               (user_prefs)  (hse.fetch)   (views JS)
```

---

## Écarts actifs

### [DELTA-005] 🟠 EN_DISCUSSION — Doc `10_api_contrat.md` manquante
- **Constat** : toute la doc existante est orientée frontend (onglets, contrat de rendering R1–R5).
  Il n'existe aucun fichier spécifiant le **shape JSON** des endpoints backend.
- **Ce qui manque** : pour chaque endpoint (`/overview`, `/costs`, `/diagnostic`, `/scan`,
  `/catalogue/*`, `/meta`, `/settings/pricing`, `/user_prefs`, `/migration/*`, `/history`, `/ping`) :
  - méthode HTTP + URL complète
  - paramètres query string / body
  - shape exact de la réponse JSON (champs, types, valeurs possibles)
  - codes d'erreur retournés
  - règles de validation des inputs
- **Décision prise** : rédiger `10_api_contrat.md` **avant tout code backend ou frontend**
- **Prochaine action** : réfléchir à la structure de ce fichier (format, niveau de détail,
  quel endpoint en premier)
- **Débloque** : DELTA-004 (on sait quoi coder), DELTA-001 (payload user_prefs défini),
  DELTA-002 (hse.fetch connaît le format des réponses), DELTA-003 (les onglets savent ce qu'ils consomment)

---

### [DELTA-004] 🔴 DOC_AHEAD — Backend Python V3
- **Doc concernée** : `hse_v3_synthese.md` §3, §9 (architecture + plan de phases)
- **Ce que la doc dit** : structure en sous-dossiers `catalogue/`, `meta/`, `engine/`, `storage/`, `api/`
- **État du code** : aucun code backend V3 produit
- **Impact** : tous les endpoints consommés par le frontend n'existent pas
- **Séquence de résolution** (une fois DELTA-005 fermé) :
  - Bloc 1 — Squelette : `manifest.json` + `__init__.py` + `api/base.py` + `GET /api/hse/ping`
  - Bloc 2 — Data : `storage/manager.py` + `meta/` + `options_flow.py`
  - Bloc 3 — Moteurs : `engine/cost.py` + `engine/calculation.py` + `engine/group_totals.py` + `engine/analytics.py`
  - Bloc 4 — Views API : toutes les views `api/views/` avec `HseBaseView`
- **Bloquant pour** : tout

---

### [DELTA-001] 🔴 DOC_AHEAD — Endpoint `user_prefs`
- **Doc concernée** : `00_methode_front_commune.md` §R4, tous les onglets avec sélecteur de période
- **Ce que la doc dit** : tout état persistant passe par `PATCH /api/hse/user_prefs`
- **État du code** : endpoint non encore créé dans le backend
- **Impact** : tous les onglets qui mémorisent une période (overview, costs, cards) sont bloqués
- **Décision à prendre** : structure du payload `user_prefs` à définir dans `10_api_contrat.md`
- **Bloquant pour** : `overview.view.js`, `costs.view.js`, `cards.view.js`

---

### [DELTA-002] 🔴 DOC_AHEAD — Fichier `hse.fetch.js` et injection token
- **Doc concernée** : `00_methode_front_commune.md` §5, `09_squelette_hse_tab_base.md`
- **Ce que la doc dit** : tous les appels HTTP passent par `hseFetch` injecté dans `ctx`, token via `window.__hseToken`
- **État du code** : fichier `hse.fetch.js` non créé, shell non écrit
- **Note** : la signature finale de `hseFetch` (gestion erreurs, format retour) dépend du shape
  des réponses API défini dans `10_api_contrat.md`
- **Impact** : aucun onglet ne peut faire de fetch sans ce fichier
- **Bloquant pour** : tous les onglets

---

### [DELTA-003] 🔴 DOC_AHEAD — Structure des 8 onglets (views JS)
- **Doc concernée** : `01_onglet_overview.md` à `08_onglet_costs.md`
- **Ce que la doc dit** : 8 fichiers `*.view.js` avec contrat `mount / update_hass / unmount`
- **État du code** : aucun fichier `view.js` n'existe encore
- **Note** : ne pas commencer avant que DELTA-002 et DELTA-004 Bloc 4 soient résolus
- **Impact** : tout le frontend est à créer
- **Bloquant pour** : tout le frontend

---

## Historique des alignements

| ID | Fermé le | Description |
|---|---|---|
| — | — | Pas encore d'alignements résolus — projet en phase initiale |

---

## Workflow rapide

```
Début de session
  → Lire DELTA.md
  → Identifier les écarts liés au travail du jour

Pendant la discussion (EXPLORATION)
  → Ajouter ligne EN_DISCUSSION si la discussion dure > 1 échange
  → Ne rien committer

Décision prise (COMMIT)
  → Générer patch doc si besoin → DOC_AHEAD jusqu'au commit code
  → Générer patch code si besoin → CODE_AHEAD jusqu'au commit doc
  → Committer doc + code ensemble
  → Supprimer la ligne de DELTA.md (ou déplacer dans Historique)

Fin de session
  → DELTA.md reflète exactement l'état réel
```
