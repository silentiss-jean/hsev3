# HSE V3 — Home Suivi Élec

**Suivi de consommation électrique complet pour Home Assistant** — sans écrire de YAML.

---

## Ce que fait HSE V3

HSE V3 transforme vos capteurs d'énergie/power Home Assistant en un dashboard énergétique exploitable :

| Fonction | Description |
|----------|-------------|
| 🔍 **Détection automatique** | Scanne vos entités HA et identifie les capteurs energy/power fiables |
| ✅ **Sélection intuitive** | Activez/désactivez les capteurs à suivre en un clic |
| ⚡ **Puissance live** | Puissance totale instantanée (W), rafraîchie toutes les 10 s |
| 📊 **Consommation multi-périodes** | Jour / Semaine / Mois / Année en kWh et € TTC |
| 💰 **Coûts réels** | Tarif fixe ou Heures Pleines/Creuses, TVA, abonnement mensuel inclus |
| 🏠 **Organisation par pièce/type** | Affectez chaque appareil à une pièce (Cuisine, Salon…) et un type (Électroménager, Chauffage…) |
| 📈 **Historique & export** | 12 mois d'historique, export CSV/JSON |
| 🔧 **Diagnostic qualité** | Score de fiabilité par capteur, alertes Home Assistant natives |
| 📦 **Migration V1→V3** | Assistant guidé pour récupérer votre configuration existante |
| 🎨 **Cartes Lovelace** | Génération de YAML prêts à copier pour vos dashboards |

> **Principe** : L'utilisateur ne touche jamais au YAML. Tout se passe dans l'interface.

---

## Installation

### Via HACS (recommandé)

1. Ouvrez **HACS** → **Intégrations** → menu ⋮ → **Dépôts personnalisés**
2. Ajoutez `https://github.com/silentiss-jean/hsev3` (catégorie : Intégration)
3. Recherchez **HSE V3** et cliquez **Installer**
4. Redémarrez Home Assistant
5. **Configuration** → **Intégrations** → **+** → **HSE V3** → Suivez l'assistant

### Manuelle

```bash
# Dans le dossier config de Home Assistant
git clone https://github.com/silentiss-jean/hsev3.git custom_components/hse
# Puis redémarrez Home Assistant
```

### Prérequis

- Home Assistant 2024.6+
- Intégration `recorder` activée (pour l'historique)
- Au moins un capteur `sensor.xxx_energy` ou `sensor.xxx_power` dans HA

---

## Première configuration (5 min)

1. **Ouvrez le panel** : Menu latéral → **HSE** (ou `/hse-panel`)
2. **Onglet Détection** : Lancez le scan → Sélectionnez vos capteurs fiables
3. **Onglet Configuration → Tarification** : Choisissez *Fixe* ou *HP/HC*, entrez vos tarifs €/kWh TTC et abonnement mensuel
4. **Onglet Configuration → Pièces & Types** : Créez vos pièces, puis affectez chaque capteur
5. **Onglet Vue d'ensemble** : Vos données s'affichent en temps réel

---

## Structure des onglets

| Onglet | Icône | Rôle |
|--------|-------|------|
| **Vue d'ensemble** | 🏠 | Dashboard principal : puissance live, conso, top 5, totaux par pièce/type |
| **Diagnostic** | 🔍 | Score qualité capteurs, alertes, santé stockage |
| **Détection** | 📡 | Scan de nouvelles entités, triage (sélectionner/ignorer) |
| **Configuration** | ⚙️ | Appareils, Pièces & Types, Tarification |
| **Coûts** | 💰 | Détail coûts par appareil, historique, export |
| **Migration** | 🔄 | Assistant V1→V3, mapping, nettoyage |
| **Cartes YAML** | 🃏 | Générateur de cartes Lovelace |
| **Personnalisation** | 🎨 | Thème, glassmorphisme, fond dynamique |

---

## Architecture technique (résumé)

```
┌─────────────────────────────────────────────────────────────┐
│                    Home Assistant Core                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Recorder    │  │  Entity      │  │  Config/Storage  │  │
│  │  (historique)│  │  Registry    │  │  (intégration)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  HSE V3 Custom Integration                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  API REST   │  │  Engine     │  │  Storage Manager    │  │
│  │  (/api/hse) │  │  (coût,     │  │  (catalogue, meta,  │  │
│  │             │  │   analytics)│  │   user_prefs)       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend JS (Vanilla)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Shell      │  │  8 Vues     │  │  Shared UI/CSS      │  │
│  │  (routing,  │  │  (overview, │  │  (tokens, themes,   │  │
│  │   polling)  │  │   config,   │  │   skeleton, tables) │  │
│  │             │  │   costs...) │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Documentation technique

| Document | Public | Contenu |
|----------|--------|---------|
| [Architecture](docs/architecture/ARCHITECTURE.md) | 👨‍💻 Dev | Diagramme Mermaid complet, flux de données, contrats |
| [Frontend — Vue d'ensemble](docs/frontend/01_overview.md) | 👨‍💻 Dev | Spécifications `overview_view.js`, endpoints, états UX |
| [Frontend — Diagnostic](docs/frontend/02_diagnostic.md) | 👨‍💻 Dev | Spécifications `diagnostic_view.js` |
| [Frontend — Détection](docs/frontend/03_scan.md) | 👨‍💻 Dev | Spécifications `scan_view.js` |
| [Frontend — Configuration](docs/frontend/04_config.md) | 👨‍💻 Dev | Spécifications `config_view.js` (3 sous-onglets) |
| [Frontend — Coûts](docs/frontend/05_costs.md) | 👨‍💻 Dev | Spécifications `costs_view.js` |
| [Frontend — Migration](docs/frontend/06_migration.md) | 👨‍💻 Dev | Spécifications `migration_view.js` |
| [Frontend — Cartes YAML](docs/frontend/07_cards.md) | 👨‍💻 Dev | Spécifications `cards_view.js` + `yamlComposer.js` |
| [Frontend — Personnalisation](docs/frontend/08_custom.md) | 👨‍💻 Dev | Spécifications `custom_view.js` |
| [Backend — API Overview](docs/backend/01_overview.md) | 👨‍💻 Dev | `GET /api/hse/overview` — moteur, calculs, recorder |
| [Backend — API Diagnostic](docs/backend/02_diagnostic.md) | 👨‍💻 Dev | `GET/POST /api/hse/diagnostic` |
| [Backend — API Catalogue/Scan](docs/backend/03_catalogue_scan.md) | 👨‍💻 Dev | `GET/POST /api/hse/catalogue`, `/scan` |
| [Backend — API Meta](docs/backend/04_meta.md) | 👨‍💻 Dev | `GET/POST /api/hse/meta`, sync preview/apply |
| [Backend — API Settings](docs/backend/05_settings.md) | 👨‍💻 Dev | `GET/PUT /api/hse/settings/pricing` |
| [Backend — API Costs/History/Export](docs/backend/06_costs_history.md) | 👨‍💻 Dev | `GET /api/hse/costs`, `/history`, `/export` |
| [Backend — API Migration](docs/backend/07_migration.md) | 👨‍💻 Dev | `GET/POST /api/hse/migration` |
| [Backend — API User Prefs](docs/backend/08_user_prefs.md) | 👨‍💻 Dev | `GET/PATCH /api/hse/user_prefs` |
| [Backend — Engine & Storage](docs/backend/09_engine_storage.md) | 👨‍💻 Dev | Moteurs coût/analytics, StorageManager |
| [Contrat API complet](docs/architecture/API_CONTRACT.md) | 👨‍💻 Dev | Tous endpoints en format compact |

---

## État du projet

| Composant | Statut | Version |
|-----------|--------|---------|
| Backend Python (11 endpoints) | ✅ Opérationnel | 3.0.x |
| Frontend Shell + 8 vues | ✅ Opérationnel | 3.0.x |
| HACS | ✅ Publié | v3.0.119 |
| Tests unitaires | ✅ 47/47 verts | - |

**Dernière release** : `v3.0.119` — Fix `_renderAssignments` (onglet Pièces & Types)

---

## Contribuer

1. Fork → branche `feature/xxx` ou `fix/xxx`
2. Tests : `python3 -m unittest discover -s tests -v`
3. Lint : `python3 -m py_compile custom_components/hse/**/*.py`
4. PR vers `main` avec description claire

---

## Licence

MIT — Voir [LICENSE](LICENSE) (à ajouter)

---

## Liens utiles

- **Repo** : https://github.com/silentiss-jean/hsev3
- **Issues** : https://github.com/silentiss-jean/hsev3/issues
- **HACS** : https://hacs.xyz/docs/faq/custom_repositories/