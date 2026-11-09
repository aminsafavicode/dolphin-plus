import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  GitBranch,
  Plus,
  CheckCircle2,
  Layers,
  ChevronLeft,
  Trash2,
  Edit2,
  UserCheck,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  X,
  AlertCircle,
  Search,
  Users,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Rocket
} from 'lucide-react';
import { api } from '../api/client';
import { AccessMatrixView } from './AccessMatrixView';


export const WorkflowsView: FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWf, setSelectedWf] = useState<any | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);


  const [activeTab, setActiveTab] = useState<'graph' | 'steps' | 'transitions' | 'team'>('graph');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [teamSubTab, setTeamSubTab] = useState<'matrix' | 'members'>('matrix');
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<number | null>(null);


  // Modals state
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [editingWf, setEditingWf] = useState<any | null>(null);
  const [wfName, setWfName] = useState('');
  const [wfCode, setWfCode] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfActive, setWfActive] = useState(true);


  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any | null>(null);
  const [stepName, setStepName] = useState('');
  const [stepOrder, setStepOrder] = useState<number>(1);
  const [stepAssignedTo, setStepAssignedTo] = useState<number | ''>('');
  const [stepDesc, setStepDesc] = useState('');
  const [stepActive, setStepActive] = useState(true);


  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [editingTrans, setEditingTrans] = useState<any | null>(null);
  const [transName, setTransName] = useState('');
  const [fromStepId, setFromStepId] = useState<number | ''>('');
  const [toStepId, setToStepId] = useState<number | ''>('');
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [rejectToStepId, setRejectToStepId] = useState<number | ''>('');
  const [transDesc, setTransDesc] = useState('');
  const [transActive, setTransActive] = useState(true);


  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberUserId, setMemberUserId] = useState<number | ''>('');
  const [memberRole, setMemberRole] = useState<'VIEWER' | 'EXECUTOR' | 'MANAGER'>('EXECUTOR');
  const [memberCanStart, setMemberCanStart] = useState(false);


  // In-app confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);


  const extractErrorMessage = (err: any, fallback: string) => {
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string') return data;
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        const text = Array.isArray(val) ? val.join(' ') : String(val);
        if (firstKey === 'name') return `خطا در عنوان: ${text}`;
        if (firstKey === 'code') return `خطا در کد لاتین: ${text}`;
        if (firstKey === 'from_step') return `خطا در مرحله مبدأ: ${text}`;
        if (firstKey === 'detail') return text;
        return `${firstKey}: ${text}`;
      }
    }
    return err.message || fallback;
  };


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


  const fetchWorkflows = async (targetId?: number) => {
    setLoading(true);
    try {
      const [wfData, userData] = await Promise.all([
        api.getWorkflows(),
        api.getUsers(),
      ]);
      setWorkflows(wfData);
      setUsers(userData);


      if (wfData.length > 0) {
        let wfToSelect = wfData[0];
        if (targetId) {
          wfToSelect = wfData.find((w: any) => w.id === targetId) || wfData[0];
        } else if (selectedWf) {
          wfToSelect = wfData.find((w: any) => w.id === selectedWf.id) || wfData[0];
        }
        await loadWorkflowDetails(wfToSelect);
      } else {
        setSelectedWf(null);
        setSteps([]);
        setTransitions([]);
        setMemberships([]);
      }
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در بارگذاری فرآیندها'), true);
    } finally {
      setLoading(false);
    }
  };


  const loadWorkflowDetails = async (wf: any) => {
    setSelectedWf(wf);
    try {
      const [stepsData, transData, memData] = await Promise.all([
        api.getWorkflowSteps(wf.id),
        api.getWorkflowTransitions(wf.id),
        api.getMemberships({ workflow_id: wf.id }),
      ]);
      setSteps(stepsData);
      setTransitions(transData);
      setMemberships(memData);
    } catch (err: any) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchWorkflows();
  }, []);


  // -----------------------------------------------------------------
  // Workflow CRUD
  // -----------------------------------------------------------------
  const handleOpenWfModal = (wf?: any) => {
    if (wf) {
      setEditingWf(wf);
      setWfName(wf.name);
      setWfCode(wf.code);
      setWfDesc(wf.description || '');
      setWfActive(wf.is_active ?? true);
    } else {
      setEditingWf(null);
      setWfName('');
      setWfCode('');
      setWfDesc('');
      setWfActive(true);
    }
    setActionError(null);
    setIsWfModalOpen(true);
  };


  const handleSaveWorkflow = async (e: FormEvent) => {
    e.preventDefault();
    if (!wfName.trim() || !wfCode.trim()) {
      showNotification('لطفاً عنوان و کد یکتای فرآیند را وارد کنید', true);
      return;
    }
    try {
      if (editingWf) {
        const updated = await api.updateWorkflow(editingWf.id, {
          name: wfName.trim(),
          code: wfCode.trim().toLowerCase(),
          description: wfDesc.trim(),
          is_active: wfActive,
        });
        showNotification('فرآیند با موفقیت ویرایش شد');
        setIsWfModalOpen(false);
        fetchWorkflows(updated.id);
      } else {
        const created = await api.createWorkflow({
          name: wfName.trim(),
          code: wfCode.trim().toLowerCase(),
          description: wfDesc.trim(),
          is_active: wfActive,
        });
        showNotification('فرآیند سازمانی جدید با موفقیت ایجاد شد');
        setIsWfModalOpen(false);
        fetchWorkflows(created.id);
      }
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره فرآیند'), true);
    }
  };


  const promptDeleteWorkflow = (wf: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف فرآیند سازمانی',
      message: `آیا از حذف کامل فرآیند «${wf.name}» اطمینان دارید؟ تمامی مراحل، گذارها و ساختار فرم مربوط به آن حذف خواهد شد.`,
      confirmLabel: 'حذف قطعی فرآیند',
      onConfirm: async () => {
        try {
          await api.deleteWorkflow(wf.id);
          showNotification(`فرآیند «${wf.name}» حذف گردید`);
          if (selectedWf?.id === wf.id) {
            setSelectedWf(null);
          }
          fetchWorkflows();
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'امکان حذف این فرآیند به دلیل داشتن پرونده‌های جاری وجود ندارد'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };


  const handleToggleWfActive = async (wf: any) => {
    try {
      await api.updateWorkflow(wf.id, { is_active: !wf.is_active });
      fetchWorkflows(wf.id);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت فرآیند'), true);
    }
  };


  // -----------------------------------------------------------------
  // Workflow Steps CRUD
  // -----------------------------------------------------------------
  const handleOpenStepModal = (step?: any) => {
    if (!selectedWf) return;
    if (step) {
      setEditingStep(step);
      setStepName(step.name);
      setStepOrder(step.order);
      setStepAssignedTo(step.assigned_to || '');
      setStepDesc(step.description || '');
      setStepActive(step.is_active ?? true);
    } else {
      setEditingStep(null);
      setStepName('');
      setStepOrder((steps.length ? Math.max(...steps.map((s) => s.order || 0)) : 0) + 1);
      setStepAssignedTo('');
      setStepDesc('');
      setStepActive(true);
    }
    setActionError(null);
    setIsStepModalOpen(true);
  };


  const handleSaveStep = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWf || !stepName.trim()) {
      showNotification('لطفاً عنوان مرحله را وارد کنید', true);
      return;
    }
    try {
      if (editingStep) {
        await api.updateWorkflowStep(editingStep.id, {
          name: stepName.trim(),
          order: Number(stepOrder),
          assigned_to: stepAssignedTo ? Number(stepAssignedTo) : null,
          description: stepDesc.trim(),
          is_active: stepActive,
        });
        showNotification('مرحله با موفقیت ویرایش شد');
      } else {
        await api.createWorkflowStep(selectedWf.id, {
          name: stepName.trim(),
          order: Number(stepOrder),
          assigned_to: stepAssignedTo ? Number(stepAssignedTo) : null,
          description: stepDesc.trim(),
          is_active: stepActive,
        });
        showNotification('مرحله جدید با موفقیت به فرآیند افزوده شد');
      }
      setIsStepModalOpen(false);
      loadWorkflowDetails(selectedWf);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره مرحله'), true);
    }
  };


  const promptDeleteStep = (stepId: number, stepName?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف مرحله فرآیند',
      message: `آیا از حذف مرحله ${stepName ? `«${stepName}»` : ''} اطمینان دارید؟ تمام گذارهای متصل به این مرحله پاک خواهند شد.`,
      confirmLabel: 'حذف مرحله',
      onConfirm: async () => {
        try {
          await api.deleteWorkflowStep(stepId);
          showNotification('مرحله با موفقیت حذف شد');
          if (selectedWf) {
            loadWorkflowDetails(selectedWf);
          }
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'امکان حذف این مرحله به دلیل گذارهای وابسته وجود ندارد'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };


  const handleReorderStep = async (step: any, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex((s) => s.id === step.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === steps.length - 1) return;


    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetStep = steps[targetIndex];


    try {
      await Promise.all([
        api.updateWorkflowStep(step.id, { order: targetStep.order }),
        api.updateWorkflowStep(targetStep.id, { order: step.order }),
      ]);
      loadWorkflowDetails(selectedWf);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر ترتیب مرحله'), true);
    }
  };


  // -----------------------------------------------------------------
  // Workflow Transitions CRUD
  // -----------------------------------------------------------------
  const handleOpenTransModal = (trans?: any, prefilledFrom?: number) => {
    if (!selectedWf) return;
    if (trans) {
      setEditingTrans(trans);
      setTransName(trans.name);
      setFromStepId(trans.from_step);
      setToStepId(trans.to_step || '');
      setRequiresAcceptance(trans.requires_acceptance ?? false);
      setRejectToStepId(trans.reject_to_step || '');
      setTransDesc(trans.description || '');
      setTransActive(trans.is_active ?? true);
    } else {
      setEditingTrans(null);
      setTransName('');
      setFromStepId(prefilledFrom || (steps.length > 0 ? steps[0].id : ''));
      setToStepId(steps.length > 1 ? steps[1].id : '');
      setRequiresAcceptance(false);
      setRejectToStepId('');
      setTransDesc('');
      setTransActive(true);
    }
    setActionError(null);
    setIsTransModalOpen(true);
  };


  const handleSaveTransition = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWf || !transName.trim() || !fromStepId) {
      showNotification('لطفاً عنوان گذار و مرحله مبدأ را مشخص کنید', true);
      return;
    }
    try {
      if (editingTrans) {
        await api.updateWorkflowTransition(editingTrans.id, {
          name: transName.trim(),
          from_step: Number(fromStepId),
          to_step: toStepId ? Number(toStepId) : null,
          requires_acceptance: requiresAcceptance,
          reject_to_step: requiresAcceptance && rejectToStepId ? Number(rejectToStepId) : null,
          description: transDesc.trim(),
          is_active: transActive,
        });
        showNotification('گذار فرآیند با موفقیت ویرایش شد');
      } else {
        await api.createWorkflowTransition(selectedWf.id, {
          name: transName.trim(),
          from_step: Number(fromStepId),
          to_step: toStepId ? Number(toStepId) : null,
          requires_acceptance: requiresAcceptance,
          reject_to_step: requiresAcceptance && rejectToStepId ? Number(rejectToStepId) : null,
          description: transDesc.trim(),
          is_active: transActive,
        });
        showNotification('گذار انتقال جدید با موفقیت ثبت شد');
      }
      setIsTransModalOpen(false);
      loadWorkflowDetails(selectedWf);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره گذار'), true);
    }
  };


  const promptDeleteTransition = (transId: number, transName?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف گذار (انتقال)',
      message: `آیا از حذف گذار ${transName ? `«${transName}»` : ''} اطمینان دارید؟`,
      confirmLabel: 'حذف گذار',
      onConfirm: async () => {
        try {
          await api.deleteWorkflowTransition(transId);
          showNotification('گذار فرآیند با موفقیت حذف گردید');
          if (selectedWf) {
            loadWorkflowDetails(selectedWf);
          }
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف گذار'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };


  // -----------------------------------------------------------------
  // Workflow Membership CRUD
  // -----------------------------------------------------------------
  const handleOpenMemberModal = () => {
    if (!selectedWf) return;
    setMemberUserId(users.length > 0 ? users[0].id : '');
    setMemberRole('EXECUTOR');
    setMemberCanStart(false);
    setActionError(null);
    setIsMemberModalOpen(true);
  };


  const handleSaveMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWf || !memberUserId) {
      showNotification('لطفاً یک کاربر را انتخاب کنید', true);
      return;
    }
    try {
      await api.createMembership({
        workflow: selectedWf.id,
        user: Number(memberUserId),
        role: memberRole,
        can_start: memberCanStart,
      });
      showNotification('عضو جدید با موفقیت به فرآیند اضافه شد');
      setIsMemberModalOpen(false);
      loadWorkflowDetails(selectedWf);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در افزودن کاربر به فرآیند (احتمالاً عضویت تکراری است)'), true);
    }
  };


  const handleToggleStarter = async (userId: number, currentCanStart: boolean) => {
    if (!selectedWf) return;
    try {
      const res = await api.toggleWorkflowStarter(selectedWf.id, userId, !currentCanStart);
      showNotification(res.message || 'وضعیت آغازگر فرآیند به‌روزرسانی شد');
      loadWorkflowDetails(selectedWf);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت آغازگر فرآیند'), true);
    }
  };


  const promptDeleteMember = (memberId: number, userName?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'لغو دسترسی کاربر',
      message: `آیا از حذف دسترسی ${userName ? `«${userName}»` : 'این کاربر'} از فرآیند اطمینان دارید؟`,
      confirmLabel: 'حذف دسترسی',
      onConfirm: async () => {
        try {
          await api.deleteMembership(memberId);
          showNotification('دسترسی کاربر از فرآیند حذف شد');
          if (selectedWf) {
            loadWorkflowDetails(selectedWf);
          }
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف عضویت'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };


  // Filtered workflows list
  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="space-y-5">
      {/* View Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">میز کار فرآیندها و گراف ماشین وضعیت</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              مدل‌سازی گرافیکی جریان کار (State Machine)، گام‌ها، تحویل‌های فیزیکی و تیم اجرایی
            </p>
          </div>
        </div>


        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenWfModal()}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تعریف فرآیند جدید</span>
          </button>
        </div>
      </div>


      {/* Global Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs font-normal flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-normal flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Column: Workflows Sidebar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-700">فرآیندها ({filteredWorkflows.length})</span>
            <div className="relative w-28">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو..."
                className="w-full bg-slate-50 border border-slate-200 rounded-md pr-6 pl-1 py-1 text-xs outline-none text-slate-700 placeholder-slate-400"
              />
              <Search className="w-3 h-3 text-slate-400 absolute right-2 top-2" />
            </div>
          </div>


          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 font-normal">
                {loading ? 'در حال دریافت...' : 'فرآیندی یافت نشد'}
              </div>
            ) : (
              filteredWorkflows.map((wf) => {
                const isSelected = selectedWf?.id === wf.id;
                return (
                  <div
                    key={wf.id}
                    onClick={() => loadWorkflowDetails(wf)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-medium text-slate-800">{wf.name}</h4>
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            {wf.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal">
                          <span>{wf.steps_count || 0} مرحله</span>
                          <span>•</span>
                          <span>{wf.transitions_count || 0} گذار</span>
                        </div>
                      </div>


                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleWfActive(wf)}
                          title={wf.is_active ? 'فعال' : 'غیرفعال'}
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                            wf.is_active ? 'bg-green-50 text-green-700 border border-green-200/60' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {wf.is_active ? 'فعال' : 'غیرفعال'}
                        </button>
                        <button
                          onClick={() => handleOpenWfModal(wf)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="ویرایش فرآیند"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => promptDeleteWorkflow(wf)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="حذف فرآیند"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>


        {/* Right 3 Columns: Selected Workflow Studio */}
        <div className="lg:col-span-3 space-y-5">
          {selectedWf ? (
            <>
              {/* Studio Header Card */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-normal border border-slate-200">
                      ID: #{selectedWf.id}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">{selectedWf.name}</h3>
                    <span className="text-xs font-mono font-normal text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
                      {selectedWf.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-normal mt-1">
                    {selectedWf.description || 'توضیحات تکمیلی برای این فرآیند ثبت نشده است.'}
                  </p>
                </div>


                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenStepModal()}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>افزودن مرحله</span>
                  </button>
                  <button
                    onClick={() => handleOpenTransModal()}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>افزودن گذار</span>
                  </button>
                </div>
              </div>


              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 overflow-x-auto shrink-0">
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'graph'
                      ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>گراف بصری ماشین وضعیت</span>
                </button>

                <button
                  onClick={() => setActiveTab('steps')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'steps'
                      ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>مراحل</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                    activeTab === 'steps' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {steps.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('transitions')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'transitions'
                      ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>گذارها</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                    activeTab === 'transitions' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {transitions.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('team')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'team'
                      ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>تیم و دسترسی‌ها</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                    activeTab === 'team' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {memberships.length}
                  </span>
                </button>
              </div>

              {/* --------------------------------------------------------- */}
              {/* TAB 1: Clean Visual State Machine Flow */}
              {/* --------------------------------------------------------- */}
              {activeTab === 'graph' && (
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                  {/* Top Bar with situational awareness metrics */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>معماری ماشین وضعیت و توالی گام‌ها</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                        بررسی بصری ارتباط گام‌ها، مسئول هر ایستگاه و گذارهای انتقال پرونده
                      </p>
                    </div>

                    {/* Stat Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>{steps.length} مرحله</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] font-medium">
                        <GitBranch className="w-3 h-3 text-blue-600" />
                        <span>{transitions.length} گذار فعال</span>
                      </span>
                      {transitions.some((t) => t.requires_acceptance) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] font-medium">
                          <span>{transitions.filter((t) => t.requires_acceptance).length} تحویل فیزیکی</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {steps.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-normal">
                      هنوز مرحله‌ای تعریف نشده است. با کلیک روی «افزودن مرحله»، گام‌های فرآیند را بسازید.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {steps.map((st, idx) => {
                        const outgoing = transitions.filter((t) => t.from_step === st.id);
                        const incoming = transitions.filter((t) => t.to_step === st.id);
                        const isStart = st.order === 1 || incoming.length === 0;
                        const isTerminal = outgoing.length === 0;

                        return (
                          <div
                            key={st.id}
                            className={`rounded-xl p-4 bg-white border transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                              isStart
                                ? 'border-emerald-300/80 bg-gradient-to-b from-emerald-50/20 to-white'
                                : isTerminal
                                ? 'border-purple-300/80 bg-gradient-to-b from-purple-50/20 to-white'
                                : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              {/* Node Top Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                                      isStart
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300/70'
                                        : isTerminal
                                        ? 'bg-purple-100 text-purple-800 border-purple-300/70'
                                        : 'bg-blue-50 text-blue-700 border-blue-200/60'
                                    }`}
                                  >
                                    {st.order || idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-bold text-slate-900 truncate">{st.name}</h5>
                                      {isStart && (
                                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                                          آغاز
                                        </span>
                                      )}
                                      {isTerminal && (
                                        <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                                          پایان
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-400 font-normal truncate">
                                      کد: {st.code}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleOpenStepModal(st)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                    title="ویرایش مرحله"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => promptDeleteStep(st.id, st.name)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="حذف مرحله"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Operator Badge & SLA */}
                              <div className="space-y-1.5 py-2.5 border-t border-slate-100 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="text-slate-500 font-normal shrink-0">مسئول:</span>
                                    <span className="text-slate-800 font-semibold truncate">
                                      {st.assigned_to_full_name || st.assigned_to_name || 'تخصیص عمومی'}
                                    </span>
                                  </div>

                                  {st.sla_info ? (
                                    <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-200/50 text-[11px] shrink-0">
                                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>مهلت: {st.sla_info.duration_hours}h</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-normal shrink-0">
                                      بدون SLA
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Outgoing Transitions on this node */}
                            <div className="pt-2.5 border-t border-slate-100 mt-2 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>گذارهای خروجی ({outgoing.length}):</span>
                                <button
                                  onClick={() => handleOpenTransModal(undefined, st.id)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-[11px] font-medium cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>انتقال جدید</span>
                                </button>
                              </div>

                              {outgoing.length === 0 ? (
                                <div className="text-xs text-slate-400 font-normal flex items-center justify-between p-2 bg-slate-50/70 rounded-lg border border-slate-100">
                                  <span className="text-[11px]">🏁 نقطه پایانی فرآیند (بدون خروجی)</span>
                                  <button
                                    onClick={() => handleOpenTransModal(undefined, st.id)}
                                    className="text-blue-600 hover:underline text-[11px] font-medium cursor-pointer"
                                  >
                                    + گذار
                                  </button>
                                </div>
                              ) : (
                                outgoing.map((tr) => (
                                  <div
                                    key={tr.id}
                                    className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-1.5 text-xs hover:bg-slate-100/60 transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-800 truncate">{tr.name}</span>
                                      <ChevronLeft className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-blue-700 font-medium truncate text-[11px]">
                                        {tr.to_step_name || 'خاتمه فرآیند'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {tr.requires_acceptance && (
                                        <span
                                          title="نیازمند تایید فیزیکی (Dual-Handoff)"
                                          className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/70 font-semibold px-1.5 py-0.2 rounded"
                                        >
                                          هنداوف
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleOpenTransModal(tr)}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                        title="ویرایش گذار"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Steps / Stages Management */}
              {/* --------------------------------------------------------- */}
              {activeTab === 'steps' && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        مراحل و گام‌های فرآیند ({steps.length})
                      </h4>
                      <p className="text-xs text-slate-400 font-normal mt-0.5">
                        تعیین توالی گام‌ها، اپراتور مسئول و تنظیم محدودیت‌های زمانی
                      </p>
                    </div>


                    <button
                      onClick={() => handleOpenStepModal()}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>افزودن مرحله جدید</span>
                    </button>
                  </div>


                  <div className="space-y-2.5">
                    {steps.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-normal">
                        هیچ مرحله‌ای برای این فرآیند ثبت نشده است.
                      </div>
                    ) : (
                      steps.map((st, idx) => (
                        <div
                          key={st.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => handleReorderStep(st, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                title="انتقال به بالا"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <span className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 font-medium text-xs text-slate-700 flex items-center justify-center">
                                {st.order || idx + 1}
                              </span>
                              <button
                                onClick={() => handleReorderStep(st, 'down')}
                                disabled={idx === steps.length - 1}
                                className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                title="انتقال به پایین"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>


                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-medium text-slate-800">{st.name}</h5>
                                <span className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                  {st.code}
                                </span>
                                <span
                                  className={`text-xs font-medium px-1.5 py-0.2 rounded-md ${
                                    st.is_active
                                      ? 'bg-green-50 text-green-700 border border-green-200/60'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {st.is_active ? 'فعال' : 'غیرفعال'}
                                </span>
                              </div>


                              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap font-normal">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                  مسئول: <strong className="font-medium text-slate-700">{st.assigned_to_full_name || st.assigned_to_name || 'تخصیص عمومی'}</strong>
                                </span>
                                {st.sla_info && (
                                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/50 text-xs">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    SLA: {st.sla_info.duration_hours} ساعت
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>


                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenStepModal(st)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش مرحله"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => promptDeleteStep(st.id, st.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف مرحله"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


              {/* --------------------------------------------------------- */}
              {/* TAB 3: Transitions Management */}
              {/* --------------------------------------------------------- */}
              {activeTab === 'transitions' && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        گذارهای انتقال ماشین وضعیت ({transitions.length})
                      </h4>
                      <p className="text-xs text-slate-400 font-normal mt-0.5">
                        تعریف مسیرهای جابجایی بین مراحل و تایید تحویل فیزیکی (Dual-Handoff)
                      </p>
                    </div>


                    <button
                      onClick={() => handleOpenTransModal()}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>افزودن گذار جدید</span>
                    </button>
                  </div>


                  <div className="space-y-2.5">
                    {transitions.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-normal">
                        هیچ گذار انتقالی تعریف نشده است.
                      </div>
                    ) : (
                      transitions.map((tr) => (
                        <div
                          key={tr.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-xs font-medium text-slate-800">{tr.name}</h5>
                              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                {tr.code}
                              </span>
                              {tr.requires_acceptance && (
                                <span className="text-xs font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200 flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-amber-700" />
                                  <span>تایید فیزیکی (هنداوف)</span>
                                </span>
                              )}
                              <span
                                className={`text-xs font-medium px-1.5 py-0.2 rounded-md ${
                                  tr.is_active
                                    ? 'bg-green-50 text-green-700 border border-green-200/60'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {tr.is_active ? 'فعال' : 'غیرفعال'}
                              </span>
                            </div>


                            <div className="flex items-center gap-2 text-xs text-slate-600 font-normal">
                              <span>مبدأ: <strong className="font-medium text-slate-800">{tr.from_step_name}</strong></span>
                              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span>مقصد: <strong className="font-medium text-blue-700">{tr.to_step_name || 'خاتمه فرآیند'}</strong></span>
                            </div>
                          </div>


                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenTransModal(tr)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش گذار"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => promptDeleteTransition(tr.id, tr.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف گذار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


              {/* --------------------------------------------------------- */}
              {/* TAB 4: Team & Workflow Permissions */}
              {/* --------------------------------------------------------- */}
              {activeTab === 'team' && (
                <div className="space-y-5">
                  {/* Sub-tab Navigation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTeamSubTab('matrix')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          teamSubTab === 'matrix'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 font-normal'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ماتریس دسترسی فیلدها و مراحل</span>
                      </button>


                      <button
                        onClick={() => setTeamSubTab('members')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          teamSubTab === 'members'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 font-normal'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>اعضای تیم ({memberships.length})</span>
                      </button>
                    </div>


                    {teamSubTab === 'members' && (
                      <button
                        onClick={handleOpenMemberModal}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>افزودن عضو جدید</span>
                      </button>
                    )}
                  </div>


                  {teamSubTab === 'matrix' && (
                    <AccessMatrixView
                      initialWorkflowId={selectedWf.id}
                      initialUserId={selectedMemberUserId}
                    />
                  )}


                  {teamSubTab === 'members' && (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                      <div className="pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-800">
                          اعضای منتسب به این فرآیند ({memberships.length} عضو)
                        </h4>
                        <p className="text-xs text-slate-400 font-normal mt-0.5">
                          کاربران مجاز به مشاهده، اقدام یا آغاز پرونده‌های این فرآیند
                        </p>
                      </div>


                      <div className="space-y-2.5">
                        {memberships.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs font-normal">
                            هیچ عضوی به این فرآیند منتسب نشده است.
                          </div>
                        ) : (
                          memberships.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-medium flex items-center justify-center text-xs border border-slate-200/60">
                                  {m.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-slate-800">{m.username}</div>
                                  <div className="text-xs text-slate-400 font-normal">عضو #{m.id}</div>
                                </div>
                              </div>


                              <div className="flex items-center gap-2">
                                {m.can_start ? (
                                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-green-50 text-green-700 border-green-200/60">
                                    <Rocket className="w-3 h-3 text-green-600" />
                                    <span>آغازگر مجاز</span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-normal px-2 py-0.5 rounded-md text-slate-400 bg-slate-50 border border-slate-200/60">
                                    فاقد دسترسی شروع
                                  </span>
                                )}


                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                                    m.role === 'MANAGER'
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : m.role === 'EXECUTOR'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                                      : 'bg-slate-50 text-slate-600 border-slate-200/60'
                                  }`}
                                >
                                  {m.role === 'MANAGER'
                                    ? 'مدیر فرآیند'
                                    : m.role === 'EXECUTOR'
                                    ? 'مجری کارتابل'
                                    : 'مشاهده‌کننده'}
                                </span>


                                <button
                                  type="button"
                                  onClick={() => handleToggleStarter(m.user_id || m.user, m.can_start)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                                    m.can_start
                                      ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  }`}
                                  title={m.can_start ? 'لغو دسترسی شروع فرآیند' : 'تعیین به عنوان آغازگر فرآیند'}
                                >
                                  <Rocket className="w-3 h-3" />
                                  <span>{m.can_start ? 'لغو آغازگر' : 'تعیین آغازگر'}</span>
                                </button>


                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMemberUserId(m.user_id || m.user);
                                    setTeamSubTab('matrix');
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                                  title="تنظیم دقیق ماتریس دسترسی"
                                >
                                  <ShieldCheck className="w-3 h-3 text-slate-500" />
                                  <span>ماتریس</span>
                                </button>


                                <button
                                  onClick={() => promptDeleteMember(m.id, m.username)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="حذف دسترسی"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-xs flex flex-col items-center justify-center">
              <GitBranch className="w-10 h-10 text-slate-300 mb-3" />
              <div className="text-sm font-semibold text-slate-700">فرآیندی برای نمایش انتخاب نشده است</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                از منوی سمت راست یک فرآیند را انتخاب کنید یا با کلیک روی «تعریف فرآیند جدید»، جریان کاری نوینی بسازید.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Create / Edit Workflow */}
      {/* ------------------------------------------------------------- */}
      {isWfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-lg relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingWf ? 'ویرایش فرآیند سازمانی' : 'تعریف فرآیند سازمانی جدید'}
              </h3>
              <button onClick={() => setIsWfModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>


            <form onSubmit={handleSaveWorkflow} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-medium text-slate-700">عنوان فرآیند *</label>
                <input
                  type="text"
                  required
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  placeholder="مثال: کالیبراسیون تجهیزات و ابزار دقیق"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                />
              </div>


              <div>
                <label className="block mb-1 font-medium text-slate-700">کد سیستمی یکتا *</label>
                <input
                  type="text"
                  required
                  value={wfCode}
                  onChange={(e) => setWfCode(e.target.value)}
                  placeholder="مثال: calib_process_v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono lowercase outline-none focus:bg-white focus:border-blue-500"
                />
              </div>


              <div>
                <label className="block mb-1 font-medium text-slate-700">شرح و اهداف فرآیند</label>
                <textarea
                  rows={2}
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  placeholder="توضیحات اختیاری درباره دامنه کاربرد و دستورالعمل فرآیند..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 resize-none font-normal"
                />
              </div>


              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wfActiveCheck"
                  checked={wfActive}
                  onChange={(e) => setWfActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="wfActiveCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  فرآیند فعال باشد و در کارتابل قابل شروع باشد
                </label>
              </div>


              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWfModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  {editingWf ? 'ذخیره تغییرات فرآیند' : 'ثبت فرآیند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Create / Edit Workflow Step */}
      {/* ------------------------------------------------------------- */}
      {isStepModalOpen && selectedWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-lg relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {editingStep ? 'ویرایش مرحله (گام)' : 'افزودن مرحله جدید'}
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">فرآیند: {selectedWf.name}</p>
              </div>
              <button onClick={() => setIsStepModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>


            <form onSubmit={handleSaveStep} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-medium text-slate-700">نام مرحله (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  placeholder="مثال: ارزیابی فنی و تست اولیه"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-slate-700">ترتیب گام (Order) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stepOrder}
                    onChange={(e) => setStepOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>


                <div>
                  <label className="block mb-1 font-medium text-slate-700">مسئول پیش‌فرض مرحله</label>
                  <select
                    value={stepAssignedTo}
                    onChange={(e) => setStepAssignedTo(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                  >
                    <option value="">همگانی / انتخاب در زمان اجرا</option>
                    {users.filter((u) => !u.is_superuser && u.username !== 'admin').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.last_name
                          ? `${u.first_name} ${u.last_name} (${u.username})`
                          : u.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              <div>
                <label className="block mb-1 font-medium text-slate-700">دستورالعمل اجرایی گام</label>
                <textarea
                  rows={2}
                  value={stepDesc}
                  onChange={(e) => setStepDesc(e.target.value)}
                  placeholder="راهنمای اپراتور برای تکمیل این مرحله..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 resize-none font-normal"
                />
              </div>


              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="stepActiveCheck"
                  checked={stepActive}
                  onChange={(e) => setStepActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="stepActiveCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  مرحله فعال باشد
                </label>
              </div>


              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  {editingStep ? 'ذخیره تغییرات مرحله' : 'ثبت مرحله'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Create / Edit Workflow Transition */}
      {/* ------------------------------------------------------------- */}
      {isTransModalOpen && selectedWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-lg relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {editingTrans ? 'ویرایش گذار انتقال' : 'افزودن گذار مسیر (Transition)'}
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">فرآیند: {selectedWf.name}</p>
              </div>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>


            <form onSubmit={handleSaveTransition} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-medium text-slate-700">عنوان گذار *</label>
                <input
                  type="text"
                  required
                  value={transName}
                  onChange={(e) => setTransName(e.target.value)}
                  placeholder="مثال: تأیید اولیه و ارسال به آزمایشگاه"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium text-slate-700">از مرحله مبدأ *</label>
                  <select
                    required
                    value={fromStepId}
                    onChange={(e) => setFromStepId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                  >
                    <option value="">انتخاب مبدأ...</option>
                    {steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.order}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>


                <div>
                  <label className="block mb-1 font-medium text-slate-700">به مرحله مقصد</label>
                  <select
                    value={toStepId}
                    onChange={(e) => setToStepId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                  >
                    <option value="">خاتمه فرآیند (Terminal)</option>
                    {steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.order}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              {/* Dual-Handoff Settings */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-900 text-xs">
                  <input
                    type="checkbox"
                    checked={requiresAcceptance}
                    onChange={(e) => setRequiresAcceptance(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>نیاز به تایید و تحویل فیزیکی (Dual-Handoff)</span>
                </label>
                <p className="text-xs text-amber-800/90 font-normal leading-relaxed">
                  پرونده پس از ارسال در حالت تعلیق مانده تا متصدی مقصد دکمه «تایید تحویل» را بزند.
                </p>


                {requiresAcceptance && (
                  <div className="pt-2 border-t border-amber-200">
                    <label className="block mb-1 font-medium text-amber-950">
                      در صورت عدم تایید / رد، به کدام مرحله بازگردد؟
                    </label>
                    <select
                      value={rejectToStepId}
                      onChange={(e) => setRejectToStepId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 outline-none font-normal"
                    >
                      <option value="">بازگشت به همان مرحله مبدأ</option>
                      {steps.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.order}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


              <div>
                <label className="block mb-1 font-medium text-slate-700">توضیحات تکمیلی گذار</label>
                <textarea
                  rows={2}
                  value={transDesc}
                  onChange={(e) => setTransDesc(e.target.value)}
                  placeholder="شرایط یا یادداشت‌های اختیاری برای این انتقال..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 resize-none font-normal"
                />
              </div>


              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  {editingTrans ? 'ذخیره تغییرات گذار' : 'ذخیره گذار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* Modal 4: Add Team Member */}
      {/* ------------------------------------------------------------- */}
      {isMemberModalOpen && selectedWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-lg relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">افزودن عضو جدید به فرآیند</h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">فرآیند: {selectedWf.name}</p>
              </div>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>


            <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-medium text-slate-700">انتخاب کاربر *</label>
                <select
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                >
                  <option value="">انتخاب کاربر...</option>
                  {users.filter((u) => !u.is_superuser && u.username !== 'admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.last_name
                        ? `${u.first_name} ${u.last_name} (${u.username})`
                        : u.username}
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block mb-1 font-medium text-slate-700">نقش در فرآیند *</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-blue-500 font-normal"
                >
                  <option value="EXECUTOR">مجری کارتابل (Executor) - حق اقدام و انتقال</option>
                  <option value="VIEWER">مشاهده‌کننده (Viewer) - صرفاً مشاهده سوابق</option>
                  <option value="MANAGER">مدیر فرآیند (Manager) - دسترسی کامل و گزارش‌گیری</option>
                </select>
              </div>


              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={memberCanStart}
                    onChange={(e) => setMemberCanStart(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-slate-800 text-xs">تعیین به عنوان آغازگر فرآیند (Initiator)</span>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      این کاربر مجاز خواهد بود در کارتابل و پنل کاربری خود، این فرآیند را آغاز و ثبت کند.
                    </p>
                  </div>
                </label>
              </div>


              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  افزودن به تیم فرآیند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Confirm Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-slate-200 shadow-lg relative text-center">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1.5">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5 font-normal">{confirmDialog.message}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
              >
                {confirmDialog.confirmLabel || 'حذف قطعی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
