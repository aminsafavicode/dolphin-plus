import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  Clock,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trash2,
  Layers,
  Save,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export const SlaCalendarView: FC = () => {
  const [activeTab, setActiveTab] = useState<'calendars' | 'exceptions' | 'sla'>('calendars');

  // Data states
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<any | null>(null);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  // Modals state
  const [isNewCalModalOpen, setIsNewCalModalOpen] = useState(false);
  const [isNewExceptionModalOpen, setIsNewExceptionModalOpen] = useState(false);
  const [isNewSlaModalOpen, setIsNewSlaModalOpen] = useState(false);

  // New Calendar Form
  const [calName, setCalName] = useState('');
  const [calCode, setCalCode] = useState('');
  const [calTimezone, setCalTimezone] = useState('Asia/Tehran');

  // New Exception Form
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionStatus, setExceptionStatus] = useState<'NON_WORKING' | 'WORKING'>('NON_WORKING');
  const [exceptionTitle, setExceptionTitle] = useState('');
  const [exceptionDesc, setExceptionDesc] = useState('');

  // New SLA Form
  const [selectedWfId, setSelectedWfId] = useState<number | ''>('');
  const [selectedStepId, setSelectedStepId] = useState<number | ''>('');
  const [selectedSlaCalId, setSelectedSlaCalId] = useState<number | ''>('');
  const [slaDurationHours, setSlaDurationHours] = useState<number>(8);
  const [slaDurationDays, setSlaDurationDays] = useState<number>(0);
  const [slaWarningHours, setSlaWarningHours] = useState<number>(2);

  // Edit Schedule form states
  const [scheduleEditing, setScheduleEditing] = useState<{ [key: number]: { is_working: boolean; start_time: string; end_time: string } }>({});

  const loadAllData = async () => {
    try {
      const [calData, slaData, wfData] = await Promise.all([
        api.getCalendars(),
        api.getSlaPolicies(),
        api.getWorkflows(),
      ]);
      setCalendars(calData);
      setSlaPolicies(slaData);
      setWorkflows(wfData);

      if (calData.length > 0) {
        const currentId = selectedCalendar?.id;
        const matched = calData.find((c: any) => c.id === currentId) || calData[0];
        setSelectedCalendar(matched);
        initScheduleEditing(matched);
      } else {
        setSelectedCalendar(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initScheduleEditing = (calendar: any) => {
    if (!calendar || !calendar.weekly_schedules) return;
    const initialMap: any = {};
    calendar.weekly_schedules.forEach((s: any) => {
      const firstIv = s.intervals && s.intervals.length > 0 ? s.intervals[0] : null;
      initialMap[s.id] = {
        is_working: s.is_working,
        start_time: firstIv ? firstIv.start_time.slice(0, 5) : '08:00',
        end_time: firstIv ? firstIv.end_time.slice(0, 5) : '17:00',
      };
    });
    setScheduleEditing(initialMap);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSelectCalendar = (cal: any) => {
    setSelectedCalendar(cal);
    initScheduleEditing(cal);
  };

  // --- Handlers: Calendar ---
  const handleCreateCalendar = async (e: FormEvent) => {
    e.preventDefault();
    if (!calName) return;
    try {
      const newCal = await api.createCalendar({
        name: calName,
        code: calCode || calName,
        timezone: calTimezone,
      });
      setIsNewCalModalOpen(false);
      setCalName('');
      setCalCode('');
      await loadAllData();
      setSelectedCalendar(newCal);
      initScheduleEditing(newCal);
    } catch (err: any) {
      alert('خطا در ثبت تقویم: ' + err.message);
    }
  };

  const handleDeleteCalendar = async (calId: number) => {
    if (!confirm('آیا از حذف این تقویم کاری اطمینان دارید؟')) return;
    try {
      await api.deleteCalendar(calId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف تقویم: ' + err.message);
    }
  };

  const handleSaveDaySchedule = async (scheduleId: number) => {
    const editData = scheduleEditing[scheduleId];
    if (!editData) return;
    try {
      await api.updateSchedule(scheduleId, {
        is_working: editData.is_working,
        intervals: editData.is_working
          ? [{ start_time: editData.start_time, end_time: editData.end_time }]
          : [],
      });
      alert('شیفت این روز کاری با موفقیت به‌روزرسانی شد.');
      loadAllData();
    } catch (err: any) {
      alert('خطا در ذخیره شیفت: ' + err.message);
    }
  };

  const handleApplyPresetIran = async () => {
    if (!selectedCalendar) return;
    if (!confirm('آیا مایل به اعمال شیفت استاندارد اداری ایران (شنبه تا چهارشنبه ۰۸:۰۰ الی ۱۷:۰۰، پنج‌شنبه و جمعه تعطیل) هستید؟')) return;
    try {
      await api.bulkSchedule(selectedCalendar.id, {
        weekdays: [5, 6, 0, 1, 2], // شنبه تا چهارشنبه
        intervals: [{ start_time: '08:00', end_time: '17:00' }],
      });
      alert('شیفت استاندارد اداری با موفقیت اعمال شد.');
      loadAllData();
    } catch (err: any) {
      alert('خطا در اعمال شیفت استاندارد: ' + err.message);
    }
  };

  // --- Handlers: Exceptions ---
  const handleCreateException = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCalendar || !exceptionDate || !exceptionTitle) return;
    try {
      await api.createCalendarException(selectedCalendar.id, {
        date: exceptionDate,
        status: exceptionStatus,
        title: exceptionTitle,
        description: exceptionDesc,
      });
      setIsNewExceptionModalOpen(false);
      setExceptionDate('');
      setExceptionTitle('');
      setExceptionDesc('');
      loadAllData();
    } catch (err: any) {
      alert('خطا در ثبت استثنای تقویم: ' + err.message);
    }
  };

  const handleDeleteException = async (exceptionId: number) => {
    if (!confirm('آیا از حذف این تعطیلی / استثنا اطمینان دارید؟')) return;
    try {
      await api.deleteCalendarException(exceptionId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف استثنا: ' + err.message);
    }
  };

  // --- Handlers: SLA Policies ---
  const handleCreateSla = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStepId || !selectedSlaCalId) return;

    // Convert days and hours to duration string: e.g. "1 08:00:00" or "08:00:00"
    let durationStr = '';
    if (slaDurationDays > 0) {
      durationStr = `${slaDurationDays} ${String(slaDurationHours).padStart(2, '0')}:00:00`;
    } else {
      durationStr = `${String(slaDurationHours).padStart(2, '0')}:00:00`;
    }

    const warningStr = `${String(slaWarningHours).padStart(2, '0')}:00:00`;

    try {
      await api.createSlaPolicy({
        step: Number(selectedStepId),
        calendar: Number(selectedSlaCalId),
        duration: durationStr,
        warning_before: warningStr,
        is_active: true,
      });
      setIsNewSlaModalOpen(false);
      setSelectedStepId('');
      setSelectedWfId('');
      setSelectedSlaCalId('');
      setSlaDurationHours(8);
      setSlaDurationDays(0);
      setSlaWarningHours(2);
      loadAllData();
      alert('تعهد زمانی (SLA) برای مرحله با موفقیت ثبت شد.');
    } catch (err: any) {
      alert('خطا در ثبت SLA: ' + err.message);
    }
  };

  const handleDeleteSla = async (policyId: number) => {
    if (!confirm('آیا از حذف تعهد زمانی این مرحله اطمینان دارید؟')) return;
    try {
      await api.deleteSlaPolicy(policyId);
      loadAllData();
    } catch (err: any) {
      alert('خطا در حذف تعهد زمانی: ' + err.message);
    }
  };

  // Find steps for selected workflow in modal
  const activeWf = workflows.find((w) => w.id === Number(selectedWfId));
  const availableSteps = activeWf?.steps || [];

  return (
    <div className="space-y-7">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">تقویم کاری سازمانی و موتور تعهدات زمانی (SLA Engine)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت شیفت‌های کاری هفتگی، تعطیلات رسمی و کشوری، و محاسبه دقیق سررسید و اخطارهای نقض SLA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'calendars' && (
            <button
              onClick={() => setIsNewCalModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تقویم کاری جدید</span>
            </button>
          )}

          {activeTab === 'exceptions' && selectedCalendar && (
            <button
              onClick={() => setIsNewExceptionModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت تعطیلی / استثنای جدید</span>
            </button>
          )}

          {activeTab === 'sla' && (
            <button
              onClick={() => setIsNewSlaModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف قرارداد زمانی (SLA)</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('calendars')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'calendars'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>تقویم‌ها و شیفت‌های هفتگی ({calendars.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exceptions'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>تعطیلات و استثنائات تقویمی ({selectedCalendar?.exceptions?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('sla')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sla'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>تعهدات زمانی مراحل فرآیند ({slaPolicies.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CALENDARS & WEEKLY SHIFTS */}
      {/* ============================================================== */}
      {activeTab === 'calendars' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Calendar List */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">تقویم‌های فعال سیستم</h3>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg">
                {calendars.length} تقویم
              </span>
            </div>

            <div className="space-y-2">
              {calendars.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  هنوز تقویم کاری ثبت نشده است. روی «تقویم کاری جدید» کلیک کنید.
                </div>
              ) : (
                calendars.map((c) => {
                  const isSelected = selectedCalendar?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCalendar(c)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/70 border-purple-400 shadow-sm'
                          : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">{c.name}</h4>
                          <div className="text-xs font-mono text-slate-400 mt-1">منطقه زمانی: {c.timezone}</div>
                        </div>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-purple-600 text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/40">
                        <span>روزهای کاری: <strong>{c.weekly_schedules?.filter((w: any) => w.is_working).length || 0} روز</strong></span>
                        <span>استثنائات: <strong>{c.exceptions?.length || 0} مورد</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Weekly Schedule & Shift Intervals */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCalendar ? (
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-mono text-xs font-bold">
                        ID: {selectedCalendar.id}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">برنامه شیفت هفتگی «{selectedCalendar.name}»</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تنظیم روزهای کاری هفته و بازه‌های ساعتی محاسبه مهلت SLA
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyPresetIran}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                      title="تنظیم خودکار شنبه تا چهارشنبه ۸ الی ۱۷"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>شیفت استاندارد اداری ایران</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCalendar(selectedCalendar.id)}
                      className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="حذف این تقویم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Days Table */}
                <div className="divide-y divide-slate-100">
                  {selectedCalendar.weekly_schedules?.map((sched: any) => {
                    const edit = scheduleEditing[sched.id] || {
                      is_working: sched.is_working,
                      start_time: '08:00',
                      end_time: '17:00',
                    };

                    return (
                      <div
                        key={sched.id}
                        className={`py-3.5 px-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          edit.is_working ? 'bg-slate-50/50' : 'bg-slate-100/40 opacity-70'
                        }`}
                      >
                        {/* Day Info & Toggle */}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={edit.is_working}
                              onChange={(e) => {
                                setScheduleEditing((prev) => ({
                                  ...prev,
                                  [sched.id]: { ...edit, is_working: e.target.checked },
                                }));
                              }}
                              className="rounded text-purple-600 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-800">{sched.weekday_name}</span>
                          </label>

                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              edit.is_working
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {edit.is_working ? 'روز کاری' : 'تعطیل هفتگی'}
                          </span>
                        </div>

                        {/* Shift Times */}
                        {edit.is_working ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-semibold">از ساعت:</span>
                            <input
                              type="time"
                              value={edit.start_time}
                              onChange={(e) => {
                                setScheduleEditing((prev) => ({
                                  ...prev,
                                  [sched.id]: { ...edit, start_time: e.target.value },
                                }));
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-purple-500"
                            />
                            <span className="text-slate-500 font-semibold">تا ساعت:</span>
                            <input
                              type="time"
                              value={edit.end_time}
                              onChange={(e) => {
                                setScheduleEditing((prev) => ({
                                  ...prev,
                                  [sched.id]: { ...edit, end_time: e.target.value },
                                }));
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs outline-none focus:border-purple-500"
                            />

                            <button
                              onClick={() => handleSaveDaySchedule(sched.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>ذخیره شیفت</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">ساعات کاری در این روز متوقف است.</span>
                            <button
                              onClick={() => handleSaveDaySchedule(sched.id)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              ثبت تعطیلی
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200/80 shadow-sm">
                تقویمی برای نمایش انتخاب نشده است.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CALENDAR EXCEPTIONS & HOLIDAYS */}
      {/* ============================================================== */}
      {activeTab === 'exceptions' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                تعطیلات رسمی و استثنائات تقویم {selectedCalendar ? `«${selectedCalendar.name}»` : ''}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعطیلات کشوری، مناسبت‌های خاص یا شیفت‌های ویژه اضافه‌کاری که از روزهای عادی هفته متفاوتند
              </p>
            </div>

            {selectedCalendar && (
              <button
                onClick={() => setIsNewExceptionModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت استثنای جدید</span>
              </button>
            )}
          </div>

          {!selectedCalendar ? (
            <div className="text-center py-12 text-xs text-slate-400">
              ابتدا یک تقویم کاری از تب اول انتخاب فرمایید.
            </div>
          ) : !selectedCalendar.exceptions || selectedCalendar.exceptions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              هیچ تعطیلی یا استثنایی برای این تقویم ثبت نشده است. روی «ثبت استثنای جدید» کلیک کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedCalendar.exceptions.map((exc: any) => (
                <div
                  key={exc.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {exc.date}
                      </span>

                      <button
                        onClick={() => handleDeleteException(exc.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="حذف این استثنا"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900">{exc.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{exc.description || 'بدون توضیحات'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">وضعیت روز:</span>
                    {exc.status === 'NON_WORKING' ? (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        تعطیل کامل (توقف SLA)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        شیفت کاری ویژه
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: STEP SLA POLICIES */}
      {/* ============================================================== */}
      {activeTab === 'sla' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">قراردادهای سطح خدمت مراحل فرآیند (Step SLA Policies)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعیین سقف مهلت مجاز کاری برای انجام هر مرحله و زمان ارسال هشدار پیش از نقض تعهد
              </p>
            </div>

            <button
              onClick={() => setIsNewSlaModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف تعهد زمانی (SLA)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">فرآیند سازمانی</th>
                  <th className="py-3 px-4">مرحله (Stage)</th>
                  <th className="py-3 px-4">تقویم کاری مرجع</th>
                  <th className="py-3 px-4">سقف مهلت مجاز</th>
                  <th className="py-3 px-4">آستانه اخطار قبل از نقض</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {slaPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      هنوز تعهد زمانی (SLA) برای مراحل تعریف نشده است. روی «تعریف تعهد زمانی (SLA)» کلیک کنید.
                    </td>
                  </tr>
                ) : (
                  slaPolicies.map((sla) => (
                    <tr key={sla.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-blue-700">
                        {sla.workflow_name || 'فرآیند عمومی'}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {sla.step_name}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                          {sla.calendar_name}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-800">
                        ⏱️ {sla.duration}
                      </td>
                      <td className="py-4 px-4 font-mono text-amber-700 font-semibold">
                        ⚠️ {sla.warning_before || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          فعال
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeleteSla(sla.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="حذف این تعهد زمانی"
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
      {/* MODAL: NEW CALENDAR */}
      {/* ============================================================== */}
      {isNewCalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">تعریف تقویم کاری جدید</h3>
            <form onSubmit={handleCreateCalendar} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">عنوان تقویم کاری *</label>
                <input
                  type="text"
                  required
                  value={calName}
                  onChange={(e) => setCalName(e.target.value)}
                  placeholder="مثال: شیفت کارگاه تعمیرات مرکزی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">کد لاتین یکتا</label>
                <input
                  type="text"
                  value={calCode}
                  onChange={(e) => setCalCode(e.target.value)}
                  placeholder="مثال: central_workshop_shift"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">منطقه زمانی استاندارد (Timezone)</label>
                <select
                  value={calTimezone}
                  onChange={(e) => setCalTimezone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500 font-mono text-xs"
                >
                  <option value="Asia/Tehran">Asia/Tehran (ساعت رسمی ایران)</option>
                  <option value="UTC">UTC (زمان هماهنگ جهانی)</option>
                  <option value="Asia/Dubai">Asia/Dubai (امارات)</option>
                </select>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700">
                💡 با ایجاد این تقویم، برنامه هفتگی شنبه تا چهارشنبه (۰۸:۰۰ الی ۱۷:۰۰) به صورت خودکار مقداردهی می‌شود و می‌توانید آن را سفارشی‌سازی کنید.
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                >
                  ذخیره و مقداردهی تقویم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW EXCEPTION */}
      {/* ============================================================== */}
      {isNewExceptionModalOpen && selectedCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              ثبت استثنا برای تقویم «{selectedCalendar.name}»
            </h3>
            <p className="text-xs text-slate-400 mb-4">تعطیلات رسمی، تعطیلی اضطراری یا شیفت کاری ویژه</p>

            <form onSubmit={handleCreateException} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">تاریخ استثنا (میلادی / تقویم سیستم) *</label>
                <input
                  type="date"
                  required
                  value={exceptionDate}
                  onChange={(e) => setExceptionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">وضعیت این روز *</label>
                <select
                  value={exceptionStatus}
                  onChange={(e) => setExceptionStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500"
                >
                  <option value="NON_WORKING">تعطیل کامل (شمارشگر SLA در این روز متوقف می‌شود)</option>
                  <option value="WORKING">روز کاری ویژه / اضافه‌کاری (محاسبه زمان در این روز فعال است)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">عنوان مناسبت / دلیل *</label>
                <input
                  type="text"
                  required
                  value={exceptionTitle}
                  onChange={(e) => setExceptionTitle(e.target.value)}
                  placeholder="مثال: عید فطر / تعطیلی آلودگی هوا"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  value={exceptionDesc}
                  onChange={(e) => setExceptionDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewExceptionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  ثبت استثنا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NEW SLA POLICY */}
      {/* ============================================================== */}
      {isNewSlaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">تعریف تعهد زمانی (SLA) برای مرحله فرآیند</h3>
            <form onSubmit={handleCreateSla} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-600">انتخاب فرآیند سازمانی *</label>
                <select
                  required
                  value={selectedWfId}
                  onChange={(e) => {
                    setSelectedWfId(Number(e.target.value));
                    setSelectedStepId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="">انتخاب فرآیند...</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">انتخاب مرحله فرآیند (Step) *</label>
                <select
                  required
                  disabled={!selectedWfId || availableSteps.length === 0}
                  value={selectedStepId}
                  onChange={(e) => setSelectedStepId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">انتخاب مرحله...</option>
                  {availableSteps.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      گام {st.order}: {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">تقویم کاری مرجع این مرحله *</label>
                <select
                  required
                  value={selectedSlaCalId}
                  onChange={(e) => setSelectedSlaCalId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option value="">انتخاب تقویم مرجع...</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.timezone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">مهلت (روز کاری)</label>
                  <input
                    type="number"
                    min="0"
                    value={slaDurationDays}
                    onChange={(e) => setSlaDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">مهلت (ساعت کاری)</label>
                  <input
                    type="number"
                    min="1"
                    max="23"
                    value={slaDurationHours}
                    onChange={(e) => setSlaDurationHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-600">زمان ارسال اخطار زرد رنگ قبل از نقض (ساعت)</label>
                <input
                  type="number"
                  min="0"
                  value={slaWarningHours}
                  onChange={(e) => setSlaWarningHours(Number(e.target.value))}
                  placeholder="مثال: ۲ ساعت قبل"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSlaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  ثبت تعهد زمانی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
