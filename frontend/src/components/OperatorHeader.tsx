import { useState } from 'react';
import type { FC } from 'react';
import {
  Search,
  Plus,
  Menu,
  Shield,
  ArrowRight,
  ChevronDown,
  LogOut
} from 'lucide-react';

interface OperatorHeaderProps {
  onOpenNewProcess?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: any;
  usersList?: any[];
  onSelectUser?: (user: any) => void;
  currentView?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSwitchToAdmin?: () => void;
  isSuperuser?: boolean;
  onLogout?: () => void;
}

const operatorTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'میز کار و داشبورد من',
    subtitle: 'اولویت‌بندی خودکار وظایف، پیگیری پرونده‌های در جریان و کنترل مهلت‌های SLA',
  },
  my_tasks: {
    title: 'وظایف اختصاص‌یافته به من',
    subtitle: 'پرونده‌هایی که مسئول مستقیم گام جاری آنها شما هستید',
  },
  pending_handoff: {
    title: 'تأییدهای در انتظار (Dual-Handoff)',
    subtitle: 'دستگاه‌های ارسالی از مرحله قبلی که نیازمند تایید فیزیکی شما هستند',
  },
  my_processes: {
    title: 'پرونده‌های در جریان من',
    subtitle: 'تمامی فرآیندهایی که آغازگر آن شما بوده‌اید و هنوز خاتمه نیافته‌اند',
  },
  history: {
    title: 'سوابق و تاریخچه کارها',
    subtitle: 'آرشیو فرآیندهای تکمیل‌شده و اقدامات گذشته',
  },
};

export const OperatorHeader: FC<OperatorHeaderProps> = ({
  onOpenNewProcess,
  searchQuery,
  onSearchChange,
  currentUser,
  usersList = [],
  onSelectUser,
  currentView = 'dashboard',
  isSidebarCollapsed = false,
  onToggleSidebar,
  onSwitchToAdmin,
  isSuperuser = false,
  onLogout,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const activeTitle = operatorTitles[currentView] || {
    title: 'پورتال اپراتورها',
    subtitle: 'سامانه یکپارچه مدیریت عملیاتی فرآیندها',
  };

  const displayName = currentUser
    ? (currentUser.first_name || currentUser.last_name
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
        : currentUser.username)
    : 'اپراتور';

  const displayRole = currentUser?.role || (currentUser?.is_superuser ? 'مدیر ارشد' : (currentUser?.job?.name || 'کارشناس'));

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col shrink-0 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
              {activeTitle.title}
            </h1>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded border border-emerald-200/60 hidden sm:inline-block">
              پورتال پرسنل
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
            {activeTitle.subtitle}
          </span>
        </div>

        <div className="relative w-full max-w-xs mr-3 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو در وظایف، کد رهگیری، مشتری..."
            className="w-full h-9 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pr-9 pl-3 rounded-lg border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors outline-none font-normal"
          />
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-3">
        {/* Return to Admin Studio Button (If user is Admin/Superuser) */}
        {isSuperuser && onSwitchToAdmin && (
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="بازگشت به پنل مدیریت ارشد"
          >
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">پنل مدیریت (Admin)</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          </button>
        )}

        {/* Live Core Engine Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>هسته برخط</span>
        </div>

        {/* Primary Start Process Button */}
        {onOpenNewProcess && (
          <button
            type="button"
            onClick={onOpenNewProcess}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>شروع فرآیند</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200" />

        {/* User Pill / Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 h-9 pr-1.5 pl-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-800 font-semibold flex items-center justify-center text-xs border border-emerald-200/60">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-right">
              <span className="font-semibold text-slate-800 leading-tight block">{displayName}</span>
              <span className="text-[10px] text-slate-400 font-normal leading-tight block">{displayRole}</span>
            </div>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isUserDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsUserDropdownOpen(false)}
              />

              <div
                className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 overflow-hidden text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800">{displayName}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{displayRole}</div>
                </div>

                {/* If Admin, allow switching operator view */}
                {isSuperuser && usersList.length > 0 && onSelectUser && (
                  <div className="p-2 border-b border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                      مشاهده میز کار به عنوان اپراتور دیگر:
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {usersList
                        .filter((u) => !u.is_superuser && u.username !== 'admin')
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              onSelectUser(u);
                              setIsUserDropdownOpen(false);
                            }}
                            className={`w-full text-right p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentUser?.id === u.id
                                ? 'bg-emerald-50 text-emerald-800 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{u.job?.name || 'کارشناس'}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {isSuperuser && onSwitchToAdmin && (
                  <div className="p-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onSwitchToAdmin();
                      }}
                      className="w-full text-right p-2 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>ورود به استودیو مدیریت (Admin)</span>
                    </button>
                  </div>
                )}

                {onLogout && (
                  <div className="p-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-right p-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج از حساب کاربری</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
