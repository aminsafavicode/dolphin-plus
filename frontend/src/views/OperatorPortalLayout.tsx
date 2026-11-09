import { useState } from 'react';
import type { FC } from 'react';
import { OperatorSidebar } from '../components/OperatorSidebar';
import { OperatorHeader } from '../components/OperatorHeader';
import { OperatorDashboardView } from './OperatorDashboardView';
import { LiveCartableTable } from '../components/LiveCartableTable';
import type { TaskItem } from '../types/dashboard';

interface OperatorPortalLayoutProps {
  currentUser?: any;
  usersList?: any[];
  onSelectUser?: (user: any) => void;
  onSwitchToAdmin?: () => void;
  isSuperuser?: boolean;
  onOpenNewProcess?: () => void;
  onOpenTask?: (taskId: string) => void;
  tasks?: TaskItem[];
  onAcceptHandoff?: (taskId: string) => void;
  onRejectHandoff?: (taskId: string) => void;
  onOpenTaskModal?: (task: TaskItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout?: () => void;
}

export const OperatorPortalLayout: FC<OperatorPortalLayoutProps> = ({
  currentUser,
  usersList = [],
  onSelectUser,
  onSwitchToAdmin,
  isSuperuser = false,
  onOpenNewProcess,
  onOpenTask,
  tasks = [],
  onAcceptHandoff,
  onRejectHandoff,
  onOpenTaskModal,
  searchQuery,
  onSearchChange,
  onLogout,
}) => {
  const [operatorView, setOperatorView] = useState<'dashboard' | 'my_tasks' | 'pending_handoff' | 'my_processes' | 'history'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filter tasks for operator tabs
  const myTasks = tasks.filter((t) => t.status === 'active');
  const pendingHandoffs = tasks.filter((t) => t.status === 'pending_handoff');
  const myProcesses = tasks.filter((t) => t.status === 'active');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800" dir="rtl">
      {/* Dedicated Operator Sidebar */}
      <OperatorSidebar
        currentView={operatorView}
        onSelectView={(v) => setOperatorView(v as any)}
        myTasksCount={myTasks.length}
        pendingCount={pendingHandoffs.length}
        myProcessesCount={myProcesses.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenNewProcess={onOpenNewProcess}
        onSwitchToAdmin={onSwitchToAdmin}
        isSuperuser={isSuperuser}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dedicated Operator Header */}
        <OperatorHeader
          onOpenNewProcess={onOpenNewProcess}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          currentUser={currentUser}
          usersList={usersList}
          onSelectUser={onSelectUser}
          currentView={operatorView}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSwitchToAdmin={onSwitchToAdmin}
          isSuperuser={isSuperuser}
          onLogout={onLogout}
        />

        {/* Scrollable Main View */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* 1. Operator Dashboard View */}
          {operatorView === 'dashboard' && (
            <OperatorDashboardView
              onOpenNewProcess={onOpenNewProcess}
              onOpenTask={onOpenTask}
              selectedUserId={currentUser?.id}
              usersList={usersList}
              onSelectUser={onSelectUser}
            />
          )}

          {/* 2. My Tasks View */}
          {operatorView === 'my_tasks' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">وظایف اختصاص‌یافته به من</h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    پرونده‌هایی که در گام فعلی مستقیماً به شما ارجاع داده شده‌اند
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-lg">
                  {myTasks.length} وظیفه در جریان
                </span>
              </div>
              <LiveCartableTable
                tasks={myTasks}
                onAcceptHandoff={onAcceptHandoff || (() => {})}
                onRejectHandoff={onRejectHandoff || (() => {})}
                onOpenTask={onOpenTaskModal || (() => {})}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {/* 3. Pending Physical Handoffs View */}
          {operatorView === 'pending_handoff' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 shadow-2xs">
                <strong>پروتکل تحویل فیزیکی تجهیزات (Dual-Handoff):</strong> پرونده‌های زیر توسط همکاران در مرحله قبل ارسال شده و جهت آغاز مرحله شما نیازمند تایید دریافت حضوری دستگاه است.
              </div>
              <LiveCartableTable
                tasks={pendingHandoffs}
                onAcceptHandoff={onAcceptHandoff || (() => {})}
                onRejectHandoff={onRejectHandoff || (() => {})}
                onOpenTask={onOpenTaskModal || (() => {})}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {/* 4. My Started Processes */}
          {operatorView === 'my_processes' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">پرونده‌های در جریان من</h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    تمامی فرآیندهایی که آغازگر آن شما بوده‌اید و هنوز در چرخه گردش کار فعال هستند
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                  {myProcesses.length} پرونده فعال
                </span>
              </div>
              <LiveCartableTable
                tasks={myProcesses}
                onAcceptHandoff={onAcceptHandoff || (() => {})}
                onRejectHandoff={onRejectHandoff || (() => {})}
                onOpenTask={onOpenTaskModal || (() => {})}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {/* 5. Completed Archive History */}
          {operatorView === 'history' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">سوابق و تاریخچه پرونده‌ها</h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    آرشیو فرآیندهای تکمیل‌شده و خاتمه‌یافته
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {completedTasks.length} پرونده مختومه
                </span>
              </div>
              <LiveCartableTable
                tasks={completedTasks}
                onAcceptHandoff={onAcceptHandoff || (() => {})}
                onRejectHandoff={onRejectHandoff || (() => {})}
                onOpenTask={onOpenTaskModal || (() => {})}
                searchFilter={searchQuery}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
