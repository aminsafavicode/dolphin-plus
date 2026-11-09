from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from accounts.models import Job
from workflow.models import WorkflowMembership, Workflow
from api.serializers import (
    UserSerializer,
    GroupSerializer,
    JobSerializer,
    WorkflowMembershipSerializer,
)

User = get_user_model()


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().select_related('job').prefetch_related('groups', 'workflow_memberships__workflow').order_by('id')
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all().select_related('job').prefetch_related('groups', 'workflow_memberships__workflow')
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def perform_destroy(self, instance):
        if instance.is_superuser and User.objects.filter(is_superuser=True).count() <= 1:
            raise serializers.ValidationError("امکان حذف تنها مدیر ارشد سامانه وجود ندارد.")
        instance.delete()


class UserSetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        new_password = request.data.get('password')
        if not new_password:
            return Response({'error': 'وارد کردن رمز عبور جدید الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': f'رمز عبور کاربر {user.username} با موفقیت به‌روزرسانی شد.'})


class JobListCreateView(generics.ListCreateAPIView):
    queryset = Job.objects.all().prefetch_related('users').order_by('name')
    serializer_class = JobSerializer
    permission_classes = [AllowAny]


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    permission_classes = [AllowAny]


class GroupListCreateView(generics.ListCreateAPIView):
    queryset = Group.objects.all().prefetch_related('user_set').order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [AllowAny]


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [AllowAny]


class WorkflowMembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkflowMembershipSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = WorkflowMembership.objects.all().select_related('workflow', 'user').order_by('id')
        user_id = self.request.query_params.get('user_id')
        workflow_id = self.request.query_params.get('workflow_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if workflow_id:
            qs = qs.filter(workflow_id=workflow_id)
        return qs

    def create(self, request, *args, **kwargs):
        workflow_id = request.data.get('workflow')
        user_id = request.data.get('user')
        role = request.data.get('role', WorkflowMembership.Role.EXECUTOR)
        can_start = request.data.get('can_start')

        wf = get_object_or_404(Workflow, pk=workflow_id)
        user = get_object_or_404(User, pk=user_id)

        membership, created = WorkflowMembership.objects.update_or_create(
            workflow=wf,
            user=user,
            defaults={'role': role, 'is_active': True}
        )

        if can_start is not None:
            from workflow.models import WorkflowPermission
            if can_start:
                WorkflowPermission.objects.update_or_create(
                    workflow=wf,
                    user=user,
                    action=WorkflowPermission.Action.START,
                    defaults={'effect': WorkflowPermission.Effect.ALLOW, 'role': None}
                )
            else:
                WorkflowPermission.objects.filter(
                    workflow=wf,
                    user=user,
                    action=WorkflowPermission.Action.START
                ).delete()

        return Response(WorkflowMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class WorkflowMembershipDeleteView(generics.DestroyAPIView):
    queryset = WorkflowMembership.objects.all()
    serializer_class = WorkflowMembershipSerializer
    permission_classes = [AllowAny]

    def perform_destroy(self, instance):
        from workflow.models import WorkflowPermission
        # Remove any user-specific START permissions on this workflow
        WorkflowPermission.objects.filter(
            workflow=instance.workflow,
            user=instance.user,
            action=WorkflowPermission.Action.START
        ).delete()
        instance.delete()
