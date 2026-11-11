import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Table as TableIcon,
  Layers,
  Eye,
  Sliders,
  Calendar as CalendarIcon,
  UploadCloud,
  FolderPlus,
  Calculator,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { api } from '../api/client';

export const FormsView: FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWfId, setSelectedWfId] = useState<number | null>(null);
  const [formDef, setFormDef] = useState<any | null>(null);
  const [lookups, setLookups] = useState<any[]>([]);
  const [staticSets, setStaticSets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'designer' | 'preview' | 'print'>('designer');
  const [loading, setLoading] = useState(false);

  // Global notifications
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);

  // Field Form States
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldCode, setFieldCode] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldSectionId, setFieldSectionId] = useState<number | ''>('');
  const [fieldGroupId, setFieldGroupId] = useState<number | ''>('');
  const [fieldType, setFieldType] = useState('TEXT');
  const [fieldCalendar, setFieldCalendar] = useState('JALALI');
  const [fieldChoiceSource, setFieldChoiceSource] = useState('NONE');
  const [fieldStaticSetId, setFieldStaticSetId] = useState<number | ''>('');
  const [fieldLookupListId, setFieldLookupListId] = useState<number | ''>('');
  const [fieldParentFieldId, setFieldParentFieldId] = useState<number | ''>('');
  const [fieldSystemKey, setFieldSystemKey] = useState('NONE');
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [fieldDecimalPlaces, setFieldDecimalPlaces] = useState<number>(2);
  const [fieldIsRequired, setFieldIsRequired] = useState(false);
  const [fieldShowInSummary, setFieldShowInSummary] = useState(false);
  const [fieldIsActive, setFieldIsActive] = useState(true);

  // Formula Builder States
  const [formulaTokens, setFormulaTokens] = useState<any[]>([]);
  const [formulaConstNum, setFormulaConstNum] = useState<string>('');
  const [formulaSelectedFieldId, setFormulaSelectedFieldId] = useState<number | ''>('');

  // Group Form States
  const [groupLabel, setGroupLabel] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupSectionId, setGroupSectionId] = useState<number | ''>('');
  const [groupType, setGroupType] = useState<'NORMAL' | 'DEVICE'>('NORMAL');
  const [groupDisplayType, setGroupDisplayType] = useState<'TABLE' | 'LIST'>('TABLE');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupIsRequired, setGroupIsRequired] = useState(false);

  // Section Form States
  const [secName, setSecName] = useState('');
  const [secCode, setSecCode] = useState('');
  const [secDesc, setSecDesc] = useState('');

  // Print Settings States
  const [printDocTitle, setPrintDocTitle] = useState('');
  const [printSubtitle, setPrintSubtitle] = useState('');
  const [printHeader, setPrintHeader] = useState('');
  const [printFooter, setPrintFooter] = useState('');
  const [printPageSize, setPrintPageSize] = useState<'A4' | 'A5'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [printShowWfName, setPrintShowWfName] = useState(true);
  const [printShowInstanceNumber, setPrintShowInstanceNumber] = useState(true);
  const [printShowCreatedAt, setPrintShowCreatedAt] = useState(true);
  const [printShowSignatures, setPrintShowSignatures] = useState(true);
  const [printSignatureCount, setPrintSignatureCount] = useState<number>(3);
  const [fieldPrintLayouts, setFieldPrintLayouts] = useState<Record<number, {
    is_enabled: boolean;
    title_override: string;
    print_order: number;
    print_width: string;
  }>>({});

  // Preview Form Interactive Simulator State
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewRows, setPreviewRows] = useState<Record<number, any[]>>({});
  const [previewValidationResult, setPreviewValidationResult] = useState<string | null>(null);

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
        if (firstKey === 'name') return `خطا در نام/شناسه: ${text}`;
        if (firstKey === 'code') return `خطا در کد لاتین: ${text}`;
        if (firstKey === 'label') return `خطا در عنوان فیلد: ${text}`;
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

  // Helper arrays
  const allSections = formDef?.sections || [];
  const allFields: any[] = [];
  allSections.forEach((s: any) => {
    if (s.fields) allFields.push(...s.fields);
  });

  // Client-side formula evaluator matching backend FormulaService
  const evaluateFormula = (
    field: any,
    pValues: Record<string, any>,
    rowValues?: Record<string, any>,
    pRows?: Record<number, any[]>,
    fieldsList?: any[]
  ): number | string => {
    let config = field.choices;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch { return 0; }
    }
    if (!config || !Array.isArray(config.tokens) || config.tokens.length === 0) {
      return 0;
    }

    const tokens = config.tokens;
    const decimalPlaces = config.decimal_places ?? field.decimal_places ?? 2;

    const fieldMap = new Map<number, any>();
    (fieldsList || allFields || []).forEach((f: any) => fieldMap.set(f.id, f));

    const resolveFieldValue = (fieldId: number): number => {
      const f = fieldMap.get(fieldId);
      if (!f) return 0;
      if (rowValues && f.code in rowValues) {
        const val = parseFloat(rowValues[f.code]);
        return isNaN(val) ? 0 : val;
      }
      const val = parseFloat(pValues[f.code] ?? f.default_value ?? 0);
      return isNaN(val) ? 0 : val;
    };

    const resolveAggregate = (fieldId: number, func: string): number => {
      const f = fieldMap.get(fieldId);
      if (!f || !f.repeatable_group || !pRows) return 0;
      const rows = pRows[f.repeatable_group] || [];
      const values = rows.map((r: any) => {
        const v = parseFloat(r[f.code]);
        return isNaN(v) ? 0 : v;
      });
      if (values.length === 0) return 0;
      if (func === 'SUM') return values.reduce((a: number, b: number) => a + b, 0);
      if (func === 'AVG') return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      if (func === 'MIN') return Math.min(...values);
      if (func === 'MAX') return Math.max(...values);
      return 0;
    };

    try {
      let pos = 0;
      const current = () => (pos < tokens.length ? tokens[pos] : null);
      const advance = () => tokens[pos++];
      const match = (type: string, val?: string) => {
        const t = current();
        if (!t || t.type !== type) return false;
        return val === undefined || String(t.value) === String(val);
      };

      const parseFactor = (): number => {
        const token = current();
        if (!token) return 0;

        if (token.type === 'number') {
          advance();
          return parseFloat(token.value) || 0;
        }
        if (token.type === 'field') {
          advance();
          return resolveFieldValue(Number(token.field_id));
        }
        if (token.type === 'paren' && token.value === '(') {
          advance();
          const expr = parseExpression();
          if (match('paren', ')')) advance();
          return expr;
        }
        if (token.type === 'function') {
          const fnName = String(token.value).toUpperCase();
          advance();
          if (match('paren', '(')) advance();

          const peek = current();
          if (['SUM', 'AVG', 'MIN', 'MAX'].includes(fnName) && peek && peek.type === 'field') {
            const fId = Number(peek.field_id);
            const fObj = fieldMap.get(fId);
            if (fObj && fObj.repeatable_group) {
              advance();
              if (match('paren', ')')) advance();
              return resolveAggregate(fId, fnName);
            }
          }

          const args: number[] = [];
          if (!match('paren', ')')) {
            while (pos < tokens.length) {
              args.push(parseExpression());
              if (match('comma', ',')) {
                advance();
                continue;
              }
              break;
            }
          }
          if (match('paren', ')')) advance();

          if (fnName === 'SUM') return args.reduce((a, b) => a + b, 0);
          if (fnName === 'AVG') return args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0;
          if (fnName === 'MIN') return args.length ? Math.min(...args) : 0;
          if (fnName === 'MAX') return args.length ? Math.max(...args) : 0;
          if (fnName === 'ABS') return Math.abs(args[0] || 0);
          if (fnName === 'FLOOR') return Math.floor(args[0] || 0);
          if (fnName === 'CEIL') return Math.ceil(args[0] || 0);
          if (fnName === 'ROUND') {
            const factor = Math.pow(10, args[1] !== undefined ? args[1] : 0);
            return Math.round((args[0] || 0) * factor) / factor;
          }
          return 0;
        }
        advance();
        return 0;
      };

      const parseTerm = (): number => {
        let val = parseFactor();
        while (match('operator', '*') || match('operator', '/') || match('operator', '%')) {
          const op = advance().value;
          const next = parseFactor();
          if (op === '*') val = val * next;
          else if (op === '/') val = next !== 0 ? val / next : 0;
          else if (op === '%') val = next !== 0 ? val % next : 0;
        }
        return val;
      };

      const parseExpression = (): number => {
        let val = parseTerm();
        while (match('operator', '+') || match('operator', '-')) {
          const op = advance().value;
          const next = parseTerm();
          if (op === '+') val = val + next;
          else if (op === '-') val = val - next;
        }
        return val;
      };

      const res = parseExpression();
      return Number(res.toFixed(decimalPlaces));
    } catch (e) {
      return 0;
    }
  };

  const syncPrintSettings = (fd: any) => {
    if (!fd) return;
    if (fd.sections) {
      setFieldPrintLayouts((prev) => {
        const next = { ...prev };
        fd.sections.forEach((sec: any) => {
          (sec.fields || []).forEach((f: any, idx: number) => {
            if (!next[f.id]) {
              next[f.id] = {
                is_enabled: f.print_config?.is_enabled ?? true,
                title_override: f.print_config?.title_override || '',
                print_order: f.print_config?.print_order ?? (f.order || idx + 1),
                print_width: f.print_config?.print_width || '100%',
              };
            }
          });
        });
        return next;
      });
    }
    if (fd.print_settings) {
      const ps = fd.print_settings;
      setPrintDocTitle(ps.document_title || '');
      setPrintSubtitle(ps.subtitle || '');
      setPrintHeader(ps.header_text || '');
      setPrintFooter(ps.footer_text || '');
      setPrintPageSize(ps.page_size || 'A4');
      setPrintOrientation(ps.orientation || 'PORTRAIT');
      setPrintShowWfName(ps.show_workflow_name ?? true);
      setPrintShowInstanceNumber(ps.show_instance_number ?? true);
      setPrintShowCreatedAt(ps.show_created_at ?? true);
      setPrintShowSignatures(ps.show_signatures ?? true);
      setPrintSignatureCount(ps.signature_count ?? 3);
    }
  };

  const loadData = async (targetWfId?: number) => {
    setLoading(true);
    try {
      const [wfs, lks, stSets] = await Promise.all([
        api.getWorkflows(),
        api.getLookups(),
        api.getStaticChoiceSets(),
      ]);
      setWorkflows(wfs);
      setLookups(lks);
      setStaticSets(stSets);

      if (wfs.length > 0) {
        const currentId = targetWfId || selectedWfId || wfs[0].id;
        setSelectedWfId(currentId);
        const fd = await api.getFormDefinition(currentId);
        setFormDef(fd);
        syncPrintSettings(fd);
      } else {
        setSelectedWfId(null);
        setFormDef(null);
      }
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در بارگذاری اطلاعات فرم'), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectWorkflow = async (wfId: number) => {
    setSelectedWfId(wfId);
    setPreviewValues({});
    setPreviewRows({});
    setPreviewValidationResult(null);
    try {
      const fd = await api.getFormDefinition(wfId);
      setFormDef(fd);
      syncPrintSettings(fd);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در دریافت فرم فرآیند'), true);
    }
  };

  // -----------------------------------------------------------------
  // Form Field CRUD
  // -----------------------------------------------------------------
  const handleOpenFieldModal = (field?: any, defaultSecId?: number, defaultGroupId?: number) => {
    const firstSecId = formDef?.sections?.[0]?.id || '';
    if (field) {
      setEditingField(field);
      setFieldLabel(field.label);
      setFieldCode(field.code);
      setFieldName(field.name);
      setFieldSectionId(field.section || firstSecId);
      setFieldGroupId(field.repeatable_group || '');
      setFieldType(field.field_type || 'TEXT');
      setFieldCalendar(field.calendar || 'JALALI');
      setFieldChoiceSource(field.choice_source || 'NONE');
      setFieldStaticSetId(field.choice_static_set || '');
      setFieldLookupListId(field.choice_lookup_list || '');
      setFieldParentFieldId(field.choice_parent_field || '');
      setFieldSystemKey(field.system_key || 'NONE');
      setFieldDefaultValue(field.default_value || '');
      setFieldHelpText(field.help_text || '');
      setFieldDecimalPlaces(field.decimal_places ?? 2);
      setFieldIsRequired(field.is_required ?? false);
      setFieldShowInSummary(field.show_in_process_summary ?? false);
      setFieldIsActive(field.is_active ?? true);

      // Formula choices parsing
      if (field.field_type === 'FORMULA') {
        let c = field.choices;
        if (typeof c === 'string') {
          try { c = JSON.parse(c); } catch {}
        }
        if (c && Array.isArray(c.tokens)) {
          setFormulaTokens(c.tokens);
        } else {
          setFormulaTokens([]);
        }
        setFieldDecimalPlaces(c?.decimal_places ?? field.decimal_places ?? 2);
      } else {
        setFormulaTokens([]);
      }
    } else {
      setEditingField(null);
      setFieldLabel('');
      setFieldCode('');
      setFieldName('');
      setFieldSectionId(defaultSecId || firstSecId);
      setFieldGroupId(defaultGroupId || '');
      setFieldType('TEXT');
      setFieldCalendar('JALALI');
      setFieldChoiceSource('NONE');
      setFieldStaticSetId('');
      setFieldLookupListId('');
      setFieldParentFieldId('');
      setFieldSystemKey('NONE');
      setFieldDefaultValue('');
      setFieldHelpText('');
      setFieldDecimalPlaces(2);
      setFieldIsRequired(false);
      setFieldShowInSummary(false);
      setFieldIsActive(true);
      setFormulaTokens([]);
    }
    setFormulaConstNum('');
    setFormulaSelectedFieldId('');
    setActionError(null);
    setIsFieldModalOpen(true);
  };

  const handleSaveField = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWfId || !fieldLabel.trim()) {
      showNotification('لطفاً عنوان فیلد را وارد کنید', true);
      return;
    }
    const cleanName = fieldName.trim() || fieldCode.trim() || `field_${Date.now()}`;
    const cleanCode = fieldCode.trim() || cleanName;

    const payload: any = {
      section: fieldSectionId ? Number(fieldSectionId) : undefined,
      repeatable_group: fieldGroupId ? Number(fieldGroupId) : null,
      label: fieldLabel.trim(),
      name: cleanName,
      code: cleanCode,
      field_type: fieldType,
      calendar: fieldCalendar,
      choice_source: fieldChoiceSource,
      choice_static_set: fieldChoiceSource === 'STATIC' && fieldStaticSetId ? Number(fieldStaticSetId) : null,
      choice_lookup_list: fieldChoiceSource === 'LOOKUP' && fieldLookupListId ? Number(fieldLookupListId) : null,
      choice_parent_field: fieldParentFieldId ? Number(fieldParentFieldId) : null,
      system_key: fieldSystemKey,
      default_value: fieldDefaultValue.trim(),
      help_text: fieldHelpText.trim(),
      decimal_places: Number(fieldDecimalPlaces),
      is_required: fieldIsRequired,
      show_in_process_summary: fieldShowInSummary,
      is_active: fieldIsActive,
    };

    if (fieldType === 'FORMULA') {
      if (formulaTokens.length === 0) {
        showNotification('لطفاً فرمول محاسباتی را با استفاده از دکمه‌های فرمول‌ساز ایجاد نمایید', true);
        return;
      }
      payload.choices = {
        version: 2,
        tokens: formulaTokens,
        formula_text: formulaTokens.map((t: any) => t.label || t.value).join(' '),
        decimal_places: Number(fieldDecimalPlaces || 2),
      };
    }

    try {
      if (editingField) {
        await api.updateFormField(editingField.id, payload);
        showNotification('فیلد با موفقیت ویرایش شد');
      } else {
        await api.createFormField(selectedWfId, payload);
        showNotification('فیلد جدید با موفقیت به فرم افزوده شد');
      }
      setIsFieldModalOpen(false);
      const fd = await api.getFormDefinition(selectedWfId);
      setFormDef(fd);
      syncPrintSettings(fd);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره فیلد فرم'), true);
    }
  };

  const promptDeleteField = (fieldId: number, fieldLabel?: string) => {
    if (!selectedWfId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف فیلد از فرم',
      message: `آیا از حذف فیلد ${fieldLabel ? `«${fieldLabel}»` : ''} اطمینان دارید؟`,
      confirmLabel: 'حذف فیلد',
      onConfirm: async () => {
        try {
          await api.deleteFormField(fieldId);
          showNotification('فیلد فرم با موفقیت حذف گردید');
          const fd = await api.getFormDefinition(selectedWfId);
          setFormDef(fd);
          syncPrintSettings(fd);
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف فیلد'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // -----------------------------------------------------------------
  // Formula Builder Actions
  // -----------------------------------------------------------------
  const handleAddFormulaToken = (token: any) => {
    setFormulaTokens((prev) => [...prev, token]);
  };

  const handleRemoveFormulaToken = (index: number) => {
    setFormulaTokens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearFormulaTokens = () => {
    setFormulaTokens([]);
  };

  const handleBackspaceFormulaToken = () => {
    setFormulaTokens((prev) => prev.slice(0, -1));
  };

  const handleAddFormulaField = (fId: number) => {
    const f = allFields.find((item: any) => item.id === fId);
    if (!f) return;
    handleAddFormulaToken({
      type: 'field',
      field_id: f.id,
      label: f.label,
      code: f.code,
    });
    setFormulaSelectedFieldId('');
  };

  const handleAddFormulaNumber = () => {
    const val = parseFloat(formulaConstNum.trim());
    if (isNaN(val)) return;
    handleAddFormulaToken({
      type: 'number',
      value: val,
    });
    setFormulaConstNum('');
  };

  const handleAddFormulaFunction = (fnName: string) => {
    handleAddFormulaToken({ type: 'function', value: fnName });
    handleAddFormulaToken({ type: 'paren', value: '(' });
  };

  // -----------------------------------------------------------------
  // Repeatable Group CRUD
  // -----------------------------------------------------------------
  const handleOpenGroupModal = (group?: any, defaultSecId?: number) => {
    const firstSecId = formDef?.sections?.[0]?.id || '';
    if (group) {
      setEditingGroup(group);
      setGroupLabel(group.label);
      setGroupCode(group.code);
      setGroupName(group.name);
      setGroupSectionId(group.section || firstSecId);
      setGroupType(group.group_type || 'NORMAL');
      setGroupDisplayType(group.display_type || 'TABLE');
      setGroupDesc(group.description || '');
      setGroupIsRequired(group.is_required ?? false);
    } else {
      setEditingGroup(null);
      setGroupLabel('');
      setGroupCode('');
      setGroupName('');
      setGroupSectionId(defaultSecId || firstSecId);
      setGroupType('NORMAL');
      setGroupDisplayType('TABLE');
      setGroupDesc('');
      setGroupIsRequired(false);
    }
    setActionError(null);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWfId || !groupLabel.trim()) {
      showNotification('لطفاً عنوان جدول تکرارپذیر را وارد کنید', true);
      return;
    }
    const cleanName = groupName.trim() || groupCode.trim() || `group_${Date.now()}`;
    const cleanCode = groupCode.trim() || cleanName;

    const payload: any = {
      section: groupSectionId ? Number(groupSectionId) : undefined,
      label: groupLabel.trim(),
      name: cleanName,
      code: cleanCode,
      group_type: groupType,
      display_type: groupDisplayType,
      description: groupDesc.trim(),
      is_required: groupIsRequired,
    };

    try {
      if (editingGroup) {
        await api.updateFormGroup(editingGroup.id, payload);
        showNotification('جدول تکرارپذیر با موفقیت ویرایش شد');
      } else {
        await api.createFormGroup(selectedWfId, payload);
        showNotification('جدول تکرارپذیر جدید با موفقیت ایجاد شد');
      }
      setIsGroupModalOpen(false);
      const fd = await api.getFormDefinition(selectedWfId);
      setFormDef(fd);
      syncPrintSettings(fd);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره جدول تکرارپذیر'), true);
    }
  };

  const promptDeleteGroup = (groupId: number, groupName?: string) => {
    if (!selectedWfId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف جدول تکرارشونده',
      message: `آیا از حذف جدول ${groupName ? `«${groupName}»` : ''} و ستون‌های داخل آن اطمینان دارید؟`,
      confirmLabel: 'حذف جدول',
      onConfirm: async () => {
        try {
          await api.deleteFormGroup(groupId);
          showNotification('جدول تکرارپذیر و ستون‌های آن حذف شد');
          const fd = await api.getFormDefinition(selectedWfId);
          setFormDef(fd);
          syncPrintSettings(fd);
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'خطا در حذف جدول تکرارپذیر'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // -----------------------------------------------------------------
  // Form Section CRUD
  // -----------------------------------------------------------------
  const handleOpenSectionModal = (sec?: any) => {
    if (sec) {
      setEditingSection(sec);
      setSecName(sec.name);
      setSecCode(sec.code);
      setSecDesc(sec.description || '');
    } else {
      setEditingSection(null);
      setSecName('');
      setSecCode('');
      setSecDesc('');
    }
    setActionError(null);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWfId || !secName.trim()) {
      showNotification('لطفاً عنوان بخش را وارد کنید', true);
      return;
    }
    const cleanCode = secCode.trim() || `sec_${Date.now()}`;
    try {
      if (editingSection) {
        await api.updateFormSection(editingSection.id, {
          name: secName.trim(),
          code: cleanCode,
          description: secDesc.trim(),
        });
        showNotification('بخش با موفقیت ویرایش شد');
      } else {
        await api.createFormSection(selectedWfId, {
          name: secName.trim(),
          code: cleanCode,
          description: secDesc.trim(),
        });
        showNotification('بخش جدید به فرم افزوده شد');
      }
      setIsSectionModalOpen(false);
      const fd = await api.getFormDefinition(selectedWfId);
      setFormDef(fd);
      syncPrintSettings(fd);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره بخش فرم'), true);
    }
  };

  const promptDeleteSection = (secId: number, secName?: string) => {
    if (!selectedWfId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'حذف بخش فرم',
      message: `آیا از حذف بخش ${secName ? `«${secName}»` : ''} و تمامی فیلدها و جدول‌های داخل آن اطمینان دارید؟`,
      confirmLabel: 'حذف بخش',
      onConfirm: async () => {
        try {
          await api.deleteFormSection(secId);
          showNotification('بخش فرم با موفقیت حذف شد');
          const fd = await api.getFormDefinition(selectedWfId);
          setFormDef(fd);
          syncPrintSettings(fd);
        } catch (err: any) {
          showNotification(extractErrorMessage(err, 'امکان حذف این بخش وجود ندارد'), true);
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // -----------------------------------------------------------------
  // Print Settings & Layout Precision Handlers
  // -----------------------------------------------------------------
  const handleMoveFieldOrder = (secId: number, fieldId: number, direction: 'UP' | 'DOWN') => {
    const sec = formDef?.sections?.find((s: any) => s.id === secId);
    if (!sec || !sec.fields) return;
    const regularFields = [...(sec.fields || [])].filter((f: any) => !f.repeatable_group);
    regularFields.sort((a: any, b: any) => {
      const ordA = fieldPrintLayouts[a.id]?.print_order ?? a.order ?? 0;
      const ordB = fieldPrintLayouts[b.id]?.print_order ?? b.order ?? 0;
      return ordA - ordB;
    });

    const idx = regularFields.findIndex((f: any) => f.id === fieldId);
    if (idx < 0) return;
    if (direction === 'UP' && idx > 0) {
      const prevField = regularFields[idx - 1];
      const currOrder = fieldPrintLayouts[fieldId]?.print_order ?? idx + 1;
      const prevOrder = fieldPrintLayouts[prevField.id]?.print_order ?? idx;
      setFieldPrintLayouts((prev) => ({
        ...prev,
        [fieldId]: { ...prev[fieldId], print_order: prevOrder },
        [prevField.id]: { ...prev[prevField.id], print_order: currOrder },
      }));
    } else if (direction === 'DOWN' && idx < regularFields.length - 1) {
      const nextField = regularFields[idx + 1];
      const currOrder = fieldPrintLayouts[fieldId]?.print_order ?? idx + 1;
      const nextOrder = fieldPrintLayouts[nextField.id]?.print_order ?? idx + 2;
      setFieldPrintLayouts((prev) => ({
        ...prev,
        [fieldId]: { ...prev[fieldId], print_order: nextOrder },
        [nextField.id]: { ...prev[nextField.id], print_order: currOrder },
      }));
    }
  };

  const handleChangeFieldWidth = (fieldId: number, width: string) => {
    setFieldPrintLayouts((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || { is_enabled: true, title_override: '', print_order: 0 }),
        print_width: width,
      },
    }));
  };

  const handleChangeFieldTitleOverride = (fieldId: number, title: string) => {
    setFieldPrintLayouts((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || { is_enabled: true, print_width: '100%', print_order: 0 }),
        title_override: title,
      },
    }));
  };

  const handleToggleFieldVisibility = (fieldId: number) => {
    setFieldPrintLayouts((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || { title_override: '', print_width: '100%', print_order: 0 }),
        is_enabled: !prev[fieldId]?.is_enabled,
      },
    }));
  };

  const handleSavePrintSettings = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedWfId) return;
    try {
      const fieldSettingsPayload = Object.entries(fieldPrintLayouts).map(([fId, cfg]) => ({
        field_id: Number(fId),
        is_enabled: cfg.is_enabled,
        title_override: cfg.title_override,
        print_order: cfg.print_order,
        print_width: cfg.print_width,
      }));
      await api.updateFormPrintSettings(selectedWfId, {
        document_title: printDocTitle.trim(),
        subtitle: printSubtitle.trim(),
        header_text: printHeader.trim(),
        footer_text: printFooter.trim(),
        page_size: printPageSize,
        orientation: printOrientation,
        show_workflow_name: printShowWfName,
        show_instance_number: printShowInstanceNumber,
        show_created_at: printShowCreatedAt,
        show_signatures: printShowSignatures,
        signature_count: printSignatureCount,
        field_settings: fieldSettingsPayload,
      });
      showNotification('تنظیمات چاپ و چیدمان فیلدها با موفقیت در سیستم ثبت گردید');
      const fd = await api.getFormDefinition(selectedWfId);
      setFormDef(fd);
      syncPrintSettings(fd);
    } catch (err: any) {
      showNotification(extractErrorMessage(err, 'خطا در ذخیره تنظیمات سند چاپی'), true);
    }
  };

  // -----------------------------------------------------------------
  // Preview Simulator Handlers
  // -----------------------------------------------------------------
  const handlePreviewInputChange = (fieldCode: string, val: any) => {
    setPreviewValues((prev) => ({ ...prev, [fieldCode]: val }));
  };

  const handleUpdatePreviewCell = (groupId: number, rowId: number, colCode: string, val: any) => {
    setPreviewRows((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map((r: any) =>
        r._id === rowId ? { ...r, [colCode]: val } : r
      ),
    }));
  };

  const handleAddPreviewRow = (groupId: number, groupFields: any[]) => {
    const emptyRow: any = { _id: Date.now() };
    groupFields.forEach((f) => {
      emptyRow[f.code] = '';
    });
    setPreviewRows((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), emptyRow],
    }));
  };

  const handleDeletePreviewRow = (groupId: number, rowId: number) => {
    setPreviewRows((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((r) => r._id !== rowId),
    }));
  };

  const handleValidatePreview = () => {
    const missing: string[] = [];
    allFields.forEach((f) => {
      if (f.is_required && !f.repeatable_group) {
        const val = previewValues[f.code];
        if (val === undefined || val === null || val === '') {
          missing.push(f.label);
        }
      }
    });

    if (missing.length > 0) {
      setPreviewValidationResult(`خطای اعتبارسنجی: فیلدهای الزامی زیر تکمیل نشده‌اند: ${missing.join('، ')}`);
    } else {
      setPreviewValidationResult('اعتبارسنجی ۱۰۰٪ موفق! تمام فیلدهای الزامی و مقادیر به درستی تکمیل شده‌اند.');
    }
  };

  return (
    <div className="space-y-5 min-w-0 @container">
      {/* Top Banner */}
      <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">فرم‌ساز پویا و موتور اسناد (Dynamic Form Builder)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              طراحی فیلدهای داده‌ای، فرمول‌های محاسباتی، جداول اقلام و چیدمان دقیق سند چاپی
            </p>
          </div>
        </div>

        {/* Workflow Switcher & Quick Create */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 max-w-full">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl min-w-0 max-w-full">
            <span className="text-xs font-semibold text-slate-500 shrink-0">انتخاب فرآیند:</span>
            <select
              value={selectedWfId || ''}
              onChange={(e) => handleSelectWorkflow(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer min-w-0 truncate"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.code})
                </option>
              ))}
            </select>
          </div>

          {selectedWfId && (
            <button
              onClick={() => handleOpenFieldModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فیلد جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workflow Check */}
      {workflows.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-slate-200/80 shadow-sm flex flex-col items-center justify-center no-print">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">هیچ فرآیندی در دیتابیس ثبت نشده است</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            فرم‌های اطلاعاتی بر روی فرآیندها سوار می‌شوند. لطفاً ابتدا از منوی «فرآیندها و گراف ماشین وضعیت» یک فرآیند ایجاد نمایید.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 no-print">
            {/* Segmented Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('designer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'designer'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>طراح فرم</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0 ${
                  activeTab === 'designer'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                    : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {allFields.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>پیش‌نمایش زنده</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 font-normal hover:bg-white/60'
                }`}
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>قالب چاپی</span>
              </button>
            </div>

            {/* Actions for Designer */}
            {activeTab === 'designer' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenSectionModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>بخش جدید</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenGroupModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                >
                  <TableIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>جدول تکرارپذیر</span>
                </button>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* TAB 1: Form Designer & Structure */}
          {/* ----------------------------------------------------------- */}
          {activeTab === 'designer' && (
            <div className="space-y-6">
              {allSections.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center text-xs text-slate-400 border border-slate-200">
                  {loading ? 'در حال بارگذاری فرم...' : 'هیچ بخشی برای این فرم تعریف نشده است.'}
                </div>
              ) : (
                allSections.map((sec: any) => {
                  const regularFields = (sec.fields || []).filter((f: any) => !f.repeatable_group);
                  const groups = sec.repeatable_groups || [];

                  return (
                    <div
                      key={sec.id}
                      className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden"
                    >
                      {/* Section Header */}
                      <div className="p-3.5 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">
                            #{sec.id}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{sec.name}</h3>
                              <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sec.code}
                              </span>
                            </div>
                            {sec.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{sec.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenFieldModal(undefined, sec.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                            <span>فیلد در این بخش</span>
                          </button>
                          <button
                            onClick={() => handleOpenGroupModal(undefined, sec.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                          >
                            <TableIcon className="w-3 h-3" />
                            <span>جدول در این بخش</span>
                          </button>
                          <button
                            onClick={() => handleOpenSectionModal(sec)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                            title="ویرایش بخش"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => promptDeleteSection(sec.id, sec.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="حذف بخش"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-5">
                        {/* Regular Fields List */}
                        <div>
                          <div className="text-xs font-bold text-slate-500 mb-3 flex items-center justify-between">
                            <span>فیلدهای ورودی این بخش ({regularFields.length})</span>
                          </div>

                          {regularFields.length === 0 ? (
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                              هنوز فیلد معمولی در این بخش ثبت نشده است.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
                              {regularFields.map((f: any) => (
                                <div
                                  key={f.id}
                                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-100/60 transition-all flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                                          f.field_type === 'FORMULA'
                                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                                            : 'bg-white text-blue-700 border-slate-200'
                                        }`}>
                                          {f.field_type}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">{f.label}</span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleOpenFieldModal(f)}
                                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                          title="ویرایش فیلد"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => promptDeleteField(f.id, f.label || f.name)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                          title="حذف فیلد"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="text-xs font-mono text-slate-400 mb-2">
                                      شناسه متغیر: {f.name} ({f.code})
                                    </div>

                                    {/* Formula Info preview */}
                                    {f.field_type === 'FORMULA' && (
                                      <div className="mt-2 mb-2 p-2 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs font-mono flex items-center gap-1.5">
                                        <Calculator className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                        <span className="font-bold">فرمول:</span>
                                        <span dir="ltr" className="truncate font-semibold text-purple-800">
                                          {f.choices?.formula_text || (Array.isArray(f.choices?.tokens) ? f.choices.tokens.map((t: any) => t.label || t.value).join(' ') : '—')}
                                        </span>
                                      </div>
                                    )}

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                      {f.is_required && (
                                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                          الزامی
                                        </span>
                                      )}
                                      {f.choice_source === 'LOOKUP' && (
                                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                          منبع پویا: {f.choice_lookup_list_name || 'انتخاب شده'}
                                        </span>
                                      )}
                                      {f.choice_source === 'STATIC' && (
                                        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                          مجموعه ثابت: {f.choice_static_set_name || 'انتخاب شده'}
                                        </span>
                                      )}
                                      {f.choice_parent_field_label && (
                                        <span className="text-xs font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                          آبشاری از: {f.choice_parent_field_label}
                                        </span>
                                      )}
                                      {f.system_key !== 'NONE' && (
                                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                          سیستمی: {f.system_key}
                                        </span>
                                      )}
                                      {f.show_in_process_summary && (
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          خلاصه پرونده
                                        </span>
                                      )}
                                      {f.field_type === 'DATE' && (
                                        <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                          تقویم: {f.calendar === 'JALALI' ? 'شمسی' : 'میلادی'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {f.help_text && (
                                    <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-slate-200/50">
                                      {f.help_text}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Repeatable Groups List */}
                        {groups.length > 0 && (
                          <div className="pt-4 border-t border-slate-200/70 space-y-4">
                            <div className="text-xs font-bold text-slate-500">
                              جداول تکرارپذیر اقلام این بخش ({groups.length})
                            </div>

                            {groups.map((grp: any) => {
                              const groupCols = (sec.fields || []).filter((f: any) => f.repeatable_group === grp.id);

                              return (
                                <div
                                  key={grp.id}
                                  className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                        <TableIcon className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-semibold text-slate-900">{grp.label}</h4>
                                        <span className="text-xs font-mono text-slate-400">
                                          جدول شناسه: {grp.code}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenFieldModal(undefined, sec.id, grp.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>ستون جدید</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenGroupModal(grp, sec.id)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                                        title="ویرایش مشخصات جدول"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => promptDeleteGroup(grp.id, grp.label || grp.name)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                        title="حذف جدول"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Columns inside group */}
                                  <div>
                                    <span className="text-xs font-bold text-slate-500 mb-2 block">
                                      ستون‌های داده‌ای جدول ({groupCols.length}):
                                    </span>

                                    {groupCols.length === 0 ? (
                                      <div className="p-4 bg-white rounded-xl border border-dashed border-indigo-200 text-center text-xs text-slate-400">
                                        هنوز ستونی برای این جدول ایجاد نشده است. روی «ستون جدید» کلیک کنید.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 gap-2.5">
                                        {groupCols.map((c: any) => (
                                          <div
                                            key={c.id}
                                            className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-xs"
                                          >
                                            <div className="truncate">
                                              <span className="font-bold text-slate-800 block truncate">
                                                {c.label}
                                              </span>
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1 rounded">
                                                  {c.field_type}
                                                </span>
                                                {c.field_type === 'FORMULA' && (
                                                  <Calculator className="w-2.5 h-2.5 text-purple-600" />
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                onClick={() => handleOpenFieldModal(c, sec.id, grp.id)}
                                                className="text-slate-400 hover:text-blue-600 p-0.5"
                                                title="ویرایش ستون"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => promptDeleteField(c.id, c.label || c.name)}
                                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                                title="حذف ستون"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* TAB 2: Interactive Live Preview & Formula Evaluator */}
          {/* ----------------------------------------------------------- */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-xl p-4 @3xl:p-5 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex flex-col @3xl:flex-row @3xl:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-purple-600" />
                    <span>شبیه‌ساز و پیش‌نمایش زنده فرم با ارزیابی فرمول‌های ریاضی</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    فرم نهایی را با ورود داده تست کنید؛ فیلدهای فرمول، محاسبات سطری و توابع تجمیعی به صورت بلادرنگ ارزیابی می‌شوند.
                  </p>
                </div>

                <button
                  onClick={handleValidatePreview}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تست اعتبارسنجی مقادیر فرم</span>
                </button>
              </div>

              {previewValidationResult && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    previewValidationResult.includes('موفق')
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{previewValidationResult}</span>
                </div>
              )}

              {/* Form Render Simulator */}
              <div className="space-y-8 max-w-4xl mx-auto">
                {allSections.map((sec: any) => {
                  const regularFields = (sec.fields || []).filter((f: any) => !f.repeatable_group);
                  const groups = sec.repeatable_groups || [];

                  return (
                    <div key={sec.id} className="space-y-4">
                      <div className="pb-2 border-b-2 border-blue-500/80 flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-900">{sec.name}</h4>
                        {sec.description && (
                          <span className="text-xs text-slate-400">{sec.description}</span>
                        )}
                      </div>

                      {/* Regular Fields Grid */}
                      <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
                        {regularFields.map((f: any) => (
                          <div key={f.id} className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">
                              {f.label} {f.is_required && <span className="text-rose-500">*</span>}
                            </label>

                            {f.field_type === 'TEXT' && (
                              <input
                                type="text"
                                placeholder={f.default_value || 'متن را وارد کنید...'}
                                value={previewValues[f.code] ?? ''}
                                onChange={(e) => handlePreviewInputChange(f.code, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-blue-500 font-medium"
                              />
                            )}

                            {f.field_type === 'TEXTAREA' && (
                              <textarea
                                rows={3}
                                placeholder={f.default_value || 'توضیحات تکمیلی...'}
                                value={previewValues[f.code] ?? ''}
                                onChange={(e) => handlePreviewInputChange(f.code, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-blue-500 font-medium resize-none"
                              />
                            )}

                            {f.field_type === 'NUMBER' && (
                              <input
                                type="number"
                                step={1 / Math.pow(10, f.decimal_places ?? 0)}
                                placeholder={f.default_value || '0'}
                                value={previewValues[f.code] ?? ''}
                                onChange={(e) => handlePreviewInputChange(f.code, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:border-blue-500"
                              />
                            )}

                            {/* Live Formula Calculated Card */}
                            {f.field_type === 'FORMULA' && (
                              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 border border-purple-200/90 space-y-1.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                                    <Calculator className="w-3.5 h-3.5 text-purple-600" />
                                    <span>محاسبه خودکار زنده</span>
                                  </span>
                                  <span className="text-xs font-mono font-bold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md">
                                    {f.decimal_places ?? 2} رقم اعشار
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between pt-1">
                                  <span className="text-xs font-mono text-slate-500 dir-ltr truncate max-w-[200px]" title={f.choices?.formula_text}>
                                    {f.choices?.formula_text || '—'}
                                  </span>
                                  <span className="text-base font-semibold text-purple-950 font-mono tracking-wide">
                                    {Number(evaluateFormula(f, previewValues, undefined, previewRows, allFields)).toLocaleString('fa-IR', {
                                      minimumFractionDigits: f.decimal_places ?? 0,
                                      maximumFractionDigits: f.decimal_places ?? 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}

                            {f.field_type === 'DATE' && (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder={f.calendar === 'JALALI' ? '1405/08/10' : '2026-10-31'}
                                  value={previewValues[f.code] ?? ''}
                                  onChange={(e) => handlePreviewInputChange(f.code, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                                />
                                <CalendarIcon className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                              </div>
                            )}

                            {f.field_type === 'SELECT' && (
                              <select
                                value={previewValues[f.code] ?? ''}
                                onChange={(e) => handlePreviewInputChange(f.code, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
                              >
                                <option value="">انتخاب گزینه...</option>
                                {f.choice_source === 'LOOKUP' &&
                                  lookups
                                    .find((l) => l.id === f.choice_lookup_list)
                                    ?.items?.map((it: any) => (
                                      <option key={it.id} value={it.code || it.value}>
                                        {it.label}
                                      </option>
                                    ))}
                                {f.choice_source === 'STATIC' &&
                                  staticSets
                                    .find((s) => s.id === f.choice_static_set)
                                    ?.items?.map((it: any) => (
                                      <option key={it.id} value={it.code || it.value}>
                                        {it.label}
                                      </option>
                                    ))}
                                {f.choice_source === 'NONE' && (
                                  <>
                                    <option value="OPT1">گزینه نمونه ۱</option>
                                    <option value="OPT2">گزینه نمونه ۲</option>
                                  </>
                                )}
                              </select>
                            )}

                            {f.field_type === 'BOOLEAN' && (
                              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!previewValues[f.code]}
                                  onChange={(e) => handlePreviewInputChange(f.code, e.target.checked)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                                />
                                <span className="text-xs font-semibold text-slate-700">تأیید / فعال</span>
                              </label>
                            )}

                            {f.field_type === 'FILE' && (
                              <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 text-center">
                                <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                                <span className="text-xs text-slate-500">بارگذاری فایل / ضمیمه</span>
                              </div>
                            )}

                            {f.help_text && (
                              <p className="text-xs text-slate-400 mt-0.5">{f.help_text}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Repeatable Groups Table Simulator */}
                      {groups.map((grp: any) => {
                        const groupCols = (sec.fields || []).filter((f: any) => f.repeatable_group === grp.id);
                        const rows = previewRows[grp.id] || [];

                        return (
                          <div key={grp.id} className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-900">{grp.label}</span>
                              <button
                                onClick={() => handleAddPreviewRow(grp.id, groupCols)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>افزودن ردیف</span>
                              </button>
                            </div>

                            {rows.length === 0 ? (
                              <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                                ردیفی اضافه نشده است. روی «افزودن ردیف» کلیک کنید.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-right bg-white rounded-xl border border-slate-200">
                                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                                    <tr>
                                      <th className="p-2.5 w-10 text-center">#</th>
                                      {groupCols.map((c: any) => (
                                        <th key={c.id} className="p-2.5">
                                          {c.label} {c.field_type === 'FORMULA' && '(محاسباتی)'}
                                        </th>
                                      ))}
                                      <th className="p-2.5 w-12 text-center">حذف</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {rows.map((row: any, idx: number) => (
                                      <tr key={row._id} className="hover:bg-slate-50">
                                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                                        {groupCols.map((c: any) => (
                                          <td key={c.id} className="p-2">
                                            {c.field_type === 'FORMULA' ? (
                                              <div className="bg-purple-50 border border-purple-200 text-purple-950 font-bold font-mono rounded-lg px-2.5 py-1 text-xs text-center">
                                                {Number(evaluateFormula(c, previewValues, row, previewRows, allFields)).toLocaleString('fa-IR', {
                                                  minimumFractionDigits: c.decimal_places ?? 0,
                                                  maximumFractionDigits: c.decimal_places ?? 2,
                                                })}
                                              </div>
                                            ) : (
                                              <input
                                                type={c.field_type === 'NUMBER' ? 'number' : 'text'}
                                                value={row[c.code] ?? ''}
                                                placeholder={c.label}
                                                onChange={(e) => handleUpdatePreviewCell(grp.id, row._id, c.code, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 font-medium"
                                              />
                                            )}
                                          </td>
                                        ))}
                                        <td className="p-2 text-center">
                                          <button
                                            onClick={() => handleDeletePreviewRow(grp.id, row._id)}
                                            className="text-slate-400 hover:text-rose-600 p-1"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* TAB 3: Print & Document Layout Settings & Precision Positioning */}
          {/* ----------------------------------------------------------- */}
          {activeTab === 'print' && (
            <div className="space-y-6">
              {/* Header Action Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-4 no-print">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>موتور خروجی چاپی و چیدمان دقیق فیلدها در برگه رسمی</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تعیین دقیق موقعیت، عرض، ترتیب و عناوین فیلدها در سند چاپی رسمی با پشتیبانی از پرینت مستقیم مرورگر (Ctrl+P / خروجی PDF)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSavePrintSettings()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ذخیره چیدمان و تنظیمات چاپ</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>پرینت سند / خروجی PDF</span>
                  </button>
                </div>
              </div>

              {/* Grid 2 Columns: Right = Layout Settings, Left = Live Printable Sheet */}
              <div className="grid grid-cols-1 @5xl:grid-cols-12 gap-5 items-start">
                {/* Right Column: Settings & Precision Field Customizer */}
                <div className="@5xl:col-span-5 space-y-4 min-w-0 no-print">
                  {/* General Print Settings Box */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">۱. تنظیمات مشخصات برگه و سربرگ</span>
                      <span className="text-xs text-slate-400 font-mono">Page Configuration</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block mb-1 font-semibold text-slate-700">عنوان سند چاپی *</label>
                        <input
                          type="text"
                          required
                          value={printDocTitle}
                          onChange={(e) => setPrintDocTitle(e.target.value)}
                          placeholder="مثال: برگ رسمی پذیرش و ارزیابی فنی تجهیز"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-slate-700">زیرعنوان سند</label>
                        <input
                          type="text"
                          value={printSubtitle}
                          onChange={(e) => setPrintSubtitle(e.target.value)}
                          placeholder="مثال: سیستم جامع مدیریت فرآیندهای فنی و تعمیراتی"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-1 font-semibold text-slate-700">اندازه کاغذ</label>
                          <select
                            value={printPageSize}
                            onChange={(e) => setPrintPageSize(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-bold"
                          >
                            <option value="A4">A4 (استاندارد)</option>
                            <option value="A5">A5 (کوچک)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block mb-1 font-semibold text-slate-700">جهت صفحه</label>
                          <select
                            value={printOrientation}
                            onChange={(e) => setPrintOrientation(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-bold"
                          >
                            <option value="PORTRAIT">عمودی (Portrait)</option>
                            <option value="LANDSCAPE">افقی (Landscape)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-slate-700">متن سربرگ رسمی (Header)</label>
                        <textarea
                          rows={2}
                          value={printHeader}
                          onChange={(e) => setPrintHeader(e.target.value)}
                          placeholder="نام سازمان، واحد پذیرش، نشانی..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-slate-700">متن پابرگ رسمی (Footer)</label>
                        <textarea
                          rows={2}
                          value={printFooter}
                          onChange={(e) => setPrintFooter(e.target.value)}
                          placeholder="قوانین گارانتی، اخطار پیگیری، نشانی وبسایت..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500 resize-none"
                        />
                      </div>

                      {/* Options checkboxes */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printShowWfName}
                            onChange={(e) => setPrintShowWfName(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300"
                          />
                          <span className="font-semibold text-slate-700">نمایش نام فرآیند در بالای سند</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printShowInstanceNumber}
                            onChange={(e) => setPrintShowInstanceNumber(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300"
                          />
                          <span className="font-semibold text-slate-700">نمایش کادر شماره پرونده و رهگیری</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printShowCreatedAt}
                            onChange={(e) => setPrintShowCreatedAt(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300"
                          />
                          <span className="font-semibold text-slate-700">نمایش تاریخ صدور سند</span>
                        </label>

                        <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={printShowSignatures}
                              onChange={(e) => setPrintShowSignatures(e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600 border-slate-300"
                            />
                            <span className="font-semibold text-slate-700">نمایش کادر امضاها و تأییدیه‌ها</span>
                          </label>

                          {printShowSignatures && (
                            <select
                              value={printSignatureCount}
                              onChange={(e) => setPrintSignatureCount(Number(e.target.value))}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            >
                              <option value={2}>۲ امضا</option>
                              <option value={3}>۳ امضا</option>
                              <option value={4}>۴ امضا</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section-by-Section Precision Field Positioning Box */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">۲. جایگاه و عرض دقیق فیلدها در سند</span>
                      <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        چیدمان شبکه‌ای
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                      {allSections.map((sec: any) => {
                        const secFields = (sec.fields || [])
                          .filter((f: any) => !f.repeatable_group)
                          .sort((a: any, b: any) => {
                            const ordA = fieldPrintLayouts[a.id]?.print_order ?? a.order ?? 0;
                            const ordB = fieldPrintLayouts[b.id]?.print_order ?? b.order ?? 0;
                            return ordA - ordB;
                          });

                        return (
                          <div key={sec.id} className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800">بخش: {sec.name}</span>
                              <span className="text-xs font-mono text-slate-400">{secFields.length} فیلد</span>
                            </div>

                            <div className="space-y-2">
                              {secFields.map((f: any) => {
                                const cfg = fieldPrintLayouts[f.id] || {
                                  is_enabled: true,
                                  title_override: '',
                                  print_order: 0,
                                  print_width: '100%',
                                };

                                return (
                                  <div
                                    key={f.id}
                                    className={`p-3 bg-white rounded-xl border transition-all text-xs space-y-2.5 ${
                                      cfg.is_enabled ? 'border-slate-200 shadow-xs' : 'border-slate-200/60 opacity-60 bg-slate-100/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 truncate">
                                        <input
                                          type="checkbox"
                                          checked={cfg.is_enabled}
                                          onChange={() => handleToggleFieldVisibility(f.id)}
                                          className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                                        />
                                        <span className="font-bold text-slate-900 truncate">{f.label}</span>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1 rounded">
                                          {f.field_type}
                                        </span>
                                      </div>

                                      {/* Order Up / Down buttons */}
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveFieldOrder(sec.id, f.id, 'UP')}
                                          className="p-1 text-slate-400 hover:text-blue-600 bg-slate-100 rounded"
                                          title="حرکت به سمت بالا"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveFieldOrder(sec.id, f.id, 'DOWN')}
                                          className="p-1 text-slate-400 hover:text-blue-600 bg-slate-100 rounded"
                                          title="حرکت به سمت پایین"
                                        >
                                          <ArrowDown className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Width Selector Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                      <span className="text-xs text-slate-500 font-semibold shrink-0">عرض فیلد:</span>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {[
                                          { label: '۱۰۰٪ (کامل)', val: '100%' },
                                          { label: '۵۰٪ (نصف)', val: '50%' },
                                          { label: '۳۳٪ (یک‌سوم)', val: '33%' },
                                          { label: '۲۵٪ (یک‌چهارم)', val: '25%' },
                                        ].map((w) => (
                                          <button
                                            key={w.val}
                                            type="button"
                                            onClick={() => handleChangeFieldWidth(f.id, w.val)}
                                            className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                                              cfg.print_width === w.val
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                          >
                                            {w.val}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Title Override */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 shrink-0">عنوان در چاپ:</span>
                                      <input
                                        type="text"
                                        placeholder={f.label}
                                        value={cfg.title_override}
                                        onChange={(e) => handleChangeFieldTitleOverride(f.id, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Left Column: Live High-Fidelity Printable Sheet (Window Print Canvas) */}
                <div className="@5xl:col-span-7 min-w-0 overflow-x-auto bg-slate-200/70 p-4 rounded-xl border border-slate-300/80 flex flex-col items-center justify-center print-page-wrapper">
                  <span className="text-xs font-bold text-slate-600 mb-3 no-print">
                    پیش‌نمایش خروجی چاپ سند ({printPageSize} - {printOrientation === 'PORTRAIT' ? 'عمودی' : 'افقی'})
                  </span>

                  {/* The Document Sheet */}
                  <div
                    className={`bg-white shadow-2xl border border-slate-400/90 rounded-2xl p-8 flex flex-col justify-between transition-all w-full print-page-sheet ${
                      printOrientation === 'LANDSCAPE' ? 'max-w-4xl' : 'max-w-2xl'
                    }`}
                    style={{ minHeight: '750px' }}
                  >
                    <div>
                      {/* Sheet Header */}
                      <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                            {printDocTitle || 'برگ رسمی اطلاعات و ارزیابی فرآیند'}
                          </h2>
                          {printSubtitle && (
                            <p className="text-xs text-slate-600 font-medium">{printSubtitle}</p>
                          )}
                          {printShowWfName && formDef?.workflow && (
                            <span className="inline-block text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              فرآیند مربوطه: {workflows.find((w) => w.id === formDef.workflow)?.name || 'پیش‌فرض'}
                            </span>
                          )}
                        </div>

                        {/* Top Left Meta Box */}
                        <div className="border border-slate-300 rounded-xl p-2 text-left text-xs font-mono space-y-0.5 bg-slate-50 shrink-0">
                          {printShowInstanceNumber && (
                            <div>
                              <span className="text-slate-500">شماره سند: </span>
                              <span className="font-bold text-slate-800">DOC-{selectedWfId || 101}-8942</span>
                            </div>
                          )}
                          {printShowCreatedAt && (
                            <div>
                              <span className="text-slate-500">تاریخ چاپ: </span>
                              <span className="font-bold text-slate-800">1405/08/10</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">قطع کاغذ: </span>
                            <span className="font-bold text-blue-600">{printPageSize}</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Text Notice if configured */}
                      {printHeader && (
                        <div className="mt-2.5 p-2 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200 text-center">
                          {printHeader}
                        </div>
                      )}

                      {/* Sheet Body - Sections & Configured Grid Layout */}
                      <div className="mt-6 space-y-6">
                        {allSections.map((sec: any) => {
                          const secFields = (sec.fields || [])
                            .filter((f: any) => !f.repeatable_group)
                            .sort((a: any, b: any) => {
                              const ordA = fieldPrintLayouts[a.id]?.print_order ?? a.order ?? 0;
                              const ordB = fieldPrintLayouts[b.id]?.print_order ?? b.order ?? 0;
                              return ordA - ordB;
                            })
                            .filter((f: any) => fieldPrintLayouts[f.id]?.is_enabled !== false);

                          return (
                            <div key={sec.id} className="space-y-2.5">
                              {/* Section Title */}
                              <div className="pb-1 border-b border-slate-700 flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">{sec.name}</h4>
                                <span className="text-xs font-mono text-slate-400">کد: {sec.code}</span>
                              </div>

                              {/* 12-Column Grid for Precision Layout */}
                              <div className="grid grid-cols-12 gap-2.5 pt-1">
                                {secFields.map((f: any) => {
                                  const cfg = fieldPrintLayouts[f.id] || {
                                    is_enabled: true,
                                    title_override: '',
                                    print_order: 0,
                                    print_width: '100%',
                                  };

                                  const width = cfg.print_width || '100%';
                                  let colSpanClass = 'col-span-12';
                                  if (width === '50%') colSpanClass = 'col-span-6';
                                  else if (width === '33%') colSpanClass = 'col-span-4';
                                  else if (width === '25%') colSpanClass = 'col-span-3';

                                  const displayTitle = cfg.title_override || f.label;
                                  let displayVal = previewValues[f.code] ?? f.default_value ?? '';
                                  if (f.field_type === 'FORMULA') {
                                    displayVal = evaluateFormula(f, previewValues, undefined, previewRows, allFields);
                                  }

                                  return (
                                    <div
                                      key={f.id}
                                      className={`${colSpanClass} p-2 border border-slate-300 rounded-lg bg-white flex flex-col justify-between min-h-[54px]`}
                                    >
                                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                        <span>{displayTitle}:</span>
                                        <span className="text-xs font-mono text-slate-400 no-print">{width}</span>
                                      </div>
                                      <div className="text-xs font-semibold text-slate-900 mt-1 border-b border-dotted border-slate-400 pb-0.5 min-h-[18px]">
                                        {displayVal !== '' ? (
                                          String(displayVal)
                                        ) : (
                                          <span className="text-slate-300 font-normal">........................</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Repeatable Tables in Section */}
                              {sec.repeatable_groups?.map((grp: any) => {
                                const groupCols = (sec.fields || []).filter((f: any) => f.repeatable_group === grp.id);
                                const rows = previewRows[grp.id] || [];

                                return (
                                  <div key={grp.id} className="mt-4">
                                    <div className="text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                                      <TableIcon className="w-3.5 h-3.5 text-slate-700" />
                                      <span>جدول اقلام: {grp.label}</span>
                                    </div>
                                    <table className="w-full text-xs text-right border-collapse border border-slate-400">
                                      <thead className="bg-slate-100 font-bold border-b border-slate-400 text-slate-800">
                                        <tr>
                                          <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                                          {groupCols.map((c: any) => (
                                            <th key={c.id} className="p-2 border-r border-slate-300">
                                              {c.label}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.length === 0 ? (
                                          <tr>
                                            <td colSpan={groupCols.length + 1} className="p-3 text-center text-slate-400 text-xs">
                                              اطلاعاتی در جدول ثبت نشده است. (ردیف خالی پیش‌فرض در برگه چاپی)
                                            </td>
                                          </tr>
                                        ) : (
                                          rows.map((r: any, idx: number) => (
                                            <tr key={r._id || idx} className="border-b border-slate-200">
                                              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">
                                                {idx + 1}
                                              </td>
                                              {groupCols.map((c: any) => {
                                                let v = r[c.code] ?? '';
                                                if (c.field_type === 'FORMULA') {
                                                  v = evaluateFormula(c, previewValues, r, previewRows, allFields);
                                                }
                                                return (
                                                  <td key={c.id} className="p-2 border-r border-slate-300 font-medium">
                                                    {v !== '' ? String(v) : '—'}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Official Signatures Box */}
                      {printShowSignatures && (
                        <div className="mt-8 pt-4 border-t-2 border-slate-800">
                          <div className={`grid grid-cols-${printSignatureCount || 3} gap-4`}>
                            {Array.from({ length: printSignatureCount || 3 }).map((_, i) => {
                              const titles = [
                                'امضا و تأیید متقاضی',
                                'امضای کارشناس فنی',
                                'تأییدیه مدیریت و حسابداری',
                                'مهر و بازرسی نهایی',
                              ];
                              return (
                                <div
                                  key={i}
                                  className="border border-slate-300 rounded-xl p-3 text-center min-h-[90px] flex flex-col justify-between"
                                >
                                  <span className="text-xs font-bold text-slate-700">{titles[i] || `امضای ردیف ${i + 1}`}</span>
                                  <div className="text-xs text-slate-400 border-t border-dashed border-slate-300 pt-1">
                                    امضا و تاریخ: ....................
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sheet Footer */}
                    <div className="border-t border-slate-300 pt-3 mt-8 flex items-center justify-between text-xs text-slate-500">
                      <span>{printFooter || 'این سند چاپی به صورت سیستمی و خودکار صادر گردیده و دارای اعتبار اداری است.'}</span>
                      <span>صفحه ۱ از ۱</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Create / Edit Form Field & Formula Builder */}
      {/* ------------------------------------------------------------- */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingField ? 'ویرایش مشخصات فیلد' : 'افزودن فیلد جدید به فرم'}
              </h3>
              <button onClick={() => setIsFieldModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">عنوان نمایشی فیلد (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="مثال: شماره سریال قطعه، جمع کل فاکتور"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">شناسه متغیر سیستمی (انگلیسی)</label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="مثال: total_price"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono lowercase outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا</label>
                  <input
                    type="text"
                    value={fieldCode}
                    onChange={(e) => setFieldCode(e.target.value)}
                    placeholder="مثال: TOTAL_PRICE"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">بخش والد (Section) *</label>
                  <select
                    value={fieldSectionId}
                    onChange={(e) => setFieldSectionId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                  >
                    {allSections.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700">وابستگی به جدول تکرارپذیر</label>
                  <select
                    value={fieldGroupId}
                    onChange={(e) => setFieldGroupId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">فیلد عادی فرم (مستقل)</option>
                    {allSections.flatMap((s: any) => s.repeatable_groups || []).map((grp: any) => (
                      <option key={grp.id} value={grp.id}>ستون جدول «{grp.label}»</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">نوع داده ورودی (Field Type) *</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="TEXT">متن کوتاه (TEXT)</option>
                    <option value="TEXTAREA">متن چندخطی (TEXTAREA)</option>
                    <option value="NUMBER">عدد (NUMBER)</option>
                    <option value="FORMULA">فرمول محاسباتی خودکار (FORMULA)</option>
                    <option value="DATE">تاریخ (DATE)</option>
                    <option value="DATETIME">تاریخ و زمان (DATETIME)</option>
                    <option value="SELECT">انتخابی و دراپ‌داون (SELECT)</option>
                    <option value="BOOLEAN">بله/خیر (BOOLEAN)</option>
                    <option value="FILE">بارگذاری فایل و ضمیمه (FILE)</option>
                  </select>
                </div>

                {fieldType === 'DATE' && (
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">نوع تقویم</label>
                    <select
                      value={fieldCalendar}
                      onChange={(e) => setFieldCalendar(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="JALALI">تقویم شمسی (Jalali)</option>
                      <option value="GREGORIAN">تقویم میلادی (Gregorian)</option>
                    </select>
                  </div>
                )}

                {(fieldType === 'NUMBER' || fieldType === 'FORMULA') && (
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">ارقام اعشار (Decimal Places)</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={fieldDecimalPlaces}
                      onChange={(e) => setFieldDecimalPlaces(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* VISUAL FORMULA BUILDER */}
              {fieldType === 'FORMULA' && (
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-purple-600" />
                      <span>سازنده فرمول محاسباتی ریاضی (Formula Builder)</span>
                    </span>
                    <span className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      AST Engine v2
                    </span>
                  </div>

                  {/* Formula Canvas Box */}
                  <div className="bg-white border border-purple-200 rounded-xl p-3 min-h-[50px] flex items-center gap-1.5 flex-wrap">
                    {formulaTokens.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        فرمول خالی است. با استفاده از دکمه‌های زیر فیلدها و عملگرها را اضافه نمایید...
                      </span>
                    ) : (
                      formulaTokens.map((t: any, idx: number) => {
                        let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
                        if (t.type === 'field') badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
                        else if (t.type === 'operator') badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
                        else if (t.type === 'function') badgeColor = 'bg-purple-100 text-purple-900 border-purple-300';
                        else if (t.type === 'number') badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';

                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold border shadow-xs ${badgeColor}`}
                          >
                            <span>{t.label || t.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormulaToken(idx)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5 font-normal"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Formula Expression Preview & Quick Actions */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-500 font-semibold">پیش‌نمایش:</span>
                      <span className="font-mono text-purple-900 font-bold truncate dir-ltr">
                        {formulaTokens.map((t: any) => t.label || t.value).join(' ') || '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleBackspaceFormulaToken}
                        className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        حذف قبلی
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFormulaTokens}
                        className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold"
                      >
                        پاک کردن همه
                      </button>
                    </div>
                  </div>

                  {/* Toolbar Row 1: Add Field */}
                  <div className="pt-2 border-t border-purple-200/60 flex items-center gap-2">
                    <select
                      value={formulaSelectedFieldId}
                      onChange={(e) => setFormulaSelectedFieldId(e.target.value ? Number(e.target.value) : '')}
                      className="flex-1 bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="">انتخاب فیلد برای فرمول...</option>
                      {allFields
                        .filter((f) => (!editingField || f.id !== editingField.id))
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label} ({f.code}) {f.repeatable_group ? '[جدول]' : ''}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      disabled={!formulaSelectedFieldId}
                      onClick={() => formulaSelectedFieldId && handleAddFormulaField(Number(formulaSelectedFieldId))}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs"
                    >
                      + افزودن فیلد
                    </button>
                  </div>

                  {/* Toolbar Row 2: Operators & Parentheses */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-bold ml-1">عملگرها:</span>
                    {['+', '-', '*', '/', '%'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => handleAddFormulaToken({ type: 'operator', value: op })}
                        className="w-7 h-7 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-mono font-semibold text-xs"
                      >
                        {op}
                      </button>
                    ))}
                    {['(', ')', ','].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleAddFormulaToken({ type: p === ',' ? 'comma' : 'paren', value: p })}
                        className="w-7 h-7 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-mono font-semibold text-xs"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Toolbar Row 3: Math & Aggregate Functions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-bold ml-1">توابع:</span>
                    {['SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS', 'FLOOR', 'CEIL'].map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => handleAddFormulaFunction(fn)}
                        className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-mono font-bold text-xs"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>

                  {/* Toolbar Row 4: Constant Number */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="عدد ثابت (مثال: 1.09 یا 5000)"
                      value={formulaConstNum}
                      onChange={(e) => setFormulaConstNum(e.target.value)}
                      className="flex-1 bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFormulaNumber}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      + افزودن عدد
                    </button>
                  </div>
                </div>
              )}

              {/* If SELECT type: Choice Source */}
              {fieldType === 'SELECT' && (
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-3">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>منبع تغذیه گزینه‌های انتخابی (Choice Source)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-semibold text-indigo-900">نوع منبع</label>
                      <select
                        value={fieldChoiceSource}
                        onChange={(e) => setFieldChoiceSource(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 outline-none font-medium"
                      >
                        <option value="NONE">بدون منبع (گزینه‌های آزاد)</option>
                        <option value="LOOKUP">منبع داده پویا (Lookup List)</option>
                        <option value="STATIC">مجموعه گزینه‌های ثابت (Static Set)</option>
                      </select>
                    </div>

                    {fieldChoiceSource === 'LOOKUP' && (
                      <div>
                        <label className="block mb-1 font-semibold text-indigo-900">انتخاب منبع پویا</label>
                        <select
                          value={fieldLookupListId}
                          onChange={(e) => setFieldLookupListId(Number(e.target.value))}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 outline-none font-medium"
                        >
                          <option value="">انتخاب...</option>
                          {lookups.map((l) => (
                            <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {fieldChoiceSource === 'STATIC' && (
                      <div>
                        <label className="block mb-1 font-semibold text-indigo-900">انتخاب مجموعه ثابت</label>
                        <select
                          value={fieldStaticSetId}
                          onChange={(e) => setFieldStaticSetId(Number(e.target.value))}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 outline-none font-medium"
                        >
                          <option value="">انتخاب...</option>
                          {staticSets.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Cascading Parent Field */}
                  {fieldChoiceSource === 'LOOKUP' && (
                    <div>
                      <label className="block mb-1 font-semibold text-indigo-900">
                        فیلد والد در فرم (برای دراپ‌داون‌های آبشاری Cascading)
                      </label>
                      <select
                        value={fieldParentFieldId}
                        onChange={(e) => setFieldParentFieldId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 outline-none font-medium"
                      >
                        <option value="">بدون والد (مستقل / سطح اول)</option>
                        {allFields
                          .filter((f) => f.field_type === 'SELECT' && (!editingField || f.id !== editingField.id))
                          .map((f) => (
                            <option key={f.id} value={f.id}>{f.label} ({f.code})</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* System Key Mapping */}
              <div>
                <label className="block mb-1 font-semibold text-slate-700">اتصال به مشخصه سیستمی (System Key)</label>
                <select
                  value={fieldSystemKey}
                  onChange={(e) => setFieldSystemKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="NONE">بدون اتصال سیستمی (فیلد آزاد)</option>
                  <option value="DEVICE_TYPE">نوع دستگاه (Device Type)</option>
                  <option value="DEVICE_MODEL">مدل دستگاه (Device Model)</option>
                  <option value="IMEI">شماره سریال / IMEI</option>
                  <option value="REPORTED_PROBLEM">شرح مشکل گزارش‌شده (Problem)</option>
                  <option value="DESCRIPTION">توضیحات تکمیلی (Description)</option>
                  <option value="WARRANTY_STATUS">وضعیت گارانتی (Warranty)</option>
                  <option value="STATUS">وضعیت نهایی دستگاه (Status)</option>
                </select>
              </div>

              {fieldType !== 'FORMULA' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">مقدار پیش‌فرض</label>
                    <input
                      type="text"
                      value={fieldDefaultValue}
                      onChange={(e) => setFieldDefaultValue(e.target.value)}
                      placeholder="مقدار اولیه اختیاری..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">متن راهنمای اپراتور (Help Text)</label>
                    <input
                      type="text"
                      value={fieldHelpText}
                      onChange={(e) => setFieldHelpText(e.target.value)}
                      placeholder="توضیح زیر فیلد..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              <div className="pt-2 flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldIsRequired}
                    onChange={(e) => setFieldIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-700">فیلد اجباری (Required)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldShowInSummary}
                    onChange={(e) => setFieldShowInSummary(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-700">نمایش در خلاصه پرونده کارتابل</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {editingField ? 'ذخیره تغییرات فیلد' : 'افزودن فیلد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Create / Edit Repeatable Group */}
      {/* ------------------------------------------------------------- */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingGroup ? 'ویرایش جدول تکرارشونده' : 'ایجاد جدول تکرارشونده جدید'}
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">عنوان جدول (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  placeholder="مثال: لیست قطعات مصرفی و یدکی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">شناسه متغیر (انگلیسی)</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="مثال: spare_parts_list"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono lowercase outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">کد لاتین یکتا</label>
                  <input
                    type="text"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    placeholder="مثال: SPARE_PARTS"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">بخش والد (Section) *</label>
                <select
                  value={groupSectionId}
                  onChange={(e) => setGroupSectionId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                >
                  {allSections.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">نوع جدول</label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-medium"
                  >
                    <option value="NORMAL">جدول اقلام عادی (Normal)</option>
                    <option value="DEVICE">تجهیزات و دستگاه‌ها (Device Group)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700">حالت نمایش در فرم</label>
                  <select
                    value={groupDisplayType}
                    onChange={(e) => setGroupDisplayType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-medium"
                  >
                    <option value="TABLE">جدول ردیفی اکسل‌گونه (Table)</option>
                    <option value="LIST">کارت‌های تکرارشونده (List)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات راهنما</label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="توضیح برای راهنمایی پرکردن جدول اقلام..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupIsRequired}
                    onChange={(e) => setGroupIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-700">حداقل یک ردیف در جدول الزامی است (Required)</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  {editingGroup ? 'ذخیره تغییرات جدول' : 'ایجاد جدول تکرارپذیر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Create / Edit Form Section */}
      {/* ------------------------------------------------------------- */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingSection ? 'ویرایش بخش فرم' : 'افزودن بخش جدید به فرم'}
              </h3>
              <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-700">نام بخش (فارسی) *</label>
                <input
                  type="text"
                  required
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  placeholder="مثال: مشخصات هویتی و ثبت پذیرش"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">کد لاتین بخش</label>
                <input
                  type="text"
                  value={secCode}
                  onChange={(e) => setSecCode(e.target.value)}
                  placeholder="مثال: IDENTITY_SECTION"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-700">توضیحات تکمیلی</label>
                <textarea
                  rows={3}
                  value={secDesc}
                  onChange={(e) => setSecDesc(e.target.value)}
                  placeholder="توضیح اختیاری..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {editingSection ? 'ذخیره تغییرات بخش' : 'افزودن بخش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
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
                {confirmDialog.confirmLabel || 'حذف نهایی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
