import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Clinic } from '../../types';
import { getDoctorReport, DoctorReportResult } from '../../services/reports';
import {
  Stethoscope,
  Building2,
  Calendar,
  Printer,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  Coins,
  Receipt,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface DoctorReportViewProps {
  fixedClinicId?: string;
  hideClinicSelector?: boolean;
}

export const DoctorReportView: React.FC<DoctorReportViewProps> = ({
  fixedClinicId,
  hideClinicSelector = false,
}) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(fixedClinicId || '');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [loadingClinics, setLoadingClinics] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<DoctorReportResult | null>(null);

  useEffect(() => {
    if (fixedClinicId) {
      setSelectedClinicId(fixedClinicId);
    }
  }, [fixedClinicId]);

  const fetchClinics = useCallback(async () => {
    setLoadingClinics(true);
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('number', { ascending: true });

      if (error) throw error;
      setClinics(data || []);
      if (!fixedClinicId && data && data.length > 0 && !selectedClinicId) {
        setSelectedClinicId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching clinics for report:', err);
      setErrorMsg('فشل تحميل قائمة العيادات');
    } finally {
      setLoadingClinics(false);
    }
  }, [fixedClinicId, selectedClinicId]);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const handleFetchReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedClinicId) {
      setErrorMsg('يرجى اختيار العيادة.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('يرجى تحديد بداية ونهاية الفترة.');
      return;
    }

    setErrorMsg(null);
    setLoadingReport(true);
    try {
      const res = await getDoctorReport(selectedClinicId, startDate, endDate);
      setReport(res);
    } catch (err: unknown) {
      console.error('Error generating doctor report:', err);
      setErrorMsg('حدث خطأ أثناء إعداد تقرير الطبيب.');
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
          <Stethoscope className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-sm text-white">تقرير حسابات الطبيب والعيادة</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!hideClinicSelector ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                اختر العيادة <span className="text-red-400">*</span>
              </label>
              {loadingClinics ? (
                <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-400">
                  جاري تحميل العيادات...
                </div>
              ) : (
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      عيادة {c.number} - {c.doctor_name} ({c.specialty})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">العيادة المرتبطة بحسابك</label>
              <div className="px-3 py-2.5 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400">
                {clinics.find((c) => c.id === selectedClinicId)
                  ? `عيادة ${clinics.find((c) => c.id === selectedClinicId)?.number} - ${clinics.find((c) => c.id === selectedClinicId)?.doctor_name}`
                  : 'جاري جلب بيانات عيادتك...'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loadingReport || !selectedClinicId}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            {loadingReport ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>جاري إعداد التقرير...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>عرض تقرير الطبيب</span>
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

      {/* Report View */}
      {report && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
          {/* Report Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-700/80 print:border-slate-300 gap-4">
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block print:text-emerald-700">
                كشف الإيرادات والمصاريف وحصة الطبيب
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 print:text-black flex items-center gap-2">
                <span>عيادة {report.clinic.number}:</span>
                <span>{report.clinic.doctor_name}</span>
                <span className="text-xs text-slate-400 font-normal">({report.clinic.specialty})</span>
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 print:text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  الفترة المحددة: {report.startDate} إلى {report.endDate}
                </span>
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

          {/* Revenue Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>أولاً: تفصيل إيرادات العيادة (مقاطعة بـ سجل النسبة التاريخي)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                عدد الدفعات: {report.incomes.length}
              </span>
            </div>

            {report.incomes.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/50">
                لا توجد إيرادات مسجلة لهذه العيادة خلال الفترة المحددة.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">اسم المريض</th>
                      <th className="p-2.5">الإيراد ل.س</th>
                      <th className="p-2.5">الإيراد $</th>
                      <th className="p-2.5">النسبة السارية بتاريخ الحركة</th>
                      <th className="p-2.5">حصة الطبيب ل.س</th>
                      <th className="p-2.5">حصة المركز ل.س</th>
                      <th className="p-2.5">حصة الطبيب $</th>
                      <th className="p-2.5">حصة المركز $</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                    {report.incomes.map((row) => (
                      <tr key={row.transactionId} className="hover:bg-slate-700/30">
                        <td className="p-2.5 font-mono text-slate-300 print:text-slate-700">{row.date}</td>
                        <td className="p-2.5 text-slate-100 font-bold print:text-black">{row.patientName}</td>
                        <td className="p-2.5 font-mono text-emerald-400 print:text-emerald-700">
                          {row.amountSYP > 0 ? `${row.amountSYP.toLocaleString()} ل.س` : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-blue-400 print:text-blue-700">
                          {row.amountUSD > 0 ? `$${row.amountUSD.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-amber-300 print:text-amber-700">
                          {row.effectiveRate}%
                        </td>
                        <td className="p-2.5 font-mono text-emerald-300">
                          {row.doctorShareSYP > 0 ? Math.round(row.doctorShareSYP).toLocaleString() : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">
                          {row.centerShareSYP > 0 ? Math.round(row.centerShareSYP).toLocaleString() : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-blue-300">
                          {row.doctorShareUSD > 0 ? `$${row.doctorShareUSD.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">
                          {row.centerShareUSD > 0 ? `$${row.centerShareUSD.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/90 font-bold text-slate-200 border-t border-slate-700 print:bg-slate-100 print:text-black">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-left font-black">المجموع الكلي للإيرادات:</td>
                      <td className="p-2.5 font-mono text-emerald-400">{report.totalRevenueSYP.toLocaleString()} ل.س</td>
                      <td className="p-2.5 font-mono text-blue-400">${report.totalRevenueUSD.toLocaleString()}</td>
                      <td className="p-2.5 text-slate-400 text-center">-</td>
                      <td className="p-2.5 font-mono text-emerald-300">{Math.round(report.totalDoctorShareSYP).toLocaleString()}</td>
                      <td className="p-2.5 font-mono text-slate-400">{Math.round(report.totalCenterShareSYP).toLocaleString()}</td>
                      <td className="p-2.5 font-mono text-blue-300">${report.totalDoctorShareUSD.toFixed(2)}</td>
                      <td className="p-2.5 font-mono text-slate-400">${report.totalCenterShareUSD.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Expense Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>ثانياً: تفصيل المصاريف المرتبطة بالعيادة</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                عدد المصاريف: {report.expenses.length}
              </span>
            </div>

            {report.expenses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/50">
                لا توجد مصاريف خاصة بالعيادة خلال هذه الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 print:border-slate-300">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">بند المصروف</th>
                      <th className="p-2.5">البيان / التفاصيل</th>
                      <th className="p-2.5">المبلغ ل.س</th>
                      <th className="p-2.5">المبلغ $</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 print:divide-slate-200">
                    {report.expenses.map((exp) => (
                      <tr key={exp.transactionId} className="hover:bg-slate-700/30">
                        <td className="p-2.5 font-mono text-slate-300 print:text-slate-700">{exp.date}</td>
                        <td className="p-2.5 font-bold text-slate-200 print:text-black">{exp.categoryName}</td>
                        <td className="p-2.5 text-slate-400 print:text-slate-600">{exp.description || '-'}</td>
                        <td className="p-2.5 font-mono text-rose-400 print:text-rose-700">
                          {exp.amountSYP > 0 ? `${exp.amountSYP.toLocaleString()} ل.س` : '-'}
                        </td>
                        <td className="p-2.5 font-mono text-rose-300 print:text-rose-800">
                          {exp.amountUSD > 0 ? `$${exp.amountUSD.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/90 font-bold text-slate-200 border-t border-slate-700 print:bg-slate-100 print:text-black">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-left font-black">مجموع المصاريف:</td>
                      <td className="p-2.5 font-mono text-rose-400">{report.totalExpenseSYP.toLocaleString()} ل.س</td>
                      <td className="p-2.5 font-mono text-rose-300">${report.totalExpenseUSD.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Final Financial Summary Dashboard */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 print:border-slate-300 print:bg-slate-50">
            <h3 className="text-sm font-extrabold text-white print:text-black pb-2 border-b border-slate-700/60 print:border-slate-300 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>ثالثاً: الملخص المالي والحساب الصافي النهائي</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total Revenue & Expense */}
              <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <span className="text-xs text-slate-400 font-bold block">إجمالي الحركة المالية</span>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">الإيراد الكلي:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {report.totalRevenueSYP.toLocaleString()} ل.س | ${report.totalRevenueUSD}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">المصاريف الكلية:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    {report.totalExpenseSYP.toLocaleString()} ل.س | ${report.totalExpenseUSD}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-700/60 flex justify-between text-xs font-bold">
                  <span className="text-slate-200">الصافي الربحي للعيادة:</span>
                  <span className="font-mono text-white">
                    {report.netRevenueSYP.toLocaleString()} ل.س | ${report.netRevenueUSD}
                  </span>
                </div>
              </div>

              {/* Card 2: Center Share */}
              <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <span className="text-xs text-slate-400 font-bold block">حصة المركز الحسابية</span>
                <div className="text-lg font-black text-blue-400 font-mono">
                  {Math.round(report.totalCenterShareSYP).toLocaleString()} <span className="text-xs font-sans text-slate-400">ل.س</span>
                </div>
                <div className="text-sm font-bold text-blue-300 font-mono">
                  ${report.totalCenterShareUSD.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  المبلغ المستحق للمركز حسب النسبة السارية لكل حركة
                </p>
              </div>

              {/* Card 3: Doctor Net Remaining */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                <span className="text-xs text-emerald-300 font-bold block flex items-center justify-between">
                  <span>الباقي الصافي المستحق للطبيب</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {Math.round(report.netDoctorRemainingSYP).toLocaleString()} <span className="text-xs font-sans text-slate-300">ل.س</span>
                </div>
                <div className="text-base font-extrabold text-emerald-300 font-mono">
                  ${report.netDoctorRemainingUSD.toFixed(2)}
                </div>
                <p className="text-[10px] text-emerald-400/80 mt-1">
                  (صافي مستحق الطبيب بعد تطبيق النسبة على صافي إيراد العيادة)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
