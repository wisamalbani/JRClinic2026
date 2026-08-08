import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Rep, MaterialBatch, RepPayment } from '../../types';
import {
  Users,
  Wallet,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  Coins,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

interface RepStatementViewProps {
  fixedRepId?: string;
  hideRepSelector?: boolean;
}

export const RepStatementView: React.FC<RepStatementViewProps> = ({
  fixedRepId,
  hideRepSelector = false,
}) => {
  const [reps, setReps] = useState<Rep[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>(fixedRepId || '');
  const [loadingReps, setLoadingReps] = useState<boolean>(true);

  // Statement Data
  const [batches, setBatches] = useState<(MaterialBatch & { inventory_items?: any })[]>([]);
  const [payments, setPayments] = useState<RepPayment[]>([]);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);

  // Modal / Payment Form
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentCurrency, setPaymentCurrency] = useState<'SYP' | 'USD'>('SYP');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (fixedRepId) {
      setSelectedRepId(fixedRepId);
    }
  }, [fixedRepId]);

  const fetchReps = useCallback(async () => {
    setLoadingReps(true);
    try {
      const { data } = await supabase.from('reps').select('*').order('name', { ascending: true });
      if (data) {
        setReps(data);
        if (!fixedRepId && data.length > 0 && !selectedRepId) {
          setSelectedRepId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching reps for statement:', err);
    } finally {
      setLoadingReps(false);
    }
  }, [fixedRepId, selectedRepId]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const fetchRepStatement = useCallback(async () => {
    if (!selectedRepId) return;
    setLoadingStatement(true);
    try {
      // 1. Fetch batches delivered by this rep
      const { data: batchData } = await supabase
        .from('material_batches')
        .select('*, inventory_items(*)')
        .eq('rep_id', selectedRepId)
        .order('purchase_date', { ascending: false });

      if (batchData) setBatches(batchData as any);

      // 2. Fetch payments made to this rep
      const { data: payData } = await supabase
        .from('rep_payments')
        .select('*')
        .eq('rep_id', selectedRepId)
        .order('date', { ascending: false });

      if (payData) setPayments(payData as any);
    } catch (err) {
      console.error('Error fetching rep statement:', err);
    } finally {
      setLoadingStatement(false);
    }
  }, [selectedRepId]);

  useEffect(() => {
    fetchRepStatement();
  }, [fetchRepStatement]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('يرجى إدخال مبلغ تسديد صحيح أكبر من صفر.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const { error } = await supabase.from('rep_payments').insert([
        {
          rep_id: selectedRepId,
          date: paymentDate,
          amount: amt,
          currency: paymentCurrency,
          notes: paymentNotes.trim() || null,
        },
      ]);

      if (error) throw error;

      setPaymentSuccess('تم تسديد المبلغ وتسجيل الدفعة للمندوب بنجاح.');
      setPaymentAmount('');
      setPaymentNotes('');
      setShowPaymentModal(false);
      fetchRepStatement();
    } catch (err: any) {
      console.error('Error recording rep payment:', err);
      setPaymentError(err.message || 'حدث خطأ أثناء تسجيل الدفعة للمندوب.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations for SYP and USD
  let totalDeliveredValueSYP = 0;
  let totalDeliveredValueUSD = 0;

  let totalConsumedValueSYP = 0;
  let totalConsumedValueUSD = 0;

  batches.forEach((b) => {
    const totalPkgCost = Number(b.package_qty) * Number(b.unit_price_per_package);
    const totalUnitsInBatch = Number(b.package_qty) * Number(b.inventory_items?.units_per_package || 1);
    const consumedUnits = totalUnitsInBatch - Number(b.remaining_units);
    const consumedValue = consumedUnits * Number(b.unit_cost);

    if (b.currency === 'USD') {
      totalDeliveredValueUSD += totalPkgCost;
      totalConsumedValueUSD += consumedValue;
    } else {
      totalDeliveredValueSYP += totalPkgCost;
      totalConsumedValueSYP += consumedValue;
    }
  });

  let totalPaymentsSYP = 0;
  let totalPaymentsUSD = 0;

  payments.forEach((p) => {
    if (p.currency === 'USD') {
      totalPaymentsUSD += Number(p.amount);
    } else {
      totalPaymentsSYP += Number(p.amount);
    }
  });

  const netBalanceDueSYP = totalConsumedValueSYP - totalPaymentsSYP;
  const netBalanceDueUSD = totalConsumedValueUSD - totalPaymentsUSD;

  const currentRep = reps.find((r) => r.id === selectedRepId);

  return (
    <div className="space-y-6">
      {/* Top Header & Rep Selector */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">كشف حساب مستحقات المندوب</h3>
            <p className="text-xs text-slate-400">حساب مستحقات المواد المستهلكة والدفعات المسددة للمندوبين</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!hideRepSelector ? (
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 min-w-[200px]"
            >
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.phone ? `(${r.phone})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-400">
              المندوب: {reps.find((r) => r.id === selectedRepId)?.name || 'جاري جلب اسم المندوب...'}
            </div>
          )}

          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل تسديد للمندوب</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Main Statement Content */}
      {!currentRep ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          يرجى اختيار مندوب لعرض كشف الحساب الخاص به.
        </div>
      ) : loadingStatement ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent" />
          <span>جاري احتساب كشف حساب المندوب...</span>
        </div>
      ) : (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-700/80 print:border-slate-300">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block print:text-amber-700">
                كشف حساب المندوب
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 print:text-black">
                {currentRep.name}
              </h2>
              {currentRep.phone && (
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1 dir-ltr text-right">
                  هاتف: {currentRep.phone}
                </p>
              )}
            </div>

            <div className="text-left text-xs text-slate-400 print:text-slate-600 mt-2 sm:mt-0 font-mono">
              تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Total Consumed Value */}
            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 print:bg-slate-100 print:border-slate-300">
              <span className="text-xs text-slate-400 font-bold block print:text-slate-700">
                مجموع قيمة المواد المستهلكة
              </span>
              <div className="text-lg font-black text-amber-400 font-mono print:text-black">
                {totalConsumedValueSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              {totalConsumedValueUSD > 0 && (
                <div className="text-sm font-bold text-amber-300 font-mono">
                  ${totalConsumedValueUSD.toLocaleString()}
                </div>
              )}
              <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-800">
                (تكلفة الكميات المسحوبة فعلياً للعيادات)
              </span>
            </div>

            {/* 2. Total Payments Made */}
            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 print:bg-slate-100 print:border-slate-300">
              <span className="text-xs text-slate-400 font-bold block print:text-slate-700">
                مجموع الدفعات المسددة للمندوب
              </span>
              <div className="text-lg font-black text-emerald-400 font-mono print:text-emerald-700">
                {totalPaymentsSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              {totalPaymentsUSD > 0 && (
                <div className="text-sm font-bold text-emerald-300 font-mono">
                  ${totalPaymentsUSD.toLocaleString()}
                </div>
              )}
              <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-800">
                (المبالغ المدفوعة والمقبوضة من قبل المندوب)
              </span>
            </div>

            {/* 3. Net Balance Due */}
            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 print:bg-slate-100 print:border-slate-300">
              <span className="text-xs text-slate-400 font-bold block print:text-slate-700">
                الرصيد الصافي المستحق للمندوب
              </span>
              <div className="text-xl font-black text-cyan-400 font-mono print:text-cyan-800">
                {netBalanceDueSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              {netBalanceDueUSD !== 0 && (
                <div className="text-sm font-bold text-cyan-300 font-mono">
                  ${netBalanceDueUSD.toLocaleString()}
                </div>
              )}
              <span className="text-[10px] text-cyan-300/80 block pt-1 border-t border-slate-800">
                (قيمة المستهلك - مجموع المسدد)
              </span>
            </div>
          </div>

          {/* Delivered Batches Table */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-200 print:text-black flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>1. سجل الدفعات المسلّمة من المندوب</span>
            </h4>

            {batches.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
                لا توجد أي دفعات مستلمة من هذا المندوب حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="p-2.5">تاريخ الشراء</th>
                      <th className="p-2.5">الصنف المادي</th>
                      <th className="p-2.5">العلب المسلمة</th>
                      <th className="p-2.5">سعر العلبة</th>
                      <th className="p-2.5">إجمالي العلب</th>
                      <th className="p-2.5">المستهلك (وحدة)</th>
                      <th className="p-2.5">المتبقي بالدفعة</th>
                      <th className="p-2.5">قيمة المستهلك المستحقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                    {batches.map((b) => {
                      const unitsPerPkg = Number(b.inventory_items?.units_per_package || 1);
                      const totalUnits = Number(b.package_qty) * unitsPerPkg;
                      const consumedUnits = totalUnits - Number(b.remaining_units);
                      const consumedValue = consumedUnits * Number(b.unit_cost);

                      return (
                        <tr key={b.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-2.5 font-mono text-slate-300 print:text-black">{b.purchase_date}</td>
                          <td className="p-2.5 font-bold text-white print:text-black">
                            {b.inventory_items?.name || 'مادة'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-200 print:text-black">
                            {b.package_qty} علبة
                          </td>
                          <td className="p-2.5 font-mono text-slate-300">
                            {Number(b.unit_price_per_package).toLocaleString()} {b.currency}
                          </td>
                          <td className="p-2.5 font-mono text-blue-300 font-bold">{totalUnits} قطعة</td>
                          <td className="p-2.5 font-mono font-bold text-purple-300">{consumedUnits} قطعة</td>
                          <td className="p-2.5 font-mono text-slate-400">{b.remaining_units} قطعة</td>
                          <td className="p-2.5 font-mono font-black text-amber-400">
                            {consumedValue.toLocaleString()} {b.currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rep Payments Table */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-sm text-slate-200 print:text-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>2. سجل الدفعات المسددة للمندوب</span>
            </h4>

            {payments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
                لا توجد أي تسديدات سابقة مسجلة لهذا المندوب.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">تاريخ التسديد</th>
                      <th className="p-2.5">المبلغ المسدد</th>
                      <th className="p-2.5">البيان / الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                    {payments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-black">{p.date}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-400">
                          {Number(p.amount).toLocaleString()} {p.currency}
                        </td>
                        <td className="p-2.5 text-slate-300 print:text-slate-700">{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Registration Modal */}
      {showPaymentModal && currentRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                تسجيل تسديد للمندوب
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                إغلاق ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              المندوب المستلم: <strong className="text-white">{currentRep.name}</strong>
            </p>

            {paymentError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المبلغ المسدد <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value as 'SYP' | 'USD')}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="SYP">ل.س</option>
                    <option value="USD">$</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الدفعة</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات / رقم وصل التسديد</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: دفعة بموجب إيصال استلام..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  ) : (
                    <span>تأكيد وحفظ الدفعة</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
