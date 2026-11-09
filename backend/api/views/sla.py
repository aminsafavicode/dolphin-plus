from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from workflow.models import (
    BusinessCalendar,
    WeeklySchedule,
    WorkingInterval,
    CalendarException,
    CalendarExceptionInterval,
    Workflow,
    WorkflowStep,
    WorkflowStepSLA,
)
from api.serializers import (
    BusinessCalendarSerializer,
    WeeklyScheduleSerializer,
    CalendarExceptionSerializer,
    WorkflowStepSLASerializer,
)


class BusinessCalendarListCreateView(generics.ListCreateAPIView):
    queryset = BusinessCalendar.objects.all().prefetch_related('weekly_schedules__intervals', 'exceptions__intervals').order_by('id')
    serializer_class = BusinessCalendarSerializer
    permission_classes = [AllowAny]


class BusinessCalendarDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BusinessCalendar.objects.all().prefetch_related('weekly_schedules__intervals', 'exceptions__intervals')
    serializer_class = BusinessCalendarSerializer
    permission_classes = [AllowAny]


class WeeklyScheduleUpdateView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, schedule_id):
        sched = get_object_or_404(WeeklySchedule, pk=schedule_id)
        is_working = request.data.get('is_working', sched.is_working)
        sched.is_working = is_working
        sched.save(update_fields=['is_working'])

        intervals = request.data.get('intervals')
        if intervals is not None:
            sched.intervals.all().delete()
            for iv in intervals:
                start_str = iv.get('start_time')
                end_str = iv.get('end_time')
                if start_str and end_str:
                    sched.intervals.create(start_time=start_str, end_time=end_str)

        return Response(WeeklyScheduleSerializer(sched).data)


class CalendarBulkScheduleView(APIView):
    """
    Quickly set multiple days with identical shifts (e.g. Saturday-Wednesday 08:00 to 17:00)
    """
    permission_classes = [AllowAny]

    def post(self, request, calendar_id):
        calendar = get_object_or_404(BusinessCalendar, pk=calendar_id)
        weekdays = request.data.get('weekdays', [5, 6, 0, 1, 2])
        intervals = request.data.get('intervals', [{'start_time': '08:00', 'end_time': '17:00'}])

        with transaction.atomic():
            for w in range(7):
                sched, _ = WeeklySchedule.objects.get_or_create(calendar=calendar, weekday=w)
                if w in weekdays:
                    sched.is_working = True
                    sched.save(update_fields=['is_working'])
                    sched.intervals.all().delete()
                    for iv in intervals:
                        sched.intervals.create(
                            start_time=iv.get('start_time', '08:00'),
                            end_time=iv.get('end_time', '17:00')
                        )
                else:
                    sched.is_working = False
                    sched.save(update_fields=['is_working'])
                    sched.intervals.all().delete()

        return Response(BusinessCalendarSerializer(calendar).data)


class CalendarExceptionCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, calendar_id):
        calendar = get_object_or_404(BusinessCalendar, pk=calendar_id)
        date = request.data.get('date')
        status_val = request.data.get('status', CalendarException.Status.NON_WORKING)
        title = request.data.get('title', 'تعطیلی تقویمی')
        description = request.data.get('description', '')

        if not date:
            return Response({'error': 'تاریخ استثنا الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        exception = CalendarException.objects.create(
            calendar=calendar,
            date=date,
            status=status_val,
            title=title,
            description=description
        )

        intervals = request.data.get('intervals', [])
        for iv in intervals:
            CalendarExceptionInterval.objects.create(
                exception=exception,
                start_time=iv.get('start_time'),
                end_time=iv.get('end_time')
            )

        return Response(CalendarExceptionSerializer(exception).data, status=status.HTTP_201_CREATED)


class CalendarExceptionDeleteView(generics.DestroyAPIView):
    queryset = CalendarException.objects.all()
    serializer_class = CalendarExceptionSerializer
    permission_classes = [AllowAny]


class WorkflowStepSLAListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        slas = WorkflowStepSLA.objects.all().select_related('step__workflow', 'calendar').order_by('id')
        data = []
        for s in slas:
            data.append({
                'id': s.id,
                'workflow_id': s.step.workflow_id,
                'workflow_name': s.step.workflow.name,
                'step_id': s.step_id,
                'step_name': s.step.name,
                'calendar_id': s.calendar_id,
                'calendar_name': s.calendar.name,
                'duration': str(s.duration),
                'warning_before': str(s.warning_before) if s.warning_before else None,
                'is_active': s.is_active,
            })
        return Response(data)

    def post(self, request):
        step_id = request.data.get('step')
        calendar_id = request.data.get('calendar')
        duration_str = request.data.get('duration', '08:00:00')
        warning_str = request.data.get('warning_before', '02:00:00')
        is_active = request.data.get('is_active', True)

        step = get_object_or_404(WorkflowStep, pk=step_id)
        calendar = get_object_or_404(BusinessCalendar, pk=calendar_id)

        sla, created = WorkflowStepSLA.objects.update_or_create(
            step=step,
            defaults={
                'calendar': calendar,
                'duration': duration_str,
                'warning_before': warning_str,
                'is_active': is_active
            }
        )
        return Response({
            'id': sla.id,
            'workflow_id': step.workflow_id,
            'workflow_name': step.workflow.name,
            'step_id': step.id,
            'step_name': step.name,
            'calendar_id': calendar.id,
            'calendar_name': calendar.name,
            'duration': str(sla.duration),
            'warning_before': str(sla.warning_before),
            'is_active': sla.is_active
        }, status=status.HTTP_201_CREATED)


class WorkflowStepSLADetailView(generics.DestroyAPIView):
    queryset = WorkflowStepSLA.objects.all()
    serializer_class = WorkflowStepSLASerializer
    permission_classes = [AllowAny]
