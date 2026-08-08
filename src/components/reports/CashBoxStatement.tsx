import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CashBox } from '../../types';
import { getCashBoxStatementReport, CashBoxStatementResult } from '../../services/reports';
import {
  Wallet,
  Calendar,
  Printer,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Coins,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export const CashBoxStatementView: React.FC = () => {
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loadingBoxes, setLoadingBoxes] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<CashBoxStatementResult | null>(null);

  const fetchCashBoxes = useCallback(async () => {
    setLoadingBoxes(true);
    try {
      const { data, error } = await supabase.from('cash_boxes').select('*');
      if (error) throw error;
      setCashBoxes(data || []);
      if (data && data.length > 0) {
        setSelectedCashBoxId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching cash boxes:', err);
      setErrorMsg('تعذر تحميل صناديق المال.');
    } finally {
      setLoadingBoxes(false);
    }
  }, []);

  useEffect(() => {
    fetchCashBoxes();
  }, [fetchCashBoxes]);

  const handleFetchReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCashBoxId) {
      setErrorMsg('يرجى اختيار الصندوق.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('يرجى اختيار بداية ونهاية الفترة.');
      return;
    }

    setErrorMsg(null);
    setLoadingReport(true);
    try {
      const res = await getCashBoxStatementReport(selectedCashBoxId, startDate, endDate);
      setReport(res);
    } catch (err: unknown) {
      console.error('Error generating cash box statement:', err);
      setErrorMsg('حدث خطأ أثناء إعداد كشف حساب الصندوق.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filter Form */}
      <form
        onSubmit={handleFetchReport}
        className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 print:hidden"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
          <Wallet className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-sm text-white">تقرير كشف حساب صندوق</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              اختر الصندوق <span className="text-red-400">*</span>
            </label>
            {loadingBoxes ? (
              <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-400">
                جاري تحميل الصناديق...
              </div>
            ) : (
              <select
                value={selectedCashBoxId}
                onChange={(e) => setSelectedCashBoxId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {cashBoxes.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    صندوق {cb.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loadingReport || !selectedCashBoxId}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50"
          >
            {loadingReport ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>جاري إعداد الكشف...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>عرض كشف حساب الصندوق</span>
              </>
            )}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Report Output */}
      {report && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-700/80 print:border-slate-300 gap-4">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block print:text-amber-700">
                كشف حركة وتدقيق الصندوق
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 print:text-black">
                صندوق {report.cashBox.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 print:text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  الفترة: من {report.startDate} إلى {report.endDate}
                </span>
                <span>•</span>
                <span>عدد الحركات: {report.rows.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Opening Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between print:bg-slate-100 print:border-slate-300">
              <div>
                <span className="text-xs text-slate-400 font-bold block print:text-slate-700">
                  رصيد أول الفترة (ليرة سورية)
                </span>
                <span className="text-xs text-slate-500">قبل تاريخ {report.startDate}</span>
              </div>
              <div className="text-lg font-black text-emerald-400 font-mono print:text-emerald-700">
                {report.openingBalanceSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between print:bg-slate-100 print:border-slate-300">
              <div>
                <span className="text-xs text-slate-400 font-bold block print:text-slate-700">
                  رصيد أول الفترة (دولار أمريكي)
                </span>
                <span className="text-xs text-slate-500">قبل تاريخ {report.startDate}</span>
              </div>
              <div className="text-lg font-black text-blue-400 font-mono print:text-blue-700">
                ${report.openingBalanceUSD.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Statement Movements Table */}
          {report.rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-700/50">
              لا توجد حركة مسجلة لهذا الصندوق خلال هذه الفترة.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">نوع الحركة</th>
                    <th className="p-2.5">المريض / التفاصيل</th>
                    <th className="p-2.5">المبلغ والعملة</th>
                    <th className="p-2.5">الرصيد الجاري (ل.س)</th>
                    <th className="p-2.5">الرصيد الجاري ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                  {report.rows.map((row, idx) => {
                    const isIncome = row.type === 'income';
                    const isExpense = row.type === 'expense';
                    return (
                      <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-200 print:text-black">{row.date}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIncome
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isExpense
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {isIncome ? 'إيراد / مقبوضات' : isExpense ? 'مصروف / مدفوعات' : 'تحويل'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200 print:text-black font-medium">
                          {row.patientName || row.categoryName || row.description || '-'}
                          {row.description && row.patientName && (
                            <span className="block text-[10px] text-slate-400">{row.description}</span>
                          )}
                        </td>
                        <td
                          className={`p-2.5 font-mono font-extrabold ${
                            isIncome
                              ? 'text-emerald-400 print:text-emerald-700'
                              : isExpense
                              ? 'text-rose-400 print:text-rose-700'
                              : 'text-blue-400'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {row.amount.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400">{row.currency}</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-200 print:text-black">
                          {row.runningBalanceSYP.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-500">ل.س</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-200 print:text-black">
                          ${row.runningBalanceUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Closing Balance & Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1 print:bg-emerald-50 print:border-emerald-300">
              <span className="text-xs text-emerald-300 font-bold block print:text-emerald-800">
                رصيد آخر الفترة الإجمالي (ليرة سورية)
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono print:text-emerald-700">
                {report.closingBalanceSYP.toLocaleString()} <span className="text-xs font-sans text-slate-300">ل.س</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-emerald-500/20">
                <span>إجمالي مقبوضات الليرة: +{report.totalIncomeSYP.toLocaleString()}</span>
                <span>إجمالي مدفوعات الليرة: -{report.totalExpenseSYP.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-500/40 rounded-xl space-y-1 print:bg-blue-50 print:border-blue-300">
              <span className="text-xs text-blue-300 font-bold block print:text-blue-800">
                رصيد آخر الفترة الإجمالي (دولار أمريكي)
              </span>
              <div className="text-2xl font-black text-blue-400 font-mono print:text-blue-700">
                ${report.closingBalanceUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-blue-500/20">
                <span>إجمالي مقبوضات الدولار: +${report.totalIncomeUSD}</span>
                <span>إجمالي مدفوعات الدولار: -${report.totalExpenseUSD}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
