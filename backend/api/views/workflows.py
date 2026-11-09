from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from workflow.models import (
    Workflow,
    WorkflowStep,
    WorkflowTransition,
    WorkflowMembership,
    FormDefinition,
)
from workflow.access_matrix import save_access_matrix
from workflow.access_workspace import _matrix_context
from api.serializers import (
    WorkflowSerializer,
    WorkflowStepSerializer,
    WorkflowTransitionSerializer,
)


User = get_user_model()


class WorkflowListCreateView(generics.ListCreateAPIView):
    queryset = Workflow.objects.all().order_by('-created_at')
    serializer_class = WorkflowSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        startable_only = self.request.query_params.get('startable_only')
        if startable_only and user_id:
            try:
                user = User.objects.get(pk=user_id)
                from workflow.authorization import WorkflowAuthorizationService
                return WorkflowAuthorizationService.get_startable_workflows(user).order_by('-created_at')
            except User.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        wf = serializer.save()
        # Ensure a default FormDefinition exists for the workflow
        FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم فرآیند {wf.name}'}
        )


class WorkflowDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [AllowAny]

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        from django.db import transaction
        from workflow.models import (
            WorkflowTransition,
            WorkflowTransitionExecution,
            WorkflowPermission,
            WorkflowStepSLA,
            FieldAccess,
            RepeatableGroupAccess,
            FormPrintFieldSettings,
            FormField,
        )

        if instance.instances.exists():
            raise ValidationError({
                'detail': 'امکان حذف این فرآیند به دلیل وجود پرونده‌های جاری یا سوابق ثبت‌شده برای آن وجود ندارد.'
            })

        with transaction.atomic():
            # 1. Clean transitions
            WorkflowTransitionExecution.objects.filter(transition__workflow=instance).delete()
            instance.transitions.all().delete()

            # 2. Clean permissions
            WorkflowPermission.objects.filter(workflow=instance).delete()

            # 3. Clean step SLAs & step access rules
            WorkflowStepSLA.objects.filter(step__workflow=instance).delete()
            FieldAccess.objects.filter(step__workflow=instance).delete()
            RepeatableGroupAccess.objects.filter(step__workflow=instance).delete()

            # 4. Clean steps
            instance.steps.all().update(assigned_to=None)
            instance.steps.all().delete()

            # 5. Clean memberships
            instance.memberships.all().delete()

            # 6. Clean form definition if exists
            if hasattr(instance, 'form_definition'):
                form_def = instance.form_definition
                for sec in form_def.sections.all():
                    FormField.objects.filter(choice_parent_field__section=sec).update(choice_parent_field=None)
                    sec.fields.all().update(choice_parent_field=None, repeatable_group=None)
                    FieldAccess.objects.filter(field__section=sec).delete()
                    FormPrintFieldSettings.objects.filter(field__section=sec).delete()
                    sec.fields.all().delete()

                    for grp in sec.repeatable_groups.all():
                        grp.child_groups.all().update(parent_group=None)
                    RepeatableGroupAccess.objects.filter(group__section=sec).delete()
                    FormPrintFieldSettings.objects.filter(repeatable_group__section=sec).delete()
                    sec.repeatable_groups.all().delete()

                    if hasattr(sec, 'print_settings'):
                        sec.print_settings.delete()
                    sec.delete()

                if hasattr(form_def, 'print_settings'):
                    form_def.print_settings.delete()
                form_def.delete()

            # 7. Delete workflow
            instance.delete()


class WorkflowStepListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkflowStepSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        wf_id = self.kwargs.get('workflow_id')
        return WorkflowStep.objects.filter(workflow_id=wf_id).select_related(
            'assigned_to', 'sla', 'sla__calendar'
        ).order_by('order', 'id')

    def perform_create(self, serializer):
        wf = get_object_or_404(Workflow, pk=self.kwargs.get('workflow_id'))
        serializer.save(workflow=wf)


class WorkflowStepDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WorkflowStep.objects.all().select_related('assigned_to', 'sla', 'sla__calendar')
    serializer_class = WorkflowStepSerializer
    permission_classes = [AllowAny]

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        from django.db import transaction
        from django.db.models import Q
        from workflow.models import (
            WorkflowInstance,
            WorkflowTransition,
            WorkflowTransitionExecution,
        )

        if WorkflowInstance.objects.filter(current_step=instance).exists():
            raise ValidationError({
                'detail': 'امکان حذف این مرحله به دلیل حضور پرونده‌های فعال در آن وجود ندارد.'
            })

        with transaction.atomic():
            transitions = WorkflowTransition.objects.filter(
                Q(from_step=instance) | Q(to_step=instance) | Q(reject_to_step=instance)
            )
            WorkflowTransitionExecution.objects.filter(transition__in=transitions).delete()
            transitions.delete()

            if hasattr(instance, 'sla'):
                instance.sla.delete()

            instance.field_access_rules.all().delete()
            instance.repeatable_group_access_rules.all().delete()

            instance.delete()


class WorkflowTransitionListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkflowTransitionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        wf_id = self.kwargs.get('workflow_id')
        return WorkflowTransition.objects.filter(workflow_id=wf_id).select_related(
            'from_step', 'to_step', 'reject_to_step'
        ).order_by('id')

    def perform_create(self, serializer):
        wf = get_object_or_404(Workflow, pk=self.kwargs.get('workflow_id'))
        serializer.save(workflow=wf)


class WorkflowTransitionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WorkflowTransition.objects.all().select_related('from_step', 'to_step', 'reject_to_step')
    serializer_class = WorkflowTransitionSerializer
    permission_classes = [AllowAny]

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        from django.db import transaction

        if instance.executions.exists():
            raise ValidationError({
                'detail': 'امکان حذف این گذار به دلیل ثبت سوابق اجرایی در پرونده‌ها وجود ندارد.'
            })

        with transaction.atomic():
            instance.permissions.all().delete()
            instance.delete()


class WorkflowAccessMatrixView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, workflow_id):
        User = get_user_model()
        wf = get_object_or_404(Workflow, pk=workflow_id)
        memberships = (
            wf.memberships.filter(is_active=True, user__is_active=True)
            .select_related("user")
            .order_by("user__username")
        )
        all_users = User.objects.filter(is_active=True).order_by("username")
        steps = wf.steps.filter(is_active=True).order_by("order")

        subject_type = request.query_params.get("subject_type", "user").strip()
        if subject_type not in {"user", "role"}:
            subject_type = "user"

        subject = request.query_params.get("subject", "").strip()
        if subject_type == "user":
            if not subject:
                if memberships.exists():
                    subject = str(memberships.first().user_id)
                elif all_users.exists():
                    subject = str(all_users.first().id)
        else:
            if not subject:
                subject = WorkflowMembership.Role.EXECUTOR

        step_id = request.query_params.get("step_id", "").strip()
        selected_step = steps.filter(pk=step_id).first() if step_id else steps.first()

        selected_user = None
        if subject_type == "user" and subject:
            selected_user = memberships.filter(user_id=subject).first()
            if not selected_user:
                u = all_users.filter(id=subject).first()
                if u:
                    selected_user = type("VirtualMembership", (), {"user": u, "role": WorkflowMembership.Role.EXECUTOR, "user_id": u.id})()

        role = selected_user.role if selected_user is not None else subject if subject_type == "role" else None
        matrix = _matrix_context(wf, subject_type, subject, selected_step, role=role) if selected_step and subject else None

        fields_data = []
        if matrix:
            for item in matrix.get("field_rows", []):
                f = item["field"]
                fields_data.append({
                    "id": f.id,
                    "name": f.name,
                    "code": f.code,
                    "label": f.label,
                    "field_type": f.field_type,
                    "section_id": f.section_id,
                    "section_name": f.section.name if f.section else "",
                    "repeatable_group_id": f.repeatable_group_id,
                    "repeatable_group_label": f.repeatable_group.label if f.repeatable_group else "",
                    "can_view": item["view"],
                    "can_edit": item["edit"],
                })

        groups_data = []
        if matrix:
            for item in matrix.get("group_rows", []):
                g = item["group"]
                groups_data.append({
                    "id": g.id,
                    "name": g.name,
                    "code": g.code,
                    "label": g.label,
                    "section_id": g.section_id,
                    "section_name": g.section.name if g.section else "",
                    "can_view": item["view"],
                    "can_edit": item["edit"],
                    "can_add": item["add"],
                    "can_delete": item["delete"],
                })

        transitions_data = []
        if matrix:
            for item in matrix.get("transition_rows", []):
                t = item["transition"]
                transitions_data.append({
                    "id": t.id,
                    "name": t.name,
                    "from_step_id": t.from_step_id,
                    "to_step_id": t.to_step_id,
                    "to_step_name": t.to_step.name if t.to_step else "",
                    "allowed": item["allowed"],
                })

        return Response({
            "workflow": {
                "id": wf.id,
                "name": wf.name,
                "code": wf.code,
            },
            "subject_type": subject_type,
            "subject": subject,
            "selected_user": {
                "id": selected_user.user.id,
                "username": selected_user.user.username,
                "role": selected_user.role,
            } if selected_user else None,
            "memberships": [
                {
                    "id": m.id,
                    "user_id": m.user_id,
                    "username": m.user.username,
                    "full_name": m.user.get_full_name() or m.user.username,
                    "role": m.role,
                }
                for m in memberships
            ],
            "all_users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "full_name": u.get_full_name() or u.username,
                }
                for u in all_users
            ],
            "role_choices": [
                {"value": r[0], "label": r[1]} for r in WorkflowMembership.Role.choices
            ],
            "steps": [
                {
                    "id": s.id,
                    "name": s.name,
                    "code": s.code,
                    "order": s.order,
                }
                for s in steps
            ],
            "selected_step_id": selected_step.pk if selected_step else None,
            "workflow_permissions": matrix["workflow_permission_rows"] if matrix else [],
            "step_permissions": matrix["step_permission_rows"] if matrix else [],
            "step_action_enabled": matrix["step_action_enabled"] if matrix else False,
            "step_actions": matrix["step_action_rows"] if matrix else [],
            "transitions": transitions_data,
            "fields": fields_data,
            "repeatable_groups": groups_data,
        })

    def post(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        data = request.data
        subject_type = data.get("subject_type", "user")
        subject = data.get("subject")
        step_id = data.get("step_id")

        if not subject or not step_id:
            return Response(
                {"error": "پارامترهای subject و step_id الزامی هستند."},
                status=status.HTTP_400_BAD_REQUEST
            )

        step = get_object_or_404(WorkflowStep, pk=step_id, workflow=wf)

        # If user subject, ensure user membership in workflow
        if subject_type == "user":
            try:
                user_id = int(subject)
                WorkflowMembership.objects.get_or_create(
                    workflow=wf,
                    user_id=user_id,
                    defaults={'role': WorkflowMembership.Role.EXECUTOR}
                )
            except (ValueError, TypeError):
                pass

        post_data = {}

        # 1. Workflow permissions
        wf_perms = data.get("workflow_permissions", {})
        if isinstance(wf_perms, dict):
            for k, v in wf_perms.items():
                post_data[f"workflow_{k}"] = "1" if v else "0"
        elif isinstance(wf_perms, list):
            for item in wf_perms:
                post_data[f"workflow_{item.get('value')}"] = "1" if item.get("enabled") else "0"

        # 2. Step permissions
        step_perms = data.get("step_permissions", {})
        if isinstance(step_perms, dict):
            for k, v in step_perms.items():
                post_data[f"step_{k}"] = "1" if v else "0"
        elif isinstance(step_perms, list):
            for item in step_perms:
                post_data[f"step_{item.get('value')}"] = "1" if item.get("enabled") else "0"

        # 3. Step action subtypes
        step_actions = data.get("step_actions", {})
        if isinstance(step_actions, dict):
            for k, v in step_actions.items():
                post_data[f"step_action_{k}"] = "1" if v else "0"
        elif isinstance(step_actions, list):
            for item in step_actions:
                post_data[f"step_action_{item.get('value')}"] = "1" if item.get("enabled") else "0"

        # 4. Transitions
        trans_perms = data.get("transitions", {})
        if isinstance(trans_perms, dict):
            for k, v in trans_perms.items():
                post_data[f"transition_{k}"] = "1" if v else "0"
        elif isinstance(trans_perms, list):
            for item in trans_perms:
                post_data[f"transition_{item.get('id')}"] = "1" if item.get("allowed") else "0"

        # 5. Field permissions
        field_perms = data.get("fields", [])
        if isinstance(field_perms, list):
            for item in field_perms:
                f_id = item.get("id") or item.get("field_id")
                if f_id:
                    post_data[f"field_{f_id}_view"] = "1" if item.get("can_view") else "0"
                    post_data[f"field_{f_id}_edit"] = "1" if item.get("can_edit") else "0"

        # 6. Group permissions
        group_perms = data.get("repeatable_groups", [])
        if isinstance(group_perms, list):
            for item in group_perms:
                g_id = item.get("id") or item.get("group_id")
                if g_id:
                    post_data[f"group_{g_id}_view"] = "1" if item.get("can_view") else "0"
                    post_data[f"group_{g_id}_edit"] = "1" if item.get("can_edit") else "0"
                    post_data[f"group_{g_id}_add"] = "1" if item.get("can_add") else "0"
                    post_data[f"group_{g_id}_delete"] = "1" if item.get("can_delete") else "0"

        try:
            save_access_matrix(
                workflow=wf,
                subject_type=subject_type,
                subject_value=str(subject),
                step=step,
                post_data=post_data
            )
            return Response({"success": True, "message": "ماتریس دسترسی‌ها با موفقیت ذخیره گردید."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WorkflowToggleStarterView(APIView):
    """
    Dedicated quick-toggle endpoint for granting or revoking workflow initiation (START)
    permission for a specific user.
    """
    permission_classes = [AllowAny]

    def post(self, request, workflow_id, user_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        user = get_object_or_404(User, pk=user_id)
        from workflow.models import WorkflowPermission
        from workflow.authorization import WorkflowAuthorizationService

        current_can_start = WorkflowAuthorizationService.has_permission(
            user=user,
            workflow=wf,
            action=WorkflowPermission.Action.START
        )

        desired_state = request.data.get('can_start')
        if desired_state is None:
            desired_state = not current_can_start
        else:
            desired_state = bool(desired_state)

        if desired_state:
            # Ensure membership exists
            WorkflowMembership.objects.get_or_create(
                workflow=wf,
                user=user,
                defaults={'role': WorkflowMembership.Role.EXECUTOR, 'is_active': True}
            )
            WorkflowPermission.objects.update_or_create(
                workflow=wf,
                user=user,
                action=WorkflowPermission.Action.START,
                defaults={'effect': WorkflowPermission.Effect.ALLOW, 'role': None}
            )
            msg = f"کاربر «{user.username}» به عنوان آغازگر مجاز این فرآیند تعیین شد."
        else:
            WorkflowPermission.objects.filter(
                workflow=wf,
                user=user,
                action=WorkflowPermission.Action.START
            ).delete()
            msg = f"دسترسی آغاز فرآیند برای کاربر «{user.username}» لغو گردید."

        return Response({
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'can_start': desired_state,
            'message': msg
        })

