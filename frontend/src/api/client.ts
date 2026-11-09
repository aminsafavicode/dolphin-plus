import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

export const api = {
  // Auth
  login: async (username: string, password?: string) => {
    const res = await apiClient.post('/auth/login/', { username, password });
    return res.data;
  },
  quickLogin: async (data: { user_id?: number; username?: string }) => {
    const res = await apiClient.post('/auth/quick-login/', data);
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout/');
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me/');
    return res.data;
  },

  // Dashboard stats
  getDashboardStats: async () => {
    const res = await apiClient.get('/dashboard/stats/');
    return res.data;
  },

  // Cartable
  getCartableTasks: async (tab = 'all', search = '') => {
    const res = await apiClient.get('/cartable/', { params: { tab, search } });
    return res.data;
  },
  getOperatorDashboard: async (userId?: number) => {
    const res = await apiClient.get('/operator/dashboard/', { params: { user_id: userId } });
    return res.data;
  },
  hideOperatorProcess: async (instanceId: number, userId?: number) => {
    const res = await apiClient.post(`/operator/processes/${instanceId}/hide/`, null, { params: { user_id: userId } });
    return res.data;
  },
  restoreOperatorProcess: async (instanceId: number, userId?: number) => {
    const res = await apiClient.post(`/operator/processes/${instanceId}/restore/`, null, { params: { user_id: userId } });
    return res.data;
  },
  createInstance: async (data: { workflow_id?: number; customer_name: string; device_model: string; description?: string; user_id?: number }) => {
    const res = await apiClient.post('/cartable/create/', data);
    return res.data;
  },
  getInstanceDetail: async (instanceId: string) => {
    const res = await apiClient.get(`/cartable/${instanceId}/`);
    return res.data;
  },
  acceptHandoff: async (instanceId: string) => {
    const res = await apiClient.post(`/cartable/${instanceId}/accept/`);
    return res.data;
  },
  rejectHandoff: async (instanceId: string, reason?: string) => {
    const res = await apiClient.post(`/cartable/${instanceId}/reject/`, { reason });
    return res.data;
  },
  executeTransition: async (instanceId: string, transitionId: number, notes?: string) => {
    const res = await apiClient.post(`/cartable/${instanceId}/transition/`, { transition_id: transitionId, notes });
    return res.data;
  },

  // Workflows
  getWorkflows: async (params?: { user_id?: number; startable_only?: boolean }) => {
    const res = await apiClient.get('/workflows/', { params });
    return res.data;
  },
  toggleWorkflowStarter: async (workflowId: number, userId: number, canStart?: boolean) => {
    const res = await apiClient.post(`/workflows/${workflowId}/starters/${userId}/toggle/`, { can_start: canStart });
    return res.data;
  },
  createWorkflow: async (data: { name: string; code: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.post('/workflows/', data);
    return res.data;
  },
  updateWorkflow: async (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/workflows/${id}/`, data);
    return res.data;
  },
  deleteWorkflow: async (id: number) => {
    const res = await apiClient.delete(`/workflows/${id}/`);
    return res.data;
  },
  getWorkflowSteps: async (workflowId: number) => {
    const res = await apiClient.get(`/workflows/${workflowId}/steps/`);
    return res.data;
  },
  createWorkflowStep: async (workflowId: number, data: { name: string; order?: number; assigned_to?: number | null; description?: string; is_active?: boolean }) => {
    const res = await apiClient.post(`/workflows/${workflowId}/steps/`, data);
    return res.data;
  },
  updateWorkflowStep: async (stepId: number, data: { name?: string; order?: number; assigned_to?: number | null; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/workflows/steps/${stepId}/`, data);
    return res.data;
  },
  deleteWorkflowStep: async (stepId: number) => {
    const res = await apiClient.delete(`/workflows/steps/${stepId}/`);
    return res.data;
  },
  getWorkflowTransitions: async (workflowId: number) => {
    const res = await apiClient.get(`/workflows/${workflowId}/transitions/`);
    return res.data;
  },
  createWorkflowTransition: async (workflowId: number, data: { name: string; from_step: number; to_step?: number | null; requires_acceptance?: boolean; reject_to_step?: number | null; description?: string; is_active?: boolean }) => {
    const res = await apiClient.post(`/workflows/${workflowId}/transitions/`, data);
    return res.data;
  },
  updateWorkflowTransition: async (transitionId: number, data: { name?: string; from_step?: number; to_step?: number | null; requires_acceptance?: boolean; reject_to_step?: number | null; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/workflows/transitions/${transitionId}/`, data);
    return res.data;
  },
  deleteWorkflowTransition: async (transitionId: number) => {
    const res = await apiClient.delete(`/workflows/transitions/${transitionId}/`);
    return res.data;
  },
  getWorkflowAccessMatrix: async (
    workflowId: number,
    params?: { subject_type?: string; subject?: string | number; step_id?: number }
  ) => {
    const res = await apiClient.get(`/workflows/${workflowId}/access-matrix/`, { params });
    return res.data;
  },
  saveWorkflowAccessMatrix: async (workflowId: number, data: any) => {
    const res = await apiClient.post(`/workflows/${workflowId}/access-matrix/`, data);
    return res.data;
  },

  // Dynamic Forms & Form Builder
  getFormDefinition: async (workflowId: number) => {
    const res = await apiClient.get(`/forms/${workflowId}/`);
    return res.data;
  },
  updateFormDefinition: async (workflowId: number, data: { name?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/forms/${workflowId}/`, data);
    return res.data;
  },
  createFormSection: async (workflowId: number, data: { name: string; code?: string; description?: string }) => {
    const res = await apiClient.post(`/forms/${workflowId}/sections/`, data);
    return res.data;
  },
  updateFormSection: async (sectionId: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/forms/sections/${sectionId}/`, data);
    return res.data;
  },
  deleteFormSection: async (sectionId: number) => {
    const res = await apiClient.delete(`/forms/sections/${sectionId}/`);
    return res.data;
  },
  createFormField: async (workflowId: number, data: any) => {
    const res = await apiClient.post(`/forms/${workflowId}/fields/`, data);
    return res.data;
  },
  updateFormField: async (fieldId: number, data: any) => {
    const res = await apiClient.patch(`/forms/fields/${fieldId}/`, data);
    return res.data;
  },
  deleteFormField: async (fieldId: number) => {
    const res = await apiClient.delete(`/forms/fields/${fieldId}/`);
    return res.data;
  },
  createFormGroup: async (workflowId: number, data: any) => {
    const res = await apiClient.post(`/forms/${workflowId}/groups/`, data);
    return res.data;
  },
  updateFormGroup: async (groupId: number, data: any) => {
    const res = await apiClient.patch(`/forms/groups/${groupId}/`, data);
    return res.data;
  },
  deleteFormGroup: async (groupId: number) => {
    const res = await apiClient.delete(`/forms/groups/${groupId}/`);
    return res.data;
  },
  getFormPrintSettings: async (workflowId: number) => {
    const res = await apiClient.get(`/forms/${workflowId}/print-settings/`);
    return res.data;
  },
  updateFormPrintSettings: async (workflowId: number, data: any) => {
    const res = await apiClient.patch(`/forms/${workflowId}/print-settings/`, data);
    return res.data;
  },

  // Device Catalog
  getCatalogTypes: async () => {
    const res = await apiClient.get('/catalog/types/');
    return res.data;
  },
  createCatalogType: async (data: { name: string; code: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.post('/catalog/types/', data);
    return res.data;
  },
  updateCatalogType: async (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/catalog/types/${id}/`, data);
    return res.data;
  },
  deleteCatalogType: async (id: number) => {
    const res = await apiClient.delete(`/catalog/types/${id}/`);
    return res.data;
  },

  getCatalogModels: async () => {
    const res = await apiClient.get('/catalog/models/');
    return res.data;
  },
  createCatalogModel: async (data: { name: string; device_type: number; brand: string; code: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.post('/catalog/models/', data);
    return res.data;
  },
  updateCatalogModel: async (id: number, data: { name?: string; device_type?: number; brand?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/catalog/models/${id}/`, data);
    return res.data;
  },
  deleteCatalogModel: async (id: number) => {
    const res = await apiClient.delete(`/catalog/models/${id}/`);
    return res.data;
  },

  getCatalogDevices: async () => {
    const res = await apiClient.get('/catalog/devices/');
    return res.data;
  },
  createCatalogDevice: async (data: { device_model: number; description?: string }) => {
    const res = await apiClient.post('/catalog/devices/', data);
    return res.data;
  },
  updateCatalogDevice: async (id: number, data: { device_model?: number; description?: string }) => {
    const res = await apiClient.patch(`/catalog/devices/${id}/`, data);
    return res.data;
  },
  deleteCatalogDevice: async (id: number) => {
    const res = await apiClient.delete(`/catalog/devices/${id}/`);
    return res.data;
  },

  getCatalogIdentifiers: async (deviceId?: number) => {
    const res = await apiClient.get('/catalog/identifiers/', { params: deviceId ? { device: deviceId } : {} });
    return res.data;
  },
  createCatalogIdentifier: async (data: { device: number; identifier_type: string; value: string }) => {
    const res = await apiClient.post('/catalog/identifiers/', data);
    return res.data;
  },
  deleteCatalogIdentifier: async (id: number) => {
    const res = await apiClient.delete(`/catalog/identifiers/${id}/`);
    return res.data;
  },

  // Dynamic Hierarchical Lookups
  getLookups: async () => {
    const res = await apiClient.get('/lookups/');
    return res.data;
  },
  createLookupList: async (data: { name: string; code: string; description?: string }) => {
    const res = await apiClient.post('/lookups/', data);
    return res.data;
  },
  updateLookupList: async (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/lookups/${id}/`, data);
    return res.data;
  },
  deleteLookupList: async (id: number) => {
    const res = await apiClient.delete(`/lookups/${id}/`);
    return res.data;
  },
  createLookupItem: async (data: { lookup_list: number; code: string; label: string; order?: number; parent?: number | null }) => {
    const res = await apiClient.post('/lookups/items/', data);
    return res.data;
  },
  updateLookupItem: async (id: number, data: { code?: string; label?: string; order?: number; parent?: number | null; is_active?: boolean }) => {
    const res = await apiClient.patch(`/lookups/items/${id}/`, data);
    return res.data;
  },
  deleteLookupItem: async (id: number) => {
    const res = await apiClient.delete(`/lookups/items/${id}/`);
    return res.data;
  },

  // Static Choice Sets
  getStaticChoiceSets: async () => {
    const res = await apiClient.get('/lookups/static/');
    return res.data;
  },
  createStaticChoiceSet: async (data: { name: string; code: string; description?: string }) => {
    const res = await apiClient.post('/lookups/static/', data);
    return res.data;
  },
  updateStaticChoiceSet: async (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    const res = await apiClient.patch(`/lookups/static/${id}/`, data);
    return res.data;
  },
  deleteStaticChoiceSet: async (id: number) => {
    const res = await apiClient.delete(`/lookups/static/${id}/`);
    return res.data;
  },
  createStaticChoiceItem: async (data: { choice_set: number; code: string; label: string; order?: number }) => {
    const res = await apiClient.post('/lookups/static/items/', data);
    return res.data;
  },
  updateStaticChoiceItem: async (id: number, data: { code?: string; label?: string; order?: number; is_active?: boolean }) => {
    const res = await apiClient.patch(`/lookups/static/items/${id}/`, data);
    return res.data;
  },
  deleteStaticChoiceItem: async (id: number) => {
    const res = await apiClient.delete(`/lookups/static/items/${id}/`);
    return res.data;
  },

  // SLA & Calendar
  getCalendars: async () => {
    const res = await apiClient.get('/sla/calendars/');
    return res.data;
  },
  createCalendar: async (data: { name: string; code?: string; timezone?: string }) => {
    const res = await apiClient.post('/sla/calendars/', data);
    return res.data;
  },
  deleteCalendar: async (calendarId: number) => {
    const res = await apiClient.delete(`/sla/calendars/${calendarId}/`);
    return res.data;
  },
  updateSchedule: async (scheduleId: number, data: { is_working?: boolean; intervals?: { start_time: string; end_time: string }[] }) => {
    const res = await apiClient.put(`/sla/schedules/${scheduleId}/`, data);
    return res.data;
  },
  bulkSchedule: async (calendarId: number, data: { weekdays: number[]; intervals: { start_time: string; end_time: string }[] }) => {
    const res = await apiClient.post(`/sla/calendars/${calendarId}/bulk-schedule/`, data);
    return res.data;
  },
  createCalendarException: async (calendarId: number, data: { date: string; status: 'NON_WORKING' | 'WORKING'; title: string; description?: string }) => {
    const res = await apiClient.post(`/sla/calendars/${calendarId}/exceptions/`, data);
    return res.data;
  },
  deleteCalendarException: async (exceptionId: number) => {
    const res = await apiClient.delete(`/sla/exceptions/${exceptionId}/`);
    return res.data;
  },
  getSlaPolicies: async () => {
    const res = await apiClient.get('/sla/policies/');
    return res.data;
  },
  createSlaPolicy: async (data: { step: number; calendar: number; duration: string; warning_before?: string; is_active?: boolean }) => {
    const res = await apiClient.post('/sla/policies/', data);
    return res.data;
  },
  deleteSlaPolicy: async (policyId: number) => {
    const res = await apiClient.delete(`/sla/policies/${policyId}/`);
    return res.data;
  },

  // Users, Jobs, Groups & Memberships
  getUsers: async () => {
    const res = await apiClient.get('/users/');
    return res.data;
  },
  createUser: async (data: {
    username: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    job_id?: number | null;
    group_ids?: number[];
    is_staff?: boolean;
    is_active?: boolean;
  }) => {
    const res = await apiClient.post('/users/', data);
    return res.data;
  },
  updateUser: async (userId: number, data: any) => {
    const res = await apiClient.patch(`/users/${userId}/`, data);
    return res.data;
  },
  deleteUser: async (userId: number) => {
    const res = await apiClient.delete(`/users/${userId}/`);
    return res.data;
  },
  setUserPassword: async (userId: number, password: string) => {
    const res = await apiClient.post(`/users/${userId}/password/`, { password });
    return res.data;
  },

  // Jobs
  getJobs: async () => {
    const res = await apiClient.get('/jobs/');
    return res.data;
  },
  createJob: async (data: { name: string; code: string; description?: string }) => {
    const res = await apiClient.post('/jobs/', data);
    return res.data;
  },
  deleteJob: async (jobId: number) => {
    const res = await apiClient.delete(`/jobs/${jobId}/`);
    return res.data;
  },

  // Groups
  getGroups: async () => {
    const res = await apiClient.get('/groups/');
    return res.data;
  },
  createGroup: async (data: { name: string }) => {
    const res = await apiClient.post('/groups/', data);
    return res.data;
  },
  deleteGroup: async (groupId: number) => {
    const res = await apiClient.delete(`/groups/${groupId}/`);
    return res.data;
  },

  // Workflow Memberships
  getMemberships: async (params?: { user_id?: number; workflow_id?: number }) => {
    const res = await apiClient.get('/memberships/', { params });
    return res.data;
  },
  createMembership: async (data: { workflow: number; user: number; role: 'VIEWER' | 'EXECUTOR' | 'MANAGER'; can_start?: boolean }) => {
    const res = await apiClient.post('/memberships/', data);
    return res.data;
  },
  deleteMembership: async (membershipId: number) => {
    const res = await apiClient.delete(`/memberships/${membershipId}/`);
    return res.data;
  },

  // Backup & DR
  getBackupStatus: async () => {
    const res = await apiClient.get('/backup/status/');
    return res.data;
  },
  triggerBackup: async (includesMedia = false, isEncrypted = false) => {
    const res = await apiClient.post('/backup/trigger/', { includes_media: includesMedia, is_encrypted: isEncrypted });
    return res.data;
  },
  deleteBackup: async (backupId: number) => {
    const res = await apiClient.delete(`/backup/${backupId}/`);
    return res.data;
  },
};
