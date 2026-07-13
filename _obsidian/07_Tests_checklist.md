# 🧪 Tests navigateur — Checklist

> Tests à effectuer avec HA ouvert en auth locale (`http://homeassistant.local:8123` ou IP)
> L'IA ouvre le navigateur en mode contrôle pour exécuter ces tests.

## Prérequis
- [ ] HA démarré et accessible
- [ ] HSE V3 installé via HACS (ou copie manuelle dans `custom_components/hse/`)
- [ ] Long-Lived Token généré dans HA (Profil → Sécurité)

## Vague 1 — Tests à valider

### Onglet Aperçu (overview_view.js)
- [ ] Affiche la puissance totale live
- [ ] Affiche consommation : aujourd'hui / cette semaine / ce mois / cette année
- [ ] Top 5 consommateurs visibles
- [ ] By_room affiché si appareils assignés
- [ ] Polling se rafraîchit toutes les 30s (vérifier dans Network)
- [ ] En cas d'erreur API → message lisible (pas blanc)

### Onglet Configuration — Sous-onglet C (tarification)
- [ ] Les champs affichent les valeurs sauvegardées
- [ ] Mode `flat` / `hphc` bascule correctement
- [ ] Sauvegarde PUT persiste (rechargement page → valeurs conservées)
- [ ] Preview recalcule avec les nouvelles valeurs
- [ ] Aucune ancienne clé (`contract_type`, `price_ht`, etc.) dans le payload (inspecter Network)

### Onglet Coûts (costs_view.js)
- [ ] Tableau coûts chargé
- [ ] Tri par colonne fonctionnel
- [ ] Pagination si > N lignes
- [ ] Export CSV/JSON déclenché par bouton
- [ ] Polling 60s actif

### Onglet Détection (scan_view.js)
- [ ] Groupement par `integration_domain` visible
- [ ] Bouton "Sélection automatique intelligente" → appelle `triage/bulk` → 200 OK
- [ ] Capteurs sélectionnés marqués en vert

## Vague 2 — Tests à valider

### Onglet Diagnostic
- [ ] Score qualité affiché (0-150)
- [ ] Alertes listées si anomalies
- [ ] Statuts par capteur visibles

### Onglet Migration
- [ ] Wizard 3 étapes s'affiche
- [ ] Mapping V1→V3 proposé
- [ ] Rapport généré après apply

### Onglet Personnalisation
- [ ] Sélecteur thème fonctionnel
- [ ] Toggles persistés
- [ ] Preview en temps réel

## Tests transversaux
- [ ] Navigation entre les 8 onglets sans crash
- [ ] Rechargement page → onglet actif restauré
- [ ] Aucune erreur console au démarrage
- [ ] `/api/hse/ping` → 200 (vérifier que l'intégration est bien chargée)
