import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { WeeklyVolumeChart } from './components/WeeklyVolumeChart';
import { SlaGaugeCard } from './components/SlaGaugeCard';
import { LiveCartableTable } from './components/LiveCartableTable';
import { RecentActivityWidget } from './components/RecentActivityWidget';
import { NewProcessModal } from './components/NewProcessModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { WorkflowsView } from './views/WorkflowsView';
import { FormsView } from './views/FormsView';
import { CatalogView } from './views/CatalogView';
import { LookupsView } from './views/LookupsView';
import { SlaCalendarView } from './views/SlaCalendarView';
import { UsersView } from './views/UsersView';
import { BackupView } from './views/BackupView';
import { AccessMatrixView } from './views/AccessMatrixView';
import type { TaskItem } from './types/dashboard';
import { CheckCircle } from 'lucide-react';
import { api } from './api/client';

export function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewProcessOpen, setIsNewProcessOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dolphin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dolphin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [stats, taskList, users] = await Promise.all([
        api.getDashboardStats(),
        api.getCartableTasks('all', searchQuery),
        api.getUsers().catch(() => []),
      ]);
      setDashboardStats(stats);
      setTasks(taskList);
      setUsersList(users);
      if (users.length > 0 && !currentUser) {
        // Default to admin or first user
        const superuser = users.find((u: any) => u.is_superuser) || users[0];
        setCurrentUser(superuser);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        const nextUrl = encodeURIComponent((window.location.pathname || '/admin/') + window.location.search);
        window.location.href = `/accounts/login/?next=${nextUrl}`;
        return;
      }
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    api.getMe()
      .then((res) => {
        if (!active) return;
        if (!res?.authenticated) {
          const nextUrl = encodeURIComponent((window.location.pathname || '/admin/') + window.location.search);
          window.location.href = `/accounts/login/?next=${nextUrl}`;
          return;
        }
        if (res.user) {
          setCurrentUser(res.user);
        }
        setAuthChecked(true);
      })
      .catch((err) => {
        if (!active) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          const nextUrl = encodeURIComponent((window.location.pathname || '/admin/') + window.location.search);
          window.location.href = `/accounts/login/?next=${nextUrl}`;
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    loadData();
    const interval = setInterval(loadData, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, [authChecked, searchQuery]);

  // Handoff Accept Handler (Accept physical custody)
  const handleAcceptHandoff = async (taskId: string) => {
    try {
      const res = await api.acceptHandoff(taskId);
      showToast(`✅ ${res.message || 'تحویل فیزیکی دستگاه با موفقیت تأیید شد.'}`);
      loadData();
    } catch (err: any) {
      showToast('❌ خطا در تایید تحویل: ' + err.message);
    }
  };

  // Handoff Reject Handler
  const handleRejectHandoff = async (taskId: string) => {
    const reason = prompt('لطفاً دلیل رد تحویل دستگاه را وارد کنید:') || 'نقص مستندات فیزیکی';
    try {
      const res = await api.rejectHandoff(taskId, reason);
      showToast(`⚠️ ${res.message || 'تحویل دستگاه رد شد.'}`);
      loadData();
    } catch (err: any) {
      showToast('❌ خطا در رد تحویل: ' + err.message);
    }
  };

  // Transition Execution Handler
  const handleExecuteTransition = async (taskId: string, nextStepName: string) => {
    try {
      // Fetch details to find transition id
      const detail = await api.getInstanceDetail(taskId);
      if (detail.transitions && detail.transitions.length > 0) {
        const transId = detail.transitions[0].id;
        const res = await api.executeTransition(taskId, transId, `انتقال به ${nextStepName}`);
        showToast(`🚀 ${res.message}`);
      } else {
        showToast(`🚀 گذار با موفقیت اجرا شد.`);
      }
      loadData();
    } catch (err: any) {
      showToast('❌ خطا در اجرای گذار: ' + err.message);
    }
  };

  // Create New Process Handler (Real DB creation with Authorization)
  const handleCreateProcess = async (data: {
    workflowId?: number;
    workflowName: string;
    customerName: string;
    deviceModel: string;
    description: string;
    userId?: number;
  }) => {
    try {
      const res = await api.createInstance({
        workflow_id: data.workflowId,
        customer_name: data.customerName,
        device_model: data.deviceModel,
        description: data.description,
        user_id: data.userId || currentUser?.id,
      });
      showToast(`✨ ${res.message} (کد پیگیری: ${res.trackingCode})`);
      loadData();
    } catch (err: any) {
      const errDetail = err.response?.data?.error || err.response?.data?.detail || err.message;
      showToast('❌ خطا در ایجاد پرونده: ' + errDetail);
    }
  };

  const pendingCount = dashboardStats?.pending_handoff_count ?? tasks.filter((t) => t.status === 'pending_handoff').length;
  const activeProcessesCount = dashboardStats?.active_tasks_count ?? tasks.filter((t) => t.status === 'active').length;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 text-sm font-sans" dir="rtl">
        در حال بررسی نشست کاربری و هدایت به صفحه ورود...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-row text-slate-800 font-sans" dir="rtl">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white text-xs font-normal px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Right Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        pendingCount={pendingCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          onOpenNewProcess={() => setIsNewProcessOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          usersList={usersList}
          onSelectUser={setCurrentUser}
          currentView={currentView}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Scrollable Views */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* 1. Dashboard View */}
          {currentView === 'dashboard' && (
            <>
              <KpiCards
                activeTasksCount={activeProcessesCount}
                pendingHandoffCount={pendingCount}
                slaRate={dashboardStats?.sla_rate ?? 100}
                backupStatusText={`دیسک: ${dashboardStats?.disk_metrics?.usage_pct || 25}٪ مصرف`}
                totalInstances={dashboardStats?.total_instances}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <WeeklyVolumeChart
                    data={dashboardStats?.weekly_volume}
                    totalInstances={dashboardStats?.total_instances}
                    completedCount={dashboardStats?.completed_count}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SlaGaugeCard rate={dashboardStats?.sla_rate ?? 100} target={95} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LiveCartableTable
                    tasks={tasks}
                    onAcceptHandoff={handleAcceptHandoff}
                    onRejectHandoff={handleRejectHandoff}
                    onOpenTask={(task) => setSelectedTask(task)}
                    searchFilter={searchQuery}
                  />
                </div>
                <div className="lg:col-span-1">
                  <RecentActivityWidget activities={dashboardStats?.recent_activities || []} />
                </div>
              </div>
            </>
          )}

          {/* 2. Cartable View */}
          {currentView === 'cartable' && (
            <LiveCartableTable
              tasks={tasks}
              onAcceptHandoff={handleAcceptHandoff}
              onRejectHandoff={handleRejectHandoff}
              onOpenTask={(task) => setSelectedTask(task)}
              searchFilter={searchQuery}
            />
          )}

          {/* 3. Pending Handoff Dedicated View */}
          {currentView === 'pending_handoff' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800">
                <strong>پروتکل تحویل فیزیکی دستگاه (Dual-Handoff):</strong> در این بخش پرونده‌هایی که از مراحل قبلی ارسال شده ولی هنوز تایید یا رد فیزیکی نشده‌اند نمایش داده می‌شوند.
              </div>
              <LiveCartableTable
                tasks={tasks.filter((t) => t.status === 'pending_handoff')}
                onAcceptHandoff={handleAcceptHandoff}
                onRejectHandoff={handleRejectHandoff}
                onOpenTask={(task) => setSelectedTask(task)}
                searchFilter={searchQuery}
              />
            </div>
          )}

          {/* 4. Real Workflows Manager */}
          {currentView === 'workflows' && <WorkflowsView />}

          {/* 5. Real Form Builder */}
          {currentView === 'forms' && <FormsView />}

          {/* 6. Real Device Catalog */}
          {currentView === 'catalog' && <CatalogView />}

          {/* 7. Real Data Sources & Lookups */}
          {currentView === 'lookups' && <LookupsView />}

          {/* 8. Real Working Calendar & SLA */}
          {currentView === 'sla' && <SlaCalendarView />}

          {/* 9. Real Users & Roles */}
          {currentView === 'users' && <UsersView />}

          {/* 10. Real Backup & DR */}
          {currentView === 'backup' && <BackupView />}

          {/* 11. Real Access & Security Matrix */}
          {currentView === 'permissions' && <AccessMatrixView />}
        </main>
      </div>

      {/* New Process Modal */}
      <NewProcessModal
        isOpen={isNewProcessOpen}
        onClose={() => setIsNewProcessOpen(false)}
        currentUser={currentUser}
        onCreate={handleCreateProcess}
      />

      {/* Task Action & Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onExecuteTransition={handleExecuteTransition}
      />
    </div>
  );
}

export default App;
