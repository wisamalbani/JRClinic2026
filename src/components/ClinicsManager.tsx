import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Clinic, DoctorPercentageHistory } from '../types';
import {
  getClinicsWithCurrentPercentage,
  getClinicPercentageHistory,
} from '../services/doctorPercentage';
import {
  Building2,
  Plus,
  Percent,
  History,
  Search,
  Calendar,
  AlertCircle,
  X,
  UserCheck,
  CheckCircle2,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';

interface ClinicWithPercentage extends Clinic {
  current_percentage: number | null;
  current_effective_date: string | null;
}

export const ClinicsManager: React.FC = () => {
  const { user, profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [clinics, setClinics] = useState<ClinicWithPercentage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [isAddClinicOpen, setIsAddClinicOpen] = useState<boolean>(false);
  const [isUpdatePercentageOpen, setIsUpdatePercentageOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const [selectedClinic, setSelectedClinic] = useState<ClinicWithPercentage | null>(null);
  const [historyRecords, setHistoryRecords] = useState<DoctorPercentageHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Form States - New Clinic
  const [newNumber, setNewNumber] = useState<string>('');
  const [newDoctorName, setNewDoctorName] = useState<string>('');
  const [newSpecialty, setNewSpecialty] = useState<string>('');
  const [newInitialPercentage, setNewInitialPercentage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form States - Update Percentage
  const [updatePercentageValue, setUpdatePercentageValue] = useState<string>('');
  const [updateEffectiveFrom, setUpdateEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchClinicsData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getClinicsWithCurrentPercentage();
      setClinics(data);
    } catch (err: unknown) {
      console.error('Error fetching clinics:', err);
      setErrorMsg('حدث خطأ أثناء تحميل بيانات العيادات ونسب الأطباء.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClinicsData();
  }, [fetchClinicsData]);

  // Handle Add New Clinic
  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newNumber.trim() || !newDoctorName.trim() || !newSpecialty.trim()) {
      setErrorMsg('جميع الحقول مطلوبة (رقم العيادة، اسم الطبيب، التخصص).');
      return;
    }

    const initialPercentageNum = parseFloat(newInitialPercentage);
    if (isNaN(initialPercentageNum) || initialPercentageNum < 0 || initialPercentageNum > 100) {
      setErrorMsg('يرجى إدخال نسبة مئوية صحيحة بين 0 و 100.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert into clinics
      const { data: clinicData, error: clinicErr } = await supabase
        .from('clinics')
        .insert({
          number: newNumber.trim(),
          doctor_name: newDoctorName.trim(),
          specialty: newSpecialty.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (clinicErr || !clinicData) {
        throw clinicErr || new Error('فشل إضافة العيادة');
      }

      // 2. Insert initial doctor percentage history record
      const todayStr = new Date().toISOString().split('T')[0];
      const { error: historyErr } = await supabase
        .from('doctor_percentage_history')
        .insert({
          clinic_id: clinicData.id,
          percentage: initialPercentageNum,
          effective_from: todayStr,
          created_by: user?.id || null,
        });

      if (historyErr) {
        console.error('Error inserting percentage history:', historyErr);
      }

      setSuccessMsg(`تمت إضافة العيادة رقم (${newNumber}) بنجاح وتعيين النسبة الأولية (${initialPercentageNum}%).`);
      setNewNumber('');
      setNewDoctorName('');
      setNewSpecialty('');
      setNewInitialPercentage('');
      setIsAddClinicOpen(false);
      await fetchClinicsData();
    } catch (err: unknown) {
      console.error('Error creating clinic:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setErrorMsg(`تعذر إضافة العيادة: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open Update Percentage Modal
  const openUpdatePercentageModal = (clinic: ClinicWithPercentage) => {
    setSelectedClinic(clinic);
    setUpdatePercentageValue(
      clinic.current_percentage !== null ? String(clinic.current_percentage) : ''
    );
    setUpdateEffectiveFrom(new Date().toISOString().split('T')[0]);
    setIsUpdatePercentageOpen(true);
  };

  // Handle Submit Update Percentage (Inserts NEW row, NEVER modifies old ones)
  const handleUpdatePercentageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const percentageNum = parseFloat(updatePercentageValue);
    if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
      setErrorMsg('يرجى إدخال نسبة مئوية صحيحة بين 0 و 100.');
      return;
    }

    if (!updateEffectiveFrom) {
      setErrorMsg('يرجى تحديد تاريخ بداية سريان النسبة.');
      return;
    }

    setSubmitting(true);
    try {
      // Insert NEW row in doctor_percentage_history (do NOT update or delete old ones)
      const { error: insertErr } = await supabase
        .from('doctor_percentage_history')
        .insert({
          clinic_id: selectedClinic.id,
          percentage: percentageNum,
          effective_from: updateEffectiveFrom,
          created_by: user?.id || null,
        });

      if (insertErr) {
        throw insertErr;
      }

      setSuccessMsg(
        `تم إضافة النسبة الجديدة (${percentageNum}%) للعيادة (${selectedClinic.number}) بتاريخ سريان ${updateEffectiveFrom} بنجاح.`
      );
      setIsUpdatePercentageOpen(false);
      setSelectedClinic(null);
      await fetchClinicsData();
    } catch (err: unknown) {
      console.error('Error adding new percentage record:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setErrorMsg(`تعذر تحديث نسبة الطبيب: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open History Modal
  const openHistoryModal = async (clinic: ClinicWithPercentage) => {
    setSelectedClinic(clinic);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const history = await getClinicPercentageHistory(clinic.id);
      setHistoryRecords(history);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtered Clinics
  const filteredClinics = clinics.filter(
    (c) =>
      c.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOwner) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center my-6">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">صلاحية غير متاحة</h3>
        <p className="text-slate-400 text-sm">
          إدارة العيادات ونسب الأطباء مقتصرة حصرياً على مالك المركز (Owner).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>إدارة العيادات ونسب الأطباء</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                المرحلة الثالثة
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إضافة العيادات وتتبع سجل النسبة التاريخية للأطباء بدون تعديل السجلات القديمة
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddClinicOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عيادة جديدة</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم العيادة، اسم الطبيب، أو التخصص..."
            className="w-full pl-3 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 self-end sm:self-auto">
          <span className="bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl font-medium">
            إجمالي العيادات: <strong className="text-white font-mono">{clinics.length}</strong>
          </span>
        </div>
      </div>

      {/* Clinics Table / Cards */}
      {loading ? (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400 text-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-3"></div>
          <p>جاري تحميل العيادات والنسب التاريخية...</p>
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400 text-xs">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-300">لا توجد عيادات مسجلة مطابقة للبحث</p>
          <p className="text-slate-500 mt-1">يمكنك إضافة عيادة جديدة من خلال الزر أعلاه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between shadow-md"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-mono font-bold">
                      عيادة {clinic.number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        clinic.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {clinic.is_active ? 'نشطة' : 'غير نشطة'}
                    </span>
                  </div>

                  <button
                    onClick={() => openHistoryModal(clinic)}
                    className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1.5 px-2 py-1 bg-slate-700/40 rounded-lg border border-slate-600/40 transition-colors"
                    title="سجل تعديل النسب التاريخي"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>السجل التاريخي</span>
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400">الطبيب:</span>
                    <strong className="text-xs font-bold text-slate-100">{clinic.doctor_name}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400">التخصص:</span>
                    <span className="text-xs text-slate-200">{clinic.specialty}</span>
                  </div>
                </div>

                {/* Percentage Highlight Card */}
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between my-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">النسبة الحالية السارية</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        منذ: {clinic.current_effective_date || 'غير محدد'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {clinic.current_percentage !== null ? `${clinic.current_percentage}%` : 'غير محددة'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-700/60 mt-2 flex items-center gap-2">
                <button
                  onClick={() => openUpdatePercentageModal(clinic)}
                  className="w-full py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-600/60 transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تعديل النسبة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Clinic */}
      {isAddClinicOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl dir-rtl">
            <div className="p-5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">إضافة عيادة جديدة</h3>
              </div>
              <button
                onClick={() => setIsAddClinicOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClinic} className="p-6 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                💡 <strong>تنبيه للـ Owner:</strong> لإنشاء رابط دخول لهذا الطبيب، اطلب منه التسجيل عبر صفحة إنشاء حساب، ثم اربط حسابه من شاشة إدارة المستخدمين.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  رقم العيادة <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="مثال: 101 أو C1"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم الطبيب <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  placeholder="مثال: د. أحمد المحمود"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  التخصص <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="مثال: طب وجراحة الأسنان"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  النسبة الأولية للطبيب (%) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newInitialPercentage}
                    onChange={(e) => setNewInitialPercentage(e.target.value)}
                    placeholder="مثال: 50"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  سيتم تسجيل هذه النسبة في سجل النسبة التاريخية بتاريخ اليوم.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddClinicOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ العيادة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Percentage (Inserts NEW record, NEVER modifies old ones) */}
      {isUpdatePercentageOpen && selectedClinic && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl dir-rtl">
            <div className="p-5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">تعديل نسبة الطبيب</h3>
                  <p className="text-xs text-slate-400">
                    عيادة {selectedClinic.number} - {selectedClinic.doctor_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdatePercentageOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePercentageSubmit} className="p-6 space-y-4">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
                <strong>ملاحظة هامة:</strong> يتّبع النظام سجل النسبة التاريخي، حيث يتم إضافة سطر جديد بتاريخ بداية السريان المحدد ولا يتم تعديل أو حذف السجلات القديمة نهائياً.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  النسبة الجديدة (%) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={updatePercentageValue}
                    onChange={(e) => setUpdatePercentageValue(e.target.value)}
                    placeholder="مثال: 55"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تاريخ بداية السريان (effective_from) <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={updateEffectiveFrom}
                  onChange={(e) => setUpdateEffectiveFrom(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  تصبح هذه النسبة سارية المفعول بدءاً من التاريخ المحدد وتُعتمد في تقارير الحسابات اللاحقة.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdatePercentageOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  {submitting ? 'جاري الإضافة...' : 'إضافة النسبة الجديدة للسجل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Percentage History */}
      {isHistoryOpen && selectedClinic && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl dir-rtl">
            <div className="p-5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">سجل النسبة التاريخية للعيادة</h3>
                  <p className="text-xs text-slate-400">
                    عيادة {selectedClinic.number} - {selectedClinic.doctor_name} ({selectedClinic.specialty})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {historyLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2"></div>
                  <p>جاري تحميل السجل التاريخي...</p>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  لا يوجد سجل نسبة تاريخية مسجل لهذه العيادة.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                    <span>جميع التعديلات مرتبة حسب تاريخ السريان الأحدث:</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      عدد السجلات: {historyRecords.length}
                    </span>
                  </div>

                  {historyRecords.map((item, idx) => {
                    const isLatestActive = idx === 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          isLatestActive
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm ${
                              isLatestActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/60 text-slate-300'
                            }`}
                          >
                            {item.percentage}%
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">
                                نسبة الطبيب: {item.percentage}%
                              </span>
                              {isLatestActive && (
                                <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                                  السارية حالياً
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                تاريخ بداية السريان:{' '}
                                <strong className="text-slate-300 font-mono">
                                  {item.effective_from}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left text-[10px] text-slate-500 font-mono">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-EG') : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
