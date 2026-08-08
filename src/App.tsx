import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { OwnerSecretaryDashboard } from './components/OwnerSecretaryDashboard';
import { DoctorRepComingSoon } from './components/DoctorRepComingSoon';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

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

  // Doctor and Rep roles get redirected to Coming Soon screen
  if (profile?.role === 'doctor' || profile?.role === 'rep') {
    return <DoctorRepComingSoon />;
  }

  // Owner and Secretary roles get redirected to internal Dashboard
  return <OwnerSecretaryDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
