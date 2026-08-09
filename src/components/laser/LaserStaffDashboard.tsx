import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LaserTransaction, LaserWithdrawal } from '../../types';
import {
  Sparkles,
  TrendingUp,
  Wallet,
  Calendar,
  LogOut,
  RefreshCw,
  Award,
  CircleDollarSign,
  Receipt,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const LaserStaffDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const staffId = profile?.linked_laser_staff_id;

  const [staffName, setStaffName] = useState<string>('');
  const [currentPercentage, setCurrentPercentage] = useState<number>(0);
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [transactions, setTransactions] = useState<LaserTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<LaserWithdrawal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Month filter state
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (staffId) {
      loadStaffData();
    } else {
      setLoading(false);
    }
  }, [staffId, selectedMonth]);

  const loadStaffData = async () => {
    if (!staffId) return;
    setLoading(true);

    try {
      // 1. Fetch Staff Info
      const { data: staffData } = await supabase
        .from('laser_staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (staffData) {
        setStaffName(staffData.name);
      }

      // 2. Fetch Latest Percentage
      const { data: percData } = await supabase
        .from('laser_staff_percentage_history')
        .select('*')
        .eq('staff_id', staffId)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (percData && percData.length > 0) {
        setCurrentPercentage(percData[0].percentage);
      }

      // 3. Fetch Latest Salary
      const { data: salaryData } = await supabase
        .from('laser_staff_salary_history')
        .select('*')
        .eq('staff_id', staffId)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (salaryData && salaryData.length > 0) {
        setCurrentSalary(salaryData[0].amount);
      }

      // Calculate start and end date for selected month
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // 4. Fetch Income Transactions for Staff
      const { data: txData } = await supabase
        .from('laser_transactions')
        .select('*')
        .eq('type', 'income')
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      setTransactions(txData || []);

      // 5. Fetch Withdrawals for Staff
      const { data: wData } = await supabase
        .from('laser_withdrawals')
        .select('*')
        .eq('beneficiary_type', 'staff')
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      setWithdrawals(wData || []);
    } catch (err) {
      console.error('Error loading laser staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!staffId) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center dir-rtl p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">حساب غير مربوط بصبية ليزر</h2>
          <p className="text-xs text-slate-400">
            تم تسجيل دخولك بدور (كادر ليزر) ولكن لم يتم ربط حسابك بعضو كادر ليزر محدد. يرجى مراجعة إدارة المركز.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // Calculated Stats for Selected Month
  const totalShots = transactions.reduce((acc, t) => acc + (t.shots_count || 0), 0);
  const totalRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const calculatedCommission = (totalRevenue * currentPercentage) / 100;
  const totalWithdrawals = withdrawals.reduce((acc, w) => acc + (w.amount || 0), 0);
  const netDueBalance = currentSalary + calculatedCommission - totalWithdrawals;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl font-sans p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <header className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white">
              كشف كادر الليزر الشخصي: <span className="text-purple-400">{staffName || profile?.full_name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              عرض خاص بالإيرادات والضربات والنسبة والمسحوبات الشخصية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">الشهر:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-slate-100 font-mono focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={loadStaffData}
            disabled={loading}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Stat 1: Total Shots */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>إجمالي الضربات</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{totalShots.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">ضربة ليزر للشهر المحدد</span>
        </div>

        {/* Stat 2: Total Revenue */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>الإيرادات المحققة</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{totalRevenue.toLocaleString()} ل.س</p>
          <span className="text-[10px] text-slate-500">من الجلسات المنجزة</span>
        </div>

        {/* Stat 3: Commission Earned */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>النسبة والمستحق</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">{calculatedCommission.toLocaleString()} ل.س</p>
          <span className="text-[10px] text-amber-300/80 font-bold">النسبة الحالية: {currentPercentage}%</span>
        </div>

        {/* Stat 4: Total Withdrawals */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>السحوبات الشخصية</span>
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{totalWithdrawals.toLocaleString()} ل.س</p>
          <span className="text-[10px] text-slate-500">سحوبات مسددة للشهر</span>
        </div>

        {/* Stat 5: Net Balance */}
        <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-2 bg-gradient-to-br from-slate-800 to-indigo-950/40">
          <div className="flex items-center justify-between text-indigo-300 text-xs">
            <span>صافي المتبقي لكِ</span>
            <CircleDollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300 font-mono">{netDueBalance.toLocaleString()} ل.س</p>
          <span className="text-[10px] text-slate-400">شاملاً الراتب الأسبوعي ({currentSalary.toLocaleString()})</span>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table 1: Executed Sessions (2 columns span) */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-extrabold text-sm text-white">سجل جلسات الليزر المنجزة</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">عدد الجلسات: {transactions.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">اسم المريضة</th>
                  <th className="p-3 text-center">عدد الضربات</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">البيان / الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      لا توجد جلسات ليزر مسجلة باسمك في هذا الشهر
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 font-mono text-slate-300 whitespace-nowrap">{tx.date}</td>
                      <td className="p-3 font-bold text-slate-100">{tx.patient_name || '-'}</td>
                      <td className="p-3 text-center font-mono font-bold text-purple-300">
                        {tx.shots_count?.toLocaleString() || 0}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {tx.amount.toLocaleString()} ل.س
                      </td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{tx.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Personal Withdrawals (1 column span) */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              <h3 className="font-extrabold text-sm text-white">سجل المسحوبات الشخصية</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{withdrawals.length} سحوبات</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المبلغ المسحوب</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      لا توجد سحوبات مسجلة لهذا الشهر
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 font-mono text-slate-300 whitespace-nowrap">{w.date}</td>
                      <td className="p-3 font-mono font-bold text-rose-400">{w.amount.toLocaleString()} ل.س</td>
                      <td className="p-3 text-slate-400">{w.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
