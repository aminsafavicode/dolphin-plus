import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  KeyRound,
  Briefcase,
  Shield,
  Edit,
  Trash2,
  Building2,
} from 'lucide-react';
import { api } from '../api/client';

export const UsersView: FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'groups' | 'memberships'>('users');

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);

  // Modals state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isNewMembershipModalOpen, setIsNewMembershipModalOpen] = useState(false);

  // Selected for modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // User form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Job form states
  const [jobName, setJobName] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  // Group form state
  const [groupName, setGroupName] = useState('');

  // Membership form states
  const [memUserId, setMemUserId] = useState<number | ''>('');
  const [memWorkflowId, setMemWorkflowId] = useState<number | ''>('');
  const [memRole, setMemRole] = useState<'VIEWER' | 'EXECUTOR' | 'MANAGER'>('EXECUTOR');

  const loadAllData = async () => {
    try {
      const [uData, jData, gData, wData, mData] = await Promise.all([
        api.getUsers(),
        api.getJobs(),
        api.getGroups(),
        api.getWorkflows(),
        api.getMemberships(),
      ]);
      setUsers(uData);
      setJobs(jData);
      setGroups(gData);
      setWorkflows(wData);
      setMemberships(mData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- Handlers: User ---
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      await api.createUser({
        username,
        password,
        first_name: firstName,
        last_name: lastName,
        email,
        job_id: selectedJobId ? Number(selectedJobId) : null,
        group_ids: selectedGroupIds,
        is_staff: isStaff,
        is_active: isActive,
      });
      setIsNewUserModalOpen(false);
      resetUserForm();
      await loadAllData();
      alert(`کاربر «${username}» با رمز عبور تعیین‌شده با موفقیت ساخته شد.`);
    } catch (err: any) {
      alert('خطا در ثبت کاربر: ' + (err.response?.data?.username || err.message));
    }
  };

  const handleEditUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.updateUser(selectedUser.id, {
        first_name: firstName,
        last_name: lastName,
        email,
        job_id: selectedJobId ? Number(selectedJobId) : null,
        group_ids: selectedGroupIds,
        is_staff: isStaff,
        is_active: isActive,
      });
      setIsEditUserModalOpen(false);
      resetUserForm();
      await loadAllData();
      alert('مشخصات کاربر با موفقیت به‌روزرسانی شد.');
    } catch (err: any) {
      alert('خطا در به‌روزرسانی کاربر: ' + err.message);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setSelectedUser(u);
    setUsername(u.username);
    setFirstName(u.first_name || '');
    setLastName(u.last_name || '');
    setEmail(u.email || '');
    setSelectedJobId(u.job?.id || '');
    setSelectedGroupIds(u.groups?.map((g: any) => g.id) || []);
    setIsStaff(u.is_staff || false);
    setIsActive(u.is_active !== undefined ? u.is_active : true);
    setIsEditUserModalOpen(true);
  };

  const handleToggleUserActive = async (u: any) => {
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      loadAllData();
    } catch (err: any) {
      alert('خطا در تغییر وضعیت کاربر: ' + err.message);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`آیا از حذف کاربر «${u.username}» اطمینان دارید؟`)) return;
    try {
      await api.deleteUser(u.id);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف کاربر: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      const res = await api.setUserPassword(selectedUser.id, newPassword);
      setIsPasswordModalOpen(false);
      setNewPassword('');
      alert(res.message || 'رمز عبور با موفقیت تغییر کرد.');
    } catch (err: any) {
      alert('خطا در تغییر کلمه عبور: ' + err.message);
    }
  };

  const resetUserForm = () => {
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedJobId('');
    setSelectedGroupIds([]);
    setIsStaff(false);
    setIsActive(true);
    setSelectedUser(null);
  };

  // --- Handlers: Job ---
  const handleCreateJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobName || !jobCode) return;
    try {
      await api.createJob({ name: jobName, code: jobCode, description: jobDesc });
      setIsNewJobModalOpen(false);
      setJobName('');
      setJobCode('');
      setJobDesc('');
      loadAllData();
    } catch (err: any) {
      alert('خطا در ثبت عنوان شغلی: ' + err.message);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('آیا از حذف این عنوان شغلی اطمینان دارید؟')) return;
    try {
      await api.deleteJob(jobId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف شغل: ' + err.message);
    }
  };

  // --- Handlers: Group ---
  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName) return;
    try {
      await api.createGroup({ name: groupName });
      setIsNewGroupModalOpen(false);
      setGroupName('');
      loadAllData();
    } catch (err: any) {
      alert('خطا در ایجاد گروه: ' + err.message);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('آیا از حذف این گروه سازمانی اطمینان دارید؟')) return;
    try {
      await api.deleteGroup(groupId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف گروه: ' + err.message);
    }
  };

  // --- Handlers: Membership ---
  const handleCreateMembership = async (e: FormEvent) => {
    e.preventDefault();
    if (!memWorkflowId || !memUserId) return;
    try {
      await api.createMembership({
        workflow: Number(memWorkflowId),
        user: Number(memUserId),
        role: memRole,
      });
      setIsNewMembershipModalOpen(false);
      setMemUserId('');
      setMemWorkflowId('');
      setMemRole('EXECUTOR');
      loadAllData();
    } catch (err: any) {
      alert('خطا در انتصاب نقش: ' + err.message);
    }
  };

  const handleDeleteMembership = async (memId: number) => {
    if (!confirm('آیا از لغو عضویت کاربر در این فرآیند اطمینان دارید؟')) return;
    try {
      await api.deleteMembership(memId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در لغو عضویت: ' + err.message);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">مدیریت کاربران، مشاغل و نقش‌های سازمانی (RBAC)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت حساب‌های پرسنل، تنظیم امن کلمه عبور، گروه‌ها، عناوین شغلی و عضویت در فرآیندها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={() => {
                resetUserForm();
                setIsNewUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف کاربر جدید</span>
            </button>
          )}
          {activeTab === 'jobs' && (
            <button
              onClick={() => setIsNewJobModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف عنوان شغلی جدید</span>
            </button>
          )}
          {activeTab === 'groups' && (
            <button
              onClick={() => setIsNewGroupModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ایجاد گروه / تیم جدید</span>
            </button>
          )}
          {activeTab === 'memberships' && (
            <button
              onClick={() => setIsNewMembershipModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>انتصاب کاربر به فرآیند</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>کاربران و پرسنل ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>عناوین شغلی ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>تیم‌ها و گروه‌های سازمانی ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('memberships')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'memberships'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>نقش‌های فرآیندی (Memberships)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: USERS LIST */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">لیست پرسنل و کاربران سیستم</h3>
            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
              {users.length} حساب کاربری
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">نام کاربری</th>
                  <th className="py-3 px-4">نام و نام خانوادگی</th>
                  <th className="py-3 px-4">عنوان شغلی</th>
                  <th className="py-3 px-4">گروه‌های سازمانی</th>
                  <th className="py-3 px-4">سطح دسترسی</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                          {u.username.slice(0, 2)}
                        </div>
                        <div>
                          <div>{u.username}</div>
                          <div className="text-xs text-slate-400 font-sans font-normal">{u.email || 'بدون ایمیل'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-800 font-bold">
                      {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : '—'}
                    </td>

                    <td className="py-4 px-4">
                      {u.job ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/60">
                          <Briefcase className="w-3 h-3" />
                          {u.job.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">ثبت‌نشده</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.groups && u.groups.length > 0 ? (
                          u.groups.map((g: any) => (
                            <span key={g.id} className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {u.is_superuser ? (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300">
                          مدیر ارشد (Superuser)
                        </span>
                      ) : u.is_staff ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          راهبر سیستم (Staff)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          اپراتور کارتابل
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100'
                        }`}
                        title="برای تغییر وضعیت کلیک کنید"
                      >
                        {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{u.is_active ? 'فعال' : 'غیرفعال'}</span>
                      </button>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Change Password Button */}
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword('');
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                          title="تغییر کلمه عبور کاربر"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit User Button */}
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="ویرایش مشخصات کاربر"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User Button */}
                        {!u.is_superuser && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="حذف حساب کاربری"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: JOBS LIST */}
      {/* ============================================================== */}
      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
              هنوز عنوان شغلی در سازمان ثبت نشده است. روی «تعریف عنوان شغلی جدید» کلیک کنید.
            </div>
          ) : (
            jobs.map((j) => (
              <div
                key={j.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      کد: {j.code}
                    </span>
                    <button
                      onClick={() => handleDeleteJob(j.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{j.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{j.description || 'بدون شرح شغلی'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>تعداد دارندگان شغل:</span>
                  <strong className="font-bold text-slate-800">{j.users_count || 0} نفر</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: GROUPS LIST */}
      {/* ============================================================== */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
              هنوز گروه یا تیم کاری تعریف نشده است. روی «ایجاد گروه / تیم جدید» کلیک کنید.
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{g.name}</h4>
                    <div className="text-xs text-slate-400 mt-0.5">{g.users_count || 0} کاربر عضو</div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: WORKFLOW MEMBERSHIPS */}
      {/* ============================================================== */}
      {activeTab === 'memberships' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">نقش‌های فرآیندی کاربران (Workflow Memberships)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعیین صریح این‌که هر کاربر در چه فرآیندی چه نقشی (مجری، مشاهده‌کننده، مدیر) دارد
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
              {memberships.length} انتصاب فعال
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">نام کاربر</th>
                  <th className="py-3 px-4">فرآیند سازمانی</th>
                  <th className="py-3 px-4">نقش انتصابی</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-6 text-center">لغو عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {memberships.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      هنوز نقشی در فرآیندها انتصاب نیافته است. روی «انتصاب کاربر به فرآیند» کلیک کنید.
                    </td>
                  </tr>
                ) : (
                  memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {m.username}
                      </td>
                      <td className="py-4 px-4 font-bold text-blue-700">
                        {m.workflow_name}
                      </td>
                      <td className="py-4 px-4">
                        {m.role === 'MANAGER' ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            مدیر فرآیند (MANAGER)
                          </span>
                        ) : m.role === 'EXECUTOR' ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            مجری عملیاتی (EXECUTOR)
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            مشاهده‌کننده (VIEWER)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-emerald-700 text-xs font-bold">فعال</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeleteMembership(m.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="لغو این نقش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW USER */}
      {/* ============================================================== */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">تعریف کاربر جدید سامانه</h3>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">نام کاربری (لاتین) *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: tech_reza"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">کلمه عبور *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="حداقل ۶ نویسه"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">نام</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="رضا"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">نام خانوادگی</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="کریمی"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">پست الکترونیک (ایمیل)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@dolphinflow.local"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">عنوان شغلی سازمانی</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">بدون عنوان شغلی</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} ({j.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-600">عضویت در گروه / تیم</label>
                  <select
                    multiple
                    value={selectedGroupIds.map(String)}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                      setSelectedGroupIds(opts);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-blue-500 h-16 text-xs"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isStaff}
                    onChange={(e) => setIsStaff(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>دسترسی راهبر سیستم (Staff / ادمین)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>حساب فعال باشد</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  ثبت و فعال‌سازی کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT USER */}
      {/* ============================================================== */}
      {isEditUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              ویرایش مشخصات کاربر «{selectedUser.username}»
            </h3>
            <p className="text-xs text-slate-400 mb-4">به‌روزرسانی اطلاعات پروفایل، شغل و دسترسی‌ها</p>

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">نام</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">نام خانوادگی</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">پست الکترونیک</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">عنوان شغلی سازمانی</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">بدون عنوان شغلی</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} ({j.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-600">گروه‌های عضویت</label>
                  <select
                    multiple
                    value={selectedGroupIds.map(String)}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                      setSelectedGroupIds(opts);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-blue-500 h-16 text-xs"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isStaff}
                    onChange={(e) => setIsStaff(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>دسترسی راهبر سیستم (Staff)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>حساب فعال باشد</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESET PASSWORD */}
      {/* ============================================================== */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-slate-900">تنظیم رمز عبور جدید</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              رمز جدید برای حساب کاربر <strong>«{selectedUser.username}»</strong> وارد کنید:
            </p>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">گذرواژه جدید *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز عبور دلخواه..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  ذخیره رمز عبور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW JOB */}
      {/* ============================================================== */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">تعریف عنوان شغلی جدید</h3>
            <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">نام عنوان شغلی *</label>
                <input
                  type="text"
                  required
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="مثال: تکنسین ارشد الکترونیک قدرت"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">کد شغلی یکتا *</label>
                <input
                  type="text"
                  required
                  value={jobCode}
                  onChange={(e) => setJobCode(e.target.value)}
                  placeholder="مثال: SR_ELEC_TECH"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">شرح وظایف و الزامات</label>
                <textarea
                  rows={2}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  ذخیره عنوان شغلی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW GROUP */}
      {/* ============================================================== */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">ایجاد گروه یا تیم کاری جدید</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">نام گروه / واحد *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="مثال: تیم بازرسی و کنترل کیفیت (QC)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                >
                  ایجاد گروه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW MEMBERSHIP */}
      {/* ============================================================== */}
      {isNewMembershipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">انتصاب نقش کاربر در فرآیند</h3>
            <form onSubmit={handleCreateMembership} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">انتخاب فرآیند سازمانی *</label>
                {workflows.length === 0 ? (
                  <div className="text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    هیچ فرآیندی تعریف نشده است. لطفاً ابتدا در «مدیریت فرآیندها» یک فرآیند ثبت کنید.
                  </div>
                ) : (
                  <select
                    required
                    value={memWorkflowId}
                    onChange={(e) => setMemWorkflowId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500"
                  >
                    <option value="">انتخاب فرآیند...</option>
                    {workflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name} ({wf.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">انتخاب کاربر *</label>
                <select
                  required
                  value={memUserId}
                  onChange={(e) => setMemUserId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500"
                >
                  <option value="">انتخاب کاربر...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.first_name || ''} {u.last_name || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">نقش در این فرآیند *</label>
                <select
                  value={memRole}
                  onChange={(e) => setMemRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500"
                >
                  <option value="EXECUTOR">مجری عملیاتی (EXECUTOR) - ثبت فرم‌ها و تحویل کار</option>
                  <option value="VIEWER">مشاهده‌کننده (VIEWER) - نظارت و بررسی سوابق</option>
                  <option value="MANAGER">مدیر فرآیند (MANAGER) - اختیارات کامل و مداخله دستی</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMembershipModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={workflows.length === 0}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:bg-slate-400"
                >
                  انتصاب نقش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
