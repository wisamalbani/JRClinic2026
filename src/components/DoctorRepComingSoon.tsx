import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, ShieldAlert, User, Stethoscope, Briefcase } from 'lucide-react';

export const DoctorRepComingSoon: React.FC = () => {
  const { profile, user, signOut } = useAuth();

  const isDoctor = profile?.role === 'doctor';
  const roleName = isDoctor ? 'طبيب' : 'مندوب';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Header Bar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            {isDoctor ? <Stethoscope className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white">نظام المحاسبة للمركز الطبي</h1>
            <p className="text-xs text-slate-400">بوابة الحسابات الخاصة بـ {roleName}</p>
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

      {/* Main Content Card */}
      <main className="my-auto w-full max-w-lg mx-auto text-center space-y-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
              صفحة العرض الخاصة بـ {roleName}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              قريباً في المرحلة القادمة
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              حسابك مفعل بنجاح على نظام المحاسبة للمركز الطبي. سيتم إطلاق واجهة {roleName} التقاريرية المستقلة في مرحلة قادمة وفق الخطة الزمنية للمشروع.
            </p>
          </div>

          {/* User Account Info */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-right space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                البريد الإلكتروني:
              </span>
              <span className="font-mono text-slate-200 dir-ltr">{profile?.email || user?.email}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>الدور المحدد بالنظام:</span>
              <span className="font-bold text-purple-300">{roleName} ({profile?.role})</span>
            </div>

            {isDoctor && profile?.linked_clinic_id && (
              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>العيادة المرتبطة:</span>
                <span className="font-mono text-slate-200">{profile.linked_clinic_id}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            <span>صلاحياتك محصورة ببياناتك فقط بموجب سياسة Row Level Security (RLS)</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto text-center text-xs text-slate-500">
        نظام المحاسبة - المرحلة الأولى (الأساس) &copy; 2026
      </footer>
    </div>
  );
};
