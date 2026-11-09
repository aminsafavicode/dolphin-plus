import shutil
from pathlib import Path
from django.conf import settings
from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.contrib.auth import get_user_model

from backup.models import (
    Backup,
    BackupSchedule,
    BackupStorageDestination,
    BackupRetentionPolicy,
    generate_backup_filename,
)
from backup.storage import LocalBackupStorage, NetworkBackupStorage
from api.serializers import (
    BackupSerializer,
    BackupScheduleSerializer,
    BackupStorageDestinationSerializer,
)

User = get_user_model()


class BackupStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        backups = Backup.objects.all().order_by('-created_at')[:20]
        schedules = BackupSchedule.objects.all().order_by('id')
        destinations = BackupStorageDestination.objects.all().order_by('id')
        retention = BackupRetentionPolicy.get_solo()

        # Database size
        pg_size_bytes = 0
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_database_size(current_database());")
                row = cursor.fetchone()
                if row:
                    pg_size_bytes = row[0]
        except Exception:
            pass

        # Media size
        media_size_bytes = 0
        try:
            media_path = Path(settings.MEDIA_ROOT)
            if media_path.exists():
                for f in media_path.rglob("*"):
                    if f.is_file():
                        try:
                            media_size_bytes += f.stat().st_size
                        except OSError:
                            pass
        except Exception:
            pass

        # Disk usage
        total, used, free = shutil.disk_usage(settings.BASE_DIR)
        disk_total_gb = round(total / (1024 ** 3), 1)
        disk_used_gb = round(used / (1024 ** 3), 1)
        disk_free_gb = round(free / (1024 ** 3), 1)
        disk_usage_pct = round((used / total) * 100, 1)

        return Response({
            'backups': BackupSerializer(backups, many=True).data,
            'schedules': BackupScheduleSerializer(schedules, many=True).data,
            'destinations': BackupStorageDestinationSerializer(destinations, many=True).data,
            'retention': {
                'keep_last': retention.keep_last,
                'keep_days': retention.keep_days,
                'enabled': retention.enabled,
            },
            'disk_metrics': {
                'total_gb': disk_total_gb,
                'used_gb': disk_used_gb,
                'free_gb': disk_free_gb,
                'usage_pct': disk_usage_pct,
                'pg_size_mb': round(pg_size_bytes / (1024 ** 2), 2),
                'media_size_mb': round(media_size_bytes / (1024 ** 2), 2),
            }
        })


class BackupTriggerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        includes_media = request.data.get('includes_media', False)
        is_encrypted = request.data.get('is_encrypted', False)

        user = request.user if request.user.is_authenticated else User.objects.first()

        backup = Backup.objects.create(
            filename=generate_backup_filename(),
            includes_media=includes_media,
            destination=Backup.Destination.LOCAL,
            created_by=user,
            status=Backup.Status.QUEUED,
            is_encrypted=is_encrypted,
        )

        # Execute backup synchronously or through Celery
        try:
            from backup.tasks import run_backup
            run_backup.delay(backup.pk)
        except Exception:
            from backup.services import BackupService
            BackupService(backup).run()
            backup.refresh_from_db()

        return Response({
            'id': backup.id,
            'filename': backup.filename,
            'status': backup.status,
            'message': f'عملیات پشتیبان‌گیری #{backup.id} آغاز شد.'
        }, status=status.HTTP_201_CREATED)


class BackupDeleteView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, backup_id):
        backup = get_object_or_404(Backup, pk=backup_id)
        if backup.storage_path:
            LocalBackupStorage().delete(backup.storage_path)
        if backup.network_storage_path and backup.network_storage:
            NetworkBackupStorage(backup.network_storage).delete(backup.network_storage_path)

        filename = backup.filename
        backup.delete()
        return Response({'message': f'نسخه پشتیبان {filename} با موفقیت حذف شد.'})
