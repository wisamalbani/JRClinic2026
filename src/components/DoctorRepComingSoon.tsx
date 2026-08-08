import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DoctorReportView } from './reports/DoctorReport';
import { RepStatementView } from './inventory/RepStatementView';
import { LogOut, Stethoscope, Briefcase, AlertCircle, UserCheck } from 'lucide-react';

export const DoctorRepDashboard: React.FC = () => {
  const { profile, user, signOut } = useAuth();

  const isDoctor = profile?.role === 'doctor';
  const isRep = profile?.role === 'rep';
  const roleName = isDoctor ? 'طبيب' : isRep ? 'مندوب' : 'مستخدم';

  const linkedClinicId = profile?.linked_clinic_id;
  const linkedRepId = profile?.linked_rep_id;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            {isDoctor ? <Stethoscope className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white">نظام المحاسبة للمركز الطبي</h1>
            <p className="text-xs text-slate-400">بوابة الحسابات الخاصة بـ {roleName}: {profile?.email || user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto mb-auto space-y-6">
        {/* DOCTOR VIEW */}
        {isDoctor && (
          <>
            {linkedClinicId ? (
              <DoctorReportView fixedClinicId={linkedClinicId} hideClinicSelector={true} />
            ) : (
              <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <h2 className="text-lg font-bold text-white">لم يتم ربط حسابك بفرع عيادة محددة بعد</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  حسابك مفعّل برتبة (طبيب)، ولكن يتوجب على مالك المركز (Owner) ربط حسابك بعيادتك من شاشة <strong>"إدارة المستخدمين"</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {/* REP VIEW */}
        {isRep && (
          <>
            {linkedRepId ? (
              <RepStatementView fixedRepId={linkedRepId} hideRepSelector={true} />
            ) : (
              <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                <h2 className="text-lg font-bold text-white">لم يتم ربط حسابك بمندوب مبيعات محدد بعد</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  حسابك مفعّل برتبة (مندوب)، ولكن يتوجب على مالك المركز (Owner) ربط حسابك بسجل المندوب الخاص بك من شاشة <strong>"إدارة المستخدمين"</strong>.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto text-center text-xs text-slate-500 pt-8 border-t border-slate-800/60 mt-8">
        نظام المحاسبة - بوابة {roleName} &copy; 2026
      </footer>
    </div>
  );
};

// Re-export alias for backwards compatibility
export const DoctorRepComingSoon = DoctorRepDashboard;
