from .admin import (
    ADMIN_CATEGORIES,
    build_admin_structure,
)
from .branding_models import SystemBranding


def dolphin_flow_admin_context(request):
    kpis = {
        "workflows_count": 0,
        "forms_count": 0,
        "repairs_count": 0,
        "users_count": 0,
        "devices_count": 0,
        "backups_count": 0,
    }
    if request.path.startswith("/djangoadmin/") or request.path.startswith("/admin/"):
        try:
            from workflow.models import Workflow, FormDefinition, Device
            from repairs.models import RepairDevice
            from accounts.models import User
            from backup.models import Backup
            kpis["workflows_count"] = Workflow.objects.count()
            kpis["forms_count"] = FormDefinition.objects.count()
            kpis["repairs_count"] = RepairDevice.objects.count()
            kpis["users_count"] = User.objects.filter(is_active=True).count()
            kpis["devices_count"] = Device.objects.count()
            kpis["backups_count"] = Backup.objects.filter(status=Backup.Status.SUCCESS).count()
        except Exception:
            pass

    return {
        "admin_categories": ADMIN_CATEGORIES,
        "admin_structure": build_admin_structure(request),
        "system_branding": SystemBranding.get_current(),
        "admin_kpis": kpis,
    }
