import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  Database,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Layers,
  GitBranch,
  X,
  AlertCircle,
  Search,
  ListFilter
} from 'lucide-react';
import { api } from '../api/client';

export const LookupsView: FC = () => {
  const [activeTab, setActiveTab] = useState<'lookups' | 'static'>('lookups');
  const [lookups, setLookups] = useState<any[]>([]);
  const [staticSets, setStaticSets] = useState<any[]>([]);
  const [selectedLookup, setSelectedLookup] = useState<any | null>(null);
  const [selectedStaticSet, setSelectedStaticSet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals for Dynamic Lookups
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<any | null>(null);
  const [lookupName, setLookupName] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupDesc, setLookupDesc] = useState('');
  const [lookupActive, setLookupActive] = useState(true);

  const [isLookupItemModalOpen, setIsLookupItemModalOpen] = useState(false);
  const [editingLookupItem, setEditingLookupItem] = useState<any | null>(null);
  const [itemLabel, setItemLabel] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemOrder, setItemOrder] = useState<number>(0);
  const [itemParentId, setItemParentId] = useState<number | ''>('');
  const [itemActive, setItemActive] = useState(true);

  // Modals for Static Choice Sets
  const [isStaticModalOpen, setIsStaticModalOpen] = useState(false);
  const [editingStaticSet, setEditingStaticSet] = useState<any | null>(null);
  const [staticName, setStaticName] = useState('');
  const [staticCode, setStaticCode] = useState('');
  const [staticDesc, setStaticDesc] = useState('');
  const [staticActive, setStaticActive] = useState(true);

  const [isStaticItemModalOpen, setIsStaticItemModalOpen] = useState(false);
  const [editingStaticItem, setEditingStaticItem] = useState<any | null>(null);
  const [staticItemLabel, setStaticItemLabel] = useState('');
  const [staticItemCode, setStaticItemCode] = useState('');
  const [staticItemOrder, setStaticItemOrder] = useState<number>(0);
  const [staticItemActive, setStaticItemActive] = useState(true);

  const extractErrorMessage = (err: any, fallback: string) => {
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string') return data;
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        const text = Array.isArray(val) ? val.join(' ') : String(val);
        if (firstKey === 'name') return `خطا در نام: ${text}`;
        if (firstKey === 'code') return `خطا در کد لاتین: ${text}`;
        if (firstKey === 'label') return `خطا در عنوان گزینه: ${text}`;
        if (firstKey === 'value') return `خطا در مقدار: ${text}`;
        if (firstKey === 'detail') return text;
        return `${firstKey}: ${text}`;
      }
    }
    return err.message || fallback;
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [lData, sData] = await Promise.all([
        api.getLookups(),
        api.getStaticChoiceSets(),
      ]);
      setLookups(lData);
      setStaticSets(sData);

      // Keep selection in sync
      if (lData.length > 0) {
        setSelectedLookup((prev: any) => {
          if (!prev) return lData[0];
          const match = lData.find((item: any) => item.id === prev.id);
          return match || lData[0];
        });
      } else {
        setSelectedLookup(null);
      }

      if (sData.length > 0) {
        setSelectedStaticSet((prev: any) => {
          if (!prev) return sData[0];
          const match = sData.find((item: any) => item.id === prev.id);
          return match || sData[0];
        });
      } else {
        setSelectedStaticSet(null);
      }
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در دریافت لیست منابع داده'), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // -----------------------------------------------------------------
  // Dynamic Lookup List Handlers
  // -----------------------------------------------------------------
  const handleOpenLookupModal = (item?: any) => {
    if (item) {
      setEditingLookup(item);
      setLookupName(item.name);
      setLookupCode(item.code);
      setLookupDesc(item.description || '');
      setLookupActive(item.is_active ?? true);
    } else {
      setEditingLookup(null);
      setLookupName('');
      setLookupCode('');
      setLookupDesc('');
      setLookupActive(true);
    }
    setActionError(null);
    setIsLookupModalOpen(true);
  };

  const handleSaveLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!lookupName.trim() || !lookupCode.trim()) {
      showNotification('لطفاً عنوان و کد لاتین را وارد کنید', true);
      return;
    }
    try {
      if (editingLookup) {
        await api.updateLookupList(editingLookup.id, {
          name: lookupName.trim(),
          code: lookupCode.trim().toLowerCase(),
          description: lookupDesc.trim(),
          is_active: lookupActive,
        });
        showNotification('منبع داده پویا با موفقیت بروزرسانی شد');
      } else {
        const res = await api.createLookupList({
          name: lookupName.trim(),
          code: lookupCode.trim().toLowerCase(),
          description: lookupDesc.trim(),
        });
        setSelectedLookup(res);
        showNotification('منبع داده پویا با موفقیت ایجاد شد');
      }
      setIsLookupModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره منبع داده'), true);
    }
  };

  const handleDeleteLookup = async (l: any) => {
    if (!window.confirm(`آیا از حذف منبع داده «${l.name}» اطمینان دارید؟`)) return;
    try {
      await api.deleteLookupList(l.id);
      showNotification(`منبع داده «${l.name}» حذف شد`);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'امکان حذف این منبع به دلیل اتصال به فرم‌ها وجود ندارد'), true);
    }
  };

  const handleToggleLookupActive = async (l: any) => {
    try {
      await api.updateLookupList(l.id, { is_active: !l.is_active });
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت منبع'), true);
    }
  };

  // -----------------------------------------------------------------
  // Dynamic Lookup Item Handlers
  // -----------------------------------------------------------------
  const handleOpenLookupItemModal = (item?: any) => {
    if (!selectedLookup) return;
    if (item) {
      setEditingLookupItem(item);
      setItemLabel(item.label);
      setItemCode(item.code || item.value || '');
      setItemOrder(item.order ?? 0);
      setItemParentId(item.parent || '');
      setItemActive(item.is_active ?? true);
    } else {
      setEditingLookupItem(null);
      setItemLabel('');
      setItemCode('');
      setItemOrder((selectedLookup.items?.length || 0) + 1);
      setItemParentId('');
      setItemActive(true);
    }
    setActionError(null);
    setIsLookupItemModalOpen(true);
  };

  const handleSaveLookupItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLookup || !itemLabel.trim() || !itemCode.trim()) {
      showNotification('لطفاً عنوان و کد گزینه را وارد کنید', true);
      return;
    }
    try {
      if (editingLookupItem) {
        await api.updateLookupItem(editingLookupItem.id, {
          label: itemLabel.trim(),
          code: itemCode.trim().toUpperCase(),
          order: Number(itemOrder),
          parent: itemParentId ? Number(itemParentId) : null,
          is_active: itemActive,
        });
        showNotification('گزینه با موفقیت ویرایش شد');
      } else {
        await api.createLookupItem({
          lookup_list: selectedLookup.id,
          label: itemLabel.trim(),
          code: itemCode.trim().toUpperCase(),
          order: Number(itemOrder),
          parent: itemParentId ? Number(itemParentId) : null,
        });
        showNotification('گزینه جدید با موفقیت به منبع اضافه شد');
      }
      setIsLookupItemModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره گزینه'), true);
    }
  };

  const handleDeleteLookupItem = async (id: number) => {
    if (!window.confirm('آیا از حذف این گزینه اطمینان دارید؟')) return;
    try {
      await api.deleteLookupItem(id);
      showNotification('گزینه با موفقیت حذف گردید');
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در حذف گزینه'), true);
    }
  };

  const handleToggleLookupItemActive = async (it: any) => {
    try {
      await api.updateLookupItem(it.id, { is_active: !it.is_active });
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت گزینه'), true);
    }
  };

  // -----------------------------------------------------------------
  // Static Choice Sets Handlers
  // -----------------------------------------------------------------
  const handleOpenStaticModal = (setObj?: any) => {
    if (setObj) {
      setEditingStaticSet(setObj);
      setStaticName(setObj.name);
      setStaticCode(setObj.code);
      setStaticDesc(setObj.description || '');
      setStaticActive(setObj.is_active ?? true);
    } else {
      setEditingStaticSet(null);
      setStaticName('');
      setStaticCode('');
      setStaticDesc('');
      setStaticActive(true);
    }
    setActionError(null);
    setIsStaticModalOpen(true);
  };

  const handleSaveStaticSet = async (e: FormEvent) => {
    e.preventDefault();
    if (!staticName.trim() || !staticCode.trim()) {
      showNotification('لطفاً عنوان و کد لاتین مجموعه را وارد کنید', true);
      return;
    }
    try {
      if (editingStaticSet) {
        await api.updateStaticChoiceSet(editingStaticSet.id, {
          name: staticName.trim(),
          code: staticCode.trim().toUpperCase(),
          description: staticDesc.trim(),
          is_active: staticActive,
        });
        showNotification('مجموعه گزینه‌های ثابت با موفقیت ویرایش شد');
      } else {
        const res = await api.createStaticChoiceSet({
          name: staticName.trim(),
          code: staticCode.trim().toUpperCase(),
          description: staticDesc.trim(),
        });
        setSelectedStaticSet(res);
        showNotification('مجموعه گزینه‌های ثابت با موفقیت ایجاد شد');
      }
      setIsStaticModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره مجموعه ثابت'), true);
    }
  };

  const handleDeleteStaticSet = async (s: any) => {
    if (!window.confirm(`آیا از حذف مجموعه ثابت «${s.name}» اطمینان دارید؟`)) return;
    try {
      await api.deleteStaticChoiceSet(s.id);
      showNotification(`مجموعه «${s.name}» حذف گردید`);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'امکان حذف این مجموعه به دلیل اتصال به فیلدها وجود ندارد'), true);
    }
  };

  // -----------------------------------------------------------------
  // Static Choice Items Handlers
  // -----------------------------------------------------------------
  const handleOpenStaticItemModal = (item?: any) => {
    if (!selectedStaticSet) return;
    if (item) {
      setEditingStaticItem(item);
      setStaticItemLabel(item.label);
      setStaticItemCode(item.code || item.value || '');
      setStaticItemOrder(item.order ?? 0);
      setStaticItemActive(item.is_active ?? true);
    } else {
      setEditingStaticItem(null);
      setStaticItemLabel('');
      setStaticItemCode('');
      setStaticItemOrder((selectedStaticSet.items?.length || 0) + 1);
      setStaticItemActive(true);
    }
    setActionError(null);
    setIsStaticItemModalOpen(true);
  };

  const handleSaveStaticItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStaticSet || !staticItemLabel.trim() || !staticItemCode.trim()) {
      showNotification('لطفاً عنوان و کد گزینه را وارد نمایید', true);
      return;
    }
    try {
      if (editingStaticItem) {
        await api.updateStaticChoiceItem(editingStaticItem.id, {
          label: staticItemLabel.trim(),
          code: staticItemCode.trim().toUpperCase(),
          order: Number(staticItemOrder),
          is_active: staticItemActive,
        });
        showNotification('گزینه ثابت با موفقیت بروزرسانی شد');
      } else {
        await api.createStaticChoiceItem({
          choice_set: selectedStaticSet.id,
          label: staticItemLabel.trim(),
          code: staticItemCode.trim().toUpperCase(),
          order: Number(staticItemOrder),
        });
        showNotification('گزینه جدید به مجموعه افزوده شد');
      }
      setIsStaticItemModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره گزینه ثابت'), true);
    }
  };

  const handleDeleteStaticItem = async (id: number) => {
    if (!window.confirm('آیا از حذف این گزینه ثابت اطمینان دارید؟')) return;
    try {
      await api.deleteStaticChoiceItem(id);
      showNotification('گزینه ثابت حذف شد');
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در حذف گزینه ثابت'), true);
    }
  };

  // Filtered lists
  const filteredLookups = lookups.filter(
    (l) =>
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaticSets = staticSets.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Available parent options for currently selected lookup (excluding item being edited)
  const availableParents = (selectedLookup?.items || []).filter(
    (it: any) => !editingLookupItem || it.id !== editingLookupItem.id
  );

  return (
    <div className="space-y-5 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">منابع داده و لغت‌نامه‌ها (Data Sources & Lookups)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت لیست‌های داده‌ای سلسله‌مراتبی، گزینه‌های آبشاری (Parent/Child) و مقادیر ثابت فرم‌های هوشمند
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {activeTab === 'lookups' ? (
            <button
              onClick={() => handleOpenLookupModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>منبع داده پویا جدید</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenStaticModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مجموعه ثابت جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col @4xl:flex-row @4xl:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('lookups')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'lookups'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GitBranch className="w-4 h-4 shrink-0" />
            <span>لیست‌های پویا و آبشاری (Lookups)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'lookups' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {lookups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('static')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'static'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>مجموعه گزینه‌های ثابت (Static Choices)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'static' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {staticSets.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full @4xl:w-60 shrink-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در عناوین یا کدها..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Dynamic Hierarchical Lookups */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'lookups' && (
        <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-5">
          {/* Lists Column */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-3 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">لیست‌های پویا ({filteredLookups.length})</span>
              <ListFilter className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredLookups.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  {loading ? 'در حال دریافت...' : 'منبع داده پویایی یافت نشد'}
                </div>
              ) : (
                filteredLookups.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLookup(l)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedLookup?.id === l.id
                        ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{l.name}</span>
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                          {l.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {l.items?.length || 0} گزینه تعریف‌شده
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleLookupActive(l)}
                        title={l.is_active ? 'فعال - کلیک برای تغییر' : 'غیرفعال - کلیک برای فعال‌سازی'}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${
                          l.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {l.is_active ? 'فعال' : 'غیرفعال'}
                      </button>
                      <button
                        onClick={() => handleOpenLookupModal(l)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ویرایش منبع"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLookup(l)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف منبع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Items Detail Column */}
          <div className="@4xl:col-span-2 bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4 min-w-0">
            <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedLookup ? `گزینه‌های «${selectedLookup.name}»` : 'انتخاب منبع داده'}
                  </h3>
                  {selectedLookup && (
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      کد: {selectedLookup.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  پشتیبانی از دسته‌بندی والد و فرزند (Cascading / Dependent Dropdowns)
                </p>
              </div>

              {selectedLookup && (
                <button
                  onClick={() => handleOpenLookupItemModal()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all self-start @3xl:self-auto shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن گزینه جدید</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {!selectedLookup?.items?.length ? (
                <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  {selectedLookup
                    ? 'هنوز گزینه‌ای برای این منبع داده ثبت نشده است. روی «افزودن گزینه جدید» کلیک کنید.'
                    : 'لطفاً یک منبع داده را از لیست سمت راست انتخاب کنید.'}
                </div>
              ) : (
                selectedLookup.items.map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/60 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">{it.label}</span>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {it.code || it.value}
                        </span>
                        {it.parent_label && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md font-semibold">
                            <GitBranch className="w-3 h-3" />
                            <span>والد: {it.parent_label}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          ترتیب: {it.order ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleLookupItemActive(it)}
                        className={`text-xs font-bold px-2 py-0.5 rounded-md transition-all ${
                          it.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {it.is_active ? 'فعال' : 'غیرفعال'}
                      </button>
                      <button
                        onClick={() => handleOpenLookupItemModal(it)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ویرایش گزینه"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLookupItem(it.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف گزینه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Static Choice Sets */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'static' && (
        <div className="grid grid-cols-1 @4xl:grid-cols-3 gap-5">
          {/* Static Sets Column */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-3 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">مجموعه‌های ثابت ({filteredStaticSets.length})</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredStaticSets.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  {loading ? 'در حال دریافت...' : 'مجموعه ثابتی یافت نشد'}
                </div>
              ) : (
                filteredStaticSets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStaticSet(s)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedStaticSet?.id === s.id
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{s.name}</span>
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded">
                          {s.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.items?.length || 0} گزینه ثابت
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenStaticModal(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ویرایش مجموعه"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaticSet(s)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف مجموعه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Static Items Detail Column */}
          <div className="@4xl:col-span-2 bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4 min-w-0">
            <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedStaticSet ? `گزینه‌های ثابت «${selectedStaticSet.name}»` : 'انتخاب مجموعه'}
                  </h3>
                  {selectedStaticSet && (
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      کد: {selectedStaticSet.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">گزینه‌های از پیش تعریف‌شده برای فیلدهای انتخابی فرم‌ها</p>
              </div>

              {selectedStaticSet && (
                <button
                  onClick={() => handleOpenStaticItemModal()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all self-start @3xl:self-auto shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن گزینه ثابت</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {!selectedStaticSet?.items?.length ? (
                <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  {selectedStaticSet
                    ? 'هنوز گزینه‌ای برای این مجموعه ثبت نشده است. روی «افزودن گزینه ثابت» کلیک کنید.'
                    : 'لطفاً یک مجموعه ثابت را انتخاب کنید.'}
                </div>
              ) : (
                selectedStaticSet.items.map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/60 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs text-slate-900">{it.label}</span>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {it.code || it.value}
                      </span>
                      <span className="text-xs text-slate-400">
                        ترتیب: {it.order ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteStaticItem(it.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف گزینه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Create/Edit Dynamic Lookup List */}
      {/* ------------------------------------------------------------- */}
      {isLookupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingLookup ? 'ویرایش منبع داده پویا' : 'تعریف منبع داده جدید'}
              </h3>
              <button onClick={() => setIsLookupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLookup} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">عنوان منبع داده *</label>
                <input
                  type="text"
                  required
                  value={lookupName}
                  onChange={(e) => setLookupName(e.target.value)}
                  placeholder="مثال: فهرست عیوب فنی تجهیزات"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا *</label>
                <input
                  type="text"
                  required
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="مثال: technical_faults"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono lowercase outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات</label>
                <textarea
                  value={lookupDesc}
                  onChange={(e) => setLookupDesc(e.target.value)}
                  rows={2}
                  placeholder="توضیحات اختیاری درباره این منبع داده..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lookupActiveCheck"
                  checked={lookupActive}
                  onChange={(e) => setLookupActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <label htmlFor="lookupActiveCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  منبع داده فعال باشد
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLookupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-500/20"
                >
                  {editingLookup ? 'ذخیره تغییرات' : 'ذخیره منبع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Create/Edit Dynamic Lookup Item (with Parent Dropdown) */}
      {/* ------------------------------------------------------------- */}
      {isLookupItemModalOpen && selectedLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingLookupItem ? 'ویرایش گزینه' : 'افزودن گزینه جدید'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">منبع: {selectedLookup.name}</p>
              </div>
              <button onClick={() => setIsLookupItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLookupItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">عنوان گزینه (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  placeholder="مثال: خرابی بلبرینگ موتور"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا *</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="مثال: MOTOR_BEARING"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">ترتیب نمایش</label>
                  <input
                    type="number"
                    value={itemOrder}
                    onChange={(e) => setItemOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">
                  گزینه والد (برای لیست‌های آبشاری Cascading)
                </label>
                <select
                  value={itemParentId}
                  onChange={(e) => setItemParentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">بدون والد (سطح ریشه / والد اصلی)</option>
                  {availableParents.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.code || p.value})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  اگر این گزینه زیرمجموعه یک گزینه دیگر است، والد آن را انتخاب کنید.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLookupItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-500/20"
                >
                  {editingLookupItem ? 'ذخیره تغییرات' : 'افزودن گزینه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Create/Edit Static Choice Set */}
      {/* ------------------------------------------------------------- */}
      {isStaticModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingStaticSet ? 'ویرایش مجموعه ثابت' : 'تعریف مجموعه گزینه‌های ثابت'}
              </h3>
              <button onClick={() => setIsStaticModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaticSet} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">نام مجموعه ثابت *</label>
                <input
                  type="text"
                  required
                  value={staticName}
                  onChange={(e) => setStaticName(e.target.value)}
                  placeholder="مثال: وضعیت‌های اولویت پرونده"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا *</label>
                <input
                  type="text"
                  required
                  value={staticCode}
                  onChange={(e) => setStaticCode(e.target.value)}
                  placeholder="مثال: PRIORITY_TYPES"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات تکمیلی</label>
                <textarea
                  value={staticDesc}
                  onChange={(e) => setStaticDesc(e.target.value)}
                  rows={2}
                  placeholder="توضیحات اختیاری درباره این مجموعه ثابت..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaticModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  {editingStaticSet ? 'ذخیره تغییرات' : 'ذخیره مجموعه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Create Static Choice Item */}
      {/* ------------------------------------------------------------- */}
      {isStaticItemModalOpen && selectedStaticSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingStaticItem ? 'ویرایش گزینه ثابت' : 'افزودن گزینه ثابت'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">مجموعه: {selectedStaticSet.name}</p>
              </div>
              <button onClick={() => setIsStaticItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaticItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">عنوان گزینه (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={staticItemLabel}
                  onChange={(e) => setStaticItemLabel(e.target.value)}
                  placeholder="مثال: اولویت اضطراری"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">کد لاتین مقدار *</label>
                  <input
                    type="text"
                    required
                    value={staticItemCode}
                    onChange={(e) => setStaticItemCode(e.target.value)}
                    placeholder="مثال: URGENT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">ترتیب نمایش</label>
                  <input
                    type="number"
                    value={staticItemOrder}
                    onChange={(e) => setStaticItemOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaticItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  {editingStaticItem ? 'ذخیره تغییرات' : 'افزودن گزینه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
