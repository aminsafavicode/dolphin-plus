import { useState } from 'react';
import type { FC } from 'react';
import {
  X,
  Send,
  Plus,
  Trash2,
  Clock,
  FileCheck
} from 'lucide-react';
import type { TaskItem } from '../types/dashboard';

interface TaskDetailModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onExecuteTransition: (taskId: string, nextStepName: string) => void;
}

interface PartRow {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export const TaskDetailModal: FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onExecuteTransition,
}) => {
  if (!task) return null;

  const [parts, setParts] = useState<PartRow[]>([
    { id: '1', name: 'خازن صافی ۴۵۰ ولت', quantity: 2, unitPrice: 150000 },
    { id: '2', name: 'فیوز فست‌بلو ۱۰ آمپر', quantity: 1, unitPrice: 85000 },
  ]);

  const [notes, setNotes] = useState('تست اولیه با موفقیت انجام شد و مدار تغذیه ترمیم گردید.');

  const handleAddPart = () => {
    setParts([
      ...parts,
      { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  const handlePartChange = (id: string, field: keyof PartRow, value: any) => {
    setParts(
      parts.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Safe formula: SUM(parts.quantity * parts.unitPrice)
  const totalPartsCost = parts.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-xl max-w-2xl w-full p-6 border border-slate-200 shadow-xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60">
                  {task.trackingCode}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {task.deviceModel}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                مشتری: <span className="text-slate-600 font-medium">{task.customerName}</span> • فرآیند: {task.workflowName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 pl-0.5">
          {/* Status & SLA Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-normal block mb-1">مرحله جاری:</span>
              <span className="font-medium text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 inline-block">
                {task.currentStep}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-normal block mb-1">مهلت کاری (SLA):</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {task.slaDue} ({task.slaPercent}٪ سپری‌شده)
              </span>
            </div>
          </div>

          {/* Dynamic Form: Repeatable Parts Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700">
                جدول پویا: قطعات مصرفی و تعویضی
              </label>
              <button
                type="button"
                onClick={handleAddPart}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>افزودن ردیف قطعه</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 font-medium text-xs border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">نام قطعه</th>
                    <th className="p-2.5 w-20">تعداد</th>
                    <th className="p-2.5 w-32">قیمت واحد (ریال)</th>
                    <th className="p-2.5 w-32">جمع ردیف (ریال)</th>
                    <th className="p-2.5 w-10 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map((part) => {
                    const rowTotal = (part.quantity || 0) * (part.unitPrice || 0);
                    return (
                      <tr key={part.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handlePartChange(part.id, 'name', e.target.value)}
                            placeholder="نام قطعه..."
                            className="w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => handlePartChange(part.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs text-center font-mono text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="1000"
                            value={part.unitPrice}
                            onChange={(e) => handlePartChange(part.id, 'unitPrice', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-mono text-slate-800"
                          />
                        </td>
                        <td className="p-2 font-mono font-medium text-slate-700">
                          {rowTotal.toLocaleString('fa-IR')}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(part.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Formula Aggregate Bar */}
            <div className="mt-2 p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
              <span className="font-medium text-blue-900">
                محاسبه خودکار فرمول امن SUM(parts.total):
              </span>
              <span className="font-medium font-mono text-xs text-blue-700">
                {totalPartsCost.toLocaleString('fa-IR')} ریال
              </span>
            </div>
          </div>

          {/* Technician Notes */}
          <div>
            <label className="block mb-1 text-xs font-medium text-slate-700">
              شرح اقدامات فنی و گزارش ارزیابی
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none font-normal"
            />
          </div>
        </div>

        {/* Footer Transitions / Buttons */}
        <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-normal">
            ثبت اسنپ‌شات قطعی در تاریخچه (Immutable Snapshot)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              onClick={() => {
                onExecuteTransition(task.id, 'تسویه حساب و ترخیص نهایی');
                onClose();
              }}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال به مرحله بعد</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
