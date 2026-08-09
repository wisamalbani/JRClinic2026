import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Database, Lock, Mail, ShieldAlert, Sparkles, LogIn, FileCode } from 'lucide-react';
import { SupabaseSetupModal } from './SupabaseSetupModal';

export const LoginPage: React.FC = () => {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isConfigured) {
      setErrorMsg('الاتصال بـ Supabase غير مهيأ. يرجى ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY أولاً.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(
          error.message === 'Invalid login credentials'
            ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.'
            : `خطأ أثناء تسجيل الدخول: ${error.message}`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between dir-rtl p-4 sm:p-6 select-none font-sans">
      {/* Background Subtle Gradient Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-900 to-slate-950 pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">نظام المحاسبة للمركز الطبي</h1>
            <p className="text-xs text-slate-400">المرحلة الأولى - الأساس الهيكلي والأمني</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <FileCode className="w-4 h-4" />
          <span>عرض schema.sql والتهيئة</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 my-8 w-full max-w-md mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Form Title & Description */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              تسجيل الدخول للنظام
            </h2>
            <p className="text-xs text-slate-400">
              أدخل البريد الإلكتروني وكلمة المرور الممنوحة لك من إدارة المركز
            </p>
          </div>

          {/* Missing Supabase Config Alert */}
          {!isConfigured && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm text-red-300">اتصال Supabase غير معرّف!</span>
                  لم يتم ضبط متغيرات البيئة <code className="bg-red-900/60 px-1 py-0.5 rounded text-red-100 font-mono text-[11px]">VITE_SUPABASE_URL</code> و <code className="bg-red-900/60 px-1 py-0.5 rounded text-red-100 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> بشكل صحيح.
                </div>
              </div>
              <p className="text-[11px] text-red-300/80 leading-relaxed pt-1 border-t border-red-800/50">
                تسجيل الدخول معطّل تماماً حتى يتم ربط المشروع بقاعدة بيانات Supabase وتنفيذ السكربت المعتمد.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-2 py-2 px-3 bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                عرض السكربت وطريقة التهيئة
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                البريد الإلكتروني <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={!isConfigured || loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medical-center.com"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                كلمة المرور <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  disabled={!isConfigured || loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isConfigured || loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-bold text-white text-xs shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          {/* Security Mandates Information Note */}
          <div className="pt-4 border-t border-slate-700/60 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              إشعار الأمان والوصول:
            </p>
            <p className="text-slate-400 pr-1 text-[10.5px] leading-relaxed">
              التسجيل الذاتي معطّل بالكامل. يتم إنشاء الحسابات وتعيين أدوار المستخدمين (أطباء، مندوبين، سكرتارية، كادر ليزر، مشاهدين) حصرياً من قبل مالك المركز (<code className="text-slate-200">Owner</code>).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto text-center py-4 text-[11px] text-slate-500">
        نظام إدارة ومحاسبة المراكز الطبية &copy; 2026 - جميع الحقوق محفوظة
      </footer>

      {/* Supabase Setup Modal */}
      <SupabaseSetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
