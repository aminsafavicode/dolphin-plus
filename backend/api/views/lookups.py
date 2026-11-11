from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from workflow.models import (
    LookupList,
    LookupItem,
    StaticChoiceSet,
    StaticChoiceItem,
)
from api.serializers import (
    LookupListSerializer,
    LookupItemSerializer,
    StaticChoiceSetSerializer,
    StaticChoiceItemSerializer,
)


# -------------------------------------------------------------
# Dynamic Lookup Lists (Hierarchical / Cascading)
# -------------------------------------------------------------
class LookupListCreateView(generics.ListCreateAPIView):
    queryset = LookupList.objects.all().prefetch_related('items__parent').order_by('id')
    serializer_class = LookupListSerializer
    permission_classes = [IsAuthenticated]


class LookupListDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LookupList.objects.all().prefetch_related('items__parent')
    serializer_class = LookupListSerializer
    permission_classes = [IsAuthenticated]


class LookupItemCreateView(generics.ListCreateAPIView):
    serializer_class = LookupItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LookupItem.objects.all().select_related('parent').order_by('order', 'id')
        lookup_list_id = self.request.query_params.get('lookup_list')
        if lookup_list_id:
            qs = qs.filter(lookup_list_id=lookup_list_id)
        return qs


class LookupItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LookupItem.objects.all().select_related('parent')
    serializer_class = LookupItemSerializer
    permission_classes = [IsAuthenticated]


# -------------------------------------------------------------
# Static Choice Sets
# -------------------------------------------------------------
class StaticChoiceSetListCreateView(generics.ListCreateAPIView):
    queryset = StaticChoiceSet.objects.all().prefetch_related('items').order_by('id')
    serializer_class = StaticChoiceSetSerializer
    permission_classes = [IsAuthenticated]


class StaticChoiceSetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StaticChoiceSet.objects.all().prefetch_related('items')
    serializer_class = StaticChoiceSetSerializer
    permission_classes = [IsAuthenticated]


class StaticChoiceItemListCreateView(generics.ListCreateAPIView):
    serializer_class = StaticChoiceItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = StaticChoiceItem.objects.all().order_by('order', 'id')
        choice_set_id = self.request.query_params.get('choice_set')
        if choice_set_id:
            qs = qs.filter(choice_set_id=choice_set_id)
        return qs


class StaticChoiceItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StaticChoiceItem.objects.all()
    serializer_class = StaticChoiceItemSerializer
    permission_classes = [IsAuthenticated]
