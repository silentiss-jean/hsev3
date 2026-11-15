# Frontend — Migration V1 → V3

> Spécifications techniques de `migration_view.js` — Assistant migration legacy

---

## Mission

Guider l'utilisateur dans la migration depuis une installation HSE V1 (entités `sensor.hse_*`, `input_number.hse_*`) vers HSE V3 (catalogue unique). Détecter les entités legacy, proposer un mapping, appliquer la migration et nettoyer.

---

## Fichier

```
custom_components/hse/web_static/panel/features/migration/migration_view.js
```

---

## Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/hse/migration/export` | GET | Détecte entités legacy + suggère mappings |
| `/api/hse/migration/apply` | POST | Applique mappings + nettoyage optionnel |

---

## Structure données — Export (`GET /api/hse/migration/export`)

```typescript
interface MigrationExportResponse {
  legacy_found: number;
  mappings: Array<{
    legacy_entity_id: string;         // ex: sensor.hse_salon_power
    suggested_entity_id: string;      // ex: sensor.salon_power (nouveau)
    confidence: 'high' | 'medium' | 'low';
    status: 'pending' | 'validated' | 'skipped';
  }>;
}
```

---

## Structure données — Apply (`POST /api/hse/migration/apply`)

```typescript
// Request
interface MigrationApplyRequest {
  mappings: Array<{ legacy_entity_id: string; target_entity_id: string }>;
  cleanup_legacy: boolean;            // Supprime entités V1 après migration
}

// Response
interface MigrationApplyResponse {
  applied: number;                    // Mappings appliqués
  cleaned: number;                    // Entités legacy supprimées
  errors: string[];
}
```

---

## Règles V3 respectées

| Règle | Implémentation |
|-------|----------------|
| **R1** | `mount()` construit DOM wizard steps. `_renderStep()` patch par étape. |
| **R2** | Flag `_fetching` sur export/apply. |
| **R3** | Signature export comparée. |
| **R4** | Zéro `localStorage` — état wizard en mémoire. |
| **R5** | Skeleton step 1 (détection) avant fetch. |

---

## Wizard — 3 étapes

| Étape | Titre | Action |
|-------|-------|--------|
| **1** | **Détection** | GET `/migration/export` → liste mappings suggérés |
| **2** | **Validation** | User coche/décoche mappings, édite cibles, choisit cleanup |
| **3** | **Application** | POST `/migration/apply` → rapport + nettoyage |

---

## États UX par étape

| Étape | État | Affichage |
|-------|------|-----------|
| **1** | Chargement | Skeleton liste |
| | Résultats | Table : Legacy | Suggestion | Confiance | Action (checkbox) |
| | Aucune legacy | "Aucune entité V1 détectée — migration non nécessaire" |
| **2** | Édition | Inputs editables sur `target_entity_id`, checkbox `cleanup_legacy` |
| **3** | En cours | Spinner + "Migration en cours…" |
| | Succès | Rapport : X appliqués, Y nettoyés, erreurs |
| | Erreur | Détail erreurs + bouton "Réessayer" |

---

## Layout DOM

```html
<div class="hse-migration">
  <!-- Progress indicator -->
  <div class="hse-migration__progress">
    <div class="hse-migration__step active" data-step="1">1. Détection</div>
    <div class="hse-migration__step" data-step="2">2. Validation</div>
    <div class="hse-migration__step" data-step="3">3. Application</div>
  </div>

  <!-- Step 1 : Détection -->
  <div id="hse-mig-step-1" class="hse-migration__panel">
    <h2>🔍 Détection entités V1</h2>
    <div id="hse-mig-detect">...</div>
    <button id="hse-mig-next-1" class="hse-btn hse-btn--primary" disabled>Suivant →</button>
  </div>

  <!-- Step 2 : Validation -->
  <div id="hse-mig-step-2" class="hse-migration__panel" hidden>
    <h2>✅ Validation mappings</h2>
    <div class="hse-migration__table-wrapper">
      <table class="hse-table">
        <thead><tr><th>Entité V1</th><th>Cible V3</th><th>Confiance</th><th>Inclure</th></tr></thead>
        <tbody id="hse-mig-mappings-body">...</tbody>
      </table>
    </div>
    <label class="hse-migration__cleanup">
      <input type="checkbox" id="hse-mig-cleanup"> Supprimer entités V1 après migration
    </label>
    <div class="hse-migration__actions">
      <button id="hse-mig-back-2" class="hse-btn hse-btn--ghost">← Retour</button>
      <button id="hse-mig-apply" class="hse-btn hse-btn--primary">🚀 Appliquer la migration</button>
    </div>
  </div>

  <!-- Step 3 : Résultat -->
  <div id="hse-mig-step-3" class="hse-migration__panel" hidden>
    <h2>📋 Résultat</h2>
    <div id="hse-mig-result">...</div>
    <button id="hse-mig-done" class="hse-btn hse-btn--primary" hidden>Terminer</button>
  </div>
</div>
```

---

## Logique étape 1 — Détection

```javascript
async _loadDetection() {
  this._fetching = true;
  try {
    const r = await this._ctx.hseFetch('/api/hse/migration/export');
    const data = await r.json();
    this._migrationData = data;
    this._renderStep1(data);
  } catch (e) { ... }
  finally { this._fetching = false; }
}

_renderStep1(data) {
  const { legacy_found, mappings } = data;
  if (legacy_found === 0) {
    this._els.detect.innerHTML = '<div class="hse-empty">Aucune entité V1 détectée</div>';
    this._els.next1.disabled = true;
    return;
  }
  this._els.detect.innerHTML = mappings.map(m => `
    <tr data-legacy="${escAttr(m.legacy_entity_id)}">
      <td><code>${escHtml(m.legacy_entity_id)}</code></td>
      <td><input type="text" value="${escAttr(m.suggested_entity_id)}" class="hse-mig-target"></td>
      <td><span class="hse-badge hse-badge--${m.confidence}">${m.confidence}</span></td>
      <td><input type="checkbox" checked ${m.status === 'skipped' ? 'disabled' : ''}></td>
    </tr>
  `).join('');
  this._els.next1.disabled = false;
}
```

---

## Logique étape 3 — Application

```javascript
async _applyMigration() {
  this._fetching = true;
  this._els.apply.disabled = true;
  this._els.apply.textContent = '⏳ Application…';

  const mappings = Array.from(this._els.mappingsBody.querySelectorAll('tr'))
    .filter(tr => tr.querySelector('input[type="checkbox"]').checked)
    .map(tr => ({
      legacy_entity_id: tr.dataset.legacy,
      target_entity_id: tr.querySelector('.hse-mig-target').value.trim()
    }));

  const cleanup = this._els.cleanup.checked;

  try {
    const r = await this._ctx.hseFetch('/api/hse/migration/apply', {
      method: 'POST',
      body: JSON.stringify({ mappings, cleanup_legacy: cleanup })
    });
    const result = await r.json();
    this._renderStep3(result);
  } catch (e) { ... }
  finally { this._fetching = false; }
}
```

---

## Dépendances

- `../../shared/hse_esc.js` — `escHtml()`, `escAttr()`
- `../../shared/hse_fetch.js` — `hseFetch()`
- CSS inliné
- Contexte shell : `ctx.hseFetch`, `ctx.toast`

---

## Definition of Done

- [x] Wizard 3 étapes avec progress indicator
- [x] Étape 1 : GET `/migration/export` → table mappings avec confiance
- [x] Étape 2 : Édition cibles, checkbox inclusion, option cleanup
- [x] Étape 3 : POST `/migration/apply` → rapport appliqués/nettoyés/erreurs
- [x] Navigation Précédent/Suivant fonctionnelle
- [x] Skeleton étape 1 (R5)
- [x] Flag `_fetching` export/apply (R2)
- [x] Signature export (R3)
- [x] Zéro localStorage (R4)