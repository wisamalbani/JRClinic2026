import React, { useState, useEffect } from 'react';
import {
  LaserStaff,
  LaserTransaction,
  LaserWithdrawal,
} from '../../types';
import {
  getLaserStaff,
  addLaserTransaction,
  addLaserWithdrawal,
  getLaserTransactions,
  getLaserWithdrawals,
} from '../../services/laser';
import { getTodayExchangeRate } from '../../services/exchangeRate';
import { Sparkles, PlusCircle, ArrowDownCircle, ArrowUpCircle, Banknote, History, RefreshCw } from 'lucide-react';

export const LaserInputForm: React.FC = () => {
  const [entryType, setEntryType] = useState<'income' | 'expense' | 'withdrawal'>('income');

  const [staffList, setStaffList] = useState<LaserStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);

  // Common fields
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SYP');
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  // Income specific fields
  const [patientName, setPatientName] = useState<string>('');
  const [shotsCount, setShotsCount] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Expense specific fields
  const [description, setDescription] = useState<string>('');

  // Withdrawal specific fields
  const [beneficiaryType, setBeneficiaryType] = useState<'staff' | 'doctor' | 'center'>('staff');
  const [withdrawalStaffId, setWithdrawalStaffId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recent logs
  const [recentTx, setRecentTx] = useState<LaserTransaction[]>([]);
  const [recentWd, setRecentWd] = useState<LaserWithdrawal[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingStaff(true);
    try {
      const [staffData, rateData] = await Promise.all([
        getLaserStaff(),
        getTodayExchangeRate(),
      ]);
      const activeStaff = staffData.filter((s) => s.is_active);
      setStaffList(activeStaff);
      if (activeStaff.length > 0) {
        setSelectedStaffId(activeStaff[0].id);
        setWithdrawalStaffId(activeStaff[0].id);
      }
      if (rateData && rateData.rate) {
        setExchangeRate(rateData.rate);
      }
    } catch (err: any) {
      console.error('Error fetching initial laser form data:', err);
    } finally {
      setLoadingStaff(false);
    }

    fetchRecentLogs();
  };

  const fetchRecentLogs = async () => {
    setLoadingRecent(true);
    try {
      const [txs, wds] = await Promise.all([
        getLaserTransactions(),
        getLaserWithdrawals(),
      ]);
      setRecentTx(txs.slice(0, 10));
      setRecentWd(wds.slice(0, 10));
    } catch (err) {
      console.error('Error fetching recent logs:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح أكبر من الصفر' });
      return;
    }

    setSubmitting(true);
    try {
      if (entryType === 'income') {
        if (!patientName.trim()) {
          setMessage({ type: 'error', text: 'اسم المريضة إلزامي' });
          setSubmitting(false);
          return;
        }
        if (!selectedStaffId) {
          setMessage({ type: 'error', text: 'يرجى اختيار الصبية المنفذة للخدمة' });
          setSubmitting(false);
          return;
        }
        const numericShots = parseInt(shotsCount, 10);
        if (shotsCount === '' || isNaN(numericShots) || numericShots < 0) {
          setMessage({ type: 'error', text: 'يرجى إدخال عدد ضربات صحيح (0 أو أكثر)' });
          setSubmitting(false);
          return;
        }

        await addLaserTransaction({
          date,
          type: 'income',
          patient_name: patientName.trim(),
          staff_id: selectedStaffId,
          shots_count: numericShots,
          amount: numericAmount,
          currency,
          exchange_rate_used: currency === 'USD' ? exchangeRate : 1.0,
        });

        setMessage({ type: 'success', text: 'تم تسجيل إيراد الليزر بنجاح' });
        setPatientName('');
        setShotsCount('');
        setAmount('');
      } else if (entryType === 'expense') {
        if (!description.trim()) {
          setMessage({ type: 'error', text: 'يرجى إدخال بيان المصروف' });
          setSubmitting(false);
          return;
        }

        await addLaserTransaction({
          date,
          type: 'expense',
          amount: numericAmount,
          currency,
          exchange_rate_used: currency === 'USD' ? exchangeRate : 1.0,
          description: description.trim(),
        });

        setMessage({ type: 'success', text: 'تم تسجيل مصروف الليزر بنجاح' });
        setAmount('');
        setDescription('');
      } else if (entryType === 'withdrawal') {
        if (beneficiaryType === 'staff' && !withdrawalStaffId) {
          setMessage({ type: 'error', text: 'يرجى اختيار الصبية المستفيدة من السحب' });
          setSubmitting(false);
          return;
        }

        await addLaserWithdrawal({
          date,
          beneficiary_type: beneficiaryType,
          staff_id: beneficiaryType === 'staff' ? withdrawalStaffId : undefined,
          amount: numericAmount,
          currency,
          notes: notes.trim() || undefined,
        });

        setMessage({ type: 'success', text: 'تم تسجيل عملية السحب بنجاح' });
        setAmount('');
        setNotes('');
      }

      fetchRecentLogs();
    } catch (err: any) {
      console.error('Error submitting laser entry:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تنفيذ العملية' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">إدخال حركة جديد في صندوق الليزر</h2>
              <p className="text-xs text-slate-500 mt-0.5">تسجيل المقبوضات والمصاريف والسحوبات المستقلة لجلسات الليزر</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-sm font-medium">
            <button
              type="button"
              onClick={() => { setEntryType('income'); setMessage(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                entryType === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              قبض (إيراد)
            </button>
            <button
              type="button"
              onClick={() => { setEntryType('expense'); setMessage(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                entryType === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              صرف (مصروف)
            </button>
            <button
              type="button"
              onClick={() => { setEntryType('withdrawal'); setMessage(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                entryType === 'withdrawal'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4" />
              سحب (مسحوبات)
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
                required
              />
            </div>

            {/* Income Specific: Patient Name */}
            {entryType === 'income' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  اسم المريضة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="أدخل اسم المريضة"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                  required
                />
              </div>
            )}

            {/* Income Specific: Staff Selection */}
            {entryType === 'income' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الصبية المنفذة <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                  required
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Income Specific: Shots Count */}
            {entryType === 'income' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  عدد الضربات <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="مثال: 500"
                  value={shotsCount}
                  onChange={(e) => setShotsCount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Withdrawal Specific: Beneficiary Type */}
            {entryType === 'withdrawal' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  جهة الاستفادة من السحب <span className="text-rose-500">*</span>
                </label>
                <select
                  value={beneficiaryType}
                  onChange={(e) => setBeneficiaryType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  required
                >
                  <option value="staff">إحدى الصبايا (روان / عبير)</option>
                  <option value="doctor">الدكتور جهاد</option>
                  <option value="center">المركز</option>
                </select>
              </div>
            )}

            {/* Withdrawal Specific: Staff Selection */}
            {entryType === 'withdrawal' && beneficiaryType === 'staff' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  تحديد الصبية <span className="text-rose-500">*</span>
                </label>
                <select
                  value={withdrawalStaffId}
                  onChange={(e) => setWithdrawalStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  required
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                المبلغ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm font-semibold"
                required
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
              >
                <option value="SYP">ليرة سورية (SYP)</option>
                <option value="USD">دولار أمريكي ($)</option>
              </select>
            </div>

            {/* Exchange Rate if USD */}
            {currency === 'USD' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">سعر الصرف المعتمد</label>
                <input
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            )}

            {/* Expense Description */}
            {entryType === 'expense' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  وصف المصروف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="بيان تفصيلي للمصروف الخاص بجهاز أو قسم الليزر"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                  required
                />
              </div>
            )}

            {/* Withdrawal Notes */}
            {entryType === 'withdrawal' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ملاحظات / سبب السحب</label>
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية عن عملية السحب"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-md ${
                entryType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : entryType === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-50`}
            >
              <PlusCircle className="w-5 h-5" />
              {submitting ? 'جاري التسجيل...' : 'حفظ الحركة'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <History className="w-5 h-5 text-slate-500" />
            <span>آخر حركات صندوق الليزر المسجلة مؤخراً</span>
          </div>
          <button
            onClick={fetchRecentLogs}
            disabled={loadingRecent}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRecent ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Income & Expense Transactions */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">حركات المقبوضات والمصاريف</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">المريضة / الوصف</th>
                    <th className="p-2.5">الصبية / الضربات</th>
                    <th className="p-2.5">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTx.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">لا توجد حركات ليزر مسجلة حتى الآن</td>
                    </tr>
                  ) : (
                    recentTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-2.5 whitespace-nowrap text-slate-600">{tx.date}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          {tx.type === 'income' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">قبض</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">صرف</span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {tx.type === 'income' ? tx.patient_name : tx.description || 'مصروف'}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {tx.type === 'income' ? (
                            <span>{tx.laser_staff?.name || '-'} ({tx.shots_count} ضربة)</span>
                          ) : '-'}
                        </td>
                        <td className="p-2.5 font-bold whitespace-nowrap">
                          <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                            {Number(tx.amount).toLocaleString()} {tx.currency}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Withdrawals */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">حركات السحوبات المسجلة</h3>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">جهة الاستفادة</th>
                    <th className="p-2.5">المبلغ</th>
                    <th className="p-2.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentWd.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">لا توجد سحوبات مسجلة</td>
                    </tr>
                  ) : (
                    recentWd.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="p-2.5 whitespace-nowrap text-slate-600">{w.date}</td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {w.beneficiary_type === 'staff'
                            ? `صبية: ${w.laser_staff?.name || 'محددة'}`
                            : w.beneficiary_type === 'doctor'
                            ? 'الدكتور جهاد'
                            : 'المركز'}
                        </td>
                        <td className="p-2.5 font-bold text-amber-600 whitespace-nowrap">
                          {Number(w.amount).toLocaleString()} {w.currency}
                        </td>
                        <td className="p-2.5 text-slate-500">{w.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
