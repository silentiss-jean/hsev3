# Backend — Catalogue & Scan API

> Spécifications techniques de `catalogue.py` + `scan.py` — GET/POST `/api/hse/catalogue*`, GET/POST `/api/hse/scan`

---

## Fichiers

```
custom_components/hse/api/views/catalogue.py
custom_components/hse/api/views/scan.py
```

## Classes

| Fichier | Classe | Endpoints |
|---------|--------|-----------|
| `catalogue.py` | `HseCatalogueView` | GET `/catalogue`, POST `/catalogue/triage`, POST `/catalogue/triage/bulk`, POST `/catalogue/refresh` |
| `scan.py` | `HseScanView` | GET `/scan`, POST `/scan` |

---

## Catalogue — `HseCatalogueView`

### GET `/api/hse/catalogue`

**Params** : `?status=all|selected|ignored|pending` (défaut `all`), `?page=int`, `?per_page=int` (max 200)

**Flux** :
```
1. Charge catalogue (StorageManager)
2. Filtre items valides (dict)
3. Applique filtre status si fourni
4. Pagination (page/per_page)
5. Pour chaque item : enrichit name, icon, room, type, quality_score depuis meta
6. Retour {total, page, per_page, items[]}
```

**Item enrichi** :
```python
{
    "entity_id": "...",
    "name": item.get("display_name") or friendly_name HA,
    "icon": item.get("icon") or "mdi:flash",
    "room": meta_assignments.get(eid, {}).get("room"),
    "type": meta_assignments.get(eid, {}).get("type"),
    "status": triage.policy,  # selected|ignored|pending
    "quality_score": item.get("quality_score", 0)
}
```

### POST `/api/hse/catalogue/triage`

**Body** : `{ "entity_id": str, "action": "select" | "ignore" | "reset" }`

**Flux** :
```
1. Valide entity_id présent dans catalogue
2. Valide action ∈ {select, ignore, reset}
3. Met à jour item.triage.policy = action
4. Si reset : supprime item du catalogue (retourne en scan)
5. Sauvegarde catalogue
6. Retour {entity_id, status}
```

### POST `/api/hse/catalogue/triage/bulk`

**Body** : `{ "items": [{ "entity_id": str, "action": str }] }`

**Flux** :
```
1. Valide chaque item (entity_id existe, action valide)
2. Applique en boucle (même logique unitaire)
3. Compte processed + collecte errors
4. Sauvegarde catalogue une seule fois
5. Retour {processed: int, errors: string[]}
```

### POST `/api/hse/catalogue/refresh`

**Body** : `{}`

**Flux** :
```
1. Vérifie pas de refresh en cours (flag storage ou lock)
2. Marque refresh en cours
3. Déclenche scan async (hass.async_create_task)
4. Retour {triggered: bool}
```

---

## Scan — `HseScanView`

### GET `/api/hse/scan`

**Params** : `?domain=str`, `?q=str` (recherche), `?page=int`, `?per_page=int`

**Flux** :
```
1. Récupère toutes les entités HA (hass.states.async_all())
2. Filtre domaines energy/power/sensor pertinents
3. Exclut : déjà dans catalogue, utility_meter, input_number, automation, script, ...
4. Pour chaque candidate :
   - Calcule quality_score (engine/scan.py)
   - Déduit suggested_action (select/ignore)
   - Déduit kind: "energy" | "power" (FIX-2026-07-04 C8)
   - Récupère integration_domain + integration_label
5. Applique filtres domain/q
6. Groupe par integration_domain (DELTA-053)
7. Pagination
8. Retour {total, page, per_page, items[]}
```

**Item scan** :
```json
{
  "entity_id": "sensor.xxx",
  "name": "Friendly name",
  "domain": "sensor",
  "device": "device_id ou null",
  "quality_score": 142,
  "suggested_action": "select",
  "kind": "energy",
  "integration_domain": "tuya",
  "integration_label": "Tuya (ftoure.net)"
}
```

### POST `/api/hse/scan`

**Body** : `{}`

**Flux** :
```
1. Identique à GET mais force re-scan complet (invalide cache si existant)
2. Retour {triggered: bool} (ou résultats directs si synchrone)
```

---

## Quality Score (engine/scan.py)

```python
def calculate_quality_score(entity_id, state, attributes) -> int:
    score = 0
    # +50 : unit_of_measurement ∈ {W, kWh}
    # +30 : device_class ∈ {power, energy}
    # +20 : state numeric non None
    # +20 : last_changed récent (< 24h)
    # +15 : attribution source connue (integration)
    # +15 : pas utility_meter / pas input_number
    # -30 : état unknown/unavailable
    # -50 : pas d'unit_of_measurement
    return max(0, min(150, score))
```

---

## Réponses types

### GET `/catalogue` (page 1, 20 items)
```json
{
  "total": 42,
  "page": 1,
  "per_page": 20,
  "items": [
    {
      "entity_id": "sensor.salon_power",
      "name": "Salon",
      "icon": "mdi:sofa",
      "room": "Salon",
      "type": "Lighting",
      "status": "selected",
      "quality_score": 145
    }
  ]
}
```

### GET `/scan` (page 1)
```json
{
  "total": 15,
  "page": 1,
  "per_page": 50,
  "items": [
    {
      "entity_id": "sensor.new_device_power",
      "name": "Nouveau device",
      "domain": "sensor",
      "device": "abc123",
      "quality_score": 120,
      "suggested_action": "select",
      "kind": "power",
      "integration_domain": "tplink",
      "integration_label": "TP-Link"
    }
  ]
}
```

---

## Codes d'erreur

| Endpoint | 400 | 404 | 409 | 422 | 503 |
|----------|-----|-----|-----|-----|-----|
| GET /catalogue | ✅ | | | ✅ | |
| POST /triage | ✅ | ✅ | | ✅ | |
| POST /triage/bulk | ✅ | | | ✅ | |
| POST /refresh | | | ✅ | | |
| GET /scan | ✅ | | | | ✅ |
| POST /scan | | | ✅ | | |

---

## Auth / CORS

- Toutes : `requires_auth = True`, `cors_allowed = False`

---

## Definition of Done

- [x] GET /catalogue : filtre status, pagination, enrichissement room/type/quality
- [x] POST /triage : select/ignore/reset unitaire + sauvegarde
- [x] POST /triage/bulk : masse + erreurs collectées + 1 sauvegarde
- [x] POST /refresh : 409 si en cours, sinon déclenche scan async
- [x] GET /scan : filtres domain/q, quality_score, kind, integration_domain/label
- [x] POST /scan : re-scan forcé
- [x] Groupement par `integration_domain` (DELTA-053)
- [x] Libellés HA internes : utility_meter→"Compteurs HA", integration→"Helpers HA"
- [x] Auth required, CORS false