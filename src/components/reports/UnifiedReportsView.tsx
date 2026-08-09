import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Clinic, Rep, FIXED_REPORT_KEYS, getClinicReportKey, getRepReportKey } from '../../types';
import { getReportPermissionsForUser } from '../../services/usersAndPermissions';
import { CashBoxStatementView } from './CashBoxStatement';
import { DoctorReportView } from './DoctorReport';
import { CustomReportsView } from './CustomReports';
import { LaserReportView } from '../laser/LaserReportView';
import { RepStatementView } from '../inventory/RepStatementView';
import {
  FileText,
  Wallet,
  Stethoscope,
  Sparkles,
  Users,
  Clock,
  Sliders,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Building2,
  Lock,
} from 'lucide-react';

export const UnifiedReportsView: React.FC = () => {
  const { profile, user } = useAuth();
  const isOwner = profile?.role === 'owner';
  const userId = profile?.id || user?.id || '';

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Active Selected Report View State
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clinicsRes, repsRes] = await Promise.all([
        supabase.from('clinics').select('*').order('number', { ascending: true }),
        supabase.from('reps').select('*').order('name', { ascending: true }),
      ]);

      setClinics(clinicsRes.data || []);
      setReps(repsRes.data || []);

      if (!isOwner && userId) {
        const perms = await getReportPermissionsForUser(userId);
        setPermissionsMap(perms);
      }
    } catch (err) {
      console.error('Error loading unified reports metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const isReportAllowed = (reportKey: string): boolean => {
    if (isOwner || profile?.role === 'viewer') return true; // Owner & Viewer see all reports
    return permissionsMap[reportKey] !== false; // Default enabled = true
  };

  // Render Sub Report View when selected
  if (activeReportKey) {
    let reportComponent: React.ReactNode = null;

    if (activeReportKey === FIXED_REPORT_KEYS.BOX_CENTER) {
      reportComponent = <CashBoxStatementView />;
    } else if (activeReportKey === FIXED_REPORT_KEYS.BOX_LASER || activeReportKey === FIXED_REPORT_KEYS.LASER_MONTHLY_REPORT) {
      reportComponent = <LaserReportView />;
    } else if (activeReportKey.startsWith('clinic_')) {
      const clinicId = activeReportKey.replace('clinic_', '');
      reportComponent = <DoctorReportView fixedClinicId={clinicId} hideClinicSelector={true} />;
    } else if (activeReportKey.startsWith('rep_')) {
      const repId = activeReportKey.replace('rep_', '');
      reportComponent = <RepStatementView fixedRepId={repId} hideRepSelector={true} />;
    } else if (activeReportKey === FIXED_REPORT_KEYS.FREE_REPORTS) {
      reportComponent = <CustomReportsView />;
    } else if (activeReportKey === FIXED_REPORT_KEYS.SUSPENSE_TRANSACTIONS) {
      reportComponent = <CustomReportsView initialSuspenseOnly={true} />;
    }

    return (
      <div className="space-y-6 dir-rtl">
        {/* Top Header to Return to Unified Buttons Grid */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <button
            onClick={() => setActiveReportKey(null)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة التقارير الموحّدة</span>
          </button>

          <span className="text-xs text-slate-400 font-mono">
            المستند المحدد: <strong className="text-indigo-400">{activeReportKey}</strong>
          </span>
        </div>

        {/* Selected Sub Report Component */}
        <div className="bg-slate-900/50 rounded-2xl p-2">{reportComponent}</div>
      </div>
    );
  }

  // Categories Grid Definition
  const categories = [
    {
      title: 'تقارير الصناديق',
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/30 bg-emerald-950/20',
      items: [
        {
          key: FIXED_REPORT_KEYS.BOX_CENTER,
          title: 'كشف صندوق المركز',
          desc: 'حركات الدخل والمصاريف والتحويلات لصندوق المركز الرئيسي',
        },
        {
          key: FIXED_REPORT_KEYS.BOX_LASER,
          title: 'كشف صندوق الليزر',
          desc: 'حركات الصندوق المستقل الخاص بقسم الليزر والمستحقات',
        },
      ],
    },
    {
      title: 'تقارير الأطباء والعيادات',
      icon: <Stethoscope className="w-5 h-5 text-blue-400" />,
      color: 'border-blue-500/30 bg-blue-950/20',
      items: clinics.map((c) => ({
        key: getClinicReportKey(c.id),
        title: `عيادة ${c.number} - د. ${c.doctor_name}`,
        desc: `تقرير أرباح العيادة وحصة الطبيب والتخصص (${c.specialty})`,
      })),
    },
    {
      title: 'تقارير الليزر الشهري',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/30 bg-purple-950/20',
      items: [
        {
          key: FIXED_REPORT_KEYS.LASER_MONTHLY_REPORT,
          title: 'تقرير الليزر الشهري',
          desc: 'تحليل أداء وتوزيعات قسم الليزر والضربات لشهر كامل',
        },
      ],
    },
    {
      title: 'كشوفات حسابات المندوبين',
      icon: <Users className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/30 bg-amber-950/20',
      items: reps.map((r) => ({
        key: getRepReportKey(r.id),
        title: `كشف المندوب: ${r.name}`,
        desc: `حساب الشحنات الموردة والدفعات المسددة وتوازن المستحقات`,
      })),
    },
    {
      title: 'تقارير معلقة واستعلامات',
      icon: <Sliders className="w-5 h-5 text-rose-400" />,
      color: 'border-rose-500/30 bg-rose-950/20',
      items: [
        {
          key: FIXED_REPORT_KEYS.SUSPENSE_TRANSACTIONS,
          title: 'الحركات المعلقة (Suspense)',
          desc: 'عرض كافة المبالغ والحركات المالية غير المسواة مع العيادات',
        },
        {
          key: FIXED_REPORT_KEYS.FREE_REPORTS,
          title: 'تقارير حرة واستعلامات مفصلة',
          desc: 'تصفية وتصدير البيانات الشاملة حسب التاريخ والنوع والمستفيد',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Banner */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">نافذة التقارير الموحّدة (المرحلة السابعة)</h2>
            <p className="text-xs text-slate-400">وصول سريع لكافة كشوفات الحسابات والتقارير المالية المفوّضة بحسب الصلاحيات</p>
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

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-800/60 rounded-2xl border border-slate-700/60">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          <p className="text-xs">جاري فحص صلاحيات التقارير وإعداد النافذة الموحّدة...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat, idx) => {
            // Filter items user is permitted to see
            const visibleItems = cat.items.filter((item) => isReportAllowed(item.key));

            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className={`border rounded-2xl p-5 shadow-lg space-y-4 ${cat.color}`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                  {cat.icon}
                  <h3 className="font-extrabold text-sm text-white">{cat.title}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setActiveReportKey(item.key)}
                      className="p-4 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-right transition-all group flex flex-col justify-between shadow-md hover:shadow-xl space-y-2 cursor-pointer"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-100 group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                          <span>{item.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all text-indigo-400 -translate-x-1 group-hover:translate-x-0" />
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>فتح التقرير</span>
                        <span className="text-emerald-400 font-bold">متاح</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
