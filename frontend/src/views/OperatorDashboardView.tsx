import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  Plus,
  UserCheck,
  Sparkles,
  EyeOff,
  User,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { api } from '../api/client';

interface OperatorDashboardViewProps {
  onOpenNewProcess?: () => void;
  onOpenTask?: (taskId: string) => void;
  selectedUserId?: number;
  usersList?: any[];
  onSelectUser?: (user: any) => void;
}

export const OperatorDashboardView: FC<OperatorDashboardViewProps> = ({
  onOpenNewProcess,
  onOpenTask,
  selectedUserId,
  usersList = [],
  onSelectUser,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOperatorDashboard(selectedUserId);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'خطا در بارگذاری اطلاعات داشبورد اپراتور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => {
      // Background silent refresh
      api.getOperatorDashboard(selectedUserId)
        .then((res) => setData(res))
        .catch(() => {});
    }, 12000);
    return () => clearInterval(timer);
  }, [selectedUserId]);

  const handleHideProcess = async (instanceId: number) => {
    try {
      await api.hideOperatorProcess(instanceId, selectedUserId);
      showNotification('پرونده از فهرست داشبورد پنهان شد.');
      loadDashboard();
    } catch (err: any) {
      showNotification('خطا در پنهان‌سازی: ' + (err.message || 'نامشخص'));
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">در حال فراخوانی میز کار و کارتابل اپراتور...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <span className="text-xs font-bold">{error}</span>
        </div>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    tasks: 0,
    pending: 0,
    active: 0,
    completed: 0,
    sla_warning: 0,
    sla_breached: 0,
    pending_acceptances: 0,
  };

  const nextBestActions = data?.nextBestActions || [];
  const activeProcesses = data?.activeProcesses || [];
  const waitingForOthers = data?.waitingForOthers || [];
  const unfinishedProcesses = data?.unfinishedProcesses || [];
  const startableWorkflows = data?.startableWorkflows || [];
  const currentUser = data?.user || { fullName: 'اپراتور', role: 'کارشناس' };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 1. Header & Operator Persona Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
            {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                سلام، {currentUser.fullName}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200/60">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              میز کار عملیاتی — مشاهده وضعیت پرونده‌های در جریان، انجام وظایف و کنترل مهلت‌های SLA
            </p>
          </div>
        </div>

        {/* Action Controls & User Perspective Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch Operator perspective for Admin */}
          {usersList.length > 0 && onSelectUser && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 font-medium">نمای کاربر:</span>
              <select
                value={selectedUserId || currentUser.id || ''}
                onChange={(e) => {
                  const u = usersList.find((item: any) => item.id === Number(e.target.value));
                  if (u) onSelectUser(u);
                }}
                className="bg-transparent font-semibold text-slate-800 text-xs outline-none cursor-pointer"
              >
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={loadDashboard}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {onOpenNewProcess && (
            <button
              type="button"
              onClick={onOpenNewProcess}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>شروع فرآیند جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dual-Handoff Physical Custody Alert (If any) */}
      {summary.pending_acceptances > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">
                {summary.pending_acceptances} دستگاه در انتظار تحویل فیزیکی (Dual-Handoff)
              </div>
              <div className="text-[11px] text-amber-700 font-normal mt-0.5">
                دستگاه توسط مرحله قبلی ارسال شده و جهت آغاز کار نیازمند تایید فیزیکی شما است.
              </div>
            </div>
          </div>
          {onOpenTask && nextBestActions.length > 0 && (
            <button
              onClick={() => onOpenTask(String(nextBestActions[0].id))}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              بررسی تحویل
            </button>
          )}
        </div>
      )}

      {/* 3. Four Core Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: My Tasks */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">وظایف من</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{summary.tasks}</div>
          <p className="text-[11px] text-slate-400 font-normal mt-1">وظایف فعال اختصاص‌یافته به شما</p>
        </div>

        {/* KPI 2: Actionable / Pending */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">قابل اقدام</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{summary.pending}</div>
          <p className="text-[11px] text-slate-400 font-normal mt-1">پرونده‌هایی که مجاز به اقدام هستید</p>
        </div>

        {/* KPI 3: Nearing SLA */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">نزدیک به سررسید</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{summary.sla_warning}</div>
          <p className="text-[11px] text-slate-400 font-normal mt-1">پرونده‌های نزدیک به پایان زمان SLA</p>
        </div>

        {/* KPI 4: SLA Breached */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">عقب‌افتاده از SLA</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono">{summary.sla_breached}</div>
          <p className="text-[11px] text-slate-400 font-normal mt-1">پرونده‌هایی که مهلت آن‌ها سپری شده است</p>
        </div>
      </div>

      {/* 4. Section: «الان چه کاری را اول انجام بدهم؟» (Intelligent Next Best Actions) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-50/40 via-white to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">الان چه کاری را اول انجام بدهم؟</h3>
              <p className="text-[11px] text-slate-400 font-normal">
                اولویت‌بندی خودکار وظایف بر اساس فوریت سررسید و ایستگاه‌های منتظر اقدام
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
            {nextBestActions.length} اولویت اقدام
          </span>
        </div>

        {nextBestActions.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            🎉 در حال حاضر هیچ اقدام با اولویت بالایی در صف انتظار شما نیست.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {nextBestActions.map((inst: any) => {
              const isDanger = inst.priorityClass === 'danger' || inst.slaStatus === 'breached';
              const isWarning = inst.priorityClass === 'warning' || inst.slaStatus === 'warning';

              return (
                <div
                  key={inst.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        isDanger ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          {inst.workflowName}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                          {inst.trackingCode}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            isDanger
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {inst.priorityLabel || (isDanger ? 'فوری' : isWarning ? 'هشدار SLA' : 'عادی')}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-normal mt-1 flex items-center gap-2 flex-wrap">
                        <span>مرحله: <strong className="text-slate-700 font-semibold">{inst.currentStep}</strong></span>
                        <span>•</span>
                        <span>مهلت SLA: <strong className={isDanger ? 'text-rose-600 font-semibold' : 'text-slate-600'}>{inst.slaLabel}</strong></span>
                        {inst.startedAgo && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 font-mono text-[10px]">شروع {inst.startedAgo}</span>
                          </>
                        )}
                      </div>

                      {/* Summary Tags (Devices, Customers if any) */}
                      {Array.isArray(inst.processSummary) && inst.processSummary.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {inst.processSummary.map((s: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60"
                            >
                              {s.label}: <strong>{s.value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenTask && (
                      <button
                        type="button"
                        onClick={() => onOpenTask(String(inst.id))}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                          isDanger
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                        }`}
                      >
                        <span>انجام وظیفه</span>
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Section: «فرآیندهای در حال اجرا با استپر گرافیکی» (Active Process Timeline & Stepper) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-emerald-600" />
              <span>فرآیندهای در حال اجرای من و توالی گام‌ها</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
              رهگیری بصری مرحله فعلی پرونده‌ها، گام‌های تکمیل‌شده و مراحل آینده
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            {activeProcesses.length} پرونده در جریان
          </span>
        </div>

        {activeProcesses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            در حال حاضر فرآیند فعالی که توسط شما ثبت شده باشد وجود ندارد.
          </div>
        ) : (
          <div className="space-y-4">
            {activeProcesses.map((inst: any) => (
              <div
                key={inst.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 hover:bg-white hover:border-blue-200 transition-all space-y-3.5"
              >
                {/* Instance Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{inst.workflowName}</span>
                    <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded">
                      {inst.trackingCode}
                    </span>
                    {inst.startedAgo && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        · ثبت {inst.startedAgo}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {inst.slaLabel && (
                      <span className="text-[11px] text-slate-500 font-medium bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {inst.slaLabel}
                      </span>
                    )}
                    {onOpenTask && (
                      <button
                        type="button"
                        onClick={() => onOpenTask(String(inst.id))}
                        className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-200/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>ورود به پرونده</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Graphical Horizontal Step Tracker */}
                {Array.isArray(inst.tracker) && inst.tracker.length > 0 && (
                  <div className="overflow-x-auto pb-1 scrollbar-thin">
                    <div className="flex items-center min-w-max py-2">
                      {inst.tracker.map((item: any, idx: number) => {
                        const isCompleted = item.state === 'completed';
                        const isCurrent = item.state === 'current';

                        return (
                          <div key={idx} className="flex items-center">
                            {/* Step Node */}
                            <div className="flex flex-col items-center text-center w-28 px-1">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : isCurrent
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                                    : 'bg-white border-2 border-slate-300 text-slate-400'
                                }`}
                              >
                                {isCompleted ? '✓' : isCurrent ? '●' : idx + 1}
                              </div>
                              <span
                                className={`text-[11px] mt-1.5 leading-tight truncate max-w-[100px] ${
                                  isCurrent
                                    ? 'font-bold text-blue-700'
                                    : isCompleted
                                    ? 'font-semibold text-slate-700'
                                    : 'font-normal text-slate-400'
                                }`}
                                title={item.stepName}
                              >
                                {item.stepName}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {isCompleted ? 'تکمیل‌شده' : isCurrent ? 'گام فعلی' : 'در انتظار'}
                              </span>
                            </div>

                            {/* Connecting Line between steps */}
                            {idx < inst.tracker.length - 1 && (
                              <div
                                className={`h-0.5 w-8 -mt-7 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Section 2-Column: Waiting for Others vs My Unfinished */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Right: Waiting for Others */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>در انتظار اقدام دیگران</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                پرونده‌های شما که در کارتابل همکاران دیگر متوقف است
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {waitingForOthers.length} مورد
            </span>
          </div>

          {waitingForOthers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              هیچ پرونده‌ای در انتظار اقدام شخص دیگری متوقف نیست.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
              {waitingForOthers.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800 truncate">{item.workflowName}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {item.trackingCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5 truncate">
                      در مرحله «{item.currentStep}» منتظر: <strong>{item.assignedTo}</strong>
                    </div>
                  </div>

                  {onOpenTask && (
                    <button
                      type="button"
                      onClick={() => onOpenTask(String(item.id))}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      مشاهده
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Left: My Unfinished Processes */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>پرونده‌های نیمه‌تمام من</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                پرونده‌های در جریان شما با امکان پنهان‌سازی از داشبورد
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {unfinishedProcesses.length} مورد
            </span>
          </div>

          {unfinishedProcesses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              در حال حاضر پرونده نیمه‌تمامی برای شما ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
              {unfinishedProcesses.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800 truncate">{item.workflowName}</span>
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/50">
                        {item.trackingCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      مرحله جاری: <span className="text-slate-700 font-medium">{item.currentStep}</span>
                      {item.startedAgo && <span className="text-slate-400 font-mono text-[10px] mr-1">({item.startedAgo})</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleHideProcess(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title="پنهان کردن موقت از داشبورد"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                    {onOpenTask && (
                      <button
                        type="button"
                        onClick={() => onOpenTask(String(item.id))}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/70 rounded-md text-xs font-semibold transition-all cursor-pointer"
                      >
                        ادامه
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. Section: «فرآیندهای قابل شروع» (Startable Workflows) */}
      {startableWorkflows.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900">فرآیندهای مجاز برای شروع</h4>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                فرآیندهایی که نقش سازمانی شما دارای مجوز آغاز پرونده در آنها است
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {startableWorkflows.map((wf: any) => (
              <div
                key={wf.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h5 className="font-bold text-xs text-slate-900">{wf.name}</h5>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {wf.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal line-clamp-2">
                    {wf.description || 'فرآیند استاندارد سازمانی'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onOpenNewProcess}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>شروع پرونده</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function ArrowLeftIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  );
}
