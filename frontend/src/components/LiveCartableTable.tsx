import { useState } from 'react';
import type { FC } from 'react';
import {
  CheckCircle2,
  Check,
  X,
  FileText
} from 'lucide-react';
import type { TaskItem } from '../types/dashboard';

interface CartableTableProps {
  tasks: TaskItem[];
  onAcceptHandoff: (taskId: string) => void;
  onRejectHandoff: (taskId: string) => void;
  onOpenTask: (task: TaskItem) => void;
  searchFilter: string;
}

export const LiveCartableTable: FC<CartableTableProps> = ({
  tasks,
  onAcceptHandoff,
  onRejectHandoff,
  onOpenTask,
  searchFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'pending' | 'completed'>('all');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchFilter ||
      t.trackingCode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.deviceModel.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.currentStep.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'my') return t.status === 'active';
    if (activeTab === 'pending') return t.status === 'pending_handoff';
    if (activeTab === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden min-w-0 @container">
      {/* Table Header with Tabs */}
      <div className="p-4 border-b border-slate-100 flex flex-col @4xl:flex-row @4xl:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">
            کارتابل نظارتی پرونده‌ها
          </h2>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            رهگیری برخط مراحل فرآیند، متصدیان مسئول و وضعیت تحویل فیزیکی
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/60 text-xs max-w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-blue-700 font-medium shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-normal'
            }`}
          >
            همه ({tasks.length.toLocaleString('fa-IR')})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'my'
                ? 'bg-white text-blue-700 font-medium shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-normal'
            }`}
          >
            پرونده‌های در جریان ({tasks.filter((t) => t.status === 'active').length.toLocaleString('fa-IR')})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-50 text-amber-700 font-medium border border-amber-200/60'
                : 'text-slate-500 hover:text-amber-700 font-normal'
            }`}
          >
            در انتظار تحویل ({tasks.filter((t) => t.status === 'pending_handoff').length.toLocaleString('fa-IR')})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-white text-blue-700 font-medium shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-normal'
            }`}
          >
            بایگانی شده
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="py-3 px-4 w-32 whitespace-nowrap">کد رهگیری</th>
              <th className="py-3 px-4 w-52 whitespace-nowrap">تجهیز و فرآیند</th>
              <th className="py-3 px-4 w-44 whitespace-nowrap">متقاضی / مشتری</th>
              <th className="py-3 px-4 w-48 whitespace-nowrap">مرحله جاری</th>
              <th className="py-3 px-4 w-32 whitespace-nowrap">مسئول</th>
              <th className="py-3 px-4 w-36 whitespace-nowrap">مهلت زمانی (SLA)</th>
              <th className="py-3 px-4 w-32 text-center whitespace-nowrap">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 font-normal">
                  پرونده‌ای با فیلترهای انتخابی یافت نشد.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => {
                const isPending = t.status === 'pending_handoff';
                const isCompleted = t.status === 'completed';

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors h-14 group cursor-pointer"
                    onClick={() => onOpenTask(t)}
                  >
                    {/* Tracking ID */}
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 whitespace-nowrap">
                      {t.trackingCode}
                    </td>

                    {/* Device & Workflow */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 whitespace-nowrap truncate max-w-[200px]" title={t.deviceModel}>
                        {t.deviceModel}
                      </div>
                      <div className="text-xs text-slate-400 font-normal whitespace-nowrap truncate max-w-[200px]">
                        {t.workflowName}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap truncate max-w-[170px]" title={t.customerName}>
                      {t.customerName}
                    </td>

                    {/* Current Step (Never wrap awkwardly!) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200/60 max-w-[180px] truncate" title={t.currentStep}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span className="truncate">{t.currentStep}</span>
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap truncate max-w-[120px]">
                      {t.assignee}
                    </td>

                    {/* SLA status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isCompleted ? (
                        <span className="text-green-600 font-normal flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تکمیل شده
                        </span>
                      ) : (
                        <div className="space-y-1 w-28">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-normal">
                            <span>{t.slaDue}</span>
                            <span className={t.slaPercent > 80 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                              {t.slaPercent}٪
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${t.slaPercent}%` }}
                              className={`h-full rounded-full ${
                                t.slaPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPending ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onAcceptHandoff(t.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium text-xs transition-colors cursor-pointer"
                            title="تایید تحویل فیزیکی دستگاه"
                          >
                            <Check className="w-3 h-3" />
                            <span>تایید</span>
                          </button>
                          <button
                            onClick={() => onRejectHandoff(t.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors cursor-pointer"
                            title="رد تحویل"
                          >
                            <X className="w-3 h-3" />
                            <span>رد</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenTask(t)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 text-slate-600 font-medium transition-colors cursor-pointer mx-auto text-xs"
                        >
                          <FileText className="w-3 h-3" />
                          <span>اقدام</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
