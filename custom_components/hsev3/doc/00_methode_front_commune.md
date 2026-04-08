# HSE V3 — Méthode frontend commune (contrat de base)

> Référence obligatoire avant de coder n'importe quel onglet.
> Tout onglet qui ne respecte pas ce contrat est considéré **non conforme** et bloquant pour le merge.

---

## 1. Pourquoi cette méthode

La V2 a introduit une **régression critique** sur `costs` : re-render complet du tableau à chaque tick Live,
fuite mémoire, perte de scroll, freeze UI. Cause : absence de contrat de rendering partagé.
La V3 impose un contrat unique à tous les onglets pour que ce problème ne se reproduise jamais.

---

## 2. Le contrat de cycle de vie

Chaque onglet est un module JS avec exactement trois méthodes publiques :
mount(container, ctx) → appel unique à l'activation de l'onglet
update_hass(hass) → appel à chaque changement d'état HA
unmount() → appel à la désactivation de l'onglet

### 2.1 `mount(container, ctx)`

**Rôle :** construire intégralement la structure DOM et déclencher le premier fetch.

**Règles :**
- Construit le skeleton HTML (`container.innerHTML = skeletonHTML`) une seule fois
- Déclenche le premier fetch asynchrone
- Initialise le polling si nécessaire (`setInterval`)
- Pose `this._mounted = true`
- Ne doit JAMAIS être rappelé sans `unmount()` préalable

**Paramètres :**
- `container` : `HTMLElement` cible
- `ctx` : `{ hass, hseFetch, store }` injecté par le shell

### 2.2 `update_hass(hass)`

**Rôle :** recevoir la mise à jour de l'objet `hass`.

**Règles :**
- Met à jour uniquement `this._hass = hass`
- N'effectue aucun fetch
- Ne reconstruit jamais le DOM

### 2.3 `unmount()`

**Rôle :** nettoyer toutes les ressources.

**Règles :**
- `clearInterval` sur tous les timers
- `clearTimeout` sur tous les timeouts
- Annule tous les fetch via `AbortController`
- Pose `this._mounted = false`
- Ne laisse aucune fuite mémoire

---

## 3. Les 5 règles de rendering (R1 à R5)

### R1 — Séparation stricte montage / mise à jour
mount() → construit le DOM
update_hass() → met à jour this._hass uniquement
unmount() → nettoie tout

Le DOM n'est jamais reconstruit après `mount()`.

### R2 — Protection re-entrance

```javascript
async _fetchData() {
  if (this._fetching) return;
  this._fetching = true;
  try {
    const data = await hseFetch('/api/hse/...');
    if (!this._mounted) return;
    this._applyData(data);
  } finally {
    this._fetching = false;
  }
}
```

### R3 — Signature JSON avant render

```javascript
_applyData(data) {
  const sig = JSON.stringify(data);
  if (sig === this._lastSig) return;
  this._lastSig = sig;
  this._render(data);
}
```

### R4 — Zéro localStorage

Tout état persistant passe par `PATCH /api/hse/user_prefs`.
Aucune ligne `localStorage.setItem` / `localStorage.getItem` n'est tolérée.

### R5 — Skeleton systématique

Tout onglet affiche un skeleton loader pendant le fetch initial.
Le skeleton est posé dans `mount()` avant le premier fetch.

```javascript
mount(container) {
  container.innerHTML = `<div class="hse-skeleton skeleton-list"></div>`;
  this._fetch();
}
```

---

## 4. Règle supplémentaire — Pas de re-render complet

```javascript
// ❌ INTERDIT dans update_hass() et dans les callbacks de polling
container.innerHTML = buildHTML(data);

// ✅ OBLIGATOIRE
container.querySelector('.power-value').textContent = `${data.power} W`;
```

La reconstruction complète du DOM n'est autorisée que dans `mount()`.

---

## 5. Injection du token HA

Tous les appels HTTP passent par `hseFetch` injecté dans `ctx` :

```javascript
// hse.fetch.js
export function hseFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${window.__hseToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
}
```

`window.__hseToken` est positionné par le shell depuis `hass.auth.data.access_token`.

---

## 6. Structure type d'un fichier d'onglet

```javascript
export class MonOngletView {
  constructor() {
    this._mounted  = false;
    this._fetching = false;
    this._lastSig  = null;
    this._timer    = null;
    this._abortCtl = null;
    this._hass     = null;
    this._ctx      = null;
    this._root     = null;
  }

  mount(container, ctx) {
    this._ctx     = ctx;
    this._hass    = ctx.hass;
    this._root    = container;
    this._mounted = true;
    this._buildSkeleton();
    this._fetchData();
  }

  update_hass(hass) {
    this._hass = hass;
  }

  unmount() {
    this._mounted = false;
    if (this._timer)    clearInterval(this._timer);
    if (this._abortCtl) this._abortCtl.abort();
  }

  _buildSkeleton() {
    this._root.innerHTML = `<div class="hse-skeleton"></div>`;
  }

  async _fetchData() {
    if (this._fetching) return;
    this._fetching = true;
    this._abortCtl = new AbortController();
    try {
      const resp = await this._ctx.hseFetch('/api/hse/...', { signal: this._abortCtl.signal });
      if (!this._mounted) return;
      const data = await resp.json();
      this._applyData(data);
    } catch (e) {
      if (e.name !== 'AbortError') this._renderError(e);
    } finally {
      this._fetching = false;
    }
  }

  _applyData(data) {
    const sig = JSON.stringify(data);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._render(data);
  }

  _render(data) {
    // Première fois : construire le DOM complet
    // Ensuite : ne mettre à jour que les nœuds texte
  }

  _renderError(err) {
    this._root.innerHTML = `<p class="hse-error">Erreur : ${err.message}</p>`;
  }
}
```

---

## 7. États UX obligatoires

| État | Classe CSS | Déclencheur |
|---|---|---|
| Chargement initial | `.hse-skeleton` | `mount()` avant le premier fetch |
| Données disponibles | `.hse-loaded` | première réponse réussie |
| Erreur de chargement | `.hse-error` | exception catch sur fetch |
| Données vides | `.hse-empty` | réponse valide mais liste vide |

---

## 8. Checklist de revue par onglet (avant merge)

- [ ] `mount()` construit le DOM une seule fois
- [ ] `update_hass()` ne reconstruit pas le DOM
- [ ] `unmount()` annule tous les timers et fetch
- [ ] R2 : flag `_fetching` présent sur chaque fetch
- [ ] R3 : signature JSON vérifiée avant `_render()`
- [ ] R4 : zéro `localStorage` dans le fichier
- [ ] R5 : skeleton affiché pendant le fetch initial
- [ ] Tous les appels HTTP passent par `ctx.hseFetch`
- [ ] États vide et erreur designés
- [ ] `AbortController` utilisé et annulé dans `unmount()`