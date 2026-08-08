import React, { useState } from 'react';
import { Copy, Check, Database, FileCode, Shield, Terminal, X } from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCHEMA_SQL_CODE = `-- ============================================================================
-- Medical Center Accounting System (نظام المحاسبة للمركز الطبي) - Schema Phase 1
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CLINICS
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(50) NOT NULL UNIQUE,
    doctor_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. DOCTOR PERCENTAGE HISTORY
CREATE TABLE IF NOT EXISTS public.doctor_percentage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CASH BOXES
CREATE TABLE IF NOT EXISTS public.cash_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEED CASH BOXES (MANDATE: ONLY المركز AND الليزر)
INSERT INTO public.cash_boxes (name) VALUES ('المركز'), ('الليزر') ON CONFLICT (name) DO NOTHING;

-- 4. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.expense_categories (name) VALUES ('صيانة أجهزة'), ('مستلزمات طبية'), ('فواتير وبنية تحتية'), ('مصاريف نثرية') ON CONFLICT (name) DO NOTHING;

-- 5. EXCHANGE RATES
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    rate NUMERIC(12,4) NOT NULL CHECK (rate > 0),
    source VARCHAR(100) DEFAULT 'النشرة الرسمية',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'secretary' CHECK (role IN ('owner', 'secretary', 'doctor', 'rep', 'laser_staff')),
    linked_clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    linked_rep_id UUID,
    email VARCHAR(255),
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_box_id UUID NOT NULL REFERENCES public.cash_boxes(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    exchange_rate_used NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
    patient_name VARCHAR(255),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    is_suspense BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO public.roles (id, display_name, description) VALUES
('owner', 'مالك المركز', 'صلاحيات كاملة لقراءة وكتابة وتعديل كل البيانات والإعدادات'),
('secretary', 'السكرتارية', 'إضافة حركات مالية فقط، وقراءة البيانات المرجعية بدون إمكانية التعديل أو الحذف'),
('doctor', 'طبيب', 'قراءة فقط محصورة بالعيادة المرتبطة'),
('rep', 'مندوب', 'قراءة فقط محصورة ببيانات المندوب الخاص'),
('laser_staff', 'موظفة ليزر', 'دور مخصص لمرحلة لاحقة')
ON CONFLICT (id) DO NOTHING;

-- 9. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUTH TRIGGER (role = 'secretary' STRICTLY FIXED)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (auth_id, email, role, is_active)
    VALUES (NEW.id, NEW.email, 'secretary', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. ENABLE RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- EXCHANGE RATES POLICIES
CREATE POLICY "Owner full access on exchange_rates" ON public.exchange_rates
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read on exchange_rates" ON public.exchange_rates
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary insert today rate" ON public.exchange_rates
    FOR INSERT WITH CHECK (
        public.get_current_user_role() = 'secretary'
        AND date = CURRENT_DATE
    );

-- DOCTOR PERCENTAGE HISTORY POLICIES
CREATE POLICY "Owner full access on doctor_percentage_history" ON public.doctor_percentage_history
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Others read doctor_percentage_history" ON public.doctor_percentage_history
    FOR SELECT USING (true);

`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SCHEMA_SQL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 dir-rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">دليل تهيئة قاعدة البيانات (Supabase)</h3>
              <p className="text-xs text-slate-500">المرحلة الأولى - الهيكل والتنظيم الأمني (schema.sql)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                إنشاء مشروع Supabase
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                افتح لوحة تحكم Supabase وأنشئ مشروعاً جديداً، ثم انسخ رابط المشروع (URL) والـ Anon Key.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                تنفيذ سكربت SQL
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                انتقل إلى قسم SQL Editor في Supabase، وانسخ السكربت أدناه ثم اضغط <strong>Run</strong> لإنشاء الجداول والسياسات.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                ضبط المتغيرات البيئية
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                قم بتعيين <code className="bg-slate-200 px-1 rounded text-[11px]">VITE_SUPABASE_URL</code> و <code className="bg-slate-200 px-1 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">ملاحظة أمنية إلزامية (Security Mandate):</span>
              الدالة <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">handle_new_user()</code> تُعين الدور الإفتراضي <code className="font-bold">secretary</code> دائماً بحجم ثابت في كود الدالة. لترقية أول مستخدم إلى مالك (<code className="font-bold">owner</code>)، يرجى تنفيذ الأمر التالي في SQL Editor بعد التسجيل:
              <div className="mt-2 bg-amber-900 text-amber-100 p-2.5 rounded-lg font-mono text-[11px] dir-ltr text-left overflow-x-auto">
                UPDATE public.users SET role = 'owner' WHERE email = 'your-email@example.com';
              </div>
            </div>
          </div>

          {/* SQL Code Snippet View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-blue-600" />
                ملف التهيئة المعتمد (schema.sql):
              </span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'تم النسخ بنجاح!' : 'نسخ الكود بالكامل'}
              </button>
            </div>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-80 border border-slate-800 dir-ltr text-left leading-relaxed">
              <pre>{SCHEMA_SQL_CODE}</pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" />
            المرحلة الأولى - الأساس الهيكلي المعتمد
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
