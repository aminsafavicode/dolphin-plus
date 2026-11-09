"""
Backup and Disaster Recovery Workspace Views.

Provides a dedicated, executive visual dashboard inside Dolphin Flow
for one-click backups, storage capacity monitoring, archive imports,
retention tuning, and quick restoration.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from django.conf import settings
from django.contrib import messages
from django.db import connection
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from .models import (
    Backup,
    BackupRetentionPolicy,
    BackupSchedule,
    BackupStorageDestination,
    Restore,
    generate_backup_filename,
)
from .storage import LocalBackupStorage, NetworkBackupStorage

logger = logging.getLogger(__name__)


def backup_workspace(request):
    """
    Dedicated Executive Workspace for Backup & Disaster Recovery.
    Accessible directly from the main administrative dashboard.
    """
    if not request.user.is_staff:
        messages.error(request, "دسترسی به میز کار پشتیبان‌گیری نیازمند دسترسی مدیریت (Staff) است.")
        return redirect("dolphin_admin:index")

    # Handle POST Operations
    if request.method == "POST":
        action = request.POST.get("action")

        if action == "create_backup":
            includes_media = request.POST.get("includes_media") in ("on", "1", "true")
            destination = request.POST.get("destination", Backup.Destination.LOCAL)
            if destination not in dict(Backup.Destination.choices):
                destination = Backup.Destination.LOCAL

            network_storage_id = request.POST.get("network_storage_id") or None
            if network_storage_id:
                try:
                    network_storage_id = int(network_storage_id)
                except (ValueError, TypeError):
                    network_storage_id = None

            is_encrypted = request.POST.get("is_encrypted") in ("on", "1", "true")

            backup = Backup.objects.create(
                filename=generate_backup_filename(),
                includes_media=includes_media,
                destination=destination,
                network_storage_id=network_storage_id if destination in (
                    Backup.Destination.NETWORK,
                    Backup.Destination.BOTH,
                ) else None,
                network_status=(
                    Backup.NetworkStatus.PENDING
                    if destination in (Backup.Destination.NETWORK, Backup.Destination.BOTH)
                    else Backup.NetworkStatus.NOT_REQUESTED
                ),
                created_by=request.user,
                status=Backup.Status.QUEUED,
                is_encrypted=is_encrypted,
            )

            # Attempt Celery async dispatch, fallback to sync service execution
            try:
                from .tasks import run_backup
                run_backup.delay(backup.pk)
                messages.success(
                    request,
                    f"عملیات پشتیبان‌گیری #{backup.pk} ({backup.filename}) در پس‌زمینه آغاز شد."
                )
            except Exception:
                from .services import BackupService
                try:
                    BackupService(backup).run()
                    backup.refresh_from_db()
                    if backup.status == Backup.Status.SUCCESS:
                        messages.success(
                            request,
                            f"پشتیبان‌گیری کامل با موفقیت انجام شد ({backup.filename})."
                        )
                    else:
                        messages.error(
                            request,
                            f"پشتیبان‌گیری با خطا مواجه شد: {backup.error_message}"
                        )
                except Exception as exc:
                    messages.error(request, f"خطای پیش‌بینی نشده در فرآیند: {exc}")

            return redirect("backup_workspace")

        elif action == "import_backup":
            uploaded_file = request.FILES.get("backup_file")
            if not uploaded_file:
                messages.error(request, "لطفاً یک فایل معتبر با پسوند .dfbak انتخاب کنید.")
                return redirect("backup_workspace")

            from .import_service import BackupImportService
            try:
                result = BackupImportService().import_backup(
                    uploaded_file,
                    uploaded_file.name,
                    user=request.user,
                )
                messages.success(
                    request,
                    f"بایگانی '{result['filename']}' با موفقیت بارگذاری، اعتبارسنجی و ثبت گردید."
                )
            except Exception as exc:
                messages.error(request, f"خطا در بارگذاری و اعتبارسنجی فایل: {exc}")

            return redirect("backup_workspace")

        elif action == "update_retention":
            try:
                policy = BackupRetentionPolicy.get_solo()
                policy.keep_last = max(0, int(request.POST.get("keep_last", 10)))
                policy.keep_days = max(0, int(request.POST.get("keep_days", 30)))
                policy.enabled = request.POST.get("enabled") in ("on", "1", "true")
                policy.save()
                messages.success(request, "سیاست نگهداری و پاک‌سازی خودکار با موفقیت به‌روزرسانی شد.")
            except Exception as exc:
                messages.error(request, f"خطا در ثبت سیاست نگهداری: {exc}")

            return redirect("backup_workspace")

        elif action == "delete_backup":
            backup_id = request.POST.get("backup_id")
            backup = get_object_or_404(Backup, pk=backup_id)
            try:
                if backup.storage_path:
                    LocalBackupStorage().delete(backup.storage_path)
                if backup.network_storage_path and backup.network_storage:
                    NetworkBackupStorage(backup.network_storage).delete(backup.network_storage_path)
                filename = backup.filename
                backup.delete()
                messages.success(request, f"نسخه پشتیبان {filename} با موفقیت حذف گردید.")
            except Exception as exc:
                messages.error(request, f"خطا در حذف فایل پشتیبان: {exc}")

            return redirect("backup_workspace")

    # Live Database and Storage Capacity Calculations
    db_size = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_database_size(current_database());")
            row = cursor.fetchone()
            if row:
                db_size = row[0]
    except Exception as exc:
        logger.warning("Could not calculate database size: %s", exc)

    media_size = 0
    try:
        media_path = Path(settings.MEDIA_ROOT)
        if media_path.exists():
            for f in media_path.rglob("*"):
                if f.is_file():
                    try:
                        media_size += f.stat().st_size
                    except OSError:
                        pass
    except Exception as exc:
        logger.warning("Could not calculate media size: %s", exc)

    target_dir = Path(getattr(settings, "BACKUP_ROOT", "/tmp"))
    target_dir.mkdir(parents=True, exist_ok=True)
    disk = shutil.disk_usage(target_dir)
    disk_total = disk.total
    disk_used = disk.used
    disk_free = disk.free
    disk_free_percent = round((disk_free / disk_total) * 100, 1) if disk_total else 0
    disk_used_percent = round((disk_used / disk_total) * 100, 1) if disk_total else 0

    # Querysets for the dashboard
    backups = list(
        Backup.objects.select_related("schedule", "network_storage", "created_by")
        .order_by("-created_at")[:25]
    )
    successful_backups_count = Backup.objects.filter(status=Backup.Status.SUCCESS).count()
    failed_backups_count = Backup.objects.filter(status=Backup.Status.FAILED).count()
    running_backups_count = Backup.objects.filter(status__in=[Backup.Status.QUEUED, Backup.Status.RUNNING]).count()
    
    total_backups_size = sum(b.size or 0 for b in backups if b.status == Backup.Status.SUCCESS)
    local_backups_count = Backup.objects.filter(
        destination__in=[Backup.Destination.LOCAL, Backup.Destination.BOTH]
    ).count()
    network_backups_count = Backup.objects.filter(
        destination__in=[Backup.Destination.NETWORK, Backup.Destination.BOTH]
    ).count()
    encrypted_backups_count = Backup.objects.filter(is_encrypted=True).count()

    retention_policy = BackupRetentionPolicy.get_solo()
    destinations = list(BackupStorageDestination.objects.all().order_by("name"))
    schedules = list(BackupSchedule.objects.select_related("network_storage").all().order_by("name"))
    recent_restores = list(
        Restore.objects.select_related("backup", "requested_by").order_by("-created_at")[:5]
    )

    encryption_enabled = getattr(settings, "BACKUP_ENCRYPT_ARCHIVES", False)

    context = {
        "title": "میز کار پشتیبان‌گیری و بازیابی اطلاعات (Backup & Disaster Recovery Workspace)",
        "db_size": db_size,
        "media_size": media_size,
        "disk_total": disk_total,
        "disk_used": disk_used,
        "disk_free": disk_free,
        "disk_free_percent": disk_free_percent,
        "disk_used_percent": disk_used_percent,
        "backups": backups,
        "successful_backups_count": successful_backups_count,
        "failed_backups_count": failed_backups_count,
        "running_backups_count": running_backups_count,
        "total_backups_size": total_backups_size,
        "local_backups_count": local_backups_count,
        "network_backups_count": network_backups_count,
        "encrypted_backups_count": encrypted_backups_count,
        "retention_policy": retention_policy,
        "destinations": destinations,
        "schedules": schedules,
        "recent_restores": recent_restores,
        "encryption_enabled": encryption_enabled,
    }

    return render(request, "admin/backup/backup_workspace.html", context)
