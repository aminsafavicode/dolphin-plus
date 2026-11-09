import { useState } from 'react';
import type { FC } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ExternalLink,
  Menu,
  LogIn,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  onOpenNewProcess: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: any;
  usersList?: any[];
  onSelectUser?: (user: any) => void;
  currentView?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSwitchToOperator?: () => void;
}

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  operator_dashboard: { title: 'میز کار عملیاتی اپراتور', subtitle: 'مدیریت وظایف من، اولویت‌بندی هوشمند کارها و پیگیری مراحل فرآیند' },
  dashboard: { title: 'پیشخوان و آمار کلی', subtitle: 'پایش برخط شاخص‌های کلیدی فرآیندها' },
  cartable: { title: 'کارتابل نظارتی پرونده‌ها', subtitle: 'رهگیری و پیگیری زنده وظایف' },
  pending_handoff: { title: 'تأییدهای فیزیکی در انتظار', subtitle: 'پروتکل دونفره تحویل تجهیزات (Dual-Handoff)' },
  workflows: { title: 'استودیو طراحی فرآیندها', subtitle: 'مدل‌سازی گراف وضعیت، گذارها و فیلدها' },
  forms: { title: 'فرم‌ساز یکپارچه', subtitle: 'طراحی فرم‌های پویا، سکشن‌ها و جداول تکرارشونده' },
  catalog: { title: 'کاتالوگ و تجهیزات', subtitle: 'مدیریت انواع و مدل‌های تجهیزات سخت‌افزاری' },
  lookups: { title: 'منابع داده و لغت‌نامه‌ها', subtitle: 'جداول پایه، مقادیر گزینه‌ای و مراجع' },
  sla: { title: 'تقویم کاری و موافقت‌نامه SLA', subtitle: 'تنظیم ساعات مجاز کاری و پایش تعهدات' },
  permissions: { title: 'ماتریس دسترسی و امنیت', subtitle: 'کنترل سطح دسترسی فیلدها، گام‌ها و آغازگران' },
  users: { title: 'مدیریت کاربران و سازمان', subtitle: 'تعریف نقش‌ها، مشاغل و پرسنل' },
  backup: { title: 'پشتیبان‌گیری و تاب‌آوری', subtitle: 'مدیریت نسخ پشتیبان، دیسک و بازیابی' },
};

export const Header: FC<HeaderProps> = ({
  onOpenNewProcess,
  searchQuery,
  onSearchChange,
  currentUser,
  usersList = [],
  onSelectUser,
  currentView = 'dashboard',
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const handleEnterCartable = (u: any) => {
    if (onSelectUser) {
      onSelectUser(u);
    }
    setIsUserDropdownOpen(false);
    // Open dedicated Operator Portal on port 5174 for this user
    window.open(`http://${window.location.hostname}:5174/?userId=${u.id}`, '_blank');
  };

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const username = (u.username || '').toLowerCase();
    const job = (u.job?.name || '').toLowerCase();
    return name.includes(q) || username.includes(q) || job.includes(q);
  });

  const activeTitle = viewTitles[currentView] || {
    title: 'استودیو مدیریت فرآیندها',
    subtitle: 'سامانه یکپارچه مدل‌سازی و نظارت',
  };

  const displayName = currentUser
    ? (currentUser.first_name || currentUser.last_name
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
        : currentUser.username)
    : 'محمدامین';

  const displayRole = currentUser
    ? (currentUser.is_superuser
        ? 'مدیر ارشد سامانه'
        : currentUser.job?.name || (currentUser.is_staff ? 'کارشناس سیستم' : 'کاربر اپراتور'))
    : 'مدیر ارشد سامانه';

  const initials = currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : 'م‌ا';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'باز کردن سایدبار' : 'بستن سایدبار'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col shrink-0 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
            {activeTitle.title}
          </h1>
          <span className="text-[11px] text-slate-400 font-normal truncate">
            {activeTitle.subtitle}
          </span>
        </div>
        <div className="relative w-full max-w-xs mr-3 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو در پرونده‌ها، شناسه، کد پیگیری..."
            className="w-full h-9 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pr-9 pl-3 rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors outline-none font-normal"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Core Engine Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>هسته برخط</span>
        </div>

        {/* Open Dedicated Operator Portal (Port 5174) */}
        <a
          href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5174/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          title="باز کردن پورتال اختصاصی اپراتورها روی پورت ۵۱۷۴"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>پورتال اپراتورها (۵۱۷۴)</span>
          <ExternalLink className="w-3 h-3 text-emerald-600" />
        </a>

        {/* Primary New Process Button */}
        <button
          onClick={onOpenNewProcess}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>شروع فرآیند جدید</span>
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* User Profile Pill with Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 h-9 pr-1.5 pl-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs"
            title="ورود به کارتابل پرسنل"
          >
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 font-semibold flex items-center justify-center text-xs border border-blue-200/60">
              {initials}
            </div>
            <div className="hidden sm:block text-right">
              <span className="font-medium text-slate-800 leading-tight block">{displayName}</span>
              <span className="text-xs text-slate-400 font-normal leading-tight block">{displayRole}</span>
            </div>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Switcher Dropdown */}
          {isUserDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsUserDropdownOpen(false)}
              />

              <div
                className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 overflow-hidden text-right"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-3 bg-slate-50/70 border-b border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">ورود مستقیم به کارتابل پرسنل</div>
                        <div className="text-[11px] text-slate-400 font-normal">مشاهده وظایف بدون نیاز به رمز عبور</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {usersList.length} کاربر
                    </span>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="جستجوی نام یا نقش کاربر..."
                      className="w-full h-8 bg-white text-xs text-slate-800 placeholder-slate-400 pr-8 pl-3 rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors font-normal"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="max-h-80 overflow-y-auto p-2 pb-3 space-y-1.5">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-normal">
                      کاربری یافت نشد.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const uName = u.first_name || u.last_name
                        ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                        : u.username;
                      const uRole = u.is_superuser
                        ? 'مدیر ارشد'
                        : u.job?.name || (u.is_staff ? 'کارشناس' : 'اپراتور');
                      const isCurrent = currentUser?.id === u.id;
                      const impersonateUrl = `http://${window.location.hostname}:8000/accounts/impersonate/${u.id}/`;

                      return (
                        <div
                          key={u.id}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-blue-50/60 border-blue-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200/70 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 border ${
                              u.is_superuser
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-800 truncate">{uName}</span>
                                {u.is_superuser && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium border border-blue-200/60">
                                    ادمین
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium border border-emerald-200/60">
                                    فعال
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal truncate">
                                {u.username} • {uRole}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEnterCartable(u)}
                              title={`ورود به کارتابل اپراتور ${uName}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
                            >
                              <span>ورود به کارتابل</span>
                            </button>

                            <a
                              href={impersonateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`ورود با هویت ${uName} در جنگو`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Links */}
                <div className="p-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                  <a
                    href={`http://${window.location.hostname}:8000/admin/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-700 font-normal py-1 px-2 rounded-md hover:bg-white transition-colors"
                  >
                    <span>پنل مدیریت جنگو</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <a
                    href={`http://${window.location.hostname}:5174/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium py-1 px-2 rounded-md hover:bg-emerald-50 transition-colors"
                  >
                    <span>پورتال اپراتورها (پورت ۵۱۷۴)</span>
                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
