import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, Sparkles, Plus, AlertCircle, Rocket, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onCreate: (data: {
    workflowId?: number;
    workflowName: string;
    customerName: string;
    deviceModel: string;
    description: string;
    userId?: number;
  }) => void;
}

export const NewProcessModal: FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreate,
}) => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.getWorkflows(), api.getCatalogModels()])
        .then(([wfData, modelData]) => {
          setWorkflows(wfData);
          setModels(modelData);

          // Find startable workflows for this user
          const startables = wfData.filter((w: any) => {
            if (currentUser?.is_superuser) return true;
            return (w.starters || []).some((s: any) => s.id === currentUser?.id);
          });

          if (startables.length > 0) {
            setSelectedWorkflowId(startables[0].id);
          } else if (wfData.length > 0 && currentUser?.is_superuser) {
            setSelectedWorkflowId(wfData[0].id);
          } else {
            setSelectedWorkflowId('');
          }

          if (modelData.length > 0) {
            setDeviceModel(modelData[0].name);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Compute startable workflows
  const isSuperuser = !!currentUser?.is_superuser;
  const authorizedWorkflows = workflows.filter((w) => {
    const isStarter = (w.starters || []).some((s: any) => s.id === currentUser?.id);
    return isSuperuser ? true : isStarter;
  });

  const selectedWfObj = workflows.find((w) => w.id === Number(selectedWorkflowId));
  const isStarterForSelected = (selectedWfObj?.starters || []).some((s: any) => s.id === currentUser?.id);
  const canSubmit = isSuperuser || isStarterForSelected;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !deviceModel.trim()) return;
    if (!canSubmit) return;

    onCreate({
      workflowId: selectedWfObj ? selectedWfObj.id : undefined,
      workflowName: selectedWfObj ? selectedWfObj.name : 'فرآیند پیش‌فرض',
      customerName,
      deviceModel,
      description,
      userId: currentUser?.id,
    });

    setCustomerName('');
    setDeviceModel('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              شروع فرآیند عملیاتی جدید
            </h3>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              ثبت پرونده و انتصاب به مرحله آغازگر فرآیند
            </p>
          </div>
        </div>

        {/* Active User Indicator */}
        {currentUser && (
          <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-normal">کاربر فعال:</span>
              <span className="font-medium text-slate-800">
                {currentUser.first_name || currentUser.last_name
                  ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
                  : currentUser.username}
              </span>
              <span className="text-xs text-slate-400 font-normal">({currentUser.username})</span>
            </div>
            {isSuperuser ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                مدیر کل سامانه
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200/60">
                کاربر مجاز
              </span>
            )}
          </div>
        )}

        {/* Warning if no startable workflow */}
        {!isSuperuser && authorizedWorkflows.length === 0 ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs mb-4">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>عدم دسترسی به آغاز فرآیند</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-normal">
              کاربر <strong>«{currentUser?.username}»</strong> به عنوان آغازگر هیچ فرآیندی تعیین نشده است.
              تنها کاربرانی که در تب <strong>«تیم و دسترسی‌ها»</strong> توسط مدیر به عنوان آغازگر فرآیند تایید شده‌اند می‌توانند پرونده ثبت کنند.
            </p>
          </div>
        ) : null}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-slate-700">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700">انتخاب فرآیند سازمانی *</label>
              {selectedWfObj && (
                <div className="flex items-center gap-1 text-xs">
                  {isStarterForSelected ? (
                    <span className="text-green-700 font-medium flex items-center gap-1">
                      <Rocket className="w-3 h-3 text-green-600" />
                      شما آغازگر مجاز هستید
                    </span>
                  ) : isSuperuser ? (
                    <span className="text-blue-600 font-medium">
                      مجوز مدیر ارشد
                    </span>
                  ) : (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      فاقد مجوز شروع
                    </span>
                  )}
                </div>
              )}
            </div>

            {authorizedWorkflows.length === 0 ? (
              <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-xs">
                هیچ فرآیند مجازی برای شروع توسط شما یافت نشد.
              </div>
            ) : (
              <select
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              >
                {authorizedWorkflows.map((w) => {
                  const isStarter = (w.starters || []).some((s: any) => s.id === currentUser?.id);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code}) {isStarter ? '— آغازگر مجاز' : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-slate-700">نام متقاضی / سازمان مشتری *</label>
              <input
                type="text"
                required
                disabled={!canSubmit}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: شرکت نفت و گاز پارس"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50 font-normal"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-slate-700">مدل تجهیز / شناسه دارایی *</label>
              {models.length > 0 ? (
                <div className="space-y-1">
                  <select
                    disabled={!canSubmit}
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.brand})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  disabled={!canSubmit}
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="مثال: اینورتر زیمنس G120"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50 font-normal"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium text-slate-700">شرح عیب اولیه اعلام‌شده</label>
            <textarea
              rows={3}
              disabled={!canSubmit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="نقص عملکرد، خاموشی ناگهانی، نوسان ولتاژ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none disabled:opacity-50 font-normal"
            />
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2 text-xs text-blue-700 font-normal">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              با ثبت این فرم، شماره پیگیری یکتا صادر شده و پرونده با عنوان آغازگر برای شما در کارتابل ثبت می‌شود.
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>شروع و ثبت پرونده</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
