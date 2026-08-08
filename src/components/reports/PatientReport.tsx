import React, { useState, useEffect } from 'react';
import { getPatientReport, PatientReportResult } from '../../services/reports';
import {
  User,
  Search,
  Calendar,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Coins,
  ArrowRightLeft,
  Building2,
  Wallet,
} from 'lucide-react';

export const PatientReportView: React.FC = () => {
  const [patientName, setPatientName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<PatientReportResult | null>(null);

  const handleFetchReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!patientName.trim() && !startDate && !endDate) {
      setErrorMsg('يرجى كتابة اسم المريض أو تحديد نطاق تاريخي للبحث.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await getPatientReport(patientName, startDate || undefined, endDate || undefined);
      setReport(res);
    } catch (err: unknown) {
      console.error('Error loading patient report:', err);
      setErrorMsg('حدث خطأ أثناء تحميل تقرير المريض.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Form */}
      <form
        onSubmit={handleFetchReport}
        className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 print:hidden"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
          <User className="w-5 h-5 text-blue-400" />
          <h3 className="font-extrabold text-sm text-white">تقرير كشف حساب مريض</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              اسم المريض (بحث نصي)
            </label>
            <div className="relative">
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="ادخل اسم المريض أو جزء منه..."
                className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>جاري البحث...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>عرض كشف المريض</span>
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
          {/* Printable Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-700/80 print:border-slate-300 gap-4">
            <div>
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider block print:text-blue-700">
                تقرير حسابات المرضى
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 print:text-black">
                المريض: {report.patientName ? report.patientName : 'كافة المرضى المطابقين'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 print:text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  الفترة: {report.startDate || 'البداية'} إلى {report.endDate || 'الان'}
                </span>
                <span>•</span>
                <span>عدد الدفعات: {report.payments.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-600 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / تصدير PDF</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          {report.payments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-700/50">
              لا توجد دفعات مسجلة لهذا المريض بالمحددات الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                  <tr>
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">المبلغ المدفوع</th>
                    <th className="p-3 font-bold">سعر الصرف المستخدم</th>
                    <th className="p-3 font-bold">المعادل بالعملة الأخرى</th>
                    <th className="p-3 font-bold">العيادة / الصندوق</th>
                    <th className="p-3 font-bold">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                  {report.payments.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-700/30 transition-colors print:hover:bg-transparent"
                    >
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 text-slate-200 font-mono print:text-slate-800">{p.date}</td>
                      <td className="p-3 font-mono font-extrabold text-emerald-400 print:text-emerald-700">
                        {p.amount.toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-400">{p.currency}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-300 print:text-slate-700">
                        {p.exchange_rate_used ? p.exchange_rate_used.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300 print:text-amber-800">
                        {p.equivalent_amount.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[10px] text-slate-400">{p.equivalent_currency}</span>
                      </td>
                      <td className="p-3 text-slate-300 print:text-slate-700">
                        {p.clinic_name || p.cash_box_name || '-'}
                      </td>
                      <td className="p-3 text-slate-400 print:text-slate-600">
                        {p.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 print:border-slate-300 print:bg-slate-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 print:border-slate-300 mb-3">
                <span className="text-xs font-bold text-slate-300 print:text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  إجمالي الدفعات المحسوبة بالليرة السورية
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  SYP Total
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono print:text-emerald-700">
                {report.totalPaidSYP.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                <span className="text-xs font-sans text-slate-400">ل.س</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 print:text-slate-600">
                <p>• الدفعات المباشرة بالليرة: {report.directSYPTotal.toLocaleString()} ل.س</p>
                <p>• الدفعات المحولة من الدولار بسعر صرف الحركة</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 print:border-slate-300 print:bg-slate-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 print:border-slate-300 mb-3">
                <span className="text-xs font-bold text-slate-300 print:text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  إجمالي الدفعات المحسوبة بالدولار الأمريكي
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                  USD Total
                </span>
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono print:text-blue-700">
                ${report.totalPaidUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 space-y-0.5 print:text-slate-600">
                <p>• الدفعات المباشرة بالدولار: ${report.directUSDTotal.toLocaleString()}</p>
                <p>• الدفعات المحولة من الليرة بسعر صرف الحركة</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
