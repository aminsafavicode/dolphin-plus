import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  Cpu,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Layers,
  Smartphone,
  Hash,
  X,
  AlertCircle,
  Search,
  Tag,
  Barcode
} from 'lucide-react';
import { api } from '../api/client';

export const CatalogView: FC = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'models' | 'types' | 'devices'>('models');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typeActive, setTypeActive] = useState(true);

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelBrand, setModelBrand] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
  const [modelActive, setModelActive] = useState(true);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceModelId, setDeviceModelId] = useState<number | ''>('');
  const [deviceDesc, setDeviceDesc] = useState('');

  const [isIdentifierModalOpen, setIsIdentifierModalOpen] = useState(false);
  const [targetDevice, setTargetDevice] = useState<any | null>(null);
  const [idType, setIdType] = useState<'SERIAL_NUMBER' | 'IMEI' | 'MAC_ADDRESS'>('SERIAL_NUMBER');
  const [idValue, setIdValue] = useState('');

  // In-app confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const extractErrorMessage = (err: any, fallback: string) => {
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string') return data;
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        const text = Array.isArray(val) ? val.join(' ') : String(val);
        if (firstKey === 'name') return `خطا در فیلد نام: ${text}`;
        if (firstKey === 'code') return `خطا در فیلد کد لاتین: ${text}`;
        if (firstKey === 'value') return `خطا در مقدار شناسه: ${text}`;
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
      const [tData, mData, dData] = await Promise.all([
        api.getCatalogTypes(),
        api.getCatalogModels(),
        api.getCatalogDevices(),
      ]);
      setTypes(tData);
      setModels(mData);
      setDevices(dData);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در بارگذاری اطلاعات کاتالوگ'), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // -----------------------------------------------------------------
  // Device Types (Categories) Handlers
  // -----------------------------------------------------------------
  const handleOpenTypeModal = (typeObj?: any) => {
    if (typeObj) {
      setEditingType(typeObj);
      setTypeName(typeObj.name);
      setTypeCode(typeObj.code);
      setTypeDesc(typeObj.description || '');
      setTypeActive(typeObj.is_active ?? true);
    } else {
      setEditingType(null);
      setTypeName('');
      setTypeCode('');
      setTypeDesc('');
      setTypeActive(true);
    }
    setActionError(null);
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: FormEvent) => {
    e.preventDefault();
    if (!typeName.trim() || !typeCode.trim()) {
      showNotification('لطفاً نام دسته و کد لاتین را وارد کنید', true);
      return;
    }
    try {
      if (editingType) {
        await api.updateCatalogType(editingType.id, {
          name: typeName.trim(),
          code: typeCode.trim().toUpperCase(),
          description: typeDesc.trim(),
          is_active: typeActive,
        });
        showNotification('دسته‌بندی تجهیزات با موفقیت ویرایش شد');
      } else {
        await api.createCatalogType({
          name: typeName.trim(),
          code: typeCode.trim().toUpperCase(),
          description: typeDesc.trim(),
          is_active: typeActive,
        });
        showNotification('دسته‌بندی جدید تجهیزات با موفقیت تعریف شد');
      }
      setIsTypeModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره دسته‌بندی'), true);
    }
  };

  const promptDeleteType = (t: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف دسته‌بندی تجهیزات',
      message: `آیا از حذف دسته‌بندی «${t.name}» اطمینان دارید؟`,
      confirmLabel: 'حذف دسته‌بندی',
      onConfirm: async () => {
        try {
          await api.deleteCatalogType(t.id);
          showNotification(`دسته‌بندی «${t.name}» حذف گردید`);
          loadData();
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'امکان حذف این دسته وجود ندارد زیرا مدل‌های وابسته دارد.'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleToggleTypeActive = async (t: any) => {
    try {
      await api.updateCatalogType(t.id, { is_active: !t.is_active });
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت دسته'), true);
    }
  };

  // -----------------------------------------------------------------
  // Device Models Handlers
  // -----------------------------------------------------------------
  const handleOpenModelModal = (modelObj?: any) => {
    if (modelObj) {
      setEditingModel(modelObj);
      setModelName(modelObj.name);
      setModelBrand(modelObj.brand || '');
      setModelCode(modelObj.code);
      setModelDesc(modelObj.description || '');
      setSelectedTypeId(modelObj.device_type);
      setModelActive(modelObj.is_active ?? true);
    } else {
      setEditingModel(null);
      setModelName('');
      setModelBrand('');
      setModelCode('');
      setModelDesc('');
      setSelectedTypeId(types.length > 0 ? types[0].id : '');
      setModelActive(true);
    }
    setActionError(null);
    setIsModelModalOpen(true);
  };

  const handleSaveModel = async (e: FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() || !selectedTypeId || !modelCode.trim()) {
      showNotification('لطفاً نام مدل، دسته‌بندی و کد کاتالوگ را وارد کنید', true);
      return;
    }
    try {
      if (editingModel) {
        await api.updateCatalogModel(editingModel.id, {
          name: modelName.trim(),
          brand: modelBrand.trim() || 'عمومی',
          code: modelCode.trim().toUpperCase(),
          device_type: Number(selectedTypeId),
          description: modelDesc.trim(),
          is_active: modelActive,
        });
        showNotification('مدل تجهیز با موفقیت بروزرسانی شد');
      } else {
        await api.createCatalogModel({
          name: modelName.trim(),
          brand: modelBrand.trim() || 'عمومی',
          code: modelCode.trim().toUpperCase(),
          device_type: Number(selectedTypeId),
          description: modelDesc.trim(),
          is_active: modelActive,
        });
        showNotification('مدل جدید با موفقیت به کاتالوگ افزوده شد');
      }
      setIsModelModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره مدل تجهیز'), true);
    }
  };

  const promptDeleteModel = (m: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف مدل تجهیزات',
      message: `آیا از حذف مدل «${m.name}» اطمینان دارید؟`,
      confirmLabel: 'حذف مدل',
      onConfirm: async () => {
        try {
          await api.deleteCatalogModel(m.id);
          showNotification(`مدل «${m.name}» حذف شد`);
          loadData();
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'امکان حذف این مدل به دلیل اتصال به دستگاه‌ها یا فرایندها وجود ندارد'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleToggleModelActive = async (m: any) => {
    try {
      await api.updateCatalogModel(m.id, { is_active: !m.is_active });
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در تغییر وضعیت مدل'), true);
    }
  };

  // -----------------------------------------------------------------
  // Device Physical Asset Handlers
  // -----------------------------------------------------------------
  const handleOpenDeviceModal = () => {
    setDeviceModelId(models.length > 0 ? models[0].id : '');
    setDeviceDesc('');
    setActionError(null);
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!deviceModelId) {
      showNotification('لطفاً یک مدل تجهیز را انتخاب کنید', true);
      return;
    }
    try {
      await api.createCatalogDevice({
        device_model: Number(deviceModelId),
        description: deviceDesc.trim(),
      });
      showNotification('دستگاه/دارایی فیزیکی جدید با موفقیت ثبت گردید');
      setIsDeviceModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ثبت دستگاه فیزیکی'), true);
    }
  };

  const promptDeleteDevice = (d: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف دستگاه فیزیکی',
      message: `آیا از حذف دستگاه فیزیکی #${d.id} اطمینان دارید؟`,
      confirmLabel: 'حذف دستگاه',
      onConfirm: async () => {
        try {
          await api.deleteCatalogDevice(d.id);
          showNotification(`دستگاه #${d.id} حذف شد`);
          loadData();
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف دستگاه'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // -----------------------------------------------------------------
  // Device Identifiers (IMEI, Serial, MAC) Handlers
  // -----------------------------------------------------------------
  const handleOpenIdentifierModal = (device: any) => {
    setTargetDevice(device);
    setIdType('SERIAL_NUMBER');
    setIdValue('');
    setActionError(null);
    setIsIdentifierModalOpen(true);
  };

  const handleSaveIdentifier = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetDevice || !idValue.trim()) {
      showNotification('لطفاً مقدار شناسه را وارد کنید', true);
      return;
    }
    try {
      await api.createCatalogIdentifier({
        device: targetDevice.id,
        identifier_type: idType,
        value: idValue.trim(),
      });
      showNotification(`شناسه ${idType} برای دستگاه ثبت شد`);
      setIsIdentifierModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ثبت شناسه (ممکن است تکراری باشد)'), true);
    }
  };

  const promptDeleteIdentifier = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف شناسه دستگاه',
      message: 'آیا از حذف این شناسه اطمینان دارید؟',
      confirmLabel: 'حذف شناسه',
      onConfirm: async () => {
        try {
          await api.deleteCatalogIdentifier(id);
          showNotification('شناسه با موفقیت حذف شد');
          loadData();
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف شناسه'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Filtered lists
  const filteredModels = models.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.device_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTypes = types.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDevices = devices.filter((d) =>
    d.device_model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.device_model_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.device_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.identifiers?.some((i: any) => i.value?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">کاتالوگ جامع تجهیزات و دارایی‌ها (Asset Catalog)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت دسته‌بندی‌های پایه، مدل‌های کاتالوگ سخت‌افزار، دارایی‌های فیزیکی و شناسه‌های یکتا (IMEI، سریال، MAC)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => handleOpenTypeModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>دسته‌بندی جدید</span>
          </button>
          <button
            onClick={() => handleOpenModelModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>مدل تجهیز جدید</span>
          </button>
          <button
            onClick={handleOpenDeviceModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت دارایی فیزیکی</span>
          </button>
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

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col @4xl:flex-row @4xl:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'models'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>مدل‌های سخت‌افزاری</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'models' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {models.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('types')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'types'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>دسته‌بندی‌های پایه</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'types' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {types.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>دارایی‌های فیزیکی و شناسه‌ها</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'devices' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {devices.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full @4xl:w-60 shrink-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در کاتالوگ..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Tab 1: Hardware Models View */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-3 gap-4">
          {filteredModels.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
              {loading ? 'در حال دریافت اطلاعات مدل‌ها...' : 'هیچ مدل سخت‌افزاری در کاتالوگ یافت نشد.'}
            </div>
          ) : (
            filteredModels.map((m) => (
              <div
                key={m.id}
                className={`bg-white rounded-xl p-4 border transition-all flex flex-col justify-between min-w-0 ${
                  m.is_active ? 'border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md' : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono">
                      {m.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {m.brand}
                      </span>
                      <button
                        onClick={() => handleToggleModelActive(m)}
                        title={m.is_active ? 'فعال - کلیک برای غیرفعال‌سازی' : 'غیرفعال - کلیک برای فعال‌سازی'}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${
                          m.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {m.is_active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900">{m.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>دسته: {m.device_type_name || 'نامشخص'}</span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    آماده انتخاب در فرم‌ها
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModelModal(m)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="ویرایش مدل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => promptDeleteModel(m)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="حذف مدل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Base Device Types View */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-3 gap-4">
          {filteredTypes.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
              {loading ? 'در حال دریافت دسته‌بندی‌ها...' : 'هیچ دسته‌بندی پایه‌ای یافت نشد.'}
            </div>
          ) : (
            filteredTypes.map((t) => (
              <div
                key={t.id}
                className={`bg-white rounded-xl p-4 border transition-all flex flex-col justify-between min-w-0 ${
                  t.is_active ? 'border-slate-200/80 shadow-sm hover:shadow-md' : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {t.code}
                    </span>
                    <button
                      onClick={() => handleToggleTypeActive(t)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.is_active ? 'فعال' : 'غیرفعال'}
                    </button>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 mt-1">{t.name}</h4>
                  {t.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    دسته‌بندی مرجع سیستم
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenTypeModal(t)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="ویرایش دسته‌بندی"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => promptDeleteType(t)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="حذف دسته‌بندی"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Physical Device Instances & Identifiers */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {filteredDevices.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
              {loading ? 'در حال دریافت دارایی‌های فیزیکی...' : 'هنوز هیچ دارایی فیزیکی ثبت نشده است. از دکمه «ثبت دارایی فیزیکی» در بالا استفاده نمایید.'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">لیست دارایی‌ها و شناسه‌های سخت‌افزاری</span>
                <span className="text-xs text-slate-400 font-mono">تعداد: {filteredDevices.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredDevices.map((d) => (
                  <div key={d.id} className="p-4 hover:bg-slate-50/50 transition-all flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900">
                          {d.device_model_brand} {d.device_model_name}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                          دسته: {d.device_type_name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          شناسه سیستمی: #{d.id}
                        </span>
                      </div>

                      {d.description && (
                        <p className="text-xs text-slate-500">{d.description}</p>
                      )}

                      {/* Identifiers list */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Barcode className="w-3.5 h-3.5" />
                          شناسه‌ها:
                        </span>
                        {d.identifiers && d.identifiers.length > 0 ? (
                          d.identifiers.map((ident: any) => (
                            <span
                              key={ident.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono border border-slate-200"
                            >
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                                {ident.identifier_type_display || ident.identifier_type}
                              </span>
                              <span>{ident.value}</span>
                              <button
                                onClick={() => promptDeleteIdentifier(ident.id)}
                                className="text-slate-400 hover:text-rose-600 transition-all"
                                title="حذف این شناسه"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">شناسه‌ای ثبت نشده است</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end @3xl:self-center">
                      <button
                        onClick={() => handleOpenIdentifierModal(d)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-all border border-indigo-200/60"
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>افزودن شناسه (سریال/IMEI/MAC)</span>
                      </button>
                      <button
                        onClick={() => promptDeleteDevice(d)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="حذف دستگاه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Create / Edit Device Type */}
      {/* ------------------------------------------------------------- */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingType ? 'ویرایش دسته‌بندی تجهیزات' : 'تعریف دسته جدید تجهیزات'}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">نام دسته‌بندی (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="مثال: اینورترها و درایوها"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا *</label>
                <input
                  type="text"
                  required
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  placeholder="مثال: INVERTERS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات تکمیلی</label>
                <textarea
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                  rows={2}
                  placeholder="توضیحات اختیاری درباره این دسته..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="typeActiveCheck"
                  checked={typeActive}
                  onChange={(e) => setTypeActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="typeActiveCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  دسته‌بندی فعال باشد
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {editingType ? 'ذخیره تغییرات' : 'ذخیره دسته'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Create / Edit Device Model */}
      {/* ------------------------------------------------------------- */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingModel ? 'ویرایش مدل در کاتالوگ' : 'تعریف مدل تجهیز در کاتالوگ'}
              </h3>
              <button onClick={() => setIsModelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">نام کامل مدل *</label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="مثال: Sinamics G120C 15kW"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">دسته‌بندی والد *</label>
                <select
                  required
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">انتخاب دسته والد...</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">برند / سازنده</label>
                  <input
                    type="text"
                    value={modelBrand}
                    onChange={(e) => setModelBrand(e.target.value)}
                    placeholder="مثال: Siemens"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">کد کاتالوگ *</label>
                  <input
                    type="text"
                    required
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="مثال: G120C-15K"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات تکمیلی مدل</label>
                <textarea
                  value={modelDesc}
                  onChange={(e) => setModelDesc(e.target.value)}
                  rows={2}
                  placeholder="مشخصات فنی یا توضیحات اختیاری..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modelActiveCheck"
                  checked={modelActive}
                  onChange={(e) => setModelActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="modelActiveCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  مدل فعال باشد و در فرم‌ها نمایش داده شود
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {editingModel ? 'ذخیره تغییرات مدل' : 'ثبت مدل در کاتالوگ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Create Physical Device */}
      {/* ------------------------------------------------------------- */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">ثبت دارایی فیزیکی جدید</h3>
              <button onClick={() => setIsDeviceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">مدل تجهیز از کاتالوگ *</label>
                <select
                  required
                  value={deviceModelId}
                  onChange={(e) => setDeviceModelId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">انتخاب مدل...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand} - {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات یا محل استقرار</label>
                <textarea
                  value={deviceDesc}
                  onChange={(e) => setDeviceDesc(e.target.value)}
                  rows={2}
                  placeholder="مثال: نصب شده در خط تولید شماره ۲..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20"
                >
                  ثبت دارایی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 4: Add Identifier (IMEI, Serial, MAC) */}
      {/* ------------------------------------------------------------- */}
      {isIdentifierModalOpen && targetDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">ثبت شناسه سخت‌افزاری</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  دستگاه: {targetDevice.device_model_brand} {targetDevice.device_model_name}
                </p>
              </div>
              <button onClick={() => setIsIdentifierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIdentifier} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">نوع شناسه *</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="SERIAL_NUMBER">شماره سریال (Serial Number)</option>
                  <option value="IMEI">شناسه بین‌المللی تجهیزات (IMEI)</option>
                  <option value="MAC_ADDRESS">آدرس مک شبکه (MAC Address)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">مقدار شناسه *</label>
                <input
                  type="text"
                  required
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  placeholder={
                    idType === 'SERIAL_NUMBER'
                      ? 'مثال: SN-98234-A7'
                      : idType === 'IMEI'
                      ? 'مثال: 356938035643809'
                      : 'مثال: 00:1A:2B:3C:4D:5E'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIdentifierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  ثبت شناسه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">{confirmDialog.message}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-rose-600/20"
              >
                {confirmDialog.confirmLabel || 'حذف قطعی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
