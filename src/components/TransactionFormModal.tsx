import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CashBox, Clinic, ExpenseCategory, Transaction } from '../types';
import { getTodayExchangeRate, saveTodayExchangeRate } from '../services/exchangeRate';
import {
  X,
  Plus,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  DollarSign,
  Tag,
  User,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTransaction?: Transaction | null;
  isReclassifyMode?: boolean;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTransaction,
  isReclassifyMode = false,
}) => {
  const { user, profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  // Master Data
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [cashBoxId, setCashBoxId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SYP');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [patientName, setPatientName] = useState<string>('');
  const [clinicId, setClinicId] = useState<string>('');
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('');
  const [isSuspense, setIsSuspense] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [rateWarning, setRateWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load master data and exchange rate
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setErrorMsg(null);

      // 1. Fetch cash boxes
      const { data: cbData } = await supabase.from('cash_boxes').select('*');
      if (cbData) {
        setCashBoxes(cbData);
        if (!initialTransaction && cbData.length > 0) {
          const defaultBox = cbData.find((c) => c.name === 'المركز') || cbData[0];
          setCashBoxId(defaultBox.id);
        }
      }

      // 2. Fetch clinics
      const { data: clData } = await supabase.from('clinics').select('*').eq('is_active', true);
      if (clData) setClinics(clData);

      // 3. Fetch expense categories
      const { data: catData } = await supabase.from('expense_categories').select('*').eq('is_active', true);
      if (catData) setCategories(catData);

      // 4. Set Initial values or Auto-fetch exchange rate
      if (initialTransaction) {
        setType(initialTransaction.type === 'expense' ? 'expense' : 'income');
        setCashBoxId(initialTransaction.cash_box_id);
        setAmount(String(initialTransaction.amount));
        setCurrency(initialTransaction.currency || 'SYP');
        setExchangeRate(String(initialTransaction.exchange_rate_used || 1));
        setPatientName(initialTransaction.patient_name || '');
        setClinicId(initialTransaction.clinic_id || '');
        setExpenseCategoryId(initialTransaction.expense_category_id || '');
        setIsSuspense(isReclassifyMode ? false : initialTransaction.is_suspense);
        setDescription(initialTransaction.description || '');
      } else {
        // Reset form for creation
        setType('income');
        setAmount('');
        setCurrency('SYP');
        setPatientName('');
        setClinicId('');
        setExpenseCategoryId('');
        setIsSuspense(false);
        setDescription('');

        // Get Exchange Rate
        const rateResult = await getTodayExchangeRate();
        if (rateResult.rate) {
          setExchangeRate(String(rateResult.rate));
          setRateWarning(null);
        } else {
          setExchangeRate('1');
          setRateWarning(rateResult.warning || 'تعذر جلب سعر الصرف تلقائياً.');
        }
      }
    };

    loadData();
  }, [isOpen, initialTransaction, isReclassifyMode]);

  if (!isOpen) return null;

  // Inline Category Creation (Owner only)
  const handleAddNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name: newCategoryName.trim(), is_active: true })
        .select()
        .single();

      if (error) {
        setErrorMsg(`خطأ إضافة التصنيف: ${error.message}`);
      } else if (data) {
        setCategories((prev) => [...prev, data]);
        setExpenseCategoryId(data.id);
        setNewCategoryName('');
        setShowAddCategoryInline(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Mandate Validations
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    if (type === 'income' && !patientName.trim()) {
      setErrorMsg('اسم المريض إلزامي لجميع حركات المقبوضات (قبض).');
      return;
    }

    if (!cashBoxId) {
      setErrorMsg('يرجى اختيار الصندوق.');
      return;
    }

    const rateNum = Number(exchangeRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      setErrorMsg('يرجى إدخال سعر صرف صحيح.');
      return;
    }

    setLoading(true);

    try {
      // Save or confirm exchange rate in DB if missing for today
      if (user?.id && rateNum > 0) {
        await saveTodayExchangeRate(rateNum, user.id, 'حركة مالية');
      }

      const payload = {
        cash_box_id: cashBoxId,
        date: new Date().toISOString().split('T')[0],
        type,
        amount: Number(amount),
        currency,
        exchange_rate_used: rateNum,
        patient_name: type === 'income' ? patientName.trim() : patientName.trim() || null,
        clinic_id: isSuspense ? null : clinicId || null,
        expense_category_id: isSuspense ? null : expenseCategoryId || null,
        is_suspense: isSuspense,
        description: description.trim() || null,
        created_by: user?.id,
      };

      if (initialTransaction?.id) {
        // Edit or Reclassify Mode
        if (!isOwner) {
          setErrorMsg('تعديل الحركات مقتصر على مالك المركز (Owner) فقط.');
          setLoading(false);
          return;
        }

        // Fetch old record for Audit Log
        const { data: oldData } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', initialTransaction.id)
          .single();

        // Perform Update
        const { data: updatedData, error: updateErr } = await supabase
          .from('transactions')
          .update({
            ...payload,
            is_suspense: isReclassifyMode ? false : isSuspense,
          })
          .eq('id', initialTransaction.id)
          .select()
          .single();

        if (updateErr) {
          setErrorMsg(`خطأ أثناء التعديل: ${updateErr.message}`);
          setLoading(false);
          return;
        }

        // Audit Log Entry
        await supabase.from('audit_log').insert({
          user_id: user?.id,
          action: isReclassifyMode ? 'RECLASSIFY_SUSPENSE_TRANSACTION' : 'UPDATE_TRANSACTION',
          table_name: 'transactions',
          record_id: initialTransaction.id,
          old_value: oldData || initialTransaction,
          new_value: updatedData,
        });

      } else {
        // New Transaction Creation
        const { error: insertErr } = await supabase.from('transactions').insert(payload);

        if (insertErr) {
          setErrorMsg(`خطأ أثناء إضافة الحركة: ${insertErr.message}`);
          setLoading(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 dir-rtl font-sans">
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/80 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {type === 'income' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isReclassifyMode
                  ? 'إعادة تصنيف حركة معلقة'
                  : initialTransaction
                  ? 'تعديل حركة مالية'
                  : 'إضافة حركة مالية جديدة'}
              </h3>
              <p className="text-xs text-slate-400">شاشة إدخال المقبوضات والمصروفات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {rateWarning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{rateWarning}</span>
            </div>
          )}

          {/* 1. Transaction Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">نوع الحركة المالي *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  type === 'income'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                <span>قبض (إيراد)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  type === 'expense'
                    ? 'bg-red-600/20 border-red-500 text-red-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-red-400" />
                <span>صرف (مصروف)</span>
              </button>
            </div>
          </div>

          {/* 2. Amount, Currency & Cash Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Amount */}
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300 block">المبلغ *</label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 font-mono text-left"
                dir="ltr"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="SYP">ليرة سورية (SYP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>

            {/* Cash Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">الصندوق *</label>
              <select
                value={cashBoxId}
                onChange={(e) => setCashBoxId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {cashBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Exchange Rate Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 block">سعر الصرف المستخدَم *</label>
              <span className="text-[10px] text-slate-400">تاريخ اليوم: {new Date().toISOString().split('T')[0]}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="1"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 font-mono text-left"
                dir="ltr"
              />
              <DollarSign className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* 4. Patient Name (Mandatory for Income) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <span>اسم المريض</span>
              {type === 'income' && <span className="text-red-400 font-bold">* (إلزامي للقبض)</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                required={type === 'income'}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="أدخل اسم المريض الكامل..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* 5. Suspense Checkbox ("معلقات") */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                خيار "معلقات" (Suspense)
              </span>
              <p className="text-[11px] text-slate-400">
                عند التفعيل، تُحفظ الحركة كمعلقة لتصنيفها لاحقاً وتُعطل حقول العيادة وبند المصروف.
              </p>
            </div>
            <input
              type="checkbox"
              id="is_suspense_checkbox"
              checked={isSuspense}
              onChange={(e) => setIsSuspense(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* 6. Clinic & Expense Category Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Clinic */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                العيادة (اختياري)
              </label>
              <select
                disabled={isSuspense}
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">المركز الرئيسي (بدون عيادة خاصة)</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    عيادة {c.doctor_name} ({c.specialty})
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  بند المصروف (اختياري)
                </label>
                {isOwner && !isSuspense && (
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    بند جديد
                  </button>
                )}
              </div>

              <select
                disabled={isSuspense}
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">اختر تصنيف المصروف...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inline Category Adder (Owner only) */}
          {showAddCategoryInline && isOwner && !isSuspense && (
            <div className="p-3 bg-slate-900/90 border border-blue-500/30 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-blue-300 block">إضافة بند مصروف جديد</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اسم البند الجديد..."
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  حفظ
                </button>
              </div>
            </div>
          )}

          {/* 7. Description / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">الوصف / ملاحظة (اختياري)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="بيانات إضافية عن الحركة المالية..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-700/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isReclassifyMode
                      ? 'حفظ وإلغاء التعليق'
                      : initialTransaction
                      ? 'تعديل الحركة'
                      : 'حفظ الحركة المالية'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
