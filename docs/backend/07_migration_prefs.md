# Backend — Migration & UserPrefs API

> Spécifications techniques de `migration.py` + `user_prefs.py` — GET/POST `/api/hse/migration*`, GET/PATCH `/api/hse/user_prefs`

---

## Fichiers

```
custom_components/hse/api/views/migration.py
custom_components/hse/api/views/user_prefs.py
```

---

## Migration — `/api/hse/migration`

### GET `/api/hse/migration/export` — `HseMigrationExportView`

### Flux

```
1. Récupère toutes entités HA (hass.states.async_all())
2. Identifie entités legacy V1 :
   - pattern entity_id: sensor.hse_*, input_number.hse_*, sensor.hse_cost_*, etc.
   - ou device_class legacy, integration hse_v1
3. Pour chaque legacy, suggère mapping V3 :
   - Extrait nom pièce/type depuis entity_id ou friendly_name
   - Construit suggested_entity_id = sensor.<nom_nettoyé>
   - Calcule confidence (high/medium/low) selon similarité
4. Retour {legacy_found, mappings[]}
```

### Détection legacy (heuristiques)

```python
LEGACY_PATTERNS = [
    r"^sensor\.hse_",           # sensor.hse_salon_power
    r"^input_number\.hse_",     # input_number.hse_tarif_hp
    r"^sensor\.hse_cost_",      # sensor.hse_cost_month
    r"^sensor\.hse_consumption_", # sensor.hse_consumption_day
]

def is_legacy(entity_id: str) -> bool:
    return any(re.match(p, entity_id) for p in LEGACY_PATTERNS)

def suggest_v3_id(legacy_id: str, state) -> tuple[str, str]:
    # sensor.hse_salon_power → sensor.salon_power
    base = re.sub(r"^(sensor|input_number)\.hse_?", "", legacy_id)
    # Nettoie _power, _energy, _cost, _consumption
    base = re.sub(r"_(power|energy|cost|consumption)$", "", base)
    return f"sensor.{base}", "high"
```

### Réponse

```json
{
  "legacy_found": 12,
  "mappings": [
    {
      "legacy_entity_id": "sensor.hse_salon_power",
      "suggested_entity_id": "sensor.salon_power",
      "confidence": "high",
      "status": "pending"
    },
    {
      "legacy_entity_id": "input_number.hse_tarif_hp",
      "suggested_entity_id": "sensor.hse_tarif_hp",
      "confidence": "medium",
      "status": "pending"
    }
  ]
}
```

---

### POST `/api/hse/migration/apply` — `HseMigrationApplyView`

### Body

```json
{
  "mappings": [
    {"legacy_entity_id": "sensor.hse_salon_power", "target_entity_id": "sensor.salon_power"},
    {"legacy_entity_id": "input_number.hse_tarif_hp", "target_entity_id": "sensor.hse_tarif_hp"}
  ],
  "cleanup_legacy": true
}
```

### Flux

```
1. Valide mappings[] (legacy existe, target valide)
2. Pour chaque mapping :
   - Si target_entity_id n'existe pas → crée entité helper (input_number) ou renomme
   - Migre données : historise si possible
   - Met à jour catalogue si legacy était dedans
3. Si cleanup_legacy = true :
   - Supprime entités legacy (hass.states.async_remove)
   - Supprime device legacy si orphelin
4. Retour {applied, cleaned, errors[]}
```

### Réponse

```json
{
  "applied": 10,
  "cleaned": 8,
  "errors": [
    "sensor.hse_unknown: entité legacy introuvable"
  ]
}
```

---

## UserPrefs — `/api/hse/user_prefs`

### GET `/api/hse/user_prefs` — `HseUserPrefsView.get`

### Flux

```
1. Charge user_prefs (StorageManager → UserPrefsStore)
2. Merge avec DEFAULTS (clé manquante = défaut)
3. Retour objet complet
```

### PATCH `/api/hse/user_prefs` — `HseUserPrefsView.patch`

### Body (merge partiel)

```json
{
  "theme": "dark",
  "glassmorphism": true
}
```

### Flux

```
1. Charge prefs actuel
2. Merge partiel : prefs = {**prefs, **payload}
3. Valide clés connues uniquement (ignore clés inconnues)
4. Sauvegarde (UserPrefsStore)
5. Retour OBJET COMPLET mis à jour
```

### Défauts

```python
DEFAULT_PREFS = {
    "active_tab": "overview",
    "overview_period": "day",
    "costs_period": "month",
    "theme": "default",
    "glassmorphism": False,
    "dynamic_bg": False
}
```

### Clés validées

| Clé | Type | Valeurs |
|-----|------|---------|
| `active_tab` | str | "overview"\|"diagnostic"\|"scan"\|"config"\|"costs"\|"migration"\|"cards"\|"custom" |
| `overview_period` | str | "day"\|"week"\|"month"\|"year" |
| `costs_period` | str | "day"\|"week"\|"month"\|"year" |
| `theme` | str | "default"\|"light"\|"dark"\|"auto" |
| `glassmorphism` | bool | |
| `dynamic_bg` | bool | |

---

## Réponses

### GET `/user_prefs`
```json
{
  "active_tab": "overview",
  "overview_period": "day",
  "costs_period": "month",
  "theme": "dark",
  "glassmorphism": true,
  "dynamic_bg": false
}
```

### PATCH `/user_prefs` (body: {"theme": "light"})
```json
{
  "active_tab": "overview",
  "overview_period": "day",
  "costs_period": "month",
  "theme": "light",
  "glassmorphism": true,
  "dynamic_bg": false
}
```

---

## Codes d'erreur

| Endpoint | 400 | 422 | 500 |
|----------|-----|-----|-----|
| GET /migration/export | | | ✅ |
| POST /migration/apply | ✅ | ✅ | ✅ |
| GET /user_prefs | | | ✅ |
| PATCH /user_prefs | ✅ | ✅ | ✅ |

---

## Auth / CORS

- Toutes : `requires_auth = True`, `cors_allowed = False`

---

## Definition of Done

- [x] GET /migration/export : détecte legacy patterns, suggère mapping + confidence
- [x] POST /migration/apply : migre mappings, cleanup optionnel, rapports
- [x] GET /user_prefs : merge defaults, retourne complet
- [x] PATCH /user_prefs : merge partiel, validation clés, retourne complet
- [x] Storage via StorageManager (UserPrefsStore)
- [x] Auth required, CORS false