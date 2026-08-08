import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Clinic, ExpenseCategory, CashBox } from '../../types';
import { getCustomFilteredReport, CustomReportResult, CustomReportFilters } from '../../services/reports';
import {
  Filter,
  Search,
  Calendar,
  Printer,
  AlertCircle,
  Building2,
  Wallet,
  Tag,
  ArrowRightLeft,
  Coins,
} from 'lucide-react';

export const CustomReportsView: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);

  const [filters, setFilters] = useState<CustomReportFilters>({
    categoryId: '',
    clinicId: '',
    cashBoxId: '',
    type: 'all',
    isSuspense: 'all',
    startDate: '',
    endDate: '',
    searchTerm: '',
  });

  const [loadingLookups, setLoadingLookups] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<CustomReportResult | null>(null);

  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const { data: cData } = await supabase.from('clinics').select('*').order('number', { ascending: true });
      if (cData) setClinics(cData);

      const { data: catData } = await supabase.from('expense_categories').select('*').order('name', { ascending: true });
      if (catData) setCategories(catData);

      const { data: cbData } = await supabase.from('cash_boxes').select('*');
      if (cbData) setCashBoxes(cbData);
    } catch (err) {
      console.error('Error loading filter lookups:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const handleFetchReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoadingReport(true);
    try {
      const res = await getCustomFilteredReport(filters);
      setReport(res);
    } catch (err: unknown) {
      console.error('Error generating custom report:', err);
      setErrorMsg('حدث خطأ أثناء تحميل التقرير المخصص.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      categoryId: '',
      clinicId: '',
      cashBoxId: '',
      type: 'all',
      isSuspense: 'all',
      startDate: '',
      endDate: '',
      searchTerm: '',
    });
    setReport(null);
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
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm text-white">التقارير الحرة وتصفية الحركات المتقدمة</h3>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Clinic */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">العيادة</label>
            <select
              value={filters.clinicId || ''}
              onChange={(e) => setFilters({ ...filters, clinicId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">جميع العيادات</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  عيادة {c.number} - {c.doctor_name}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Category */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">بند المصروف</label>
            <select
              value={filters.categoryId || ''}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">جميع بنود المصاريف</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cash Box */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">الصندوق</label>
            <select
              value={filters.cashBoxId || ''}
              onChange={(e) => setFilters({ ...filters, cashBoxId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">جميع الصناديق</option>
              {cashBoxes.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  صندوق {cb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">نوع الحركة</label>
            <select
              value={filters.type || 'all'}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">الكل (إيراد + مصروف + تحويل)</option>
              <option value="income">إيرادات فقط</option>
              <option value="expense">مصاريف فقط</option>
              <option value="transfer">تحويلات فقط</option>
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Suspense status */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">حالة التعليق</label>
            <select
              value={filters.isSuspense || 'all'}
              onChange={(e) => setFilters({ ...filters, isSuspense: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">الكل (مؤكدة ومعلقة)</option>
              <option value="normal">الحركات العادية المؤكدة فقط</option>
              <option value="suspense">الحركات المعلقة فقط</option>
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">بحث بالنص / المريض / البيان</label>
            <input
              type="text"
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="ابحث بالنص..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loadingReport}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {loadingReport ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>جاري استخراج البيانات...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>تطبيق الفلاتر وعرض النتائج</span>
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

      {/* Output */}
      {report && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-700/80 print:border-slate-300 gap-4">
            <div>
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block print:text-indigo-700">
                نتائج التقرير المخصص
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 print:text-black">
                سجل الحركات المطابقة للفلاتر
              </h2>
              <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                إجمالي النتائج المطابقة: <strong className="font-mono text-white print:text-black">{report.transactions.length}</strong> حركة
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          </div>

          {/* Summary Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-bold block">مجموع الإيرادات المطابقة</span>
              <div className="text-lg font-black text-emerald-400 font-mono">
                {report.totalIncomeSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              <div className="text-sm font-bold text-blue-400 font-mono">
                ${report.totalIncomeUSD.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-bold block">مجموع المصاريف المطابقة</span>
              <div className="text-lg font-black text-rose-400 font-mono">
                {report.totalExpenseSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              <div className="text-sm font-bold text-rose-300 font-mono">
                ${report.totalExpenseUSD.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 font-bold block">الفرق الصافي (الإيراد - المصروف)</span>
              <div className="text-lg font-black text-amber-400 font-mono">
                {report.netSYP.toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono">
                ${report.netUSD.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          {report.transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-700/50">
              لا توجد حركات مطابقة للخيارات المحددة.
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
                    <th className="p-2.5">بند المصروف</th>
                    <th className="p-2.5">العيادة</th>
                    <th className="p-2.5">الصندوق</th>
                    <th className="p-2.5">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                  {report.transactions.map((tx, idx) => {
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-200 print:text-black">{tx.date}</td>
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
                            {isIncome ? 'إيراد' : isExpense ? 'مصروف' : 'تحويل'}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-100 print:text-black">
                          {tx.patient_name || tx.description || '-'}
                        </td>
                        <td className="p-2.5 text-slate-300 print:text-slate-700">{tx.category_name || '-'}</td>
                        <td className="p-2.5 text-slate-300 print:text-slate-700">{tx.clinic_name || '-'}</td>
                        <td className="p-2.5 text-slate-300 print:text-slate-700">{tx.cash_box_name || '-'}</td>
                        <td
                          className={`p-2.5 font-mono font-extrabold ${
                            isIncome
                              ? 'text-emerald-400 print:text-emerald-700'
                              : isExpense
                              ? 'text-rose-400 print:text-rose-700'
                              : 'text-blue-400'
                          }`}
                        >
                          {Number(tx.amount).toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400">{tx.currency}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
