# Backend — Diagnostic API

> Spécifications techniques de `diagnostic.py` — GET + POST `/api/hse/diagnostic`

---

## Fichier

```
custom_components/hse/api/views/diagnostic.py
```

## Classe

`HseDiagnosticView` — Hérite de `HseBaseView`

---

## Responsabilité

Calculer le score de fiabilité global, lister la santé de chaque capteur catalogué, exposer les alertes Repairs natives HA, retourner les statistiques de stockage.

---

## GET — Lecture diagnostic

### Flux

```
1. Charge catalogue (StorageManager)
2. Filtre items valides (isinstance dict) — DELTA-033b
3. Compte total / selected / ignored / pending
4. Pour chaque item :
   - Récupère state HA
   - Lit health.escalation (warning_15m, error_24h, action_48h)
   - Déduit status + issues lisibles
   - Compte ok_count
5. score_pct = round(ok_count / total * 100) si total > 0 else 100
6. Récupère HA Repairs via hass.data['repairs'] (issue_registry)
7. Retour JSON
```

### Score

```python
# ok = pas d'escalation
# warning = escalation warning_15m ou error_24h
# error = escalation action_48h
score_pct = round(ok_count / total * 100) if total else 100
```

### Repairs HA

```python
# Lecture issue_registry HA
repairs = []
for issue in self.hass.data.get('repairs', {}).get('issues', {}).values():
    if issue.domain == 'hse':
        repairs.append({
            'issue_id': issue.issue_id,
            'severity': issue.severity,  # warning | critical
            'description': issue.translation_key or issue.issue_id
        })
```

---

## POST — Déclenchement diagnostic

### Flux

```python
async def post(self, request):
    if self._running:
        raise web.HTTPConflict(text="Diagnostic déjà en cours")
    self._running = True
    run_id = str(uuid.uuid4())
    # Lance task async (fire-and-forget)
    self.hass.async_create_task(self._run_diagnostic(run_id))
    return web.json_response({"started": True, "run_id": run_id})
```

### Task async `_run_diagnostic(run_id)`

```python
async def _run_diagnostic(self, run_id):
    try:
        mgr = HseStorageManager(self.hass)
        catalogue = await mgr.async_load_catalogue()
        items = catalogue.get("items") or {}

        for item_id, item in items.items():
            if not isinstance(item, dict):
                continue
            src = item.get("source") or {}
            eid = src.get("entity_id") or item_id
            state = self.hass.states.get(eid)

            # Vérifie disponibilité
            # Met à jour item.health.escalation selon seuils
            # 15m indisponible → warning_15m
            # 24h indisponible → error_24h
            # 48h indisponible → action_48h

            # Crée Repairs HA si action_48h
            if escalation == "action_48h":
                self.hass.data['repairs'].async_create_issue(
                    domain="hse",
                    issue_id=f"sensor_unavailable_{item_id}",
                    severity="critical",
                    translation_key="sensor_unavailable_48h",
                    translation_placeholders={"entity_id": eid}
                )

        await mgr.async_save_catalogue(catalogue)
    finally:
        self._running = False
```

---

## Réponse GET

```json
{
  "score_pct": 87,
  "sensors": [
    {
      "entity_id": "sensor.salon_power",
      "name": "Salon",
      "status": "ok",
      "issues": []
    },
    {
      "entity_id": "sensor.chauffe_eau_power",
      "name": "Chauffe-eau",
      "status": "warning",
      "issues": ["Indisponible depuis plus de 15 min"]
    }
  ],
  "repairs": [
    {
      "issue_id": "sensor_unavailable_sensor.xxx",
      "severity": "critical",
      "description": "sensor_unavailable_48h"
    }
  ],
  "storage_stats": {
    "total": 23,
    "selected": 18,
    "ignored": 3,
    "pending": 2
  },
  "last_run_at": "2026-04-08T12:00:00+02:00"
}
```

---

## Codes d'erreur

| Endpoint | Code | Condition |
|----------|------|-----------|
| POST | 409 | `self._running == True` (diagnostic déjà en cours) |
| GET/POST | 500 | Exception interne |

---

## Auth / CORS

- `requires_auth = True`
- `cors_allowed = False`

---

## Definition of Done

- [x] GET : score_pct (0-100) basé sur health.escalation
- [x] GET : sensors[] avec status ok/warning/error + issues lisibles
- [x] GET : repairs[] depuis HA issue_registry (domain=hse)
- [x] GET : storage_stats (total/selected/ignored/pending)
- [x] GET : last_run_at depuis catalogue metadata
- [x] POST : 409 si déjà en cours, sinon lance task async + run_id
- [x] Task async met à jour health.escalation + crée Repairs si action_48h
- [x] Auth required, CORS false