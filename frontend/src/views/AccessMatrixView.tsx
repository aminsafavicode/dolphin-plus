import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  ShieldCheck,
  Users,
  Layers,
  Eye,
  EyeOff,
  Edit2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
  Search,
  GitBranch,
  Table as TableIcon,
  RotateCcw
} from 'lucide-react';
import { api } from '../api/client';

interface AccessMatrixViewProps {
  initialWorkflowId?: number | null;
  initialUserId?: number | null;
  initialStepId?: number | null;
}

export const AccessMatrixView: FC<AccessMatrixViewProps> = ({
  initialWorkflowId,
  initialUserId,
  initialStepId,
}) => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWfId, setSelectedWfId] = useState<number | null>(initialWorkflowId || null);

  // Subject and Step context
  const [subjectType, setSubjectType] = useState<'user' | 'role'>('user');
  const [selectedSubject, setSelectedSubject] = useState<string>(initialUserId ? String(initialUserId) : '');
  const [selectedStepId, setSelectedStepId] = useState<number | null>(initialStepId || null);

  // Loaded raw matrix from backend
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [fieldPerms, setFieldPerms] = useState<Record<number, { can_view: boolean; can_edit: boolean }>>({});
  const [groupPerms, setGroupPerms] = useState<Record<number, { can_view: boolean; can_edit: boolean; can_add: boolean; can_delete: boolean }>>({});
  const [wfPerms, setWfPerms] = useState<Record<string, boolean>>({});
  const [stepPerms, setStepPerms] = useState<Record<string, boolean>>({});
  const [stepActionPerms, setStepActionPerms] = useState<Record<string, boolean>>({});
  const [transPerms, setTransPerms] = useState<Record<number, boolean>>({});

  // Active view tab inside Matrix
  const [activeMatrixTab, setActiveMatrixTab] = useState<'fields' | 'groups' | 'actions'>('fields');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<number | 'ALL'>('ALL');

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // 1. Initial Load of Workflows
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const wfs = await api.getWorkflows();
        setWorkflows(wfs);
        if (wfs.length > 0 && !selectedWfId) {
          const target = initialWorkflowId || wfs[0].id;
          setSelectedWfId(target);
        }
      } catch (err: any) {
        showNotification('خطا در بارگذاری لیست فرآیندها: ' + (err.message || ''), true);
      }
    };
    fetchWorkflows();
  }, []);

  // 2. Fetch Matrix whenever workflow, subjectType, subject or step changes
  const loadMatrix = async (wfId: number, sType: string, sub: string, stepId?: number | null) => {
    setLoading(true);
    try {
      const res = await api.getWorkflowAccessMatrix(wfId, {
        subject_type: sType,
        subject: sub || undefined,
        step_id: stepId || undefined,
      });
      setMatrixData(res);

      // Sync active subject & step
      setSubjectType(res.subject_type || 'user');
      setSelectedSubject(String(res.subject || ''));
      setSelectedStepId(res.selected_step_id || null);

      // Initialize local field permissions
      const initialFieldPerms: Record<number, { can_view: boolean; can_edit: boolean }> = {};
      (res.fields || []).forEach((f: any) => {
        initialFieldPerms[f.id] = {
          can_view: !!f.can_view,
          can_edit: !!f.can_edit,
        };
      });
      setFieldPerms(initialFieldPerms);

      // Initialize local group permissions
      const initialGroupPerms: Record<number, { can_view: boolean; can_edit: boolean; can_add: boolean; can_delete: boolean }> = {};
      (res.repeatable_groups || []).forEach((g: any) => {
        initialGroupPerms[g.id] = {
          can_view: !!g.can_view,
          can_edit: !!g.can_edit,
          can_add: !!g.can_add,
          can_delete: !!g.can_delete,
        };
      });
      setGroupPerms(initialGroupPerms);

      // Initialize workflow permissions
      const initialWfPerms: Record<string, boolean> = {};
      (res.workflow_permissions || []).forEach((wp: any) => {
        initialWfPerms[wp.value] = !!wp.enabled;
      });
      setWfPerms(initialWfPerms);

      // Initialize step permissions
      const initialStepPerms: Record<string, boolean> = {};
      (res.step_permissions || []).forEach((sp: any) => {
        initialStepPerms[sp.value] = !!sp.enabled;
      });
      setStepPerms(initialStepPerms);

      // Step action permissions
      const initialStepActions: Record<string, boolean> = {};
      (res.step_actions || []).forEach((sa: any) => {
        initialStepActions[sa.value] = !!sa.enabled;
      });
      setStepActionPerms(initialStepActions);

      // Transition permissions
      const initialTrans: Record<number, boolean> = {};
      (res.transitions || []).forEach((t: any) => {
        initialTrans[t.id] = !!t.allowed;
      });
      setTransPerms(initialTrans);

    } catch (err: any) {
      showNotification('خطا در دریافت ماتریس دسترسی: ' + (err.response?.data?.error || err.message || ''), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWfId) {
      loadMatrix(selectedWfId, subjectType, selectedSubject, selectedStepId);
    }
  }, [selectedWfId]);

  // Handle Workflow Switch
  const handleSelectWorkflow = (wfId: number) => {
    setSelectedWfId(wfId);
    setSelectedSubject('');
    setSelectedStepId(null);
  };

  // Handle Subject Switch
  const handleChangeSubject = (type: 'user' | 'role', val: string) => {
    setSubjectType(type);
    setSelectedSubject(val);
    if (selectedWfId) {
      loadMatrix(selectedWfId, type, val, selectedStepId);
    }
  };

  // Handle Step Switch
  const handleChangeStep = (stepId: number) => {
    setSelectedStepId(stepId);
    if (selectedWfId) {
      loadMatrix(selectedWfId, subjectType, selectedSubject, stepId);
    }
  };

  // -----------------------------------------------------------------
  // Toggles for Field Permissions
  // -----------------------------------------------------------------
  // Set single field access level: 'none' (hidden), 'readonly' (view only), 'edit' (view + edit)
  const setFieldAccessLevel = (fieldId: number, level: 'none' | 'readonly' | 'edit') => {
    setFieldPerms((prev) => ({
      ...prev,
      [fieldId]: {
        can_view: level !== 'none',
        can_edit: level === 'edit',
      },
    }));
  };

  // Bulk set for filtered fields
  const setFilteredFieldsLevel = (level: 'none' | 'readonly' | 'edit') => {
    setFieldPerms((prev) => {
      const next = { ...prev };
      filteredFields.forEach((f: any) => {
        next[f.id] = {
          can_view: level !== 'none',
          can_edit: level === 'edit',
        };
      });
      return next;
    });
    const label = level === 'none' ? 'مخفی' : level === 'readonly' ? 'فقط‌خواندنی' : 'قابل ویرایش';
    showNotification(`سطح دسترسی فیلدهای فیلترشده بر روی «${label}» تنظیم شد.`);
  };

  // -----------------------------------------------------------------
  // Toggles for Repeatable Groups
  // -----------------------------------------------------------------
  const toggleGroupView = (groupId: number) => {
    setGroupPerms((prev) => {
      const curr = prev[groupId] || { can_view: false, can_edit: false, can_add: false, can_delete: false };
      const nextView = !curr.can_view;
      return {
        ...prev,
        [groupId]: {
          can_view: nextView,
          can_edit: nextView ? curr.can_edit : false,
          can_add: nextView ? curr.can_add : false,
          can_delete: nextView ? curr.can_delete : false,
        },
      };
    });
  };

  const toggleGroupEdit = (groupId: number) => {
    setGroupPerms((prev) => {
      const curr = prev[groupId] || { can_view: false, can_edit: false, can_add: false, can_delete: false };
      const nextEdit = !curr.can_edit;
      return {
        ...prev,
        [groupId]: {
          ...curr,
          can_view: nextEdit ? true : curr.can_view,
          can_edit: nextEdit,
        },
      };
    });
  };

  const toggleGroupAdd = (groupId: number) => {
    setGroupPerms((prev) => {
      const curr = prev[groupId] || { can_view: false, can_edit: false, can_add: false, can_delete: false };
      const nextAdd = !curr.can_add;
      return {
        ...prev,
        [groupId]: {
          ...curr,
          can_view: nextAdd ? true : curr.can_view,
          can_add: nextAdd,
        },
      };
    });
  };

  const toggleGroupDelete = (groupId: number) => {
    setGroupPerms((prev) => {
      const curr = prev[groupId] || { can_view: false, can_edit: false, can_add: false, can_delete: false };
      const nextDelete = !curr.can_delete;
      return {
        ...prev,
        [groupId]: {
          ...curr,
          can_view: nextDelete ? true : curr.can_view,
          can_delete: nextDelete,
        },
      };
    });
  };

  // -----------------------------------------------------------------
  // Quick Presets
  // -----------------------------------------------------------------
  const applyPreset = (mode: 'full' | 'readonly' | 'none') => {
    if (!matrixData) return;

    if (mode === 'full') {
      const nextFields: Record<number, any> = {};
      (matrixData.fields || []).forEach((f: any) => {
        nextFields[f.id] = { can_view: true, can_edit: true };
      });
      setFieldPerms(nextFields);

      const nextGroups: Record<number, any> = {};
      (matrixData.repeatable_groups || []).forEach((g: any) => {
        nextGroups[g.id] = { can_view: true, can_edit: true, can_add: true, can_delete: true };
      });
      setGroupPerms(nextGroups);

      setWfPerms({ VIEW: true, START: true, MANAGE: false, HISTORY: true });
      setStepPerms({ VIEW: true, EXECUTE: true, MANAGE: false });
      showNotification('الگوی دسترسی کامل (مشاهده و ویرایش) بر روی فیلدها اعمال شد');
    } else if (mode === 'readonly') {
      const nextFields: Record<number, any> = {};
      (matrixData.fields || []).forEach((f: any) => {
        nextFields[f.id] = { can_view: true, can_edit: false };
      });
      setFieldPerms(nextFields);

      const nextGroups: Record<number, any> = {};
      (matrixData.repeatable_groups || []).forEach((g: any) => {
        nextGroups[g.id] = { can_view: true, can_edit: false, can_add: false, can_delete: false };
      });
      setGroupPerms(nextGroups);

      setWfPerms({ VIEW: true, START: false, MANAGE: false, HISTORY: true });
      setStepPerms({ VIEW: true, EXECUTE: false, MANAGE: false });
      showNotification('الگوی فقط خواندنی (مشاهده، بدون ویرایش) بر روی فیلدها اعمال شد');
    } else if (mode === 'none') {
      const nextFields: Record<number, any> = {};
      (matrixData.fields || []).forEach((f: any) => {
        nextFields[f.id] = { can_view: false, can_edit: false };
      });
      setFieldPerms(nextFields);

      const nextGroups: Record<number, any> = {};
      (matrixData.repeatable_groups || []).forEach((g: any) => {
        nextGroups[g.id] = { can_view: false, can_edit: false, can_add: false, can_delete: false };
      });
      setGroupPerms(nextGroups);

      setWfPerms({ VIEW: false, START: false, MANAGE: false, HISTORY: false });
      setStepPerms({ VIEW: false, EXECUTE: false, MANAGE: false });
      showNotification('تمام دسترسی‌ها و فیلدها برای این سوژه مسدود و مخفی شد');
    }
  };

  // -----------------------------------------------------------------
  // Save Matrix to Backend
  // -----------------------------------------------------------------
  const handleSaveMatrix = async () => {
    if (!selectedWfId || !selectedSubject || !selectedStepId) {
      showNotification('لطفاً فرآیند، کاربر/نقش و مرحله مورد نظر را انتخاب نمایید', true);
      return;
    }

    setSaving(true);
    try {
      const fieldsPayload = Object.entries(fieldPerms).map(([fId, p]) => ({
        id: Number(fId),
        can_view: p.can_view,
        can_edit: p.can_edit,
      }));

      const groupsPayload = Object.entries(groupPerms).map(([gId, p]) => ({
        id: Number(gId),
        can_view: p.can_view,
        can_edit: p.can_edit,
        can_add: p.can_add,
        can_delete: p.can_delete,
      }));

      const payload = {
        subject_type: subjectType,
        subject: selectedSubject,
        step_id: selectedStepId,
        workflow_permissions: wfPerms,
        step_permissions: stepPerms,
        step_actions: stepActionPerms,
        transitions: transPerms,
        fields: fieldsPayload,
        repeatable_groups: groupsPayload,
      };

      await api.saveWorkflowAccessMatrix(selectedWfId, payload);
      showNotification('ماتریس دسترسی‌ها و مجوزهای امنیتی با موفقیت در سیستم ثبت گردید.');
      // Refresh to ensure exact synchronization
      loadMatrix(selectedWfId, subjectType, selectedSubject, selectedStepId);
    } catch (err: any) {
      showNotification(err.response?.data?.error || err.message || 'خطا در ذخیره ماتریس دسترسی', true);
    } finally {
      setSaving(false);
    }
  };

  // Filtered fields list
  const allFields = matrixData?.fields || [];
  const sectionsList: Array<{ id: number; name: string }> = Array.from(
    new Set<number>(
      allFields
        .map((f: any) => Number(f.section_id))
        .filter((id: number) => !isNaN(id) && id > 0)
    )
  ).map((secId: number) => {
    const f = allFields.find((item: any) => Number(item.section_id) === secId);
    return { id: secId, name: (f?.section_name as string) || `بخش ${secId}` };
  });

  const filteredFields = allFields.filter((f: any) => {
    const matchesSearch =
      !searchTerm.trim() ||
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.section_name && f.section_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSection = selectedSectionFilter === 'ALL' || f.section_id === selectedSectionFilter;
    return matchesSearch && matchesSection;
  });

  const selectedStepObj = matrixData?.steps?.find((s: any) => s.id === selectedStepId);
  const selectedUserObj = matrixData?.selected_user;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              ماتریس امنیت و کنترل دسترسی فرآیندها (Access Control Matrix)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت دقیق مشاهده/ویرایش فیلدهای فرم، جداول اقلام، اختیارات مرحله و انتقال‌ها بر اساس کاربر یا نقش
            </p>
          </div>
        </div>

        {/* Workflow Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">انتخاب فرآیند:</span>
            <select
              value={selectedWfId || ''}
              onChange={(e) => handleSelectWorkflow(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            ×
          </button>
        </div>
      )}

      {/* Context Selection Panel: Subject & Step */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 1. Subject Selector (User vs Role) */}
          <div className="lg:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>سوژه هدف دسترسی:</span>
              </span>

              {/* Segmented control: User / Role */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => handleChangeSubject('user', matrixData?.all_users?.[0]?.id || '')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    subjectType === 'user'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  کاربر اختصاصی
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeSubject('role', 'EXECUTOR')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    subjectType === 'role'
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  نقش سازمانی
                </button>
              </div>
            </div>

            {/* If Subject == User */}
            {subjectType === 'user' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedSubject}
                  onChange={(e) => handleChangeSubject('user', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-colors cursor-pointer"
                >
                  <optgroup label="اعضای دارای نقش در این فرآیند">
                    {(matrixData?.memberships || []).map((m: any) => (
                      <option key={`mem_${m.user_id}`} value={m.user_id}>
                        👤 {m.full_name || m.username} ({m.username}) — نقش: {m.role}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="سایر پرسنل سامانه">
                    {(matrixData?.all_users || [])
                      .filter((u: any) => !u.is_superuser && u.username !== 'admin' && !(matrixData?.memberships || []).some((m: any) => m.user_id === u.id))
                      .map((u: any) => (
                        <option key={`user_${u.id}`} value={u.id}>
                          👤 {u.full_name || u.username} ({u.username})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* If Subject == Role */}
            {subjectType === 'role' && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'EXECUTOR', label: 'مجری فرآیند' },
                  { value: 'VIEWER', label: 'مشاهده‌کننده' },
                  { value: 'MANAGER', label: 'مدیر فرآیند' },
                ].map((r: any) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleChangeSubject('role', r.value)}
                    className={`p-2 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                      selectedSubject === r.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Step Selector */}
          <div className="lg:col-span-6 space-y-2.5">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>مرحله فرآیند (تنظیم دسترسی در این گام):</span>
            </span>

            {matrixData?.steps?.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                این فرآیند فاقد هرگونه مرحله است. لطفاً ابتدا در «میز کار فرآیندها» مراحلی برای آن ایجاد نمایید.
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {(matrixData?.steps || []).map((step: any) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleChangeStep(step.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                      selectedStepId === step.id
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedStepId === step.id ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {step.order}
                    </span>
                    <span>{step.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 ml-1">الگوهای اعمال سریع:</span>
            <button
              type="button"
              onClick={() => applyPreset('full')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-xs border border-emerald-200/60 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>دسترسی کامل</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('readonly')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-xs border border-amber-200/60 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>فقط خواندنی</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('none')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>عدم دسترسی</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            هدف فعال: <span className="text-slate-800 font-semibold">{subjectType === 'user' ? `کاربر: ${selectedUserObj?.username || selectedSubject}` : `نقش: ${selectedSubject}`}</span> | مرحله: <span className="text-blue-700 font-semibold">{selectedStepObj?.name || '—'}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs for Permission Matrices */}
      <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveMatrixTab('fields')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeMatrixTab === 'fields'
              ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
          }`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>دسترسی فیلدها</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
            activeMatrixTab === 'fields' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {allFields.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMatrixTab('groups')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeMatrixTab === 'groups'
              ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>جداول تکرارپذیر</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
            activeMatrixTab === 'groups' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {(matrixData?.repeatable_groups || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveMatrixTab('actions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeMatrixTab === 'actions'
              ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>اختیارات فرآیند و گذارها</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: FORM FIELDS ACCESS MATRIX */}
      {/* ============================================================= */}
      {activeMatrixTab === 'fields' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* Search, Section Filter & Quick Bulk Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="جستجو در فیلدها با نام، کد یا بخش..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Section Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSectionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedSectionFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه
                </button>
                {sectionsList.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSectionFilter(sec.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selectedSectionFilter === sec.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sec.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Bulk Setting for Current View */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">تنظیم سریع فیلترشده‌ها:</span>
              <button
                type="button"
                onClick={() => setFilteredFieldsLevel('none')}
                className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 text-[11px] font-medium transition-colors cursor-pointer"
                title="مخفی کردن تمام فیلدهای نمایش داده‌شده"
              >
                همه مخفی
              </button>
              <button
                type="button"
                onClick={() => setFilteredFieldsLevel('readonly')}
                className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 text-[11px] font-medium transition-colors cursor-pointer"
                title="فقط‌خواندنی کردن تمام فیلدهای نمایش داده‌شده"
              >
                همه فقط‌خواندنی
              </button>
              <button
                type="button"
                onClick={() => setFilteredFieldsLevel('edit')}
                className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 text-[11px] font-medium transition-colors cursor-pointer"
                title="قابل ویرایش کردن تمام فیلدهای نمایش داده‌شده"
              >
                همه ویرایش
              </button>
            </div>
          </div>

          {/* Fields List */}
          {filteredFields.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {loading ? 'در حال دریافت اطلاعات فیلدها...' : 'هیچ فیلدی با معیارهای جستجو یافت نشد.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center font-mono text-slate-500">#</th>
                    <th className="py-2.5 px-4">مشخصات فیلد فرم</th>
                    <th className="py-2.5 px-4">بخش / جدول</th>
                    <th className="py-2.5 px-4 w-60 text-center">سطح دسترسی در این مرحله</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFields.map((field: any, idx: number) => {
                    const perm = fieldPerms[field.id] || { can_view: false, can_edit: false };
                    const isHidden = !perm.can_view;
                    const isReadOnly = perm.can_view && !perm.can_edit;
                    const isEdit = perm.can_view && perm.can_edit;

                    return (
                      <tr
                        key={field.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isHidden ? 'bg-slate-50/40 text-slate-400' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isHidden ? 'text-slate-600' : 'text-slate-900'}`}>{field.label}</span>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {field.code}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                              {field.field_type}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-slate-500">
                          <span>{field.section_name || 'بخش اصلی'}</span>
                          {field.repeatable_group_label && (
                            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mr-1.5 border border-indigo-200/50">
                              جدول: {field.repeatable_group_label}
                            </span>
                          )}
                        </td>

                        {/* 3-State Segmented Control */}
                        <td className="py-2 px-4 text-center">
                          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => setFieldAccessLevel(field.id, 'none')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                isHidden
                                  ? 'bg-rose-50 text-rose-700 font-semibold shadow-2xs border border-rose-200/80'
                                  : 'text-slate-500 hover:text-slate-800 font-normal'
                              }`}
                              title="مخفی‌سازی فیلد"
                            >
                              <EyeOff className="w-3 h-3" />
                              <span>مخفی</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFieldAccessLevel(field.id, 'readonly')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                isReadOnly
                                  ? 'bg-amber-50 text-amber-700 font-semibold shadow-2xs border border-amber-200/80'
                                  : 'text-slate-500 hover:text-slate-800 font-normal'
                              }`}
                              title="فقط رویت بدون ویرایش"
                            >
                              <Eye className="w-3 h-3" />
                              <span>فقط‌خواندنی</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFieldAccessLevel(field.id, 'edit')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                isEdit
                                  ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800 font-normal'
                              }`}
                              title="رویت و امکان ویرایش فیلد"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ویرایش</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: REPEATABLE GROUPS ACCESS MATRIX */}
      {/* ============================================================= */}
      {activeMatrixTab === 'groups' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                دسترسی‌های چهارگانه جداول تکرارشونده و اقلام
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تعیین مجوزهای مشاهده، ویرایش مقادیر، افزودن سطر جدید و حذف سطرها در هر جدول به تفکیک
              </p>
            </div>
          </div>

          {(matrixData?.repeatable_groups || []).length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              هیچ جدول تکرارپذیری در فرم این فرآیند تعریف نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(matrixData?.repeatable_groups || []).map((grp: any) => {
                const perm = groupPerms[grp.id] || {
                  can_view: false,
                  can_edit: false,
                  can_add: false,
                  can_delete: false,
                };

                return (
                  <div
                    key={grp.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-900 text-xs">{grp.label}</span>
                        <span className="text-[11px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {grp.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">بخش: {grp.section_name}</span>
                    </div>

                    {/* 4 Capability Toggles */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => toggleGroupView(grp.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          perm.can_view
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70 font-semibold'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>مشاهده جدول</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => toggleGroupEdit(grp.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          perm.can_edit
                            ? 'bg-blue-50 text-blue-800 border-blue-200/70 font-semibold'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>ویرایش مقادیر</span>
                      </button>

                      {/* Add */}
                      <button
                        type="button"
                        onClick={() => toggleGroupAdd(grp.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          perm.can_add
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200/70 font-semibold'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>افزودن سطر</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => toggleGroupDelete(grp.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          perm.can_delete
                            ? 'bg-rose-50 text-rose-800 border-rose-200/70 font-semibold'
                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>حذف سطر</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: WORKFLOW ACTIONS & TRANSITIONS PERMISSIONS */}
      {/* ============================================================= */}
      {activeMatrixTab === 'actions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* General Workflow Actions Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="pb-2.5 border-b border-slate-100">
              <h4 className="text-xs font-semibold text-slate-900">مجوزهای کلی سطح فرآیند</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">اختیارات کاربر یا نقش نسبت به کل چرخه فرآیند</p>
            </div>

            <div className="space-y-2">
              {[
                { key: 'START', label: 'شروع و ثبت پرونده جدید', desc: 'امکان ایجاد یک فرآیند جدید در کارتابل' },
                { key: 'VIEW', label: 'مشاهده پرونده‌ها', desc: 'رویت پرونده‌های در جریان و جزئیات سوابق' },
                { key: 'MANAGE', label: 'مدیریت و پیکربندی فرآیند', desc: 'تغییر تنظیمات، مراحل و ساختار' },
                { key: 'HISTORY', label: 'دسترسی به لاگ‌ها و سوابق', desc: 'مشاهده تاریخچه چرخش و رهگیری پرونده' },
              ].map((item) => {
                const isEnabled = !!wfPerms[item.key];
                return (
                  <label
                    key={item.key}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => setWfPerms((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step Actions & Allowed Transitions */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="pb-2.5 border-b border-slate-100">
              <h4 className="text-xs font-semibold text-slate-900">
                مجوزهای این مرحله و گذارهای مجاز ({selectedStepObj?.name || 'مرحله'})
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تعیین امکان اقدام در این ایستگاه و تغییر وضعیت به کدام مراحل
              </p>
            </div>

            <div className="space-y-2">
              {/* Step execute */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-blue-200/70 bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={!!stepPerms['EXECUTE']}
                  onChange={() => setStepPerms((prev) => ({ ...prev, EXECUTE: !prev['EXECUTE'] }))}
                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">مجوز اقدام و اجرای مرحله</div>
                  <div className="text-[11px] text-slate-400 font-normal">امکان انجام وظایف و ارسال پرونده به گام بعدی</div>
                </div>
              </label>

              {/* Step view */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={!!stepPerms['VIEW']}
                  onChange={() => setStepPerms((prev) => ({ ...prev, VIEW: !prev['VIEW'] }))}
                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">مشاهده پرونده در این مرحله</div>
                  <div className="text-[11px] text-slate-400 font-normal">امکان رویت پرونده در کارتابل نظارتی حین توقف در این مرحله</div>
                </div>
              </label>

              {/* Transitions */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-800 mb-1.5 block">
                  انتقال‌ها و گذارهای مجاز از این مرحله:
                </span>
                {(matrixData?.transitions || []).length === 0 ? (
                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-400 text-center border border-slate-100">
                    هیچ گذاری از این مرحله تعریف نشده است.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(matrixData?.transitions || []).map((t: any) => {
                      const isAllowed = !!transPerms[t.id];
                      return (
                        <label
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={() => setTransPerms((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                              className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer"
                            />
                            <span className="font-medium text-slate-800">{t.name}</span>
                          </div>
                          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                            مقصد: {t.to_step_name || 'خاتمه فرآیند'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/90 backdrop-blur-md text-white p-4 px-6 rounded-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Save className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>هدف ذخیره دسترسی:</span>
              <span className="text-blue-400 font-mono">
                {subjectType === 'user'
                  ? `کاربر «${selectedUserObj?.username || selectedSubject}»`
                  : `نقش «${selectedSubject}»`}
              </span>
              <span>— مرحله:</span>
              <span className="text-indigo-400 font-mono">{selectedStepObj?.name || 'انتخاب نشده'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تغییرات شما در تمام موتور فرم‌ساز، کارتابل و گردش کار اپراتورها بی‌درنگ اعمال خواهد شد.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => loadMatrix(selectedWfId!, subjectType, selectedSubject, selectedStepId)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازنشانی</span>
          </button>

          <button
            type="button"
            disabled={loading || saving}
            onClick={handleSaveMatrix}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره ماتریس دسترسی‌ها'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
