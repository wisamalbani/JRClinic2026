import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Role, Clinic, Rep, LaserStaff } from '../types';
import { getAllUsers, updateUserLinking, deleteUserAccount } from '../services/usersAndPermissions';
import {
  Users,
  UserPlus,
  Shield,
  Building2,
  Briefcase,
  Sparkles,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Info,
  Lock,
  Mail,
  Eye,
  AlertCircle,
  UserCheck,
  Trash2,
} from 'lucide-react';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [laserStaffList, setLaserStaffList] = useState<LaserStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [currentUserAuthId, setCurrentUserAuthId] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New User Creation Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<Role>('secretary');
  const [newClinicId, setNewClinicId] = useState('');
  const [newRepId, setNewRepId] = useState('');
  const [newLaserStaffId, setNewLaserStaffId] = useState('');

  // Local editing states per user row
  const [userEdits, setUserEdits] = useState<
    Record<
      string,
      {
        role: Role;
        linked_clinic_id: string | null;
        linked_rep_id: string | null;
        linked_laser_staff_id: string | null;
        is_active: boolean;
      }
    >
  >({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserAuthId(data.user.id);
      }
    });
    loadData();
  }, []);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    if (currentUserAuthId && (userToDelete.auth_id === currentUserAuthId || userToDelete.id === currentUserAuthId)) {
      setMessage({ type: 'error', text: 'لا يمكنك حذف حسابك الشخصي (حساب المالك الحالي)' });
      setUserToDelete(null);
      return;
    }

    setDeletingUserId(userToDelete.id);
    setMessage(null);

    try {
      await deleteUserAccount(userToDelete.id, userToDelete.auth_id);
      setMessage({
        type: 'success',
        text: `تم حذف حساب المستخدم (${userToDelete.email}) بنجاح!`,
      });
      setUserToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setMessage({
        type: 'error',
        text: `خطأ أثناء حذف الحساب: ${err.message || 'فشل حذف المستخدم'}`,
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [usersData, clinicsRes, repsRes, staffRes] = await Promise.all([
        getAllUsers(),
        supabase.from('clinics').select('*').order('number', { ascending: true }),
        supabase.from('reps').select('*').order('name', { ascending: true }),
        supabase.from('laser_staff').select('*').order('name', { ascending: true }),
      ]);

      setUsers(usersData);
      setClinics(clinicsRes.data || []);
      setReps(repsRes.data || []);
      setLaserStaffList(staffRes.data || []);

      // Initialize editing state
      const initialEdits: Record<string, any> = {};
      usersData.forEach((u) => {
        initialEdits[u.id] = {
          role: u.role || 'secretary',
          linked_clinic_id: u.linked_clinic_id || null,
          linked_rep_id: u.linked_rep_id || null,
          linked_laser_staff_id: u.linked_laser_staff_id || null,
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

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newEmail.trim() || !newPassword.trim()) {
      setMessage({ type: 'error', text: 'يرجى كتابة البريد الإلكتروني وكلمة المرور' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل' });
      return;
    }

    if (newRole === 'doctor' && !newClinicId) {
      setMessage({ type: 'error', text: 'يرجى حديد العيادة المرتبطة بالطبيب' });
      return;
    }

    if (newRole === 'rep' && !newRepId) {
      setMessage({ type: 'error', text: 'يرجى تحديد المندوب المرتبط بالحساب' });
      return;
    }

    if (newRole === 'laser_staff' && !newLaserStaffId) {
      setMessage({ type: 'error', text: 'يرجى تحديد الصبية المرتبطة بكادر الليزر' });
      return;
    }

    setCreatingUser(true);

    try {
      // Invoke Supabase Edge Function 'admin-create-user'
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newEmail.trim(),
          password: newPassword,
          full_name: newFullName.trim() || undefined,
          role: newRole,
          linked_clinic_id: newRole === 'doctor' ? newClinicId : null,
          linked_rep_id: newRole === 'rep' ? newRepId : null,
          linked_laser_staff_id: newRole === 'laser_staff' ? newLaserStaffId : null,
        },
      });

      // Check for server-side error or failure flag in response
      if (error || !data || data.success === false || data.error) {
        const serverErrorMessage =
          data?.error ||
          data?.message ||
          error?.message ||
          'فشل استدعاء دالة إنشاء المستخدم admin-create-user';
        throw new Error(serverErrorMessage);
      }

      setMessage({
        type: 'success',
        text: `تم إنشاء حساب المستخدم (${newEmail}) بنجاح وتعيين دور (${newRole})!`,
      });

      // Reset form
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('secretary');
      setNewClinicId('');
      setNewRepId('');
      setNewLaserStaffId('');

      await loadData();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setMessage({
        type: 'error',
        text: `خطأ أثناء إنشاء الحساب: ${err.message || 'تأكد من نشر Supabase Edge Function (admin-create-user) ووجود SUPABASE_SERVICE_ROLE_KEY'}`,
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        role: newRole,
        linked_clinic_id: newRole === 'doctor' ? prev[userId]?.linked_clinic_id : null,
        linked_rep_id: newRole === 'rep' ? prev[userId]?.linked_rep_id : null,
        linked_laser_staff_id: newRole === 'laser_staff' ? prev[userId]?.linked_laser_staff_id : null,
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

  const handleLaserStaffChange = (userId: string, staffId: string) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        linked_laser_staff_id: staffId || null,
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

    if (edits.role === 'laser_staff' && !edits.linked_laser_staff_id) {
      setMessage({ type: 'error', text: `يرجى اختيار عضو كادر الليزر المرتبط بالحساب (${user.email})` });
      return;
    }

    setSavingUserId(user.id);
    setMessage(null);
    try {
      await updateUserLinking(user.id, {
        role: edits.role,
        linked_clinic_id: edits.role === 'doctor' ? edits.linked_clinic_id : null,
        linked_rep_id: edits.role === 'rep' ? edits.linked_rep_id : null,
        linked_laser_staff_id: edits.role === 'laser_staff' ? edits.linked_laser_staff_id : null,
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
      {/* Header Banner */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">إدارة المستخدمين وإنشاء الحسابات (Owner Only)</h2>
            <p className="text-xs text-slate-400">
              إنشاء حسابات جديدة حصرياً عبر المالِك وإدارتها وتعيين أدوار العيادات والأطباء والمندوبين والليزر
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold border border-slate-600 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث القائمة
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* CREATE NEW USER FORM CARD */}
      <div className="bg-slate-800/90 border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
          <UserPlus className="w-5 h-5 text-blue-400" />
          <h3 className="font-extrabold text-sm text-white">إنشاء حساب مستخدم جديد بالنظام</h3>
        </div>

        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                البريد الإلكتروني <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="doctor@center.com"
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                كلمة المرور <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Full Name (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">الاسم الكامل (اختياري)</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="د. أحمد علي"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Role Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                الدور / الصلاحية <span className="text-red-400">*</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="owner">مالك المركز (Owner)</option>
                <option value="secretary">سكرتارية (Secretary)</option>
                <option value="doctor">طبيب (Doctor)</option>
                <option value="rep">مندوب شركة (Rep)</option>
                <option value="laser_staff">كادر ليزر (Laser Staff)</option>
                <option value="viewer">مشاهِد كامل (Viewer - قراءة فقط)</option>
              </select>
            </div>

            {/* Conditional Entity Dropdown */}
            {newRole === 'doctor' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-300 block">
                  ربط الحساب بفيادة الطبيب <span className="text-red-400">*</span>
                </label>
                <select
                  value={newClinicId}
                  onChange={(e) => setNewClinicId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- اختر العيادة --</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      عيادة {c.number} - د. {c.doctor_name} ({c.specialty})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newRole === 'rep' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-300 block">
                  ربط الحساب بالمندوب <span className="text-red-400">*</span>
                </label>
                <select
                  value={newRepId}
                  onChange={(e) => setNewRepId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- اختر المندوب --</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      المندوب: {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newRole === 'laser_staff' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-300 block">
                  ربط الحساب بصبية الليزر <span className="text-red-400">*</span>
                </label>
                <select
                  value={newLaserStaffId}
                  onChange={(e) => setNewLaserStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/50 text-purple-200 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- اختر كادر الليزر --</option>
                  {laserStaffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      الصبية: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Submit */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creatingUser}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creatingUser ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء الحساب عبر Edge Function</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* EXISTING USERS TABLE CARD */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white">قائمة جميع الحسابات المسجلة وحالات التفعيل</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">إجمالي الحسابات: {users.length}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-xs">جاري تحميل قائمة المستخدمين...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">لا يوجد مستخدمين مسجلين حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-3.5">البريد الإلكتروني / الحساب</th>
                  <th className="p-3.5">الدور / الصلاحية</th>
                  <th className="p-3.5">الربط البرمجي (عيادة / مندوب / ليزر)</th>
                  <th className="p-3.5 text-center">حالة الحساب</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((u) => {
                  const edits = userEdits[u.id] || {
                    role: u.role,
                    linked_clinic_id: u.linked_clinic_id,
                    linked_rep_id: u.linked_rep_id,
                    linked_laser_staff_id: u.linked_laser_staff_id,
                    is_active: u.is_active,
                  };

                  const isCurrentOwner = !!currentUserAuthId && (u.auth_id === currentUserAuthId || u.id === currentUserAuthId);

                  return (
                    <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                      {/* Email & Full Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100 text-sm">{u.email}</div>
                        {u.full_name && <div className="text-slate-400 text-[11px]">{u.full_name}</div>}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {u.auth_id?.substring(0, 8)}...
                        </div>
                      </td>

                      {/* Role Select */}
                      <td className="p-3.5">
                        <select
                          value={edits.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="owner">مالك المركز (Owner)</option>
                          <option value="secretary">سكرتارية (Secretary)</option>
                          <option value="doctor">طبيب (Doctor)</option>
                          <option value="rep">مندوب (Rep)</option>
                          <option value="laser_staff">كادر ليزر (Laser Staff)</option>
                          <option value="viewer">مشاهِد (Viewer)</option>
                        </select>
                      </td>

                      {/* Linking Select */}
                      <td className="p-3.5">
                        {edits.role === 'doctor' && (
                          <select
                            value={edits.linked_clinic_id || ''}
                            onChange={(e) => handleClinicChange(u.id, e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 font-bold text-xs"
                          >
                            <option value="">-- اختر العيادة --</option>
                            {clinics.map((c) => (
                              <option key={c.id} value={c.id}>
                                عيادة {c.number} - د. {c.doctor_name}
                              </option>
                            ))}
                          </select>
                        )}

                        {edits.role === 'rep' && (
                          <select
                            value={edits.linked_rep_id || ''}
                            onChange={(e) => handleRepChange(u.id, e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 font-bold text-xs"
                          >
                            <option value="">-- اختر المندوب --</option>
                            {reps.map((r) => (
                              <option key={r.id} value={r.id}>
                                المندوب: {r.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {edits.role === 'laser_staff' && (
                          <select
                            value={edits.linked_laser_staff_id || ''}
                            onChange={(e) => handleLaserStaffChange(u.id, e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/50 text-purple-200 font-bold text-xs"
                          >
                            <option value="">-- اختر كادر الليزر --</option>
                            {laserStaffList.map((s) => (
                              <option key={s.id} value={s.id}>
                                الصبية: {s.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {edits.role !== 'doctor' && edits.role !== 'rep' && edits.role !== 'laser_staff' && (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            edits.is_active
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {edits.is_active ? 'مفعّل' : 'معطّل'}
                        </button>
                      </td>

                      {/* Action Buttons: Save & Delete */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSaveUser(u)}
                            disabled={savingUserId === u.id || deletingUserId === u.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {savingUserId === u.id ? 'جاري الحفظ...' : 'حفظ'}
                          </button>

                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={deletingUserId === u.id || isCurrentOwner}
                            title={isCurrentOwner ? 'لا يمكنك حذف حساب المالك الحالي' : 'حذف الحساب نهائياً'}
                            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 dir-rtl">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-extrabold text-base text-white">تأكيد حذف الحساب نهائياً</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                هل أنت متأكد من حذف حساب المستخدم <strong className="text-rose-300 font-mono">{userToDelete.email}</strong>؟
              </p>
              <div className="text-rose-400 font-bold bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
                ⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه! سيتم حذف حساب Auth وكافة بيانات وصلاحيات الحساب من النظام.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={deletingUserId === userToDelete.id}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deletingUserId === userToDelete.id}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-rose-600/25"
              >
                {deletingUserId === userToDelete.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
