import { useState } from 'react';
import type { FC } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Clock3,
  FolderOpen,
  History,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  LogOut,
  ChevronLeft
} from 'lucide-react';

interface OperatorSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  myTasksCount?: number;
  pendingCount?: number;
  myProcessesCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewProcess?: () => void;
  onSwitchToAdmin?: () => void;
  isSuperuser?: boolean;
  currentUser?: any;
  onLogout?: () => void;
}

export const OperatorSidebar: FC<OperatorSidebarProps> = ({
  currentView,
  onSelectView,
  myTasksCount = 0,
  pendingCount = 0,
  myProcessesCount = 0,
  isCollapsed,
  onToggleCollapse,
  onOpenNewProcess,
  onSwitchToAdmin,
  isSuperuser = false,
  currentUser,
  onLogout,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const navItems = [
    {
      id: 'dashboard',
      label: 'میز کار و داشبورد من',
      shortLabel: 'داشبورد',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'my_tasks',
      label: 'وظایف اختصاص‌یافته به من',
      shortLabel: 'وظایف من',
      icon: UserCheck,
      badge: myTasksCount > 0 ? myTasksCount.toLocaleString('fa-IR') : null,
      badgeStyle: 'bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold',
    },
    {
      id: 'pending_handoff',
      label: 'تأییدهای در انتظار (هنداوف)',
      shortLabel: 'تحویل‌ها',
      icon: Clock3,
      badge: pendingCount > 0 ? pendingCount.toLocaleString('fa-IR') : null,
      badgeStyle: 'bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold',
    },
    {
      id: 'my_processes',
      label: 'پرونده‌های در جریان من',
      shortLabel: 'پرونده‌ها',
      icon: FolderOpen,
      badge: myProcessesCount > 0 ? myProcessesCount.toLocaleString('fa-IR') : null,
      badgeStyle: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold',
    },
    {
      id: 'history',
      label: 'سوابق و تاریخچه کارها',
      shortLabel: 'سوابق',
      icon: History,
      badge: null,
    },
  ];

  const userName = currentUser
    ? (currentUser.first_name || currentUser.last_name
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
        : currentUser.username)
    : 'اپراتور';

  const userRole = currentUser?.role || (currentUser?.is_superuser ? 'مدیر ارشد' : (currentUser?.job?.name || 'کارشناس عملیات'));

  return (
    <aside
      className={`bg-white border-l border-slate-200/80 flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand & Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              🐬
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
                  Dolphin Flow
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold leading-tight">
                  پورتال اپراتورها
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'باز کردن سایدبار' : 'بستن سایدبار'}
          >
            {isCollapsed ? (
              <PanelRightOpen className="w-4 h-4" />
            ) : (
              <PanelRightClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Start Process Button */}
        {onOpenNewProcess && (
          <div className="p-3 border-b border-slate-100">
            <button
              type="button"
              onClick={onOpenNewProcess}
              className={`w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                isCollapsed ? 'px-0' : 'px-3'
              }`}
              title="شروع پرونده جدید"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>شروع فرآیند جدید</span>}
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400">
              وظایف و کارتابل من
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  className={`w-full flex items-center justify-between h-9 px-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/70 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium shrink-0 ${
                        item.badgeStyle || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Tooltip for collapsed sidebar */}
                {isCollapsed && hoveredItemId === item.id && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                    {item.label}
                    {item.badge && ` (${item.badge})`}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Switch back to Admin & User Profile */}
      <div className="p-3 border-t border-slate-200/80 space-y-2.5">
        {/* Switch back to Admin Studio (for staff/superusers) */}
        {isSuperuser && onSwitchToAdmin && (
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className={`w-full flex items-center justify-between p-2 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-800 border border-blue-200/80 text-xs font-semibold transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="بازگشت به پنل مدیریت ارشد (Admin Studio)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-blue-700 shrink-0" />
              {!isCollapsed && <span className="truncate">پنل مدیریت (Admin)</span>}
            </div>
            {!isCollapsed && <ChevronLeft className="w-3.5 h-3.5 text-blue-500" />}
          </button>
        )}

        {/* Current Operator Profile */}
        <div className="flex items-center gap-2.5 p-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800 truncate">{userName}</div>
              <div className="text-[10px] text-slate-400 font-normal truncate">{userRole}</div>
            </div>
          )}
        </div>

        {/* Dedicated Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-2 p-2 rounded-lg bg-rose-50/70 hover:bg-rose-100 text-rose-700 border border-rose-200/70 text-xs font-medium transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="خروج از حساب کاربری"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            {!isCollapsed && <span className="truncate">خروج از حساب</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
