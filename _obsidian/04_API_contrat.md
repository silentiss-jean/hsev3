# 🔌 API — Contrat des routes HSE V3

> Base : `http://homeassistant.local:8123` + token Bearer (Long-Lived Token)
> Auth : `requires_auth = True` sur toutes les vues

## Routes backend disponibles

| Méthode | Route | Vue | Statut |
|---------|-------|-----|--------|
| GET | `/api/hse/ping` | `PingView` | ✅ |
| GET | `/api/hse/overview` | `HseOverviewView` | ✅ |
| GET | `/api/hse/costs` | `HseCostsView` | ✅ |
| GET | `/api/hse/costs/history` | `HseHistoryView` | ✅ |
| GET | `/api/hse/costs/export` | `HseExportView` | ✅ |
| GET/PUT | `/api/hse/settings` | `HseSettingsView` | ✅ |
| GET/PUT | `/api/hse/settings/pricing` | alias rétrocompat | ✅ |
| GET/POST | `/api/hse/catalogue` | `HseCatalogueView` | ✅ |
| PATCH/DELETE | `/api/hse/catalogue/{entity_id}` | `HseCatalogueItemView` | ✅ |
| POST | `/api/hse/catalogue/bulk` | `HseCatalogueBulkView` | ✅ |
| POST | `/api/hse/catalogue/triage` | `HseCatalogueTriageView` | ✅ |
| POST | `/api/hse/catalogue/triage/bulk` | `HseCatalogueTriageBulkView` | ✅ |
| POST | `/api/hse/catalogue/refresh` | `HseCatalogueRefreshView` | ✅ |
| GET | `/api/hse/scan` | `HseScanView` | ✅ |
| POST | `/api/hse/scan` | `HseScanView` | ✅ |
| GET | `/api/hse/meta` | `HseMetaView` | ✅ |
| GET/POST | `/api/hse/meta/sync/preview` | `HseMetaSyncPreviewView` | ✅ |
| POST | `/api/hse/meta/sync/apply` | `HseMetaSyncApplyView` | ✅ |
| GET | `/api/hse/diagnostic` | `HseDiagnosticView` | ✅ |
| GET/POST | `/api/hse/migration` | `HseMigrationView` | ✅ |
| GET/PATCH | `/api/hse/user_prefs` | `HseUserPrefsView` | ✅ |
| GET | `/api/hse/frontend_manifest` | `HseFrontendManifestView` | ✅ |

## Payload settings (tarification)
```json
{
  "mode": "flat" | "hphc",
  "price_ht_kwh": 0.1200,
  "price_ttc_kwh": 0.1500,
  "price_hp_ttc_kwh": 0.1800,
  "price_hc_ttc_kwh": 0.1200,
  "subscription_eur_month": 9.50,
  "tax_rate_pct": 20.0,
  "reference_entity_id": "sensor.linky_consumption"
}
```
⚠️ **Anciennes clés INTERDITES** : `contract_type`, `subscription_ht`, `price_ht`, `price_hp`, `price_hc`, `tax_rate`

## Payload catalogue triage/bulk
```json
{ "threshold": 80 }   ← sélection auto (quality_score >= threshold)
```
