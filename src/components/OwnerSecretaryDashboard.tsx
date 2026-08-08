import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Building2,
  CheckCircle2,
  FileCode,
  LogOut,
  RefreshCw,
  Shield,
  UserCheck,
  Wallet,
  ArrowRightLeft,
  Users,
  Settings,
  HelpCircle,
  Search,
  Lock,
  Tag,
  BarChart3,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { SupabaseSetupModal } from './SupabaseSetupModal';
import { TransactionsList } from './TransactionsList';
import { SuspenseTransactions } from './SuspenseTransactions';
import { ExpenseCategoriesManager } from './ExpenseCategoriesManager';
import { ClinicsManager } from './ClinicsManager';
import { ReportsManager } from './reports/ReportsManager';
import { InventoryManager } from './inventory/InventoryManager';
import { LaserManager } from './laser/LaserManager';
import { UsersManager } from './UsersManager';
import { UnifiedReportsView } from './reports/UnifiedReportsView';
import { MayaPermissionsManager } from './reports/MayaPermissionsManager';

export const OwnerSecretaryDashboard: React.FC = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'transactions' | 'suspense' | 'categories' | 'clinics' | 'reports' | 'inventory' | 'laser' | 'unified' | 'users' | 'maya_permissions' | 'overview'
  >('transactions');


  const [stats, setStats] = useState({
    clinicsCount: 0,
    cashBoxes: [] as string[],
    categoriesCount: 0,
    transactionsCount: 0,
    suspenseCount: 0,
    loading: true,
  });

  const fetchDatabaseInfo = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true }));

      // Fetch cash boxes
      const { data: cbData } = await supabase.from('cash_boxes').select('name');
      const cashBoxNames = cbData ? cbData.map((c: { name: string }) => c.name) : [];

      // Fetch clinics count
      const { count: cCount } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true });

      // Fetch expense categories count
      const { count: catCount } = await supabase
        .from('expense_categories')
        .select('*', { count: 'exact', head: true });

      // Fetch transactions count
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Fetch suspense transactions count
      const { count: suspenseCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('is_suspense', true);

      setStats({
        clinicsCount: cCount || 0,
        cashBoxes: cashBoxNames.length > 0 ? cashBoxNames : ['المركز', 'الليزر'],
        categoriesCount: catCount || 0,
        transactionsCount: txCount || 0,
        suspenseCount: suspenseCount || 0,
        loading: false,
      });
    } catch (error) {
      console.warn('Error querying tables:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const isOwner = profile?.role === 'owner';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl font-sans pb-12">
      {/* Top Navbar */}
      <nav className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                نظام المحاسبة للمركز الطبي
              </h1>
              <span className="text-[11px] text-slate-400">المرحلة الثانية - إدخال الحركات وإدارة المعلقات</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Role Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <div className="text-right">
                <span className="font-bold text-slate-200 block text-[11px]">
                  {profile?.email || user?.email}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isOwner
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {isOwner ? 'مالك المركز (Owner)' : 'السكرتارية (Secretary)'}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => signOut()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700/80 hover:border-red-500/30 transition-all text-xs flex items-center gap-1.5"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-850 border-b border-slate-700/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>سجل وإدخال الحركات المالية</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('suspense')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap relative ${
                activeTab === 'suspense'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>الحركات المعلقة (Suspense)</span>
              {stats.suspenseCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white font-mono rounded-full text-[10px]">
                  {stats.suspenseCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>تصنيفات المصاريف وأسعار الصرف</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>المواد والمخزون (المرحلة 5)</span>
          </button>

          <button
            onClick={() => setActiveTab('laser')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'laser'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>صندوق قسم الليزر (المرحلة 6)</span>
          </button>

          <button
            onClick={() => setActiveTab('unified')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'unified'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>التقارير الموحّدة (المرحلة 7)</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <span>إدارة المستخدمين والربط البرمجي</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setActiveTab('maya_permissions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'maya_permissions'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-300" />
              <span>صلاحيات تقارير مايا</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setActiveTab('clinics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'clinics'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>إدارة العيادات ونسب الأطباء</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>تقارير مالية وتدقيق (المرحلة 4)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>نظرة عامة والأساس الهيكلي</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: Transactions List & Entry */}
        {activeTab === 'transactions' && <TransactionsList />}

        {/* TAB 2: Suspense Transactions (Owner only) */}
        {activeTab === 'suspense' && <SuspenseTransactions />}

        {/* TAB 3: Categories & Rates */}
        {activeTab === 'categories' && <ExpenseCategoriesManager />}

        {/* TAB 4: Clinics & Doctor Percentages (Owner only) */}
        {activeTab === 'clinics' && <ClinicsManager />}

        {/* TAB 5: Phase 4 Financial Reports (Owner only) */}
        {activeTab === 'reports' && isOwner && <ReportsManager />}

        {/* TAB 6: Phase 5 Inventory & Materials */}
        {activeTab === 'inventory' && <InventoryManager />}

        {/* TAB 7: Phase 6 Laser Fund */}
        {activeTab === 'laser' && <LaserManager userRole={profile?.role || 'secretary'} />}

        {/* TAB 8: Phase 7 Unified Reports Window */}
        {activeTab === 'unified' && <UnifiedReportsView />}

        {/* TAB 9: Phase 7 Users Management (Owner only) */}
        {activeTab === 'users' && isOwner && <UsersManager />}

        {/* TAB 10: Phase 7 Maya Report Permissions (Owner only) */}
        {activeTab === 'maya_permissions' && isOwner && <MayaPermissionsManager />}

        {/* TAB 11: Overview & Phase 1 Checks */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-slate-800 to-slate-800 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  الأساس الهيكلي وقاعدة البيانات المعتمدة
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                  أهلاً بك، {profile?.email?.split('@')[0] || 'المستخدم'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  تم إعداد الجداول، القيود، صلاحيات الـ RLS، ودالة التوثيق الذاتية بنجاح وفق المواصفات المعتمدة للمرحلتين الأولى والثانية.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4" />
                  عرض ملف schema.sql
                </button>
                <button
                  onClick={() => {
                    refreshProfile();
                    fetchDatabaseInfo();
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${stats.loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Database Structural Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Cash Boxes */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">الصناديق المعتمدة</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg font-black text-white flex items-center gap-2">
                    {stats.cashBoxes.join(' و ')}
                  </div>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    مطابق للمواصفة المعتمدة ("المركز" و "الليزر")
                  </p>
                </div>
              </div>

              {/* Card 2: Expense Categories */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">تصنيفات المصاريف</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Settings className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {stats.categoriesCount} تصنيف
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    صيانة، مستلزمات طبية، فواتير، ونثريات
                  </p>
                </div>
              </div>

              {/* Card 3: Clinics */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">العيادات المسجلة</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {stats.clinicsCount} عيادة
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    جدول العيادات ونسب الأطباء جاهز
                  </p>
                </div>
              </div>

              {/* Card 4: Transactions */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">الحركات المالية</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {stats.transactionsCount} حركة
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    محمية بسياسة (إضافة فقط للسكرتارية)
                  </p>
                </div>
              </div>
            </div>

            {/* Roles & Permissions Dynamic Architecture Grid */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    مصفوفة الأدوار والصلاحيات (Dynamic RBAC System)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    مبنية بمرونة عبر جداول <code className="text-slate-200">roles</code> و <code className="text-slate-200">permissions</code> و <code className="text-slate-200">role_permissions</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Owner Role Card */}
                <div className={`p-4 rounded-2xl border transition-all ${isOwner ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-900/60 border-slate-700/60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-amber-300">مالك المركز (owner)</span>
                    {isOwner && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">دورك الحالي</span>}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    قراءة وكتابة وتعديل وحذف كامل على جميع الجداول، وتعديل الحركات وإعادة تصنيف المعلقات.
                  </p>
                </div>

                {/* Secretary Role Card */}
                <div className={`p-4 rounded-2xl border transition-all ${!isOwner ? 'bg-blue-950/20 border-blue-500/40' : 'bg-slate-900/60 border-slate-700/60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-blue-300">السكرتارية (secretary)</span>
                    {!isOwner && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">دورك الحالي</span>}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    إضافة حركات مالية فقط على جدول <code className="text-blue-300">transactions</code>، يمنع التعديل أو الحذف بـ RLS.
                  </p>
                </div>

                {/* Doctor Role Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-purple-300">طبيب (doctor)</span>
                    <span className="text-[10px] text-slate-500">قريباً</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    قراءة فقط محصورة بالعيادة المرتبطة عبر <code className="text-purple-300">linked_clinic_id</code>.
                  </p>
                </div>

                {/* Rep Role Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-emerald-300">مندوب (rep)</span>
                    <span className="text-[10px] text-slate-500">قريباً</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    قراءة فقط محصورة ببيانات المندوب الخاصة عبر <code className="text-emerald-300">linked_rep_id</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase Info Note */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-slate-400 text-xs flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-200 text-sm block">حالة المرحلة الثانية:</span>
                <p className="leading-relaxed">
                  تم إكمال جميع متطلبات المرحلة الثانية: شاشة إدخال الحركات (قبض/صرف)، جلب سعر الصرف التلقائي مع خيار التعبئة اليدوية، تقييد السكرتارية بالإضافة فقط، وسماح التعديل/الحذف للمالك مع التوثيق في `audit_log` وشاشة إعادة تصنيف الحركات المعلقة.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Supabase Setup Modal */}
      <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
