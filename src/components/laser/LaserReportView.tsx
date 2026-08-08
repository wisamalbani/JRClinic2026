import React, { useState, useEffect } from 'react';
import {
  calculateLaserMonthlyReport,
  LaserMonthlyReportData,
} from '../../services/laser';
import { FileText, Calendar, Printer, RefreshCw, DollarSign, ArrowDownCircle, ArrowUpCircle, Banknote, Wrench, UserCheck } from 'lucide-react';

export const LaserReportView: React.FC = () => {
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());

  const [reportData, setReportData] = useState<LaserMonthlyReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await calculateLaserMonthlyReport(startDate, endDate);
      setReportData(data);
    } catch (err: any) {
      console.error('Error generating laser report:', err);
      setError('حدث خطأ أثناء احتساب تقرير الليزر');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">التقرير الشهري لصندوق قسم الليزر</h2>
              <p className="text-xs text-slate-500 mt-0.5">احتساب الإيرادات، المصاريف، نسب الصبايا، مخصص صيانة الجهاز، ورصيد د. جهاد</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
            >
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-all shadow-sm h-10 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              عرض التقرير
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-100">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-3" />
          <p className="font-semibold text-sm">جاري احتساب التقرير والبيانات المالية لصندوق الليزر...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && reportData && (
        <div id="printable-laser-report" className="space-y-6">
          {/* Print Header */}
          <div className="hidden print:block text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-900">مركز العيادات الطبية - تقرير صندوق الليزر</h1>
            <p className="text-sm text-slate-600 mt-1">
              عن الفترة من {reportData.startDate} إلى {reportData.endDate}
            </p>
          </div>

          {/* Top Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Income */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">إجمالي الإيرادات</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-emerald-600">
                {reportData.totalIncome.toLocaleString()} <span className="text-xs font-normal">ل.س</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">مجموع حركات المقبوضات بالفترة</div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">إجمالي المصاريف</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-rose-600">
                {reportData.totalExpenses.toLocaleString()} <span className="text-xs font-normal">ل.س</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">مصاريف التشغيل والصيانة الحالية</div>
            </div>

            {/* Total Maintenance Reserve */}
            <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">مخصص صيانة الجهاز</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-amber-600">
                {reportData.totalMaintenanceReserve.toLocaleString()} <span className="text-xs font-normal">ل.س</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">مجموع (الضربات × سعر الضربة بتاريخ كل حركة)</div>
            </div>

            {/* Net for Dr. Jihad */}
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-500 bg-indigo-50/20 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-900">صافي المتبقي للدكتور جهاد</span>
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-700">
                {reportData.netForDoctor.toLocaleString()} <span className="text-xs font-normal">ل.س</span>
              </div>
              <div className="text-[11px] text-indigo-600 mt-1 font-medium">
                [رصيد الصندوق الفعلي ({reportData.endingCashBalance.toLocaleString()})] - [مخصص الصيانة]
              </div>
            </div>
          </div>

          {/* Section 1: Staff Performance Breakdown */}
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-rose-600" />
              أداء ومستحقات كادر الليزر (الصبايا)
            </h3>

            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3">اسم الصبية</th>
                    <th className="p-3">إجمالي الإيراد الشخصي</th>
                    <th className="p-3">إجمالي عدد الضربات</th>
                    <th className="p-3">المستحق كنسبة (%)</th>
                    <th className="p-3">الراتب الشهري</th>
                    <th className="p-3">إجمالي المسحوبات الشخصية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.staffDetails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">لا يوجد صبايا مسجلات في النظام</td>
                    </tr>
                  ) : (
                    reportData.staffDetails.map((sd) => (
                      <tr key={sd.staff.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800 text-sm">{sd.staff.name}</td>
                        <td className="p-3 font-bold text-emerald-600">
                          {sd.income.toLocaleString()} ل.س
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {sd.shotsCount.toLocaleString()} ضربة
                        </td>
                        <td className="p-3 font-bold text-rose-600">
                          {sd.commissionAmount.toLocaleString()} ل.س
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {sd.salaryAmount.toLocaleString()} ل.س
                        </td>
                        <td className="p-3 font-semibold text-amber-600">
                          {sd.withdrawalsAmount.toLocaleString()} ل.س
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Detailed Financial Breakdown before final figure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box Cash Flow Breakdown */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 mb-2 border-b pb-2 flex items-center justify-between">
                <span>تفنيد حركة رصيد صندوق الليزر الفعلي</span>
                <span className="text-xs font-normal text-slate-500">الفترة المحدد</span>
              </h3>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-600">الرصيد الافتتاحي (قبل بداية الفترة):</span>
                <span className="font-bold text-slate-800">{reportData.openingBalance.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-emerald-700 font-medium">(+) إجمالي مقبوضات الفترة (إيراد الليزر):</span>
                <span className="font-bold text-emerald-600">+{reportData.totalIncome.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-rose-700 font-medium">(-) إجمالي مصروفات الفترة:</span>
                <span className="font-bold text-rose-600">-{reportData.totalExpenses.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-amber-700 font-medium">(-) إجمالي كافة سحوبات الفترة:</span>
                <span className="font-bold text-amber-600">-{reportData.totalWithdrawals.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-sm py-2.5 font-extrabold bg-slate-50 px-3 rounded-lg text-slate-800 mt-2">
                <span>رصيد صندوق الليزر الفعلي نهاية الفترة:</span>
                <span className="text-rose-600">{reportData.endingCashBalance.toLocaleString()} ل.س</span>
              </div>
            </div>

            {/* Detailed Items & Withdrawals breakdown */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-800 mb-2 border-b pb-2 flex items-center justify-between">
                <span>البنود التفصيلية السابقة للرقم النهائي</span>
                <span className="text-xs font-normal text-slate-500">تفاصيل السحوبات والرواتب</span>
              </h3>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-600">مجموع رواتب الصبايا بالفترة:</span>
                <span className="font-bold text-slate-800">{reportData.totalStaffSalaries.toLocaleString()} ل.س</span>
              </div>

              {reportData.staffDetails.map((sd) => (
                <div key={sd.staff.id} className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100 pr-3">
                  <span className="text-slate-500">• سحوبات الصبية ({sd.staff.name}):</span>
                  <span className="font-bold text-amber-600">{sd.withdrawalsAmount.toLocaleString()} ل.س</span>
                </div>
              ))}

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-600">• سحوبات الدكتور جهاد:</span>
                <span className="font-bold text-amber-600">{reportData.doctorWithdrawals.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-600">• سحوبات المركز:</span>
                <span className="font-bold text-amber-600">{reportData.centerWithdrawals.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                <span className="text-slate-600">(-) مخصص صيانة الجهاز المستقطع:</span>
                <span className="font-bold text-amber-600">-{reportData.totalMaintenanceReserve.toLocaleString()} ل.س</span>
              </div>

              <div className="flex items-center justify-between text-sm py-2.5 font-extrabold bg-indigo-50 border border-indigo-200 px-3 rounded-lg text-indigo-900 mt-2">
                <span>الصافي النهائي المتبقي للدكتور جهاد:</span>
                <span className="text-indigo-700">{reportData.netForDoctor.toLocaleString()} ل.س</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
