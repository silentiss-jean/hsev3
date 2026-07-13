# 📖 Glossaire — Clés backend ↔ frontend

## Settings (tarification)

| Backend | Frontend | Description |
|---------|----------|-------------|
| `mode` | `mode` | `"flat"` ou `"hphc"` |
| `price_ht_kwh` | `price_ht_kwh` | Prix HT €/kWh (fixe) |
| `price_ttc_kwh` | `price_ttc_kwh` | Prix TTC €/kWh (fixe) |
| `price_hp_ttc_kwh` | `price_hp_ttc_kwh` | Prix TTC €/kWh Heures Pleines |
| `price_hc_ttc_kwh` | `price_hc_ttc_kwh` | Prix TTC €/kWh Heures Creuses |
| `subscription_eur_month` | `subscription_eur_month` | Abonnement mensuel € |
| `tax_rate_pct` | `tax_rate_pct` | Taux TVA % |
| `reference_entity_id` | `reference_entity_id` | Capteur référence (ex: Linky) |

⚠️ **Clés INTERDITES** (DELTA-065 fermé) :
`contract_type`, `subscription_ht`, `subscription_monthly`, `price_ht`, `price_hp`, `price_hc`, `tax_rate`

## Catalogue

| Backend | Frontend | Description |
|---------|----------|-------------|
| `integration_domain` | `integration_domain` | Domaine technique ("tuya", "tplink") |
| `integration_label` | `integration_label` | Titre lisible de l'instance |
| `quality_score` | `quality_score` | Score qualité 0-150 |
| `status` | `status` | `"selected"` / `"ignored"` / `"pending"` |
| `active` | `active` | Booléen sélection |

## Meta (pièces & types)

| Backend | Frontend | Description |
|---------|----------|-------------|
| `rooms[{id,name}]` | `rooms` | Liste pièces avec id et name |
| `types[string[]]` | `types` | Types : `"energy"`, `"power"` |
| `assignments[{entity_id,room,type,pending}]` | `assignments` | Assignation capteur→pièce/type |

## Statuts DELTA

| Statut | Signification |
|--------|---------------|
| `A_CORRIGER` 🔴 | Bug bloquant, doit être corrigé avant commit |
| `EN_DISCUSSION` 🟠 | Décision pas encore prise |
| `DOC_AHEAD` 🔵 | La doc est en avance sur le code |
| `CODE_AHEAD` 🟣 | Le code est en avance sur la doc |
| `FERMÉ` ✅ | Résolu et commité |
