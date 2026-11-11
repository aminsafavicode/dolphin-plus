import type { FC } from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  Database
} from 'lucide-react';

interface KpiCardsProps {
  activeTasksCount: number;
  pendingHandoffCount: number;
  slaRate: number;
  backupStatusText: string;
  totalInstances?: number;
}

export const KpiCards: FC<KpiCardsProps> = ({
  activeTasksCount = 0,
  pendingHandoffCount = 0,
  slaRate = 100,
  backupStatusText = 'پایدار و ایمن',
  totalInstances,
}) => {
  const cards = [
    {
      title: 'پرونده‌های در حال گردش',
      value: activeTasksCount.toLocaleString('fa-IR'),
      unit: 'پرونده',
      subValue: 'در فرآیندهای عملیاتی فعال',
      badge: totalInstances !== undefined ? `${totalInstances.toLocaleString('fa-IR')} کل پرونده‌ها` : 'جاری در چرخه',
      badgeStyle: 'bg-green-50 text-green-700 border border-green-200/50',
      icon: Activity,
    },
    {
      title: 'در انتظار تایید تحویل',
      value: pendingHandoffCount.toLocaleString('fa-IR'),
      unit: 'پرونده',
      subValue: 'نیازمند پذیرش فیزیکی',
      badge: pendingHandoffCount > 0 ? 'در صف تحویل' : 'تکمیل شده',
      badgeStyle: pendingHandoffCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-slate-50 text-slate-600 border border-slate-200/50',
      icon: Clock,
    },
    {
      title: 'رعایت تعهد زمانی (SLA)',
      value: `${slaRate.toLocaleString('fa-IR')}٪`,
      unit: '',
      subValue: 'هدف سازمانی: ۹۵٪',
      badge: slaRate >= 95 ? 'محدوده بهینه' : 'نیاز به پیگیری',
      badgeStyle: slaRate >= 95 ? 'bg-green-50 text-green-700 border border-green-200/50' : 'bg-amber-50 text-amber-700 border border-amber-200/50',
      icon: CheckCircle2,
    },
    {
      title: 'وضعیت تاب‌آوری و پایگاه‌داده',
      value: '۱۰۰٪',
      unit: '',
      subValue: backupStatusText,
      badge: 'سالم و پایدار',
      badgeStyle: 'bg-blue-50 text-blue-700 border border-blue-200/50',
      icon: Database,
    },
  ];

  return (
    <div className="grid grid-cols-1 @md:grid-cols-2 @5xl:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-medium text-slate-500 truncate">
                {c.title}
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mb-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold text-slate-800 tracking-tight">
                  {c.value}
                </span>
                {c.unit && (
                  <span className="text-xs text-slate-400 font-normal">
                    {c.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5 truncate">
                {c.subValue}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${c.badgeStyle}`}>
                {c.badge}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">بروزرسانی لحظه‌ای</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
