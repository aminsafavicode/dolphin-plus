import type { FC } from 'react';

export interface DayData {
  dayName: string;
  count: number;
  isPeak?: boolean;
}

interface WeeklyVolumeChartProps {
  data?: DayData[];
  totalInstances?: number;
  completedCount?: number;
}

export const WeeklyVolumeChart: FC<WeeklyVolumeChartProps> = ({
  data,
  totalInstances,
  completedCount = 0,
}) => {
  const defaultData: DayData[] = [
    { dayName: 'شنبه', count: 0 },
    { dayName: '۱شنبه', count: 0 },
    { dayName: '۲شنبه', count: 0 },
    { dayName: '۳شنبه', count: 0 },
    { dayName: '۴شنبه', count: 0 },
    { dayName: '۵شنبه', count: 0 },
    { dayName: 'جمعه', count: 0 },
  ];

  const weeklyData = data && data.length > 0 ? data : defaultData;
  const maxVal = Math.max(...weeklyData.map((d) => d.count), 1);
  const totalWeekly = weeklyData.reduce((acc, cur) => acc + cur.count, 0);
  const totalCount = totalInstances ?? totalWeekly;

  const peakDay = weeklyData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), weeklyData[0]);
  const peakCount = peakDay?.count || 0;
  const avgDaily = Math.round(totalWeekly / 7);
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between h-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">حجم پرونده‌های هفتگی</h3>
          <p className="text-xs text-slate-400 font-normal mt-0.5">توزیع پرونده‌های ثبت‌شده در روزهای هفته (پایگاه‌داده)</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal shrink-0">
          <span>مجموع:</span>
          <strong className="text-slate-800 font-semibold">{totalCount.toLocaleString('fa-IR')} پرونده</strong>
        </div>
      </div>

      {/* Main Metric Peak Indicator */}
      <div className="flex flex-wrap items-baseline gap-2 mb-3">
        <span className="text-xl font-semibold text-slate-800">
          {peakCount.toLocaleString('fa-IR')}
        </span>
        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium border border-blue-200/50">
          {peakCount > 0 ? `اوج بار در روز ${peakDay.dayName}` : 'ثبت برخط پرونده‌ها'}
        </span>
      </div>

      {/* Chart Canvas with horizontal guidelines */}
      <div className="relative pt-5 pb-2 overflow-x-auto">
        {/* Horizontal subtle guide lines */}
        <div className="absolute inset-x-0 top-5 bottom-7 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-dashed border-slate-100 w-full" />
          <div className="border-b border-slate-200 w-full" />
        </div>

        {/* Bars Container */}
        <div className="relative z-10 flex items-end justify-between gap-1.5 h-34 px-1 min-w-[320px]">
          {weeklyData.map((item, idx) => {
            const heightPercent = maxVal > 0 ? Math.round((item.count / maxVal) * 100) : 0;
            const isHighlighted = item.count > 0 && item.count === peakCount;
            return (
              <div key={idx} className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group">
                {/* Count number explicitly on top of bar */}
                <span
                  className={`text-xs mb-1 font-medium transition-colors ${
                    isHighlighted ? 'text-blue-600 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {item.count.toLocaleString('fa-IR')}
                </span>

                {/* The Bar */}
                <div
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  className={`w-5 max-w-[24px] rounded-t-[4px] transition-all duration-200 ${
                    isHighlighted
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : item.count > 0
                      ? 'bg-blue-400 hover:bg-blue-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                />

                {/* Day Label */}
                <span
                  className={`text-[11px] mt-1.5 font-normal transition-colors whitespace-nowrap ${
                    isHighlighted ? 'text-blue-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  {item.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-normal">
        <span>میانگین ۷ روز گذشته: {avgDaily.toLocaleString('fa-IR')} پرونده</span>
        <span className="text-emerald-700 font-medium">
          {completionRate}٪ نرخ تکمیل ({completedCount} تکمیل‌شده)
        </span>
      </div>
    </div>
  );
};
