import { useState, useEffect } from 'react';
import { OperatorPortalLayout } from './views/OperatorPortalLayout';
import { OperatorLoginView } from './views/OperatorLoginView';
import { NewProcessModal } from './components/NewProcessModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import type { TaskItem } from './types/dashboard';
import { CheckCircle } from 'lucide-react';
import { api } from './api/client';

export function OperatorApp() {
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('dolphin_operator_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewProcessOpen, setIsNewProcessOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check URL params for direct userId or username login (e.g. ?userId=5 or ?user=Edari)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const userParam = params.get('user');

    if (userId || userParam) {
      api.quickLogin({
        user_id: userId ? Number(userId) : undefined,
        username: userParam || undefined,
      }).then((res) => {
        if (res.success && res.user) {
          handleLoginSuccess(res.user);
        }
      }).catch(() => {});
    } else if (!currentUser) {
      // Check session cookie
      api.getMe().then((res) => {
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
          try {
            localStorage.setItem('dolphin_operator_user', JSON.stringify(res.user));
          } catch {}
        }
      }).catch(() => {});
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('dolphin_operator_user', JSON.stringify(user));
    } catch {}
    showToast(`✨ خوش آمدید، ${user.first_name || user.username}`);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setCurrentUser(null);
    try {
      localStorage.removeItem('dolphin_operator_user');
    } catch {}
    showToast('با موفقیت از سامانه خارج شدید');
  };

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [taskList, users] = await Promise.all([
        api.getCartableTasks('all', searchQuery),
        api.getUsers().catch(() => []),
      ]);
      setTasks(taskList);
      setUsersList(users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      const interval = setInterval(loadData, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser, searchQuery]);

  const handleAcceptHandoff = async (taskId: string) => {
    try {
      await api.acceptHandoff(taskId);
      showToast('✅ تحویل فیزیکی دستگاه با موفقیت تایید و مرحله آغاز گردید.');
      loadData();
    } catch (err: any) {
      showToast('❌ خطا در تایید تحویل فیزیکی: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRejectHandoff = async (taskId: string) => {
    try {
      await api.rejectHandoff(taskId, 'رد توسط کارشناس اپراتور');
      showToast('⚠️ تحویل فیزیکی دستگاه رد شد و پرونده به مرحله قبل بازگشت.');
      loadData();
    } catch (err: any) {
      showToast('❌ خطا در رد تحویل: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExecuteTransition = async (_taskId: string, nextStepName: string) => {
    showToast(`✨ پرونده با موفقیت به مرحله «${nextStepName}» منتقل شد`);
    setSelectedTask(null);
    loadData();
  };

  const handleOpenTaskById = async (taskId: string) => {
    try {
      const detail = await api.getInstanceDetail(taskId);
      setSelectedTask(detail);
    } catch (err: any) {
      showToast('خطا در دریافت مشخصات پرونده');
    }
  };

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
        user_id: currentUser?.id,
      });
      showToast(`✨ ${res.message} (کد رهگیری: ${res.trackingCode})`);
      loadData();
    } catch (err: any) {
      const errDetail = err.response?.data?.error || err.response?.data?.detail || err.message;
      showToast('❌ خطا در ایجاد پرونده: ' + errDetail);
    }
  };

  // If unauthenticated: render dedicated login view
  if (!currentUser) {
    return <OperatorLoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // If authenticated: render full dedicated operator workspace
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans" dir="rtl">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white text-xs font-normal px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <OperatorPortalLayout
        currentUser={currentUser}
        usersList={usersList}
        onSelectUser={(u) => handleLoginSuccess(u)}
        onLogout={handleLogout}
        onOpenNewProcess={() => setIsNewProcessOpen(true)}
        onOpenTask={(id) => handleOpenTaskById(id)}
        tasks={tasks}
        onAcceptHandoff={handleAcceptHandoff}
        onRejectHandoff={handleRejectHandoff}
        onOpenTaskModal={(t) => setSelectedTask(t)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

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

export default OperatorApp;
