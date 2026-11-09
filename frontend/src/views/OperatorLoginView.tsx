import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { LogIn, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

interface OperatorLoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const OperatorLoginView: FC<OperatorLoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    // Load users for quick persona login
    api.getUsers().then((users) => {
      // Exclude admin or prioritize regular operators
      setAvailableUsers(users);
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('لطفاً نام کاربری را وارد نمایید');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'خطا در ورود به سامانه');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'نام کاربری یا کلمه عبور وارد شده صحیح نمی‌باشد';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetUser: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.quickLogin({ user_id: targetUser.id, username: targetUser.username });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        // Fallback to direct client user
        onLoginSuccess(targetUser);
      }
    } catch {
      // Fallback
      onLoginSuccess(targetUser);
    } finally {
      setLoading(false);
    }
  };

  // Preset typical operator accounts
  const operatorPresets = [
    { username: 'Edari', label: 'کارشناس اداری', job: 'امور اداری و مکاتبات', color: 'from-blue-500 to-indigo-600' },
    { username: 'Mali', label: 'کارشناس مالی', job: 'حسابداری و تاییدات مالی', color: 'from-emerald-500 to-teal-600' },
    { username: 'Foroosh', label: 'کارشناس فروش', job: 'پذیرش و تحویل پرونده', color: 'from-amber-500 to-orange-600' },
    { username: 'Anbar', label: 'مسئول انبار', job: 'تحویل فیزیکی و قطعات', color: 'from-purple-500 to-violet-600' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden" dir="rtl">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-8 sm:p-10 relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-3.5">
            <span className="text-2xl">🐬</span>
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-2">
            پورتال اختصاصی اپراتورها و کارشناسان
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">ورود به میز کار عملیاتی</h1>
          <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">
            جهت مشاهده وظایف روزانه، کارتابل و رهگیری پرونده‌ها وارد شوید
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-right">
              نام کاربری
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثلاً Edari یا Mali..."
                className="w-full h-11 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pr-10 pl-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all font-normal"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-right">
              کلمه عبور
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pr-10 pl-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all font-normal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>ورود به سامانه</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 relative text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400">
            یا دسترسی سریع پرسنل (تست فوری)
          </span>
        </div>

        {/* Quick Operator Persona Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {operatorPresets.map((preset) => {
            const userInDb = availableUsers.find((u) => u.username.toLowerCase() === preset.username.toLowerCase());
            return (
              <button
                key={preset.username}
                type="button"
                onClick={() => handleQuickLogin(userInDb || { username: preset.username, id: 999, first_name: preset.label, job: { name: preset.job } })}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/50 text-right transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                    {preset.label}
                  </span>
                  <div className={`w-5 h-5 rounded-md bg-linear-to-tr ${preset.color} text-white text-[10px] flex items-center justify-center font-bold`}>
                    {preset.username[0]}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-1 truncate">
                  {preset.job}
                </span>
              </button>
            );
          })}
        </div>

        {/* Security Footer Notice */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-normal">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>امنیت دسترسی با پایش برخط سشن و پروتکل تحویل فیزیکی</span>
        </div>
      </div>
    </div>
  );
};
