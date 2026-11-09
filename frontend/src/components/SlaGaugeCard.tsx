import type { FC } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SlaGaugeProps {
  rate?: number;
  target?: number;
}

export const SlaGaugeCard: FC<SlaGaugeProps> = ({
  rate = 96.5,
  target = 95,
}) => {
  // Clean semi-circle gauge calculation with monochromatic primary color
  const radius = 55;
  const semiCircumference = Math.PI * radius;
  const strokeDashoffset = semiCircumference * (1 - Math.min(rate, 100) / 100);

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">تعهد زمانی (SLA)</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200/50">
          پایدار
        </span>
      </div>

      {/* Monochromatic Arc Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg className="w-44 h-24 overflow-visible" viewBox="0 0 140 75">
          {/* Background Arc */}
          <path
            d="M 15 70 A 55 55 0 0 1 125 70"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Foreground Progress Arc (Single primary or green success color) */}
          <path
            d="M 15 70 A 55 55 0 0 1 125 70"
            fill="none"
            stroke="#2563eb"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={semiCircumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute bottom-1 text-center">
          <div className="text-2xl font-semibold text-slate-800 tracking-tight">
            {rate.toLocaleString('fa-IR')}٪
          </div>
          <div className="text-xs text-slate-400 font-normal mt-0.5">
            هدف تعیین‌شده: {target.toLocaleString('fa-IR')}٪
          </div>
        </div>
      </div>

      {/* Details Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-normal text-slate-500">
        <div className="flex items-center gap-1.5 text-green-700">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>مطابق شاخص استاندارد</span>
        </div>
        <span className="text-slate-400">میانگین: ۱.۴ ساعت</span>
      </div>
    </div>
  );
};
