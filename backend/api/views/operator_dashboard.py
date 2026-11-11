import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from operator_panel.dashboard_services import DashboardService
from operator_panel.dashboard_enhancements import DashboardEnhancementService
from workflow.authorization import WorkflowAuthorizationService
from workflow.acceptance_queue_services import PendingAcceptanceQueueService
from workflow.models import WorkflowInstance, Workflow

User = get_user_model()
logger = logging.getLogger(__name__)


def _get_target_user(request):
    """
    Resolves the operator user for the dashboard:
    1. If ?user_id is passed AND the caller is a superuser, use that user
       (admins may inspect any user's workspace).
    2. Otherwise always fall back to request.user. Anonymous/unprivileged
       callers may NEVER select another user's identity (IDOR protection).
    """
    user_id = request.GET.get('user_id')
    if user_id and str(user_id).isdigit() and request.user.is_authenticated and request.user.is_superuser:
        target = User.objects.filter(pk=int(user_id)).first()
        if target:
            return target
    if request.user and request.user.is_authenticated:
        return request.user
    return None


class OperatorDashboardView(APIView):
    """
    Returns full operator dashboard data structured for modern React UI:
    - summary: KPIs (my tasks, pending, active, completed, sla warning, sla breached, pending acceptances)
    - next_best_actions: High-priority immediate actionable items
    - pending_actions: Actionable workflows
    - waiting_for_others: Workflows waiting for downstream colleagues
    - unfinished_processes: My unfinished active instances
    - active_processes: Active instances with graphic progress tracker steps
    - startable_workflows: Workflows permitted to start
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _get_target_user(request)
        if not user:
            return Response({'error': 'هیچ کاربری یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        ds = DashboardService(user)
        deh = DashboardEnhancementService(user)

        context = ds.get_context()
        context.update(deh.get_context())

        # 1. Summary KPIs
        summary = context.get('summary', {})
        counts = context.get('sidebar_counts', {})
        summary_payload = {
            'today': summary.get('today', 0),
            'tasks': summary.get('tasks', counts.get('tasks', 0)),
            'pending': summary.get('pending', counts.get('pending', 0)),
            'active': summary.get('active', counts.get('active', 0)),
            'completed': summary.get('completed', 0),
            'sla_warning': summary.get('sla_warning', 0),
            'sla_breached': summary.get('sla_breached', 0),
            'pending_acceptances': counts.get('pending_acceptances', 0),
        }

        # 2. Next Best Actions (Intelligent priority recommendation)
        next_actions_payload = []
        for inst in context.get('next_best_actions', []):
            sla_info = getattr(inst, 'dashboard_sla', {}) or {}
            next_actions_payload.append({
                'id': inst.id,
                'trackingCode': f"DF-{1000 + inst.id}",
                'workflowName': inst.workflow.name,
                'workflowId': inst.workflow.id,
                'currentStep': inst.current_step.name if inst.current_step else 'پایان‌یافته',
                'currentStepId': inst.current_step.id if inst.current_step else None,
                'priorityLabel': getattr(inst, 'dashboard_priority_label', 'عادی'),
                'priorityClass': getattr(inst, 'dashboard_priority_class', 'normal'),
                'slaLabel': sla_info.get('label', 'عادی') if isinstance(sla_info, dict) else getattr(sla_info, 'label', 'عادی'),
                'slaStatus': sla_info.get('status', 'on_track') if isinstance(sla_info, dict) else getattr(sla_info, 'status', 'on_track'),
                'processSummary': getattr(inst, 'process_summary', []),
                'startedAgo': _timesince_fa(inst.started_at, now),
            })

        # 3. Pending Actions (Need my action)
        pending_payload = []
        for inst in context.get('pending_actions', []):
            pending_payload.append({
                'id': inst.id,
                'trackingCode': f"DF-{1000 + inst.id}",
                'workflowName': inst.workflow.name,
                'workflowId': inst.workflow.id,
                'currentStep': inst.current_step.name if inst.current_step else '—',
                'currentStepId': inst.current_step.id if inst.current_step else None,
                'startedAgo': _timesince_fa(inst.started_at, now),
            })

        # 4. Waiting for Others
        waiting_payload = []
        for inst in context.get('waiting_for_others', []):
            waiting_payload.append({
                'id': inst.id,
                'trackingCode': f"DF-{1000 + inst.id}",
                'workflowName': inst.workflow.name,
                'workflowId': inst.workflow.id,
                'currentStep': inst.current_step.name if inst.current_step else '—',
                'assignedTo': inst.current_step.assigned_to.get_full_name() or inst.current_step.assigned_to.username if (inst.current_step and inst.current_step.assigned_to) else 'همکار نامشخص',
                'startedAgo': _timesince_fa(inst.started_at, now),
            })

        # 5. Unfinished Processes
        unfinished_payload = []
        for inst in context.get('unfinished_processes', []):
            unfinished_payload.append({
                'id': inst.id,
                'trackingCode': f"DF-{1000 + inst.id}",
                'workflowName': inst.workflow.name,
                'workflowId': inst.workflow.id,
                'currentStep': inst.current_step.name if inst.current_step else '—',
                'startedAgo': _timesince_fa(inst.started_at, now),
            })

        # 6. Active Processes with Visual Progression Tracker
        active_processes_payload = []
        for inst in context.get('active_processes', []):
            tracker_items = []
            for item in getattr(inst, 'dashboard_tracker', []):
                step = item.get('step')
                tracker_items.append({
                    'stepId': step.id if step else None,
                    'stepName': step.name if step else '',
                    'stepOrder': step.order if step else 0,
                    'state': item.get('state', 'pending'), # completed, current, pending
                })

            sla_info = getattr(inst, 'dashboard_sla', {}) or {}
            active_processes_payload.append({
                'id': inst.id,
                'trackingCode': f"DF-{1000 + inst.id}",
                'workflowName': inst.workflow.name,
                'workflowId': inst.workflow.id,
                'currentStep': inst.current_step.name if inst.current_step else '—',
                'currentStepId': inst.current_step.id if inst.current_step else None,
                'startedAgo': _timesince_fa(inst.started_at, now),
                'slaStatus': sla_info.get('status', 'on_track') if isinstance(sla_info, dict) else getattr(sla_info, 'status', 'on_track'),
                'slaLabel': sla_info.get('label', '') if isinstance(sla_info, dict) else getattr(sla_info, 'label', ''),
                'tracker': tracker_items,
            })

        # 7. Startable Workflows
        startable_payload = []
        for wf in context.get('startable_workflows', []):
            startable_payload.append({
                'id': wf.id,
                'name': wf.name,
                'code': wf.code,
                'description': wf.description or '',
            })

        # 8. User Persona Meta
        role_label = 'مدیر ارشد' if user.is_superuser else (user.job.name if user.job else ('کارشناس' if user.is_staff else 'اپراتور'))
        user_meta = {
            'id': user.id,
            'username': user.username,
            'fullName': user.get_full_name() or user.username,
            'role': role_label,
            'isSuperuser': user.is_superuser,
        }

        return Response({
            'user': user_meta,
            'summary': summary_payload,
            'nextBestActions': next_actions_payload,
            'pendingActions': pending_payload,
            'waitingForOthers': waiting_payload,
            'unfinishedProcesses': unfinished_payload,
            'activeProcesses': active_processes_payload,
            'startableWorkflows': startable_payload,
        })


class OperatorHideProcessView(APIView):
    """
    Hides an unfinished process from the operator's personal dashboard.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        user = _get_target_user(request)
        deh = DashboardEnhancementService(user)
        deh.hide_process(instance_id)
        return Response({'status': 'hidden', 'message': 'فرآیند از داشبورد شما پنهان شد.'})


class OperatorRestoreProcessView(APIView):
    """
    Restores a hidden process back to the operator's dashboard.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        user = _get_target_user(request)
        deh = DashboardEnhancementService(user)
        deh.restore_process(instance_id)
        return Response({'status': 'restored', 'message': 'فرآیند مجدداً در داشبورد نمایان شد.'})


def _timesince_fa(dt, now):
    if not dt:
        return ''
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return 'چند لحظه پیش'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes} دقیقه پیش'
    hours = minutes // 60
    if hours < 24:
        return f'{hours} ساعت پیش'
    days = hours // 24
    return f'{days} روز پیش'
