# Documentation Architecture — Index

> Vue d'ensemble architecture HSE V3 : diagramme Mermaid + contrat API

---

## Fichiers

| Fichier | Description |
|---------|-------------|
| `ARCHITECTURE.md` | Diagramme Mermaid flowchart (HA Core, HSE Integration, Frontend 8 onglets, Flux de données) |
| `API_CONTRACT.md` | Contrat API complet : 10 règles transverses, 15 endpoints table, schémas request/response |

---

## ARCHITECTURE.md — Résumé

### Diagramme (extrait)

```mermaid
flowchart TB
    subgraph HA_CORE [Home Assistant Core]
        REC[Recorder DB]
        STATES[State Machine]
        REPAIRS[Repairs Registry]
        WS[WebSocket API]
    end

    subgraph HSE_INT [HSE Integration]
        BASE[HseBaseView]
        OVERVIEW[OverviewView]
        DIAG[DiagnosticView]
        CAT[CatalogueView]
        SCAN[ScanView]
        META[MetaView]
        SYNC[SyncViews]
        SETTINGS[SettingsView]
        COSTS[CostsView]
        HIST[HistoryView]
        EXPORT[ExportView]
        MIG[MigrationView]
        PREFS[UserPrefsView]
        SM[StorageManager]
        ENG[Engine Modules]
    end

    subgraph FE [Frontend JS (Panel HSE)]
        SHELL[hse_shell.js]
        OV[Overview Tab]
        DG[Diagnostic Tab]
        SC[Scan Tab]
        CF[Config Tab]
        CS[Costs Tab]
        MG[Migration Tab]
        CD[Cards Tab]
        CU[Custom Tab]
    end

    FE -->|REST /api/hse/*| HSE_INT
    HSE_INT -->|async_get_states| STATES
    HSE_INT -->|Recorder| REC
    HSE_INT -->|Repairs| REPAIRS
    SHELL -->|mount tabs| OV & DG & SC & CF & CS & MG & CD & CU
```

### 4 couches

1. **HA Core** : Recorder, State Machine, Repairs, WebSocket
2. **HSE Integration** : 8 API Views + StorageManager + Engine (calculation, cost, period_stats, group_totals, reference, sources, scan)
3. **Frontend JS** : hse_shell.js (router) + 8 onglets (features/*)
4. **Flux de données** : REST `/api/hse/*` → JSON → DOM patch (R1-R5)

---

## API_CONTRACT.md — Résumé

### 10 Règles transverses

| # | Règle |
|---|-------|
| R1 | Auth requise (`requires_auth = True`) |
| R2 | CORS désactivé (`cors_allowed = False`) |
| R3 | Validation stricte payloads (422) |
| R4 | Zéro token dans logs |
| R5 | Stockage via StorageManager uniquement |
| R6 | Codes HTTP sémantiques |
| R7 | Async pour travaux longs (run_id) |
| R8 | TZ locale (calendrier HA) pour périodes |
| R9 | Version dans `manifest.json` + tag Git |
| R10 | HACS `hacs.json` `{ "name": "HSE V3" }` |

### 15 Endpoints

| Méthode | Endpoint | Vue |
|---------|----------|-----|
| GET | `/api/hse/overview` | OverviewView |
| GET/POST | `/api/hse/diagnostic` | DiagnosticView |
| GET | `/api/hse/catalogue` | CatalogueView |
| POST | `/api/hse/catalogue/triage` | CatalogueView |
| POST | `/api/hse/catalogue/triage/bulk` | CatalogueView |
| POST | `/api/hse/catalogue/refresh` | CatalogueView |
| GET/POST | `/api/hse/scan` | ScanView |
| GET | `/api/hse/meta` | MetaView |
| POST | `/api/hse/meta/sync/preview` | SyncPreviewView |
| POST | `/api/hse/meta/sync/apply` | SyncApplyView |
| GET/PUT | `/api/hse/settings/pricing` | SettingsPricingView |
| GET | `/api/hse/costs` | CostsView |
| GET | `/api/hse/history` | HistoryView |
| GET | `/api/hse/export` | ExportView |
| GET/POST | `/api/hse/migration/export` | MigrationExportView |
| POST | `/api/hse/migration/apply` | MigrationApplyView |
| GET/PATCH | `/api/hse/user_prefs` | UserPrefsView |

---

## Navigation

- [Architecture complète](ARCHITECTURE.md) — Mermaid + description couches
- [Contrat API complet](API_CONTRACT.md) — Règles + 15 endpoints + schémas JSON