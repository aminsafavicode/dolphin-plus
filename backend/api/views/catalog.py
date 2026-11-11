from django.db import transaction
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from workflow.models import DeviceType, DeviceModel, Device, DeviceIdentifier
from api.serializers import (
    DeviceTypeSerializer,
    DeviceModelSerializer,
    DeviceSerializer,
    DeviceIdentifierSerializer,
)


class DeviceTypeListCreateView(generics.ListCreateAPIView):
    queryset = DeviceType.objects.all().order_by('id')
    serializer_class = DeviceTypeSerializer
    permission_classes = [IsAuthenticated]


class DeviceTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DeviceType.objects.all()
    serializer_class = DeviceTypeSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.models.exists():
            raise ValidationError({
                'detail': 'امکان حذف این دسته‌بندی وجود ندارد زیرا مدل‌های وابسته به آن در کاتالوگ تعریف شده‌اند.'
            })
        instance.delete()


class DeviceModelListCreateView(generics.ListCreateAPIView):
    queryset = DeviceModel.objects.all().select_related('device_type').order_by('id')
    serializer_class = DeviceModelSerializer
    permission_classes = [IsAuthenticated]


class DeviceModelDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DeviceModel.objects.all().select_related('device_type')
    serializer_class = DeviceModelSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.devices.exists():
            raise ValidationError({
                'detail': 'امکان حذف این مدل وجود ندارد زیرا دستگاه‌های فیزیکی وابسته به آن در سیستم ثبت شده‌اند.'
            })
        instance.delete()


class DeviceListCreateView(generics.ListCreateAPIView):
    queryset = Device.objects.all().select_related('device_model', 'device_model__device_type').prefetch_related('identifiers').order_by('-id')
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Device.objects.all().select_related('device_model', 'device_model__device_type').prefetch_related('identifiers')
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.workflow_instances.exists():
            raise ValidationError({
                'detail': 'امکان حذف این دستگاه به دلیل ارتباط با پرونده‌های جاری در گردش کار وجود ندارد.'
            })
        with transaction.atomic():
            instance.identifiers.all().delete()
            instance.delete()


class DeviceIdentifierListCreateView(generics.ListCreateAPIView):
    serializer_class = DeviceIdentifierSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DeviceIdentifier.objects.all().order_by('id')
        device_id = self.request.query_params.get('device')
        if device_id:
            qs = qs.filter(device_id=device_id)
        return qs


class DeviceIdentifierDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DeviceIdentifier.objects.all()
    serializer_class = DeviceIdentifierSerializer
    permission_classes = [IsAuthenticated]
