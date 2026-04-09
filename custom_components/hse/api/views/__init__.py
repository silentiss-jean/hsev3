"""
HSE V3 — api/views package
Exports de toutes les views pour enregistrement dans __init__.py principal.
"""
from .ping import HsePingView
from .frontend_manifest import HseFrontendManifestView
from .overview import HseOverviewView
from .diagnostic import HseDiagnosticView
from .catalogue import HseCatalogueView, HseCatalogueTriageView, HseCatalogueTriageBulkView, HseCatalogueRefreshView
from .scan import HseScanView
from .meta import HseMetaView, HseMetaSyncPreviewView, HseMetaSyncApplyView
from .settings import HseSettingsPricingView
from .costs import HseCostsView, HseHistoryView, HseExportView
from .migration import HseMigrationExportView, HseMigrationApplyView
from .user_prefs import HseUserPrefsView

__all__ = [
    "HsePingView",
    "HseFrontendManifestView",
    "HseOverviewView",
    "HseDiagnosticView",
    "HseCatalogueView",
    "HseCatalogueTriageView",
    "HseCatalogueTriageBulkView",
    "HseCatalogueRefreshView",
    "HseScanView",
    "HseMetaView",
    "HseMetaSyncPreviewView",
    "HseMetaSyncApplyView",
    "HseSettingsPricingView",
    "HseCostsView",
    "HseHistoryView",
    "HseExportView",
    "HseMigrationExportView",
    "HseMigrationApplyView",
    "HseUserPrefsView",
]
