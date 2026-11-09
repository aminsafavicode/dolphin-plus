import { useState } from 'react';
import type { FC } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Clock3,
  GitBranch,
  FileSpreadsheet,
  Cpu,
  Database,
  Calendar,
  ShieldCheck,
  Users,
  HardDrive,
  PanelRightClose,
  PanelRightOpen,
  ExternalLink,
  Layers
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  pendingCount?: number;
  myTasksCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: any;
  badge?: string | number | null;
  badgeStyle?: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const Sidebar: FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingCount = 0,
  myTasksCount: _myTasksCount = 0,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const navGroups: NavGroup[] = [
    {
      id: 'monitoring',
      title: 'نظارت و مدیریت',
      items: [
        {
          id: 'dashboard',
          label: 'پیشخوان آماری کلان',
          shortLabel: 'پیشخوان',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'cartable',
          label: 'کارتابل نظارتی پرونده‌ها',
          shortLabel: 'کارتابل',
          icon: Inbox,
          badge: null,
        },
        {
          id: 'pending_handoff',
          label: 'تأییدهای در انتظار (هنداوف)',
          shortLabel: 'تحویل‌ها',
          icon: Clock3,
          badge: pendingCount > 0 ? pendingCount.toLocaleString('fa-IR') : null,
          badgeStyle: 'bg-amber-50 text-amber-700 border border-amber-200/80',
        },
      ],
    },
    {
      id: 'studio',
      title: 'استودیو مدل‌سازی',
      items: [
        {
          id: 'workflows',
          label: 'میز کار فرآیندها',
          shortLabel: 'فرآیندها',
          icon: GitBranch,
          badge: null,
        },
        {
          id: 'forms',
          label: 'فرم‌ساز و فیلدها',
          shortLabel: 'فرم‌ساز',
          icon: FileSpreadsheet,
          badge: null,
        },
        {
          id: 'lookups',
          label: 'منابع داده و لغت‌نامه‌ها',
          shortLabel: 'منابع داده',
          icon: Database,
          badge: null,
        },
        {
          id: 'sla',
          label: 'تقویم کاری و SLA',
          shortLabel: 'تقویم SLA',
          icon: Calendar,
          badge: null,
        },
      ],
    },
    {
      id: 'assets',
      title: 'کاتالوگ و تجهیزات',
      items: [
        {
          id: 'catalog',
          label: 'کاتالوگ سخت‌افزار',
          shortLabel: 'کاتالوگ',
          icon: Cpu,
          badge: null,
        },
      ],
    },
    {
      id: 'governance',
      title: 'امنیت و سازمان',
      items: [
        {
          id: 'permissions',
          label: 'ماتریس دسترسی و امنیت',
          shortLabel: 'دسترسی‌ها',
          icon: ShieldCheck,
          badge: null,
        },
        {
          id: 'users',
          label: 'کاربران و ساختار',
          shortLabel: 'کاربران',
          icon: Users,
          badge: null,
        },
        {
          id: 'backup',
          label: 'پشتیبان‌گیری و سلامت',
          shortLabel: 'پشتیبان',
          icon: HardDrive,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-white border-l border-slate-200/80 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 transition-[width] duration-300 ease-in-out shadow-xs ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-base shadow-xs shrink-0 font-bold">
                🐬
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900 truncate">
                    Dolphin Flow
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
                    Studio
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal truncate">
                  مدیریت و مدل‌سازی فرآیند
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="بستن منو (کوچک‌نمایی)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="باز کردن منو"
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer group flex items-center justify-center"
            >
              <div className="relative">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm shadow-xs font-bold">
                  🐬
                </span>
                <span className="absolute -bottom-1 -left-1 bg-white rounded-full p-0.5 shadow-xs border border-slate-200 text-slate-600 group-hover:text-blue-600">
                  <PanelRightOpen className="w-3 h-3" />
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 overflow-x-hidden scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                  {group.title}
                </span>
                <span className="text-[10px] text-slate-300 font-mono">0{groupIdx + 1}</span>
              </div>
            ) : (
              groupIdx > 0 && <div className="h-px bg-slate-100 my-2 mx-1" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectView(item.id)}
                      className={`w-full flex items-center rounded-lg transition-all duration-150 cursor-pointer group ${
                        isCollapsed
                          ? 'justify-center h-10 w-10 mx-auto'
                          : 'justify-between px-3 py-2 text-xs'
                      } ${
                        isActive
                          ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs border-r-3 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 font-normal'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2.5 min-w-0 ${
                          isCollapsed ? 'justify-center' : ''
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-blue-600'
                              : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate text-right">{item.label}</span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0 mr-1.5 ${item.badgeStyle}`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Small badge dot for collapsed mode */}
                      {isCollapsed && item.badge && (
                        <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                      )}
                    </button>

                    {/* Floating Tooltip in Collapsed Mode */}
                    {isCollapsed && hoveredItemId === item.id && (
                      <div
                        className="fixed z-50 pointer-events-none transform -translate-y-1/2 flex items-center gap-1.5 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-800 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
                        style={{
                          right: '80px',
                          marginTop: '20px',
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            بخش {group.title}
                          </span>
                        </div>
                        {/* Caret pointing right (towards sidebar) */}
                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-t border-slate-800" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Area: Operator Portal Link & Status */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
        {/* Jump to Operator Portal */}
        <a
          href="http://localhost:8000/operator/"
          target="_blank"
          rel="noopener noreferrer"
          title="ورود به درگاه کاربری اپراتور"
          className={`flex items-center rounded-lg border border-slate-200/80 bg-white hover:bg-blue-50/60 hover:border-blue-300 text-slate-700 hover:text-blue-700 transition-all cursor-pointer shadow-2xs group ${
            isCollapsed
              ? 'justify-center w-10 h-10 mx-auto'
              : 'justify-between px-3 py-2 text-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            {!isCollapsed && <span className="font-medium">درگاه کاربری اپراتور</span>}
          </div>
          {!isCollapsed && (
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
          )}
        </a>

        {/* System Health / Status */}
        {!isCollapsed ? (
          <div className="px-3 py-2 rounded-lg bg-white border border-slate-200/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-slate-600 text-[11px] font-normal">همه سرویس‌ها آنلاین</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v2.4</span>
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-10 h-6 mx-auto"
            title="وضعیت: تمامی سرویس‌ها فعال (v2.4)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
