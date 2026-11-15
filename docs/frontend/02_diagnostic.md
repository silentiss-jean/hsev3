# Frontend — Diagnostic

> Spécifications techniques de `diagnostic_view.js` — Score qualité, santé capteurs, alertes Repairs

---

## Mission

Donner une vision complète de la fiabilité des données : score global, détail par capteur, alertes Home Assistant natives, statistiques de stockage.

---

## Fichier

```
custom_components/hse/web_static/panel/features/diagnostic/diagnostic_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Polling | Description |
|----------|---------|---------|-------------|
| `/api/hse/diagnostic` | GET | Aucun (à la demande) | Score + liste capteurs + repairs |
| `/api/hse/diagnostic` | POST | Déclenché utilisateur | Lance nouveau diagnostic |

---

## Structure des données (`GET /api/hse/diagnostic`)

```typescript
interface DiagnosticResponse {
  score_pct: number;                              // 0-100
  sensors: Array<{
    entity_id: string;
    name: string;
    status: 'ok' | 'warning' | 'error';
    issues: string[];
  }>;
  repairs: Array<{                                // HA Repairs natifs
    issue_id: string;
    severity: 'warning' | 'critical';
    description: string;
  }>;
  storage_stats: {
    total: number;      // total entités en base
    selected: number;   // status=selected
    ignored: number;    // status=ignored
    pending: number;    // status=pending
  };
  last_run_at: string | null;                     // ISO 8601
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM une fois (skeleton → layout). `_render()` patch `textContent`. |
| **R2** | Flag `_fetching` sur `_load()` et `_runDiagnostic()`. |
| **R3** | Signature JSON comparée avant render. |
| **R4** | Zéro `localStorage`. |
| **R5** | Skeleton cartes (score, liste, repairs) avant fetch. |

---

## États UX

| État | Affichage |
|------|-----------|
| **Chargement** | Skeleton : carte score (cercle), liste capteurs, liste repairs |
| **Données** | Score circulaire (couleur selon seuil), tableau capteurs avec badges, liste repairs HA |
| **Aucun diagnostic** | Message + bouton "Lancer le diagnostic" |
| **Diagnostic en cours** | Spinner + message "Analyse en cours…" (bouton désactivé) |
| **Erreur** | Carte erreur + bouton "Réessayer" |

---

## Layout DOM

```html
<div class="hse-diagnostic">
  <!-- Toolbar -->
  <div class="hse-diagnostic__toolbar">
    <button id="hse-diag-run" class="hse-btn hse-btn--primary">🔄 Lancer le diagnostic</button>
    <span id="hse-diag-last-run" class="hse-diagnostic__last-run">Dernier : —</span>
  </div>

  <!-- Score global -->
  <div class="hse-diagnostic__score-card">
    <div class="hse-diagnostic__score-circle" style="--score: {score_pct}%">
      <span class="hse-diagnostic__score-value">{score_pct}%</span>
    </div>
    <div class="hse-diagnostic__score-label">Score de fiabilité</div>
    <div class="hse-diagnostic__stats">
      <span>{selected} sélectionnés</span> · <span>{ignored} ignorés</span> · <span>{pending} pending</span>
    </div>
  </div>

  <!-- Liste capteurs -->
  <div class="hse-diagnostic__section">
    <h3>📋 Capteurs catalogués</h3>
    <div class="hse-diagnostic__table-container">
      <table class="hse-table">
        <thead><tr><th>Capteur</th><th>Statut</th><th>Problèmes</th></tr></thead>
        <tbody id="hse-diag-sensors-body">...</tbody>
      </table>
    </div>
  </div>

  <!-- Repairs HA -->
  <div class="hse-diagnostic__section">
    <h3>🔧 Alertes Home Assistant</h3>
    <div id="hse-diag-repairs">...</div>
  </div>
</div>
```

---

## Actions utilisateur

| Action | Handler | Effet |
|--------|---------|-------|
| Clic "Lancer le diagnostic" | `_runDiagnostic()` | POST `/api/hse/diagnostic` → polling jusqu'à completion |
| Clic ligne capteur | (futur) | Navigation vers config/costs filtré |

---

## Logique `_runDiagnostic()`

```javascript
async _runDiagnostic() {
  this._running = true;
  this._btn.disabled = true;
  this._btn.textContent = '⏳ Analyse…';
  try {
    const r = await this._ctx.hseFetch('/api/hse/diagnostic', { method: 'POST' });
    const { run_id } = await r.json();
    // Polling jusqu'à last_run_at mis à jour
    await this._waitForCompletion(run_id);
  } catch (e) { ... }
  finally { this._running = false; this._load(); }
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`
- `../../shared/ui/table.js` — `createTable()` (si utilisé)
- CSS inliné
- Contexte shell : `ctx.hseFetch`

---

## Definition of Done

- [x] `mount()` skeleton → layout après fetch
- [x] `update_hass()` no-op
- [x] `unmount()` nettoie timers + abort
- [x] Score circulaire CSS `--score` variable
- [x] Tableau capteurs : badge couleur (ok/warning/error) + liste issues
- [x] Repairs HA listés avec sévérité
- [x] Bouton "Lancer" désactivé pendant exécution (R2)
- [x] Skeleton avant fetch (R5)
- [x] Signature JSON (R3)