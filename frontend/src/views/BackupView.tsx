import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  ShieldCheck,
  Trash2,
  HardDrive,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';

export const BackupView: FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await api.getBackupStatus();
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.triggerBackup(true, false);
      alert('عملیات پشتیبان‌گیری با موفقیت آغاز شد: ' + res.filename);
      await loadStatus();
    } catch (err: any) {
      alert('خطا در پشتیبان‌گیری: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    if (!confirm('آیا از حذف این فایل پشتیبان اطمینان دارید؟')) return;
    try {
      await api.deleteBackup(id);
      loadStatus();
    } catch (err: any) {
      alert('خطا در حذف: ' + err.message);
    }
  };

  const disk = data?.disk_metrics || {
    total_gb: 100,
    used_gb: 25,
    free_gb: 75,
    usage_pct: 25,
    pg_size_mb: 12,
    media_size_mb: 1,
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">پیشخوان جامع پشتیبان‌گیری و تاب‌آوری (Disaster Recovery)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              پایش بلادرنگ دیسک، زمان‌بندی‌های خودکار، تهیه نسخه پشتیبان دستی و تاب‌آوری دیتابیس
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerBackup}
          disabled={isBackingUp}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
          <span>{isBackingUp ? 'در حال تهیه پشتیبان...' : 'تهیه نسخه پشتیبان دستی (فوری)'}</span>
        </button>
      </div>

      {/* Disk Storage Capacity Breakdown Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">وضعیت فضای ذخیره‌سازی و دیسک سرور</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            {disk.used_gb} GB / {disk.total_gb} GB ({disk.usage_pct}٪ مصرف‌شده)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, disk.usage_pct)}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              disk.usage_pct > 85 ? 'bg-rose-500' : 'bg-blue-600'
            }`}
          />
        </div>

        {/* Details Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-0.5">پایگاه داده PostgreSQL:</span>
            <span className="font-semibold text-slate-800 font-mono">{disk.pg_size_mb} MB</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-0.5">پوشه رسانه‌ها (Media):</span>
            <span className="font-semibold text-slate-800 font-mono">{disk.media_size_mb} MB</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-0.5">فضای خالی در دسترس:</span>
            <span className="font-semibold text-emerald-600 font-mono">{disk.free_gb} GB</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-0.5">سیاست نگهداری:</span>
            <span className="font-semibold text-slate-800">
              حفظ {data?.retention?.keep_last || 10} نسخه اخیر
            </span>
          </div>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">آرشیو نسخه‌های پشتیبان ثبت‌شده</h3>
            <p className="text-xs text-slate-400 mt-0.5">فایل‌های پشتیبان فشرده، اعتبارسنجی چکسام و لاگ تاریخچه</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            {data?.backups?.length || 0} نسخه موجود
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">نام فایل و شناسه</th>
                <th className="py-3 px-4">وضعیت عملیات</th>
                <th className="py-3 px-4">تاریخ ثبت</th>
                <th className="py-3 px-4">نوع محتوا</th>
                <th className="py-3 px-4">ایجادکننده</th>
                <th className="py-3 px-6 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.backups?.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    هنوز نسخه‌ای ذخیره نشده است. با زدن دکمه «تهیه نسخه پشتیبان دستی» اولین نسخه را ایجاد کنید.
                  </td>
                </tr>
              ) : (
                data.backups.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">
                      {b.filename}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200/60">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {b.status === 'SUCCESS' ? 'موفق و تأییدشده' : b.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono">
                      {new Date(b.created_at).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {b.includes_media ? 'دیتابیس + فایل‌های مدیا' : 'دیتابیس خالص'}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {b.created_by_name || 'سیستم'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteBackup(b.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                        title="حذف فایل پشتیبان"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
