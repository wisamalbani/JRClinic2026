import React, { useState, useEffect } from 'react';
import {
  LaserStaff,
  LaserStaffPercentageHistory,
  LaserStaffSalaryHistory,
  LaserShotRateHistory,
} from '../../types';
import {
  getLaserStaff,
  addLaserStaff,
  toggleLaserStaffActive,
  getLaserStaffPercentageHistory,
  addLaserStaffPercentage,
  getLaserStaffSalaryHistory,
  addLaserStaffSalary,
  getLaserShotRateHistory,
  addLaserShotRate,
} from '../../services/laser';
import { Settings, Users, Percent, DollarSign, Wrench, Plus, CheckCircle, XCircle } from 'lucide-react';

export const LaserSettingsManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'percentage' | 'salary' | 'shot_rate'>('percentage');

  const [staffList, setStaffList] = useState<LaserStaff[]>([]);
  const [percentages, setPercentages] = useState<LaserStaffPercentageHistory[]>([]);
  const [salaries, setSalaries] = useState<LaserStaffSalaryHistory[]>([]);
  const [shotRates, setShotRates] = useState<LaserShotRateHistory[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Forms state
  const [newStaffName, setNewStaffName] = useState<string>('');

  const [pctStaffId, setPctStaffId] = useState<string>('');
  const [pctValue, setPctValue] = useState<string>('');
  const [pctEffectiveFrom, setPctEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);

  const [salStaffId, setSalStaffId] = useState<string>('');
  const [salAmount, setSalAmount] = useState<string>('');
  const [salCurrency, setSalCurrency] = useState<string>('SYP');
  const [salEffectiveFrom, setSalEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);

  const [rateValue, setRateValue] = useState<string>('');
  const [rateCurrency, setRateCurrency] = useState<string>('SYP');
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [staff, pct, sal, rates] = await Promise.all([
        getLaserStaff(),
        getLaserStaffPercentageHistory(),
        getLaserStaffSalaryHistory(),
        getLaserShotRateHistory(),
      ]);

      setStaffList(staff);
      setPercentages(pct);
      setSalaries(sal);
      setShotRates(rates);

      if (staff.length > 0) {
        if (!pctStaffId) setPctStaffId(staff[0].id);
        if (!salStaffId) setSalStaffId(staff[0].id);
      }
    } catch (err: any) {
      console.error('Error loading laser settings:', err);
      setMessage({ type: 'error', text: 'فشل في تحميل الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  // Staff Management
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    try {
      await addLaserStaff(newStaffName.trim());
      setNewStaffName('');
      setMessage({ type: 'success', text: 'تمت إضافة الصبية بنجاح' });
      loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء إضافة الصبية' });
    }
  };

  const handleToggleStaff = async (id: string, currentActive: boolean) => {
    try {
      await toggleLaserStaffActive(id, !currentActive);
      setMessage({ type: 'success', text: 'تم تحديث حالة الصبية' });
      loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء تعديل الحالة' });
    }
  };

  // Percentage Management
  const handleAddPercentage = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(pctValue);
    if (isNaN(val) || val < 0 || val > 100) {
      setMessage({ type: 'error', text: 'يرجى إدخال نسبة مئوية صحيحة بين 0 و 100' });
      return;
    }
    if (!pctStaffId) {
      setMessage({ type: 'error', text: 'يرجى اختيار الصبية' });
      return;
    }

    try {
      await addLaserStaffPercentage(pctStaffId, val, pctEffectiveFrom);
      setPctValue('');
      setMessage({ type: 'success', text: 'تم تسجيل النسبة التاريخية بنجاح' });
      loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء إضافة النسبة' });
    }
  };

  // Salary Management
  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(salAmount);
    if (isNaN(val) || val < 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال مبلغ راتب صحيح' });
      return;
    }
    if (!salStaffId) {
      setMessage({ type: 'error', text: 'يرجى اختيار الصبية' });
      return;
    }

    try {
      await addLaserStaffSalary(salStaffId, val, salCurrency, salEffectiveFrom);
      setSalAmount('');
      setMessage({ type: 'success', text: 'تم تسجيل الراتب التاريخي بنجاح' });
      loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء إضافة الراتب' });
    }
  };

  // Shot Rate Management
  const handleAddShotRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rateValue);
    if (isNaN(val) || val < 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال سعر ضربة صحيح' });
      return;
    }

    try {
      await addLaserShotRate(val, rateCurrency, rateEffectiveFrom);
      setRateValue('');
      setMessage({ type: 'success', text: 'تم تسجيل سعر الضربة بنجاح' });
      loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء إضافة سعر الضربة' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">إدارة نسب وراتب وسعر صيانة جهاز الليزر</h2>
            <p className="text-xs text-slate-500 mt-0.5">خاص بمالك المركز (Owner) - إدارة الكادر والنسب والرواتب ومخصصات الصيانة بتاريخ سريان</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 mb-6">
          <button
            onClick={() => { setActiveSubTab('percentage'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'percentage'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Percent className="w-4 h-4" />
            نسب الصبايا (%)
          </button>

          <button
            onClick={() => { setActiveSubTab('salary'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'salary'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            الرواتب الشهرية
          </button>

          <button
            onClick={() => { setActiveSubTab('shot_rate'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'shot_rate'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            سعر الضربة (صيانة الجهاز)
          </button>

          <button
            onClick={() => { setActiveSubTab('staff'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'staff'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            إدارة كادر الليزر (الصبايا)
          </button>
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

        {/* TAB 1: PERCENTAGES */}
        {activeSubTab === 'percentage' && (
          <div className="space-y-6">
            <form onSubmit={handleAddPercentage} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">إضافة نسبة جديدة للصبية بتاريخ سريان</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصبية</label>
                  <select
                    value={pctStaffId}
                    onChange={(e) => setPctStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">النسبة (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 15"
                    value={pctValue}
                    onChange={(e) => setPctValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ السريان (Effective From)</label>
                  <input
                    type="date"
                    value={pctEffectiveFrom}
                    onChange={(e) => setPctEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  حفظ النسبة
                </button>
              </div>
            </form>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">سجل النسب التاريخي</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">اسم الصبية</th>
                      <th className="p-3">النسبة المئوية</th>
                      <th className="p-3">تاريخ السريان</th>
                      <th className="p-3">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {percentages.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">لا يوجد سجل نسب تاريخي مسجل</td>
                      </tr>
                    ) : (
                      percentages.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{p.laser_staff?.name || '-'}</td>
                          <td className="p-3 font-bold text-rose-600">{p.percentage}%</td>
                          <td className="p-3 font-medium text-slate-700">{p.effective_from}</td>
                          <td className="p-3 text-slate-400">{p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SY') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALARIES */}
        {activeSubTab === 'salary' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSalary} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">إضافة راتب شهري للصبية بتاريخ سريان</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصبية</label>
                  <select
                    value={salStaffId}
                    onChange={(e) => setSalStaffId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الراتب الشهري</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="مثال: 1500000"
                    value={salAmount}
                    onChange={(e) => setSalAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العملة</label>
                  <select
                    value={salCurrency}
                    onChange={(e) => setSalCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="SYP">ليرة سورية (SYP)</option>
                    <option value="USD">دولار أمريكي ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ السريان</label>
                  <input
                    type="date"
                    value={salEffectiveFrom}
                    onChange={(e) => setSalEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  حفظ الراتب
                </button>
              </div>
            </form>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">سجل الرواتب التاريخي</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">اسم الصبية</th>
                      <th className="p-3">الراتب الشهري</th>
                      <th className="p-3">تاريخ السريان</th>
                      <th className="p-3">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">لا يوجد سجل رواتب تاريخي</td>
                      </tr>
                    ) : (
                      salaries.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{s.laser_staff?.name || '-'}</td>
                          <td className="p-3 font-bold text-emerald-600">{Number(s.amount).toLocaleString()} {s.currency}</td>
                          <td className="p-3 font-medium text-slate-700">{s.effective_from}</td>
                          <td className="p-3 text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-SY') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SHOT RATES */}
        {activeSubTab === 'shot_rate' && (
          <div className="space-y-6">
            <form onSubmit={handleAddShotRate} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">إضافة سعر ضربة صيانة للجهاز بتاريخ سريان</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">سعر الضربة الواحدة</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="مثال: 12"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">العملة</label>
                  <select
                    value={rateCurrency}
                    onChange={(e) => setRateCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="SYP">ليرة سورية (SYP)</option>
                    <option value="USD">دولار أمريكي ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ السريان</label>
                  <input
                    type="date"
                    value={rateEffectiveFrom}
                    onChange={(e) => setRateEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  حفظ سعر الضربة
                </button>
              </div>
            </form>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">سجل أسعار الضربة التاريخي للصيانة</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">سعر الضربة الواحدة</th>
                      <th className="p-3">تاريخ السريان</th>
                      <th className="p-3">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shotRates.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-slate-400">لا يوجد سجل لأسعار الضربات</td>
                      </tr>
                    ) : (
                      shotRates.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-amber-600">{Number(r.rate_per_shot).toLocaleString()} {r.currency} / ضربة</td>
                          <td className="p-3 font-medium text-slate-700">{r.effective_from}</td>
                          <td className="p-3 text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SY') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF MANAGEMENT */}
        {activeSubTab === 'staff' && (
          <div className="space-y-6">
            <form onSubmit={handleAddStaff} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الصبية الجديدة</label>
                <input
                  type="text"
                  placeholder="مثال: روان / عبير / خديجة..."
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all shadow-sm h-10"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </form>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">قائمة صبايا قسم الليزر</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3">اسم الصبية</th>
                      <th className="p-3">الحالة الحالية</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{s.name}</td>
                        <td className="p-3">
                          {s.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="w-3 h-3" /> نشطة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                              <XCircle className="w-3 h-3" /> غير نشطة
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStaff(s.id, s.is_active)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                              s.is_active
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {s.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
