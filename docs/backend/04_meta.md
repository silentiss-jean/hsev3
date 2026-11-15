# Backend — Meta & Assignations API

> Spécifications techniques de `meta.py` + `assignments.py` + `sync.py` — GET/POST `/api/hse/meta*`

---

## Fichiers

```
custom_components/hse/api/views/meta.py
custom_components/hse/api/views/assignments.py
custom_components/hse/meta/sync.py
custom_components/hse/meta/assignments.py
custom_components/hse/meta/schema.py
```

---

## Endpoints

| Méthode | URL | Classe | Description |
|---------|-----|--------|-------------|
| `GET` | `/api/hse/meta` | `HseMetaView` | Pièces, types, assignations |
| `POST` | `/api/hse/meta/sync/preview` | `HseMetaSyncPreviewView` | Diff avant apply |
| `POST` | `/api/hse/meta/sync/apply` | `HseMetaSyncApplyView` | Applique assignations |

---

## GET `/api/hse/meta` — `HseMetaView`

### Flux

```
1. Charge meta (StorageManager → MetaStore)
2. Retourne {rooms[], types[], assignments[]}
```

### Structure meta.json (MetaStore)

```json
{
  "rooms": [
    {"id": "room_salon", "name": "Salon"},
    {"id": "room_cuisine", "name": "Cuisine"}
  ],
  "types": ["Heating", "Water Heater", "Lighting", "Appliance", "Cooking", "Other"],
  "assignments": [
    {"entity_id": "sensor.salon_power", "room": "Salon", "type": "Lighting", "pending": true},
    {"entity_id": "sensor.chauffe_eau_power", "room": "Salle de bain", "type": "Water Heater", "pending": false}
  ]
}
```

### Règles assignations

- `pending: true` = assignation manuelle non encore synchronisée (flag UI)
- `pending: false` = assignation synchronisée (issue de sync ou appliquée)
- **Manuel jamais écrasé** par sync automatique (DELTA-040)
- Suppression type → pas de réapparition via refs orphelines (schema.py)

---

## POST `/api/hse/meta/sync/preview` — `HseMetaSyncPreviewView`

### Body

```json
{
  "assignments": [
    {"entity_id": "sensor.xxx", "room": "Salon", "type": "Lighting"},
    {"entity_id": "sensor.yyy", "room": "Cuisine", "type": "Cooking"}
  ]
}
```

### Flux (meta/sync.py → `preview_assignments`)

```
1. Charge meta actuel
2. Compare assignments[] reçu vs meta.assignments[]
3. Déduit :
   - to_add: nouveaux (entity_id absent de meta)
   - to_update: existants avec room/type différents (et pending=false)
   - to_remove: dans meta mais pas dans payload (pending=false seulement)
   - unchanged: identiques
4. RÈGLE : items avec pending=true → JAMAIS dans to_update/to_remove
5. Retour {to_add, to_update, to_remove, unchanged}
```

---

## POST `/api/hse/meta/sync/apply` — `HseMetaSyncApplyView`

### Body

Identique à preview.

### Flux (meta/sync.py → `apply_assignments`)

```
1. Charge meta actuel
2. Pour chaque assignment du payload :
   - Si entity_id existant :
       * Si pending=true → GARDE l'existant (manuel prioritaire)
       * Sinon met à jour room/type, pending=false
   - Si nouveau → ajoute avec pending=false
3. Supprime assignments absents du payload (sauf pending=true)
4. Sauvegarde meta
5. Retour {applied: int, errors: string[]}
```

### Protection assignations manuelles (DELTA-040)

```python
# meta/assignments.py
def apply_assignments(meta, new_assignments):
    existing_by_eid = {a["entity_id"]: a for a in meta.get("assignments", [])}
    
    for new in new_assignments:
        eid = new["entity_id"]
        if eid in existing_by_eid and existing_by_eid[eid].get("pending"):
            # Manuel → on ne touche pas
            continue
        existing_by_eid[eid] = {**new, "pending": False}
    
    # Suppression : seulement ceux sans pending
    meta["assignments"] = [
        a for a in existing_by_eid.values()
        if not a.get("pending") or a["entity_id"] in {n["entity_id"] for n in new_assignments}
    ]
```

---

## Schema & Types (meta/schema.py)

```python
# Types canoniques (source de vérité)
HSE_TYPES = [
    "Heating", "Water Heater", "Lighting", "Appliance",
    "Cooking", "Pool", "EV Charging", "Ventilation", "Other"
]

# Validation room/type
def validate_room(room: str) -> bool: return bool(room and room.strip())
def validate_type(type_: str) -> bool: return type_ in HSE_TYPES
```

---

## Réponses

### GET `/meta`
```json
{
  "rooms": [{"id": "room_salon", "name": "Salon"}],
  "types": ["Heating", "Water Heater", "Lighting", ...],
  "assignments": [
    {"entity_id": "sensor.xxx", "room": "Salon", "type": "Lighting", "pending": true}
  ]
}
```

### POST `/meta/sync/preview`
```json
{
  "to_add": [{"entity_id": "...", "room": "...", "type": "..."}],
  "to_update": [{"entity_id": "...", "from": {"room": "A", "type": "X"}, "to": {"room": "B", "type": "Y"}}],
  "to_remove": [{"entity_id": "...", "room": "...", "type": "..."}],
  "unchanged": 15
}
```

### POST `/meta/sync/apply`
```json
{ "applied": 3, "errors": [] }
```

---

## Codes d'erreur

| Endpoint | 400 | 422 | 500 |
|----------|-----|-----|-----|
| GET /meta | | | ✅ |
| POST /preview | ✅ | ✅ | |
| POST /apply | ✅ | ✅ | ✅ |

---

## Auth / CORS

- Toutes : `requires_auth = True`, `cors_allowed = False`

---

## Definition of Done

- [x] GET /meta : rooms[], types[], assignments[] avec pending
- [x] Preview : diff complet (add/update/remove/unchanged)
- [x] Apply : met à jour, respecte pending=true (manuel prioritaire)
- [x] Suppression type → pas réapparition orpheline (schema)
- [x] Types canoniques validés (Heating, Water Heater, ...)
- [x] Auth required, CORS false