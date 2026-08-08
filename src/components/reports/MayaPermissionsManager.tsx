import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, Clinic, Rep, FIXED_REPORT_KEYS, FIXED_REPORT_LABELS, getClinicReportKey, getRepReportKey } from '../../types';
import { getAllUsers, getReportPermissionsForUser, saveReportPermissionsForUser } from '../../services/usersAndPermissions';
import { ShieldCheck, UserCheck, ToggleLeft, ToggleRight, Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';

export const MayaPermissionsManager: React.FC = () => {
  const [secretaries, setSecretaries] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);

  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPerms, setLoadingPerms] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [usersData, clinicsRes, repsRes] = await Promise.all([
        getAllUsers(),
        supabase.from('clinics').select('*').order('number', { ascending: true }),
        supabase.from('reps').select('*').order('name', { ascending: true }),
      ]);

      const secUsers = usersData.filter((u) => u.role === 'secretary' || u.role === 'owner');
      setSecretaries(secUsers);
      setClinics(clinicsRes.data || []);
      setReps(repsRes.data || []);

      if (secUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(secUsers[0].id);
        await loadUserPermissions(secUsers[0].id);
      }
    } catch (err) {
      console.error('Error loading Maya permissions data:', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء تحميل المستخدمين والعيادات' });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    if (!userId) return;
    setLoadingPerms(true);
    try {
      const existing = await getReportPermissionsForUser(userId);
      setPermissionsMap(existing);
    } catch (err) {
      console.error('Error loading perms:', err);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    setMessage(null);
    await loadUserPermissions(userId);
  };

  const handleToggle = (reportKey: string) => {
    setPermissionsMap((prev) => {
      const currentVal = prev[reportKey] !== false; // Default true if missing
      return {
        ...prev,
        [reportKey]: !currentVal,
      };
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveReportPermissionsForUser(selectedUserId, permissionsMap);
      setMessage({ type: 'success', text: 'تم حفظ صلاحيات إظهار التقارير للمستخدم بنجاح' });
    } catch (err: any) {
      console.error('Error saving report permissions:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ الصلاحيات' });
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = (key: string) => permissionsMap[key] !== false;

  // Group report keys for clean presentation
  const reportCategories = [
    {
      title: 'تقارير الصناديق الرئيسية',
      items: [
        { key: FIXED_REPORT_KEYS.BOX_CENTER, label: 'كشف صندوق المركز' },
        { key: FIXED_REPORT_KEYS.BOX_LASER, label: 'كشف صندوق الليزر' },
      ],
    },
    {
      title: 'تقارير الأطباء والعيادات',
      items: clinics.map((c) => ({
        key: getClinicReportKey(c.id),
        label: `عيادة ${c.number} - د. ${c.doctor_name}`,
      })),
    },
    {
      title: 'تقارير الليزر الشهري',
      items: [
        { key: FIXED_REPORT_KEYS.LASER_MONTHLY_REPORT, label: 'تقرير الليزر الشهري' },
      ],
    },
    {
      title: 'تقارير كشوفات المندوبين',
      items: reps.map((r) => ({
        key: getRepReportKey(r.id),
        label: `كشف المندوب: ${r.name}`,
      })),
    },
    {
      title: 'تقارير أخرى وحركات معلقة',
      items: [
        { key: FIXED_REPORT_KEYS.SUSPENSE_TRANSACTIONS, label: 'الحركات المعلقة (Suspense)' },
        { key: FIXED_REPORT_KEYS.FREE_REPORTS, label: 'تقارير حرة واستعلامات' },
      ],
    },
  ];

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">صلاحيات تقارير مايا (Maya Permissions)</h2>
              <p className="text-xs text-slate-500 mt-0.5">التحكم الدقيق بظهور وإخفاء أزرار التقارير لدى موظفي السكرتارية</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !selectedUserId}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>

        {/* User Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر مستخدم السكرتارية للتحكم بصلاحياته:</label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {secretaries.length === 0 && <option value="">لا يوجد سكرتارية مسجلين</option>}
              {secretaries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email} ({s.role === 'owner' ? 'مالك' : 'سكرتارية'})
                </option>
              ))}
            </select>
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

      {/* Permissions Grid Grouped by Category */}
      {loadingPerms ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-100">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
          <p className="text-xs">جاري تحميل مصفوفة الصلاحيات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((cat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>{cat.title}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                  {cat.items.length} تقارير
                </span>
              </h3>

              <div className="space-y-3">
                {cat.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">لا توجد بنود متاحة ضمن هذه الفئة</p>
                ) : (
                  cat.items.map((item) => {
                    const enabled = isEnabled(item.key);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggle(item.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          enabled
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {enabled ? (
                            <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>

                        <div className="shrink-0">
                          {enabled ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">مفوّض</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-300 text-slate-700">محجوب</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
