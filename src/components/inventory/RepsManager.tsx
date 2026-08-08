import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Rep } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Users, UserPlus, Phone, AlertCircle, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';

export const RepsManager: React.FC = () => {
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';

  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reps')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setReps(data);
    } catch (err: any) {
      console.error('Error fetching reps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const handleCreateRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم المندوب.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reps').insert([
        {
          name: name.trim(),
          phone: phone.trim() || null,
          is_active: true,
        },
      ]);

      if (error) throw error;

      setSuccessMsg(`تم إضافة المندوب "${name}" بنجاح.`);
      setName('');
      setPhone('');
      fetchReps();
    } catch (err: any) {
      console.error('Error adding rep:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إضافة المندوب.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rep: Rep) => {
    if (!isOwner) return;
    try {
      const { error } = await supabase
        .from('reps')
        .update({ is_active: !rep.is_active })
        .eq('id', rep.id);

      if (error) throw error;
      fetchReps();
    } catch (err: any) {
      console.error('Error toggling rep active status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form (Owner write only) */}
        {isOwner ? (
          <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700/60">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h3 className="font-extrabold text-sm text-white">إضافة مندوب مبيعات جديد</h3>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
              💡 <strong>تنبيه للـ Owner:</strong> لإنشاء رابط دخول لهذا المندوب، اطلب منه التسجيل عبر صفحة إنشاء حساب، ثم اربط حسابه من شاشة إدارة المستخدمين.
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateRep} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم المندوب كامل <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد الحمصي (شركة الفارابي)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف / للتواصل</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>حفظ المندوب</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-center text-slate-400 text-xs">
            صلاحية إضافة وتعطيل المندوبين حصرية لمالك المركز. السكرتير يستعرض القائمة فقط.
          </div>
        )}

        {/* Reps List */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="font-extrabold text-sm text-white">قائمة المندوبين المعتمدين</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                {reps.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
              <span>جاري تحميل قائمة المندوبين...</span>
            </div>
          ) : reps.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-700/40">
              لا يوجد مندوبون مسجلون حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم المندوب</th>
                    <th className="p-3">الهاتف</th>
                    <th className="p-3">الحالة</th>
                    {isOwner && <th className="p-3 text-center">الإجراء</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reps.map((rep, idx) => (
                    <tr key={rep.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-100">{rep.name}</td>
                      <td className="p-3 font-mono text-slate-300 dir-ltr text-right">
                        {rep.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {rep.phone}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3">
                        {rep.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            نشط
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            معطل
                          </span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(rep)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              rep.is_active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {rep.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
