from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from workflow.models import (
    Workflow,
    WorkflowStep,
    WorkflowTransition,
    WorkflowInstance,
    WorkflowStepExecution,
    WorkflowTransitionExecution,
    WorkflowMembership,
    FormDefinition,
    FormSection,
    FormField,
    FormRepeatableGroup,
    FormPrintSettings,
    FormData,
    RepeatableRow,
    RepeatableRowValue,
    DeviceType,
    DeviceModel,
    Device,
    DeviceIdentifier,
    LookupList,
    LookupItem,
    StaticChoiceSet,
    StaticChoiceItem,
    BusinessCalendar,
    WeeklySchedule,
    WorkingInterval,
    CalendarException,
    CalendarExceptionInterval,
    WorkflowStepSLA,
)
from accounts.models import Job
from backup.models import (
    Backup,
    BackupSchedule,
    BackupStorageDestination,
    BackupRetentionPolicy,
    Restore,
)

User = get_user_model()


# -------------------------------------------------------------
# User, Job, Group & Membership Serializers
# -------------------------------------------------------------
class JobSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = ['id', 'name', 'code', 'description', 'is_active', 'users_count']

    def get_users_count(self, obj):
        return obj.users.count()


class GroupSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'users_count']

    def get_users_count(self, obj):
        return obj.user_set.count()


class WorkflowMembershipSerializer(serializers.ModelSerializer):
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    username = serializers.ReadOnlyField(source='user.username')
    full_name = serializers.SerializerMethodField()
    can_start = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowMembership
        fields = [
            'id', 'workflow', 'workflow_name', 'user', 'username',
            'full_name', 'role', 'can_start', 'is_active', 'joined_at'
        ]

    def validate_user(self, value):
        if value and (value.is_superuser or value.username == 'admin'):
            raise serializers.ValidationError("کاربران مدیر ارشد (Admin) در فرآیندها نقش مجری یا عضو تیمی ندارند و دسترسی نظارتی سراسری دارند.")
        return value

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

    def get_can_start(self, obj):
        from workflow.authorization import WorkflowAuthorizationService
        from workflow.models import WorkflowPermission
        return WorkflowAuthorizationService.has_permission(
            user=obj.user,
            workflow=obj.workflow,
            action=WorkflowPermission.Action.START,
        )


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    job = JobSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(), source='job', write_only=True, required=False, allow_null=True
    )
    groups = GroupSerializer(many=True, read_only=True)
    group_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    memberships = WorkflowMembershipSerializer(source='workflow_memberships', many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'email', 'first_name', 'last_name',
            'job', 'job_id', 'is_staff', 'is_superuser', 'is_active',
            'groups', 'group_ids', 'memberships'
        ]

    def create(self, validated_data):
        group_ids = validated_data.pop('group_ids', [])
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if group_ids:
            user.groups.set(Group.objects.filter(id__in=group_ids))
        return user

    def update(self, instance, validated_data):
        group_ids = validated_data.pop('group_ids', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if group_ids is not None:
            instance.groups.set(Group.objects.filter(id__in=group_ids))
        return instance


# -------------------------------------------------------------
# Catalog Serializers
# -------------------------------------------------------------
class DeviceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceType
        fields = ['id', 'name', 'code', 'description', 'is_active']


class DeviceModelSerializer(serializers.ModelSerializer):
    device_type_name = serializers.ReadOnlyField(source='device_type.name')

    class Meta:
        model = DeviceModel
        fields = ['id', 'name', 'device_type', 'device_type_name', 'code', 'brand', 'description', 'is_active']


class DeviceIdentifierSerializer(serializers.ModelSerializer):
    identifier_type_display = serializers.CharField(source='get_identifier_type_display', read_only=True)

    class Meta:
        model = DeviceIdentifier
        fields = ['id', 'device', 'identifier_type', 'identifier_type_display', 'value', 'created_at']


class DeviceSerializer(serializers.ModelSerializer):
    device_model_name = serializers.ReadOnlyField(source='device_model.name')
    device_model_brand = serializers.ReadOnlyField(source='device_model.brand')
    device_type_name = serializers.ReadOnlyField(source='device_model.device_type.name')
    identifiers = DeviceIdentifierSerializer(many=True, read_only=True)

    class Meta:
        model = Device
        fields = [
            'id',
            'device_model',
            'device_model_name',
            'device_model_brand',
            'device_type_name',
            'description',
            'identifiers',
            'created_at',
        ]


# -------------------------------------------------------------
# Lookups & Data Sources Serializers
# -------------------------------------------------------------
class LookupItemSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='value')
    parent_label = serializers.ReadOnlyField(source='parent.label')

    class Meta:
        model = LookupItem
        fields = ['id', 'lookup_list', 'parent', 'parent_label', 'code', 'label', 'order', 'is_active']
        validators = []


class LookupListSerializer(serializers.ModelSerializer):
    items = LookupItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = LookupList
        fields = ['id', 'name', 'code', 'description', 'is_active', 'items', 'items_count']

    def get_items_count(self, obj):
        return obj.items.count()


class StaticChoiceItemSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='value')

    class Meta:
        model = StaticChoiceItem
        fields = ['id', 'choice_set', 'code', 'label', 'order', 'is_active']
        validators = []


class StaticChoiceSetSerializer(serializers.ModelSerializer):
    items = StaticChoiceItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = StaticChoiceSet
        fields = ['id', 'name', 'code', 'description', 'is_active', 'items', 'items_count']

    def get_items_count(self, obj):
        return obj.items.count()


# -------------------------------------------------------------
# Business Calendar & SLA Serializers
# -------------------------------------------------------------
class WorkingIntervalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkingInterval
        fields = ['id', 'weekly_schedule', 'start_time', 'end_time']


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    intervals = WorkingIntervalSerializer(many=True, read_only=True)
    weekday_name = serializers.SerializerMethodField()

    class Meta:
        model = WeeklySchedule
        fields = ['id', 'calendar', 'weekday', 'weekday_name', 'is_working', 'intervals']

    def get_weekday_name(self, obj):
        mapping = {
            5: 'شنبه',
            6: 'یکشنبه',
            0: 'دوشنبه',
            1: 'سه‌شنبه',
            2: 'چهارشنبه',
            3: 'پنج‌شنبه',
            4: 'جمعه',
        }
        return mapping.get(obj.weekday, str(obj.weekday))


class CalendarExceptionIntervalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarExceptionInterval
        fields = ['id', 'exception', 'start_time', 'end_time']


class CalendarExceptionSerializer(serializers.ModelSerializer):
    intervals = CalendarExceptionIntervalSerializer(many=True, read_only=True)

    class Meta:
        model = CalendarException
        fields = ['id', 'calendar', 'date', 'status', 'title', 'description', 'intervals']


class BusinessCalendarSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='name', required=False)
    weekly_schedules = WeeklyScheduleSerializer(many=True, read_only=True)
    exceptions = CalendarExceptionSerializer(many=True, read_only=True)

    class Meta:
        model = BusinessCalendar
        fields = ['id', 'name', 'code', 'timezone', 'is_active', 'weekly_schedules', 'exceptions']
        extra_kwargs = {'timezone': {'required': False}}

    def create(self, validated_data):
        import datetime
        from workflow.models import WeeklySchedule, WorkingInterval

        if not validated_data.get('timezone'):
            validated_data['timezone'] = 'Asia/Tehran'
        calendar = super().create(validated_data)

        # Automatically initialize standard Iranian business week:
        # شنبه (5) تا چهارشنبه (2) ساعت 08:00 الی 17:00
        # پنج‌شنبه (3) و جمعه (4) تعطیل
        working_days = [5, 6, 0, 1, 2]
        non_working_days = [3, 4]

        for w in working_days:
            sched = WeeklySchedule.objects.create(calendar=calendar, weekday=w, is_working=True)
            WorkingInterval.objects.create(
                weekly_schedule=sched,
                start_time=datetime.time(8, 0),
                end_time=datetime.time(17, 0)
            )
        for nw in non_working_days:
            WeeklySchedule.objects.create(calendar=calendar, weekday=nw, is_working=False)

        return calendar


class WorkflowStepSLASerializer(serializers.ModelSerializer):
    calendar_name = serializers.ReadOnlyField(source='calendar.name')
    step_name = serializers.ReadOnlyField(source='step.name')

    class Meta:
        model = WorkflowStepSLA
        fields = [
            'id', 'step', 'step_name', 'calendar', 'calendar_name',
            'duration', 'warning_before', 'is_active'
        ]


# -------------------------------------------------------------
# Form Builder Serializers
# -------------------------------------------------------------
class FormFieldSerializer(serializers.ModelSerializer):
    choice_static_set_name = serializers.ReadOnlyField(source='choice_static_set.name')
    choice_lookup_list_name = serializers.ReadOnlyField(source='choice_lookup_list.name')
    choice_parent_field_label = serializers.ReadOnlyField(source='choice_parent_field.label')
    field_type_display = serializers.CharField(source='get_field_type_display', read_only=True)
    print_config = serializers.SerializerMethodField()

    class Meta:
        model = FormField
        fields = [
            'id', 'section', 'repeatable_group', 'name', 'code', 'label',
            'field_type', 'field_type_display', 'calendar', 'choice_source',
            'choice_static_set', 'choice_static_set_name', 'choice_lookup_list',
            'choice_lookup_list_name', 'choice_parent_field', 'choice_parent_field_label',
            'system_key', 'help_text', 'default_value', 'is_required',
            'show_in_process_summary', 'decimal_places', 'order', 'layout_order',
            'is_active', 'choices', 'print_config'
        ]

    def get_print_config(self, obj):
        ps = obj.print_settings.first() if hasattr(obj, 'print_settings') else None
        width = '100%'
        if isinstance(obj.choices, dict) and 'print_width' in obj.choices:
            width = obj.choices['print_width']
        if ps:
            return {
                'id': ps.id,
                'is_enabled': ps.is_enabled,
                'title_override': ps.title_override,
                'print_order': ps.print_order,
                'print_width': width,
                'group_layout': getattr(ps, 'group_layout', 'TABLE'),
            }
        return {
            'is_enabled': True,
            'title_override': '',
            'print_order': obj.order or 0,
            'print_width': width,
            'group_layout': 'TABLE',
        }


class FormRepeatableGroupSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, read_only=True)
    group_type_display = serializers.CharField(source='get_group_type_display', read_only=True)
    display_type_display = serializers.CharField(source='get_display_type_display', read_only=True)
    print_config = serializers.SerializerMethodField()

    class Meta:
        model = FormRepeatableGroup
        fields = [
            'id', 'section', 'name', 'label', 'code', 'group_type',
            'group_type_display', 'display_type', 'display_type_display',
            'order', 'description', 'is_required', 'is_active', 'fields',
            'print_config'
        ]

    def get_print_config(self, obj):
        ps = obj.print_settings.first() if hasattr(obj, 'print_settings') else None
        if ps:
            return {
                'id': ps.id,
                'is_enabled': ps.is_enabled,
                'title_override': ps.title_override,
                'print_order': ps.print_order,
                'group_layout': ps.group_layout,
            }
        return {
            'is_enabled': True,
            'title_override': '',
            'print_order': obj.order or 0,
            'group_layout': 'TABLE',
        }


class FormSectionSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, read_only=True)
    repeatable_groups = FormRepeatableGroupSerializer(many=True, read_only=True)
    form_definition = serializers.ReadOnlyField(source='form_id')
    title = serializers.ReadOnlyField(source='name')

    class Meta:
        model = FormSection
        fields = [
            'id', 'form', 'form_definition', 'name', 'title', 'code',
            'order', 'description', 'is_active', 'fields', 'repeatable_groups'
        ]


class FormPrintSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormPrintSettings
        fields = [
            'id', 'form', 'document_title', 'subtitle', 'header_text',
            'footer_text', 'page_size', 'orientation', 'show_workflow_name',
            'show_instance_number', 'show_created_at', 'show_empty_values',
            'show_signatures', 'signature_count'
        ]


class FormDefinitionSerializer(serializers.ModelSerializer):
    sections = FormSectionSerializer(many=True, read_only=True)
    print_settings = FormPrintSettingsSerializer(read_only=True)

    class Meta:
        model = FormDefinition
        fields = ['id', 'workflow', 'name', 'is_active', 'sections', 'print_settings']


# -------------------------------------------------------------
# Workflow Definition Serializers
# -------------------------------------------------------------
class WorkflowStepSerializer(serializers.ModelSerializer):
    workflow = serializers.PrimaryKeyRelatedField(read_only=True)
    code = serializers.CharField(required=False, allow_blank=True)
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    assigned_to_full_name = serializers.SerializerMethodField()
    sla_info = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'workflow', 'name', 'code', 'order',
            'assigned_to', 'assigned_to_name', 'assigned_to_full_name',
            'sla_info', 'description', 'is_active'
        ]

    def validate_assigned_to(self, value):
        if value and (value.is_superuser or value.username == 'admin'):
            raise serializers.ValidationError("کاربران مدیر ارشد (Admin) مجاز به انتصاب به عنوان مسئول مراحل اجرایی نیستند.")
        return value

    def get_assigned_to_full_name(self, obj):
        if obj.assigned_to:
            full = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
            return full if full else obj.assigned_to.username
        return None

    def get_sla_info(self, obj):
        sla = getattr(obj, 'sla', None) or getattr(obj, 'sla_policy', None)
        if sla and sla.is_active:
            dur_sec = sla.duration.total_seconds() if hasattr(sla, 'duration') and sla.duration else 0
            warn_sec = sla.warning_before.total_seconds() if hasattr(sla, 'warning_before') and sla.warning_before else 0
            return {
                'id': sla.id,
                'calendar_id': sla.calendar_id,
                'calendar_name': sla.calendar.name if sla.calendar else None,
                'duration_hours': int(dur_sec / 3600),
                'warning_threshold_hours': int(warn_sec / 3600),
            }
        return None

    def create(self, validated_data):
        workflow = validated_data.get('workflow')
        if not validated_data.get('code'):
            count = WorkflowStep.objects.filter(workflow=workflow).count() + 1
            validated_data['code'] = f"step_{count}"
        order = validated_data.get('order')
        if not order or WorkflowStep.objects.filter(workflow=workflow, order=order).exists():
            max_order = WorkflowStep.objects.filter(workflow=workflow).order_by('-order').values_list('order', flat=True).first() or 0
            validated_data['order'] = max_order + 1
        return super().create(validated_data)


class WorkflowTransitionSerializer(serializers.ModelSerializer):
    workflow = serializers.PrimaryKeyRelatedField(read_only=True)
    from_step_name = serializers.ReadOnlyField(source='from_step.name')
    to_step_name = serializers.ReadOnlyField(source='to_step.name')
    reject_to_step_name = serializers.ReadOnlyField(source='reject_to_step.name')
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = WorkflowTransition
        fields = [
            'id', 'workflow', 'name', 'code', 'from_step', 'from_step_name',
            'to_step', 'to_step_name', 'requires_acceptance', 'reject_to_step',
            'reject_to_step_name', 'description', 'is_active'
        ]

    def create(self, validated_data):
        if not validated_data.get('code'):
            count = WorkflowTransition.objects.filter(workflow=validated_data.get('workflow')).count() + 1
            validated_data['code'] = f"trans_{count}"
        return super().create(validated_data)


class WorkflowSerializer(serializers.ModelSerializer):
    steps = WorkflowStepSerializer(many=True, read_only=True)
    transitions = WorkflowTransitionSerializer(many=True, read_only=True)
    memberships = WorkflowMembershipSerializer(many=True, read_only=True)
    steps_count = serializers.SerializerMethodField()
    transitions_count = serializers.SerializerMethodField()
    instances_count = serializers.SerializerMethodField()
    starters = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'code', 'description', 'is_active',
            'created_at', 'updated_at', 'steps_count', 'transitions_count',
            'instances_count', 'steps', 'transitions', 'memberships', 'starters'
        ]

    def get_steps_count(self, obj):
        return obj.steps.count()

    def get_transitions_count(self, obj):
        return obj.transitions.count()

    def get_instances_count(self, obj):
        return obj.instances.count()

    def get_starters(self, obj):
        from workflow.authorization import WorkflowAuthorizationService
        from workflow.models import WorkflowPermission
        starters_list = []
        for m in obj.memberships.filter(is_active=True).select_related('user'):
            if WorkflowAuthorizationService.has_permission(
                user=m.user,
                workflow=obj,
                action=WorkflowPermission.Action.START
            ):
                starters_list.append({
                    'id': m.user.id,
                    'username': m.user.username,
                    'full_name': f"{m.user.first_name} {m.user.last_name}".strip() or m.user.username,
                    'role': m.role,
                })
        return starters_list


# -------------------------------------------------------------
# Cartable & Runtime Instance Serializers
# -------------------------------------------------------------
class WorkflowInstanceSerializer(serializers.ModelSerializer):
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    current_step_name = serializers.ReadOnlyField(source='current_step.name')
    started_by_name = serializers.ReadOnlyField(source='started_by.username')

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'workflow', 'workflow_name', 'current_step', 'current_step_name',
            'status', 'started_by', 'started_by_name', 'started_at', 'completed_at'
        ]


# -------------------------------------------------------------
# Backup & Disaster Recovery Serializers
# -------------------------------------------------------------
class BackupStorageDestinationSerializer(serializers.ModelSerializer):
    storage_type = serializers.ReadOnlyField(source='backend_type')
    path = serializers.ReadOnlyField(source='remote_path')
    is_active = serializers.ReadOnlyField(source='enabled')

    class Meta:
        model = BackupStorageDestination
        fields = [
            'id', 'name', 'backend_type', 'storage_type', 'host', 'port',
            'share', 'remote_path', 'path', 'username', 'enabled', 'is_active', 'description'
        ]


class BackupScheduleSerializer(serializers.ModelSerializer):
    days_of_week = serializers.ReadOnlyField(source='weekday')
    includes_media = serializers.ReadOnlyField(source='include_media')
    is_active = serializers.ReadOnlyField(source='enabled')
    last_run = serializers.ReadOnlyField(source='last_run_at')

    class Meta:
        model = BackupSchedule
        fields = [
            'id', 'name', 'frequency', 'time_of_day', 'weekday', 'days_of_week',
            'day_of_month', 'include_media', 'includes_media', 'destination',
            'enabled', 'is_active', 'last_run_at', 'last_run'
        ]


class BackupSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    size_bytes = serializers.ReadOnlyField(source='size')

    class Meta:
        model = Backup
        fields = [
            'id', 'filename', 'status', 'size', 'size_bytes', 'created_at', 'completed_at',
            'includes_media', 'destination', 'is_encrypted', 'created_by_name',
            'checksum', 'network_status'
        ]
