import type { FC } from 'react';
import {
  History,
  Activity,
  UserCheck,
  CheckCircle2,
  Database
} from 'lucide-react';
import type { ActivityItem } from '../types/dashboard';

interface ActivityProps {
  activities: ActivityItem[];
}

export const RecentActivityWidget: FC<ActivityProps> = ({ activities }) => {
  const displayActivities = activities || [];

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">رویدادهای زنده سیستم</h3>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
          لحظه‌ای
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-3 flex-1">
        {displayActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-normal">
            هنوز رویدادی ثبت نشده است.
          </div>
        ) : (
          displayActivities.slice(0, 5).map((item) => {
            let Icon = Activity;

            if (item.type === 'handoff') {
              Icon = UserCheck;
            } else if (item.type === 'backup') {
              Icon = Database;
            } else if (item.type === 'complete') {
              Icon = CheckCircle2;
            }

            return (
              <div key={item.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-normal text-slate-800 truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 font-normal">
                    <span>{item.user}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Audit Link */}
      <div className="pt-3 border-t border-slate-100 mt-3 text-center">
        <span className="text-xs text-slate-400 font-normal">
          دفتر لاگ و رهگیری رویدادها فعال است
        </span>
      </div>
    </div>
  );
};
