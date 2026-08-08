import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Role, Clinic, Rep } from '../types';
import { getAllUsers, updateUserLinking } from '../services/usersAndPermissions';
import { Users, UserCheck, Shield, Building2, Briefcase, CheckCircle, XCircle, Save, RefreshCw, Info } from 'lucide-react';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local editing states per user row
  const [userEdits, setUserEdits] = useState<Record<string, {
    role: Role;
    linked_clinic_id: string | null;
    linked_rep_id: string | null;
    is_active: boolean;
  }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [usersData, clinicsRes, repsRes] = await Promise.all([
        getAllUsers(),
        supabase.from('clinics').select('*').order('number', { ascending: true }),
        supabase.from('reps').select('*').order('name', { ascending: true }),
      ]);

      setUsers(usersData);
      setClinics(clinicsRes.data || []);
      setReps(repsRes.data || []);

      // Initialize editing state
      const initialEdits: Record<string, any> = {};
      usersData.forEach((u) => {
        initialEdits[u.id] = {
          role: u.role || 'secretary',
          linked_clinic_id: u.linked_clinic_id || null,
          linked_rep_id: u.linked_rep_id || null,
          is_active: u.is_active ?? true,
        };
      });
      setUserEdits(initialEdits);
    } catch (err: any) {
      console.error('Error loading users manager data:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء تحميل بيانات المستخدمين' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        role: newRole,
        // Reset clinic or rep if role changes to non-doctor/non-rep
        linked_clinic_id: newRole === 'doctor' ? prev[userId]?.linked_clinic_id : null,
        linked_rep_id: newRole === 'rep' ? prev[userId]?.linked_rep_id : null,
      },
    }));
  };

  const handleClinicChange = (userId: string, clinicId: string) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        linked_clinic_id: clinicId || null,
      },
    }));
  };

  const handleRepChange = (userId: string, repId: string) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        linked_rep_id: repId || null,
      },
    }));
  };

  const handleToggleActive = (userId: string) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        is_active: !prev[userId]?.is_active,
      },
    }));
  };

  const handleSaveUser = async (user: UserProfile) => {
    const edits = userEdits[user.id];
    if (!edits) return;

    if (edits.role === 'doctor' && !edits.linked_clinic_id) {
      setMessage({ type: 'error', text: `يرجى اختيار العيادة التي يتبع لها الطبيب (${user.email})` });
      return;
    }

    if (edits.role === 'rep' && !edits.linked_rep_id) {
      setMessage({ type: 'error', text: `يرجى اختيار المندوب المرتبط بالحساب (${user.email})` });
      return;
    }

    setSavingUserId(user.id);
    setMessage(null);
    try {
      await updateUserLinking(user.id, {
        role: edits.role,
        linked_clinic_id: edits.role === 'doctor' ? edits.linked_clinic_id : null,
        linked_rep_id: edits.role === 'rep' ? edits.linked_rep_id : null,
        is_active: edits.is_active,
      });

      setMessage({ type: 'success', text: `تم تحديث بيانات وتصاريح الحساب (${user.email}) بنجاح` });
      await loadData();
    } catch (err: any) {
      console.error('Error updating user:', err);
      setMessage({ type: 'error', text: err.message || 'خطأ أثناء تحديث بيانات الحساب' });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">إدارة المستخدمين والأدوار الربط البرمجي</h2>
              <p className="text-xs text-slate-500 mt-0.5">ربط حسابات المستخدِمين المسجّلين بالعيادات والأطباء والمندوبين مع التحكم بالصلاحيات</p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث القائمة
          </button>
        </div>

        {/* Notice Info Banner */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3 text-xs text-indigo-900">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">آلية عمل إضافة وتأهيل الأطباء والمندوبين:</p>
            <p className="text-slate-600 leading-relaxed">
              عند رغبة طبيب أو مندوب بالدخول إلى النظام، اطلب منه التسجيل أولاً عبر صفحة إنشاء حساب (Sign Up).
              بعد التسجيل، ستظهر عضويته في هذه القائمة مباشرة بدور افتراضي (سكرتارية)، ومن هنا يمكنك تحويل حسابه إلى طبيب واختيار عيادته، أو تحويله إلى مندوب واختيار اسمه المرتبط.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs">جاري تحميل حسابات المستخدمين...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            لا يوجد مستخدمين مسجلين في النظام حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">البريد الإلكتروني / الحساب</th>
                  <th className="p-4">الدور / الصلاحية</th>
                  <th className="p-4">الربط بالجهة (عيادة / مندوب)</th>
                  <th className="p-4 text-center">حالة الحساب</th>
                  <th className="p-4 text-center">إجراءات الحفظ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const edits = userEdits[u.id] || {
                    role: u.role,
                    linked_clinic_id: u.linked_clinic_id,
                    linked_rep_id: u.linked_rep_id,
                    is_active: u.is_active,
                  };

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      {/* Email & Full Name */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{u.email}</div>
                        {u.full_name && <div className="text-slate-400 text-[11px] mt-0.5">{u.full_name}</div>}
                        <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {u.auth_id?.substring(0, 8)}...</div>
                      </td>

                      {/* Role Select */}
                      <td className="p-4">
                        <select
                          value={edits.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="w-full max-w-[160px] px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="owner">مالك المركز (Owner)</option>
                          <option value="secretary">سكرتارية (Secretary)</option>
                          <option value="doctor">طبيب (Doctor)</option>
                          <option value="rep">مندوب (Rep)</option>
                          <option value="laser_staff">موظفة ليزر (Laser Staff)</option>
                        </select>
                      </td>

                      {/* Linking Select (Clinic or Rep) */}
                      <td className="p-4">
                        {edits.role === 'doctor' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">اختر العيادة المرتبطة:</label>
                            <select
                              value={edits.linked_clinic_id || ''}
                              onChange={(e) => handleClinicChange(u.id, e.target.value)}
                              className="w-full max-w-[200px] px-3 py-1.5 border border-amber-300 bg-amber-50/50 rounded-lg text-xs font-bold text-slate-800"
                            >
                              <option value="">-- حدد عيادة الطبيب --</option>
                              {clinics.map((c) => (
                                <option key={c.id} value={c.id}>
                                  عيادة {c.number} ({c.doctor_name})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {edits.role === 'rep' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">اختر المندوب المرتبط:</label>
                            <select
                              value={edits.linked_rep_id || ''}
                              onChange={(e) => handleRepChange(u.id, e.target.value)}
                              className="w-full max-w-[200px] px-3 py-1.5 border border-purple-300 bg-purple-50/50 rounded-lg text-xs font-bold text-slate-800"
                            >
                              <option value="">-- حدد المندوب --</option>
                              {reps.map((r) => (
                                <option key={r.id} value={r.id}>
                                  المندوب: {r.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {edits.role !== 'doctor' && edits.role !== 'rep' && (
                          <span className="text-slate-400 text-xs font-medium">غير محتاج لربط إضافي</span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            edits.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {edits.is_active ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>مفعّل</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>معطّل</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Save Button */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleSaveUser(u)}
                          disabled={savingUserId === u.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingUserId === u.id ? 'جاري الحفظ...' : 'حفظ'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
