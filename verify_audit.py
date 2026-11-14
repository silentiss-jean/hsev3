#!/usr/bin/env python3
"""Vérification des constats d'audit HSE-01 à HSE-16 sur le code actuel."""

import subprocess
import sys

def check_hse01():
    """HSE-01: Les horaires HP/HC sont perdus à la relecture"""
    print("=== HSE-01: Persistance HP/HC ===")
    with open("custom_components/hse/storage/manager.py") as f:
        content = f.read()
    defaults_keys = []
    in_defaults = False
    for line in content.split('\n'):
        if '_SETTINGS_DEFAULTS' in line and '=' in line:
            in_defaults = True
        if in_defaults:
            if '}' in line and not '{' in line:
                in_defaults = False
            for key in ['price_hp_ht_kwh', 'price_hc_ht_kwh', 'hc_start', 'hc_end']:
                if key in line:
                    defaults_keys.append(key)
    print(f"  Clés HP/HC dans _SETTINGS_DEFAULTS: {defaults_keys}")
    
    with open("custom_components/hse/api/views/settings.py") as f:
        content = f.read()
    api_keys = []
    for key in ['price_hp_ht_kwh', 'price_hc_ht_kwh', 'hc_start', 'hc_end']:
        if key in content:
            api_keys.append(key)
    print(f"  Clés HP/HC dans _SETTINGS_KEYS (API): {api_keys}")
    
    if set(defaults_keys) == set(api_keys):
        print("  ✅ CORRIGÉ: Clés cohérentes entre API et stockage")
        return True
    else:
        print("  ❌ NON CORRIGÉ: API accepte des clés que le stockage ignore")
        return False

def check_hse02():
    """HSE-02: Clé inexistante dans le calcul HT HP/HC"""
    print("\n=== HSE-02: Clé HT dans costs.py ===")
    with open("custom_components/hse/api/views/costs.py") as f:
        content = f.read()
    if 'cost_hp["ht"]' in content or 'cost_hc["ht"]' in content:
        print("  ❌ NON CORRIGÉ: Accès à cost_hp['ht'] / cost_hc['ht']")
        return False
    if 'cost_hp["cost_ht_eur"]' in content and 'cost_hc["cost_ht_eur"]' in content:
        print("  ✅ CORRIGÉ: Accès à cost_hp['cost_ht_eur'] / cost_hc['cost_ht_eur']")
        return True
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse03():
    """HSE-03: Double comptage possible long terme/court terme"""
    print("\n=== HSE-03: Double comptage long/court terme ===")
    with open("custom_components/hse/engine/period_stats.py") as f:
        content = f.read()
    if "round(energy + energy2, 3)" in content and "stats_long_term+short_term" in content:
        print("  ❌ NON CORRIGÉ: Addition sans déduplication")
        return False
    if "stats_short_term" in content and "quality2 == \"ok\"" in content:
        # Check if it uses short-term instead of adding
        idx = content.find("quality2 == \"ok\"")
        if idx >= 0:
            section = content[idx:idx+200]
            if '"kwh": energy2' in section and '"method": "stats_short_term"' in section:
                print("  ✅ CORRIGÉ: Utilise court terme au lieu d'additionner")
                return True
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse04():
    """HSE-04: Le split cumulatif HP/HC utilise encore l'UTC"""
    print("\n=== HSE-04: Split HP/HC en UTC ===")
    with open("custom_components/hse/engine/period_stats.py") as f:
        content = f.read()
    if "datetime.fromtimestamp(..., tz=timezone.utc)" in content and "dt.hour" in content:
        # Check if it's in the HP/HC split function
        idx = content.find("_energy_hphc_split_sync")
        if idx >= 0:
            section = content[idx:idx+500]
            if "datetime.fromtimestamp" in section and "tz=timezone.utc" in section:
                print("  ❌ NON CORRIGÉ: Comparaison heure UTC sans conversion")
                return False
    if "is_hc_hour" in content and "_is_hc" in content:
        print("  ✅ CORRIGÉ: Utilisation du helper is_hc_hour avec fuseau local")
        return True
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse05():
    """HSE-05: Bornes du split HP/HC différentes du calcul standard"""
    print("\n=== HSE-05: Bornes split HP/HC ===")
    with open("custom_components/hse/engine/period_stats.py") as f:
        content = f.read()
    # Check cumulative branch for ref_before and exclusive end
    idx = content.find("if is_cumulative:")
    if idx >= 0:
        section = content[idx:idx+500]
        if "ref_before" in section and "start_ts < ?" in section and "prev_sum = ref_before" in section:
            print("  ✅ CORRIGÉ: Référence avant période et borne exclusive")
            return True
    if "prev_sum=None" in content and "_energy_hphc_split_sync" in content:
        idx = content.find("prev_sum = None")
        if idx >= 0:
            # Check if it's in the HP/HC split function
            section = content[max(0,idx-200):idx+100]
            if "is_cumulative" in section:
                print("  ❌ NON CORRIGÉ: prev_sum=None sans référence antérieure")
                return False
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse06():
    """HSE-06: Fallback recorder inaccessible dans async_energy_detail"""
    print("\n=== HSE-06: Fallback recorder ===")
    with open("custom_components/hse/engine/period_stats.py") as f:
        content = f.read()
    if "_energy_from_states_fallback" in content:
        # Check if it's called for entities not in all_stats
        idx = content.find("else:")
        if idx >= 0:
            section = content[idx:idx+300]
            if "_energy_from_states_fallback" in section:
                print("  ✅ CORRIGÉ: Fallback sur table states pour entités sans stats")
                return True
    if "if eid in all_stats" in content and "continue" in content:
        print("  ❌ NON CORRIGÉ: Continue empêche le fallback")
        return False
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse07():
    """HSE-07: Fuseau local prévu mais non transmis"""
    print("\n=== HSE-07: Fuseau non transmis ===")
    with open("custom_components/hse/engine/period_stats.py") as f:
        content = f.read()
    if "window_for_period" in content:
        lines = content.split('\n')
        all_ok = True
        for i, line in enumerate(lines):
            if "window_for_period(" in line and "tz=" not in line:
                # Check if it's in a function that has access to dt_util
                print(f"  ❌ NON CORRIGÉ: Appel sans fuseau à la ligne {i+1}: {line.strip()}")
                all_ok = False
        if all_ok:
            print("  ✅ CORRIGÉ: Fuseau transmis aux appels window_for_period")
            return True
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse08():
    """HSE-08: Abonnement incohérent entre écrans"""
    print("\n=== HSE-08: Abonnement incohérent ===")
    with open("custom_components/hse/api/views/costs.py") as f:
        costs_content = f.read()
    with open("custom_components/hse/api/views/overview.py") as f:
        overview_content = f.read()
    
    costs_has_prorata = "subscription_eur_month" in costs_content and "/30" in costs_content
    overview_has_prorata = "subscription_eur_month" in overview_content and ("/30" in overview_content or "*7" in overview_content or "*12" in overview_content)
    
    if costs_has_prorata and not overview_has_prorata:
        print("  ❌ NON CORRIGÉ: Prorata dans costs mais pas dans overview")
        return False
    if costs_has_prorata and overview_has_prorata:
        print("  ✅ CORRIGÉ: Prorata cohérent dans les deux écrans")
        return True
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse09():
    """HSE-09: Historique global sans sélection anti-doublons et coût HP/HC incomplet"""
    print("\n=== HSE-09: Historique sans anti-doublons ===")
    with open("custom_components/hse/engine/analytics.py") as f:
        content = f.read()
    if "plan_sources" in content and "async_history_12months" in content:
        idx = content.find("async_history_12months")
        if idx >= 0:
            section = content[idx:idx+800]
            if "plan_sources" in section and "energy_sources" in section:
                print("  ✅ CORRIGÉ: plan_sources utilisé dans async_history_12months")
                return True
    print("  ❌ NON CORRIGÉ: plan_sources non utilisé dans l'historique")
    return False

def check_hse10():
    """HSE-10: Actif et sélectionné ne pilotent pas le même état"""
    print("\n=== HSE-10: Actif vs sélectionné ===")
    with open("custom_components/hse/api/views/catalogue.py") as f:
        content = f.read()
    if "enrichment.active" in content and "triage.policy" in content:
        # Check if they're unified or if there's a clear policy
        if "policy == \"selected\"" in content and "enrichment[\"active\"]" in content:
            print("  ❌ NON CORRIGÉ: Deux notions d'activation coexistent")
            return False
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse11():
    """HSE-11: Recherche catalogue envoyée mais ignorée"""
    print("\n=== HSE-11: Recherche catalogue ignorée ===")
    with open("custom_components/hse/api/views/catalogue.py") as f:
        content = f.read()
    if "def get" in content:
        idx = content.find("async def get")
        if idx >= 0:
            section = content[idx:idx+500]
            if "request.query.get(\"q\"" in section or "request.query.get('q')" in section:
                print("  ✅ CORRIGÉ: Paramètre q lu dans GET catalogue")
                return True
    print("  ❌ NON CORRIGÉ: Paramètre q non lu dans GET catalogue")
    return False

def check_hse12():
    """HSE-12: Un type supprimé peut réapparaître"""
    print("\n=== HSE-12: Type supprimé réapparaît ===")
    with open("custom_components/hse/api/views/meta.py") as f:
        content = f.read()
    if "delete_type" in content:
        if "assignment" in content.lower() and "delete" in content.lower():
            # Check if assignments are cleaned
            idx = content.find("delete_type")
            if idx >= 0:
                section = content[idx:idx+500]
                if "assignment" in section:
                    print("  ✅ CORRIGÉ: Nettoyage des assignments à la suppression")
                    return True
    print("  ❌ NON CORRIGÉ: Suppression sans nettoyage des assignments")
    return False

def check_hse13():
    """HSE-13: Nettoyage de migration incohérent avec le mapping"""
    print("\n=== HSE-13: Nettoyage migration ===")
    with open("custom_components/hse/api/views/migration.py") as f:
        content = f.read()
    if "cleanup_legacy" in content:
        idx = content.find("if cleanup_legacy:")
        if idx >= 0:
            section = content[idx:idx+200]
            if "items.pop(key, None)" in section:
                print("  ❌ NON CORRIGÉ: Supprime la cible migrée (pop key après migration)")
                return False
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse14():
    """HSE-14: Écran coûts pouvant rester bloqué après erreur"""
    print("\n=== HSE-14: Écran coûts bloqué ===")
    with open("custom_components/hse/web_static/panel/features/costs/costs_view.js") as f:
        content = f.read()
    if "_renderError" in content and "_els" in content:
        if "this._els = " in content or "_els = " in content or "this._els = {}" in content:
            print("  ✅ CORRIGÉ: _els réinitialisé après erreur")
            return True
        if "_renderError" in content:
            idx = content.find("_renderError")
            section = content[idx:idx+300]
            if "this._el.innerHTML" in section and "this._els" not in section:
                print("  ❌ NON CORRIGÉ: _els non réinitialisé après erreur")
                return False
    print("  ? Vérification manuelle nécessaire")
    return None

def check_hse15():
    """HSE-15: Reconnexion du panel susceptible de dupliquer les iframes"""
    print("\n=== HSE-15: Duplication iframes ===")
    with open("custom_components/hse/web_static/panel/hse_panel.js") as f:
        content = f.read()
    if "disconnectedCallback" in content and "_mounted = false" in content:
        if "iframe" in content and ("remove" in content or "this._iframe" in content):
            print("  ✅ CORRIGÉ: Iframe retirée au démontage")
            return True
    print("  ❌ NON CORRIGÉ: Iframe non retirée au démontage")
    return False

def check_hse16():
    """HSE-16: Contrat incomplet pour les cartes YAML"""
    print("\n=== HSE-16: Contrat cartes YAML ===")
    with open("custom_components/hse/api/views/catalogue.py") as f:
        content = f.read()
    if '"unit"' in content or "'unit'" in content:
        # Check if unit is returned in catalogue items
        idx = content.find("filtered.append")
        if idx >= 0:
            section = content[idx:idx+500]
            if '"unit"' in section or "'unit'" in section:
                print("  ✅ CORRIGÉ: unit retourné dans l'API catalogue")
                return True
    # Check frontend
    with open("custom_components/hse/web_static/panel/features/cards/cards_view.js") as f:
        fe_content = f.read()
    if "i.source.unit" in fe_content:
        print("  ❌ NON CORRIGÉ: Frontend cherche i.source.unit absent du catalogue")
        return False
    print("  ? Vérification manuelle nécessaire")
    return None

def main():
    print("=" * 60)
    print("VÉRIFICATION DES CONSTATS D'AUDIT HSE V3")
    print("=" * 60)
    
    checks = [
        ("HSE-01", check_hse01),
        ("HSE-02", check_hse02),
        ("HSE-03", check_hse03),
        ("HSE-04", check_hse04),
        ("HSE-05", check_hse05),
        ("HSE-06", check_hse06),
        ("HSE-07", check_hse07),
        ("HSE-08", check_hse08),
        ("HSE-09", check_hse09),
        ("HSE-10", check_hse10),
        ("HSE-11", check_hse11),
        ("HSE-12", check_hse12),
        ("HSE-13", check_hse13),
        ("HSE-14", check_hse14),
        ("HSE-15", check_hse15),
        ("HSE-16", check_hse16),
    ]
    
    results = {}
    for name, check_fn in checks:
        try:
            results[name] = check_fn()
        except Exception as e:
            print(f"  ERREUR: {e}")
            results[name] = None
    
    print("\n" + "=" * 60)
    print("RÉSUMÉ")
    print("=" * 60)
    fixed = sum(1 for v in results.values() if v is True)
    not_fixed = sum(1 for v in results.values() if v is False)
    unknown = sum(1 for v in results.values() if v is None)
    
    for name, result in results.items():
        status = "✅" if result is True else "❌" if result is False else "❓"
        print(f"  {status} {name}")
    
    print(f"\nCorrigés: {fixed}/{len(checks)}")
    print(f"Non corrigés: {not_fixed}/{len(checks)}")
    print(f"À vérifier: {unknown}/{len(checks)}")

if __name__ == "__main__":
    main()