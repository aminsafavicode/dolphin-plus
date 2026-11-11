from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from workflow.models import (
    Workflow,
    WorkflowStep,
    WorkflowTransition,
    WorkflowInstance,
    WorkflowStepExecution,
    WorkflowTransitionExecution,
    FormDefinition,
    FormSection,
    FormField,
    FormRepeatableGroup,
    FormData,
    RepeatableRow,
    RepeatableRowValue,
    DeviceType,
    DeviceModel,
    Device,
    InstanceDevice,
)

User = get_user_model()


class CartableListView(APIView):
    """
    List workflow instances for the cartable, with real SLA state and Dual-Handoff detection.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tab = request.GET.get('tab', 'all')
        search = request.GET.get('search', '').strip()

        instances = WorkflowInstance.objects.select_related(
            'workflow', 'current_step', 'started_by'
        ).prefetch_related('instance_devices__device__device_model').order_by('-started_at')

        if tab == 'completed':
            instances = instances.filter(status='COMPLETED')
        elif tab == 'pending_handoff':
            pending_instance_ids = WorkflowTransitionExecution.objects.filter(
                status=WorkflowTransitionExecution.Status.PENDING
            ).values_list('instance_id', flat=True)
            instances = instances.filter(id__in=pending_instance_ids)
        elif tab == 'my':
            instances = instances.filter(status='ACTIVE')
        else:
            # all
            pass

        data = []
        for inst in instances:
            # Check device / customer information
            device_model_name = 'دستگاه عمومی / فاقد کاتالوگ'
            customer_name = 'مشتری سازمانی'
            first_dev = inst.instance_devices.first()
            if first_dev and first_dev.device and first_dev.device.device_model:
                device_model_name = first_dev.device.device_model.name

            # Check if has pending handoff
            is_pending_handoff = WorkflowTransitionExecution.objects.filter(
                instance=inst,
                status=WorkflowTransitionExecution.Status.PENDING
            ).exists()

            # SLA calculation
            sla_due_text = 'عادی'
            sla_pct = 25
            last_exec = inst.step_executions.order_by('-performed_at').first()
            if last_exec:
                elapsed = (timezone.now() - last_exec.performed_at).total_seconds() / 3600.0
                sla_pct = min(100, int(elapsed * 25))
                sla_due_text = f'{max(1, int(4 - elapsed))} ساعت کاری مانده'

            # Search filter
            tracking_code = f"DF-{1000 + inst.id}"
            if search:
                query = search.lower()
                matches = (
                    query in tracking_code.lower() or
                    query in inst.workflow.name.lower() or
                    (inst.current_step and query in inst.current_step.name.lower()) or
                    query in device_model_name.lower() or
                    query in customer_name.lower()
                )
                if not matches:
                    continue

            status_key = 'active'
            if inst.status == 'COMPLETED':
                status_key = 'completed'
            elif is_pending_handoff:
                status_key = 'pending_handoff'

            assignee = inst.started_by.get_full_name() or inst.started_by.username if inst.started_by else 'اپراتور'
            data.append({
                'id': str(inst.id),
                'trackingCode': tracking_code,
                'workflowName': inst.workflow.name,
                'customerName': customer_name,
                'deviceModel': device_model_name,
                'currentStep': inst.current_step.name if inst.current_step else 'پایان‌یافته',
                'assignee': assignee,
                'status': status_key,
                'slaDue': sla_due_text,
                'slaPercent': sla_pct,
                'createdAt': inst.started_at.strftime('%Y/%m/%d') if inst.started_at else '',
                'priority': 'normal',
            })

        return Response(data)


class CartableCreateInstanceView(APIView):
    """
    Starts a new real WorkflowInstance from the Initial Step.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        workflow_id = request.data.get('workflow_id')
        customer_name = request.data.get('customer_name', 'مشتری جدید')
        device_model_name = request.data.get('device_model', '')
        description = request.data.get('description', '')

        if not workflow_id:
            # Fallback to the first active workflow
            wf = Workflow.objects.filter(is_active=True).first()
            if not wf:
                return Response(
                    {'error': 'هیچ فرآیند فعالی در سیستم یافت نشد. لطفاً ابتدا از بخش «مدیریت فرآیندها» یک فرآیند ایجاد فرمایید.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            wf = get_object_or_404(Workflow, pk=workflow_id)

        initial_step = wf.steps.order_by('order').first()
        if not initial_step:
            # Create default workflow steps if none exist
            initial_step = WorkflowStep.objects.create(
                workflow=wf,
                name='پذیرش و ثبت اولیه',
                code='reception',
                order=1
            )
            intermediate_step = WorkflowStep.objects.create(
                workflow=wf,
                name='بررسی و عیب‌یابی فنی',
                code='technical_review',
                order=2
            )
            terminal_step = WorkflowStep.objects.create(
                workflow=wf,
                name='تسویه و ترخیص نهایی',
                code='discharge',
                order=3
            )
            # Create transitions
            WorkflowTransition.objects.create(
                workflow=wf,
                name='ارسال به بررسی فنی',
                from_step=initial_step,
                to_step=intermediate_step,
                requires_acceptance=True
            )
            WorkflowTransition.objects.create(
                workflow=wf,
                name='تکمیل و ترخیص',
                from_step=intermediate_step,
                to_step=terminal_step,
                requires_acceptance=False
            )

        # Resolve active user: from request.user, explicit user_id param, or system fallback
        user_id = request.data.get('user_id')
        if user_id:
            user = get_object_or_404(User, pk=user_id)
        elif request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.first()

        # Enforce workflow initiation permission check (unless superuser)
        from workflow.authorization import WorkflowAuthorizationService
        from workflow.models import WorkflowPermission
        if not user.is_superuser:
            can_start = WorkflowAuthorizationService.has_permission(
                user=user,
                workflow=wf,
                action=WorkflowPermission.Action.START
            )
            if not can_start:
                return Response(
                    {'error': f'کاربر «{user.username}» مجوز شروع فرآیند «{wf.name}» را ندارد. تنها آغازگران مجاز تعیین‌شده می‌توانند این فرآیند را شروع کنند.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        instance = WorkflowInstance.objects.create(
            workflow=wf,
            current_step=initial_step,
            status=WorkflowInstance.Status.ACTIVE,
            started_by=user,
        )

        # Initial step execution
        WorkflowStepExecution.objects.create(
            instance=instance,
            workflow_step=initial_step,
            performed_by=user,
            notes=description or "آغاز نمونه فرآیند"
        )

        # Link device if specified
        if device_model_name:
            dev_type, _ = DeviceType.objects.get_or_create(
                name='تجهیزات صنعتی و الکترونیک',
                defaults={'code': 'IND_ELEC'}
            )
            model_obj, _ = DeviceModel.objects.get_or_create(
                name=device_model_name,
                defaults={
                    'device_type': dev_type,
                    'brand': 'عمومی',
                    'code': f'DM-{timezone.now().microsecond}'
                }
            )
            device_obj = Device.objects.create(device_model=model_obj)
            InstanceDevice.objects.create(instance=instance, device=device_obj)

        return Response({
            'id': str(instance.id),
            'trackingCode': f"DF-{1000 + instance.id}",
            'message': 'فرآیند با موفقیت ایجاد و در کارتابل ثبت شد.'
        }, status=status.HTTP_201_CREATED)


class CartableDetailView(APIView):
    """
    Returns full details for executing tasks:
    Current step, form definition, sections, fields, repeatable groups, and available transitions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, instance_id):
        instance = get_object_or_404(
            WorkflowInstance.objects.select_related('workflow', 'current_step', 'started_by'),
            pk=instance_id
        )

        # Available transitions from current step
        transitions = []
        if instance.current_step:
            trans_qs = instance.workflow.transitions.filter(from_step=instance.current_step)
            for t in trans_qs:
                transitions.append({
                    'id': t.id,
                    'name': t.name,
                    'to_step_name': t.to_step.name if t.to_step else 'پایان فرآیند (ترخیص)',
                    'requires_acceptance': t.requires_acceptance,
                })

        # Form Definition and fields
        form_def = FormDefinition.objects.filter(workflow=instance.workflow).first()
        sections_data = []
        groups_data = []

        if form_def:
            for sec in form_def.sections.prefetch_related('fields').all():
                sec_fields = []
                for f in sec.fields.all():
                    val = FormData.objects.filter(instance=instance, field=f).first()
                    sec_fields.append({
                        'id': f.id,
                        'name': f.name,
                        'label': f.label,
                        'field_type': f.field_type,
                        'is_required': f.is_required,
                        'value': val.value_text if val else f.default_value,
                    })
                sections_data.append({
                    'id': sec.id,
                    'title': sec.title,
                    'fields': sec_fields
                })

            for grp in form_def.repeatable_groups.all():
                rows = []
                for r in RepeatableRow.objects.filter(instance=instance, group=grp):
                    vals = {v.field.name: v.value_text for v in r.values.all()}
                    rows.append({'id': r.id, **vals})

                groups_data.append({
                    'id': grp.id,
                    'name': grp.name,
                    'label': grp.label,
                    'rows': rows,
                })

        return Response({
            'id': str(instance.id),
            'trackingCode': f"DF-{1000 + instance.id}",
            'workflowName': instance.workflow.name,
            'currentStep': instance.current_step.name if instance.current_step else 'پایان‌یافته',
            'status': instance.status,
            'transitions': transitions,
            'formSections': sections_data,
            'repeatableGroups': groups_data,
        })


class CartableHandoffAcceptView(APIView):
    """
    Accept physical handoff (Dual-Handoff Protocol).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        instance = get_object_or_404(WorkflowInstance, pk=instance_id)

        pending_tr = WorkflowTransitionExecution.objects.filter(
            instance=instance,
            status=WorkflowTransitionExecution.Status.PENDING
        ).order_by('-performed_at').first()

        user = request.user if request.user.is_authenticated else User.objects.first()

        if pending_tr:
            pending_tr.status = WorkflowTransitionExecution.Status.ACCEPTED
            pending_tr.save()

            target_step = pending_tr.transition.to_step
            instance.current_step = target_step
            if not target_step:
                instance.status = WorkflowInstance.Status.COMPLETED
            instance.save()

            if target_step:
                WorkflowStepExecution.objects.create(
                    instance=instance,
                    workflow_step=target_step,
                    performed_by=user,
                    notes="تحویل فیزیکی دستگاه با موفقیت تایید و مرحله جدید آغاز شد."
                )

            return Response({'status': 'success', 'message': 'تحویل فیزیکی دستگاه تأیید شد.'})

        return Response({'status': 'no_pending', 'message': 'پرونده‌ای در انتظار تایید یافت نشد.'})


class CartableHandoffRejectView(APIView):
    """
    Reject physical handoff and return to previous step.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        instance = get_object_or_404(WorkflowInstance, pk=instance_id)
        reason = request.data.get('reason', 'نقص مستندات یا عدم تطابق فیزیکی دستگاه')

        pending_tr = WorkflowTransitionExecution.objects.filter(
            instance=instance,
            status=WorkflowTransitionExecution.Status.PENDING
        ).order_by('-performed_at').first()

        if pending_tr:
            pending_tr.status = WorkflowTransitionExecution.Status.REJECTED
            pending_tr.notes = reason
            pending_tr.save()

            # Remains in from_step
            instance.current_step = pending_tr.transition.from_step
            instance.save()

            return Response({'status': 'rejected', 'message': f'تحویل رد شد: {reason}'})

        return Response({'status': 'no_pending', 'message': 'پرونده‌ای در انتظار تایید یافت نشد.'})


class CartableExecuteTransitionView(APIView):
    """
    Execute a transition to the next step (or terminal completion).
    Respects requires_acceptance for Dual-Handoff.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        instance = get_object_or_404(WorkflowInstance, pk=instance_id)
        transition_id = request.data.get('transition_id')
        notes = request.data.get('notes', '')

        transition = get_object_or_404(WorkflowTransition, pk=transition_id, workflow=instance.workflow)
        user = request.user if request.user.is_authenticated else User.objects.first()

        if transition.requires_acceptance:
            # Set to PENDING - requires target user to ACCEPT
            WorkflowTransitionExecution.objects.create(
                instance=instance,
                transition=transition,
                performed_by=user,
                status=WorkflowTransitionExecution.Status.PENDING,
                notes=notes
            )
            return Response({
                'status': 'pending_acceptance',
                'message': 'گذار با موفقیت اجرا شد و پرونده در وضعیت "در انتظار تایید تحویل" قرار گرفت.'
            })
        else:
            # Immediate transition
            WorkflowTransitionExecution.objects.create(
                instance=instance,
                transition=transition,
                performed_by=user,
                status=WorkflowTransitionExecution.Status.ACCEPTED,
                notes=notes
            )

            target_step = transition.to_step
            instance.current_step = target_step
            if not target_step:
                instance.status = WorkflowInstance.Status.COMPLETED
            instance.save()

            if target_step:
                WorkflowStepExecution.objects.create(
                    instance=instance,
                    workflow_step=target_step,
                    performed_by=user,
                    notes=notes or "ورود به مرحله جدید"
                )

            return Response({
                'status': 'completed' if not target_step else 'moved',
                'message': f'پرونده به مرحله "{target_step.name if target_step else "پایان‌یافته"}" منتقل شد.'
            })
