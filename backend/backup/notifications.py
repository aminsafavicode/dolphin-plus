"""
Notification and Alerting Services for Dolphin Flow Backup Subsystem.

Dispatches real-time alerts and persisted notifications to administrators and
technical staff when backup, restore, or replication operations fail.
"""

from __future__ import annotations

import logging
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


def _get_admin_recipients():
    """Retrieve all active administrative staff users."""
    user_model = get_user_model()
    return list(user_model.objects.filter(is_active=True, is_staff=True))


def notify_backup_failure(backup, error_message: str):
    """Notify administrators about a failed backup creation task."""
    try:
        from workflow.models import Notification
        from workflow.notification_services import NotificationService
    except ImportError:
        logger.warning("Workflow notification system unavailable.")
        return

    admins = _get_admin_recipients()
    if not admins:
        logger.info("No active staff administrators found for backup alert.")
        return

    title = "خطا در فرآیند پشتیبان‌گیری"
    msg = (
        f"پشتیبان‌گیری شماره {backup.pk} ({backup.filename}) با خطا متوقف شد:\n"
        f"{error_message}"
    )

    for admin_user in admins:
        try:
            NotificationService.create(
                recipient=admin_user,
                notification_type=Notification.NotificationType.BACKUP_ALERT,
                title=title,
                message=msg,
            )
        except Exception as exc:
            logger.warning("Failed to send backup failure alert to user %s: %s", admin_user.pk, exc)


def notify_restore_failure(restore, error_message: str):
    """Notify administrators about a failed restore operation (CRITICAL)."""
    try:
        from workflow.models import Notification
        from workflow.notification_services import NotificationService
    except ImportError:
        logger.warning("Workflow notification system unavailable.")
        return

    admins = _get_admin_recipients()
    if not admins:
        return

    title = "هشدار بحرانی: شکست در بازیابی پایگاه داده"
    msg = (
        f"عملیات بازیابی شماره {restore.pk} برای پشتیبان "
        f"{restore.backup.filename if restore.backup else 'نامشخص'} با خطا متوقف گردید:\n"
        f"{error_message}"
    )

    for admin_user in admins:
        try:
            NotificationService.create(
                recipient=admin_user,
                notification_type=Notification.NotificationType.BACKUP_ALERT,
                title=title,
                message=msg,
            )
        except Exception as exc:
            logger.warning("Failed to send restore alert to user %s: %s", admin_user.pk, exc)


def notify_network_sync_failure(backup, error_message: str):
    """Notify administrators about a failure replicating an archive to remote storage."""
    try:
        from workflow.models import Notification
        from workflow.notification_services import NotificationService
    except ImportError:
        return

    admins = _get_admin_recipients()
    if not admins:
        return

    dest_name = backup.network_storage.name if backup.network_storage else "مقصد شبکه"
    title = f"خطا در همگام‌سازی شبکه با {dest_name}"
    msg = (
        f"ارسال پشتیبان {backup.filename} به مقصد {dest_name} ناموفق بود:\n"
        f"{error_message}"
    )

    for admin_user in admins:
        try:
            NotificationService.create(
                recipient=admin_user,
                notification_type=Notification.NotificationType.BACKUP_ALERT,
                title=title,
                message=msg,
            )
        except Exception as exc:
            logger.warning("Failed to send network sync alert: %s", exc)
