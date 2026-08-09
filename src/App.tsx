import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { OwnerSecretaryDashboard } from './components/OwnerSecretaryDashboard';
import { DoctorRepDashboard } from './components/DoctorRepComingSoon';
import { LaserStaffDashboard } from './components/laser/LaserStaffDashboard';
import { UnifiedReportsView } from './components/reports/UnifiedReportsView';
import { LogOut, Eye } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-sans dir-rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">جاري التحقق من حالة الجلسة وقاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Doctor and Rep roles get redirected to Doctor/Rep Dashboard
  if (profile?.role === 'doctor' || profile?.role === 'rep') {
    return <DoctorRepDashboard />;
  }

  // Laser staff role gets redirected to Laser Staff Dashboard
  if (profile?.role === 'laser_staff') {
    return <LaserStaffDashboard />;
  }

  // Viewer role gets redirected to full UnifiedReportsView (Read-Only)
  if (profile?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl font-sans p-4 sm:p-6 space-y-6">
        <header className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">نافذة التقارير الموحّدة (وضع المشاهِد - قراءة فقط)</h1>
              <p className="text-xs text-slate-400">مرحباً {profile?.email} - يتاح لك استعراض كافة كشوفات الحسابات المسموحة دون تعديل</p>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </header>

        <UnifiedReportsView />
      </div>
    );
  }

  // Owner and Secretary roles get full internal Dashboard
  return <OwnerSecretaryDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
