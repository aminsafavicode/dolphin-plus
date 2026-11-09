from django.urls import path
from api.views.auth import (
    AuthLoginView,
    AuthQuickLoginView,
    AuthLogoutView,
    AuthMeView,
)
from api.views.dashboard import DashboardStatsView
from api.views.workflows import (
    WorkflowListCreateView,
    WorkflowDetailView,
    WorkflowStepListCreateView,
    WorkflowStepDetailView,
    WorkflowTransitionListCreateView,
    WorkflowTransitionDetailView,
    WorkflowAccessMatrixView,
    WorkflowToggleStarterView,
)
from api.views.cartable import (
    CartableListView,
    CartableCreateInstanceView,
    CartableDetailView,
    CartableHandoffAcceptView,
    CartableHandoffRejectView,
    CartableExecuteTransitionView,
)
from api.views.operator_dashboard import (
    OperatorDashboardView,
    OperatorHideProcessView,
    OperatorRestoreProcessView,
)
from api.views.forms import (
    FormDefinitionDetailView,
    FormSectionListCreateView,
    FormSectionDetailView,
    FormFieldCreateView,
    FormFieldDetailView,
    FormRepeatableGroupCreateView,
    FormRepeatableGroupDetailView,
    FormPrintSettingsView,
)
from api.views.catalog import (
    DeviceTypeListCreateView,
    DeviceTypeDetailView,
    DeviceModelListCreateView,
    DeviceModelDetailView,
    DeviceListCreateView,
    DeviceDetailView,
    DeviceIdentifierListCreateView,
    DeviceIdentifierDetailView,
)
from api.views.lookups import (
    LookupListCreateView,
    LookupListDetailView,
    LookupItemCreateView,
    LookupItemDetailView,
    StaticChoiceSetListCreateView,
    StaticChoiceSetDetailView,
    StaticChoiceItemListCreateView,
    StaticChoiceItemDetailView,
)
from api.views.sla import (
    BusinessCalendarListCreateView,
    BusinessCalendarDetailView,
    WeeklyScheduleUpdateView,
    CalendarBulkScheduleView,
    CalendarExceptionCreateView,
    CalendarExceptionDeleteView,
    WorkflowStepSLAListCreateView,
    WorkflowStepSLADetailView,
)
from api.views.users import (
    UserListCreateView,
    UserDetailView,
    UserSetPasswordView,
    JobListCreateView,
    JobDetailView,
    GroupListCreateView,
    GroupDetailView,
    WorkflowMembershipListCreateView,
    WorkflowMembershipDeleteView,
)
from api.views.backup import (
    BackupStatusView,
    BackupTriggerView,
    BackupDeleteView,
)

app_name = 'api'

urlpatterns = [
    # Authentication & Session
    path('auth/login/', AuthLoginView.as_view(), name='auth_login'),
    path('auth/quick-login/', AuthQuickLoginView.as_view(), name='auth_quick_login'),
    path('auth/logout/', AuthLogoutView.as_view(), name='auth_logout'),
    path('auth/me/', AuthMeView.as_view(), name='auth_me'),

    # Dashboard & Stats
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # Cartable & Runtime Instances
    path('cartable/', CartableListView.as_view(), name='cartable_list'),
    path('cartable/create/', CartableCreateInstanceView.as_view(), name='cartable_create'),
    path('cartable/<int:instance_id>/', CartableDetailView.as_view(), name='cartable_detail'),
    path('cartable/<int:instance_id>/accept/', CartableHandoffAcceptView.as_view(), name='cartable_accept'),
    path('cartable/<int:instance_id>/reject/', CartableHandoffRejectView.as_view(), name='cartable_reject'),
    path('cartable/<int:instance_id>/transition/', CartableExecuteTransitionView.as_view(), name='cartable_transition'),

    # Operator Dedicated Workspace Dashboard & Preferences
    path('operator/dashboard/', OperatorDashboardView.as_view(), name='operator_dashboard'),
    path('operator/processes/<int:instance_id>/hide/', OperatorHideProcessView.as_view(), name='operator_hide_process'),
    path('operator/processes/<int:instance_id>/restore/', OperatorRestoreProcessView.as_view(), name='operator_restore_process'),

    # Workflows, Steps & Transitions
    path('workflows/', WorkflowListCreateView.as_view(), name='workflows_list_create'),
    path('workflows/<int:pk>/', WorkflowDetailView.as_view(), name='workflow_detail'),
    path('workflows/<int:workflow_id>/steps/', WorkflowStepListCreateView.as_view(), name='workflow_steps'),
    path('workflows/steps/<int:pk>/', WorkflowStepDetailView.as_view(), name='workflow_step_detail'),
    path('workflows/<int:workflow_id>/transitions/', WorkflowTransitionListCreateView.as_view(), name='workflow_transitions'),
    path('workflows/transitions/<int:pk>/', WorkflowTransitionDetailView.as_view(), name='workflow_transition_detail'),
    path('workflows/<int:workflow_id>/access-matrix/', WorkflowAccessMatrixView.as_view(), name='workflow_access_matrix'),
    path('workflows/<int:workflow_id>/starters/<int:user_id>/toggle/', WorkflowToggleStarterView.as_view(), name='workflow_toggle_starter'),

    # Form Builder
    path('forms/<int:workflow_id>/', FormDefinitionDetailView.as_view(), name='form_definition_detail'),
    path('forms/<int:workflow_id>/sections/', FormSectionListCreateView.as_view(), name='form_section_create'),
    path('forms/sections/<int:section_id>/', FormSectionDetailView.as_view(), name='form_section_detail'),
    path('forms/<int:workflow_id>/fields/', FormFieldCreateView.as_view(), name='form_field_create'),
    path('forms/fields/<int:field_id>/', FormFieldDetailView.as_view(), name='form_field_detail'),
    path('forms/<int:workflow_id>/groups/', FormRepeatableGroupCreateView.as_view(), name='form_group_create'),
    path('forms/groups/<int:group_id>/', FormRepeatableGroupDetailView.as_view(), name='form_group_detail'),
    path('forms/<int:workflow_id>/print-settings/', FormPrintSettingsView.as_view(), name='form_print_settings'),

    # Device Catalog
    path('catalog/types/', DeviceTypeListCreateView.as_view(), name='catalog_types'),
    path('catalog/types/<int:pk>/', DeviceTypeDetailView.as_view(), name='catalog_type_detail'),
    path('catalog/models/', DeviceModelListCreateView.as_view(), name='catalog_models'),
    path('catalog/models/<int:pk>/', DeviceModelDetailView.as_view(), name='catalog_model_detail'),
    path('catalog/devices/', DeviceListCreateView.as_view(), name='catalog_devices'),
    path('catalog/devices/<int:pk>/', DeviceDetailView.as_view(), name='catalog_device_detail'),
    path('catalog/identifiers/', DeviceIdentifierListCreateView.as_view(), name='catalog_identifiers'),
    path('catalog/identifiers/<int:pk>/', DeviceIdentifierDetailView.as_view(), name='catalog_identifier_detail'),

    # Data Sources / Lookups & Static Choices
    path('lookups/', LookupListCreateView.as_view(), name='lookups_list'),
    path('lookups/<int:pk>/', LookupListDetailView.as_view(), name='lookup_detail'),
    path('lookups/items/', LookupItemCreateView.as_view(), name='lookup_items'),
    path('lookups/items/<int:pk>/', LookupItemDetailView.as_view(), name='lookup_item_detail'),
    path('lookups/static/', StaticChoiceSetListCreateView.as_view(), name='static_choices_list'),
    path('lookups/static/<int:pk>/', StaticChoiceSetDetailView.as_view(), name='static_choice_detail'),
    path('lookups/static/items/', StaticChoiceItemListCreateView.as_view(), name='static_choice_items'),
    path('lookups/static/items/<int:pk>/', StaticChoiceItemDetailView.as_view(), name='static_choice_item_detail'),

    # Business Calendar & SLA
    path('sla/calendars/', BusinessCalendarListCreateView.as_view(), name='sla_calendars'),
    path('sla/calendars/<int:pk>/', BusinessCalendarDetailView.as_view(), name='sla_calendar_detail'),
    path('sla/calendars/<int:calendar_id>/bulk-schedule/', CalendarBulkScheduleView.as_view(), name='sla_calendar_bulk_schedule'),
    path('sla/calendars/<int:calendar_id>/exceptions/', CalendarExceptionCreateView.as_view(), name='sla_calendar_exceptions'),
    path('sla/exceptions/<int:pk>/', CalendarExceptionDeleteView.as_view(), name='sla_exception_delete'),
    path('sla/schedules/<int:schedule_id>/', WeeklyScheduleUpdateView.as_view(), name='sla_schedule_update'),
    path('sla/policies/', WorkflowStepSLAListCreateView.as_view(), name='sla_policies'),
    path('sla/policies/<int:pk>/', WorkflowStepSLADetailView.as_view(), name='sla_policy_detail'),

    # Users, Jobs, Groups & Memberships
    path('users/', UserListCreateView.as_view(), name='users_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('users/<int:user_id>/password/', UserSetPasswordView.as_view(), name='user_set_password'),
    path('jobs/', JobListCreateView.as_view(), name='jobs_list'),
    path('jobs/<int:pk>/', JobDetailView.as_view(), name='job_detail'),
    path('groups/', GroupListCreateView.as_view(), name='groups_list'),
    path('groups/<int:pk>/', GroupDetailView.as_view(), name='group_detail'),
    path('memberships/', WorkflowMembershipListCreateView.as_view(), name='memberships_list'),
    path('memberships/<int:pk>/', WorkflowMembershipDeleteView.as_view(), name='membership_delete'),

    # Backup & DR
    path('backup/status/', BackupStatusView.as_view(), name='backup_status'),
    path('backup/trigger/', BackupTriggerView.as_view(), name='backup_trigger'),
    path('backup/<int:backup_id>/', BackupDeleteView.as_view(), name='backup_delete'),
]
