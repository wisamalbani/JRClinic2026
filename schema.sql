-- ============================================================================
-- Medical Center Accounting System (نظام المحاسبة للمركز الطبي) - Schema Phase 1 & 2
-- ============================================================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CLINICS TABLE (العيادات)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(50) NOT NULL UNIQUE,
    doctor_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. DOCTOR PERCENTAGE HISTORY TABLE (سجل نسبة الطبيب)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_percentage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. CASH BOXES TABLE (الصناديق)
-- STRICT MANDATE: Seed data must be ONLY "المركز" and "الليزر"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Cash Boxes
INSERT INTO public.cash_boxes (name)
VALUES ('المركز'), ('الليزر')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. EXPENSE CATEGORIES TABLE (تصنيفات المصاريف)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Categories
INSERT INTO public.expense_categories (name)
VALUES ('صيانة أجهزة'), ('مستلزمات طبية'), ('فواتير وبنية تحتية'), ('مصاريف نثرية')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. EXCHANGE RATES TABLE (أسعار الصرف)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    rate NUMERIC(12,4) NOT NULL CHECK (rate > 0),
    source VARCHAR(100) DEFAULT 'النشرة الرسمية',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. USERS TABLE (جدول المستخدمين والتخصيص)
-- Linked to auth.users via auth_id
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. TRANSACTIONS TABLE (الحركات المالية)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 8. FLEXIBLE ROLES & PERMISSIONS TABLE ARCHITECTURE
-- Allows dynamic permissions and adding new roles (like laser_staff) easily
-- ----------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT
);

INSERT INTO public.permissions (id, name, description) VALUES
('full_access', 'وصول كامل', 'إدارة وتعديل وحذف كل البيانات والمالية'),
('add_transaction', 'إضافة حركة مالية', 'إدخال معاملات مالية جديدة فقط'),
('read_reference_data', 'قراءة البيانات المرجعية', 'عرض الصناديق والعيادات وتصنيفات المصاريف'),
('read_clinic_data', 'قراءة بيانات العيادة', 'عرض الحركات والتقارير المتعلقة بالعيادة المرتبطة'),
('read_rep_data', 'قراءة بيانات المندوب', 'عرض الحركات الخاصة بالمندوب')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
('owner', 'full_access'),
('secretary', 'add_transaction'),
('secretary', 'read_reference_data'),
('doctor', 'read_clinic_data'),
('rep', 'read_rep_data')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. AUDIT LOG TABLE (سجل التدقيق)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 10. AUTH TRIGGER FUNCTION (handle_new_user)
-- MANDATE: Hardcodes role = 'secretary' strictly in code!
-- Never reads role from NEW.raw_user_meta_data.
-- Owner upgrade must be done manually via public.users update by existing owner.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (
        auth_id,
        email,
        role,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        'secretary', -- Strictly hardcoded fixed value
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.users WHERE auth_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user linked clinic
CREATE OR REPLACE FUNCTION public.get_current_user_clinic_id()
RETURNS UUID AS $$
    SELECT linked_clinic_id FROM public.users WHERE auth_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user linked rep
CREATE OR REPLACE FUNCTION public.get_current_user_rep_id()
RETURNS UUID AS $$
    SELECT linked_rep_id FROM public.users WHERE auth_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all public tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_percentage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: CLINICS
CREATE POLICY "Owner full access on clinics" ON public.clinics
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read on clinics" ON public.clinics
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

CREATE POLICY "Doctor read own clinic" ON public.clinics
    FOR SELECT USING (
        public.get_current_user_role() = 'doctor' 
        AND id = public.get_current_user_clinic_id()
    );

-- Policy: CASH BOXES
CREATE POLICY "Owner full access on cash_boxes" ON public.cash_boxes
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read on cash_boxes" ON public.cash_boxes
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

-- Policy: EXPENSE CATEGORIES
CREATE POLICY "Owner full access on expense_categories" ON public.expense_categories
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read on expense_categories" ON public.expense_categories
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

-- Policy: EXCHANGE RATES
CREATE POLICY "Owner full access on exchange_rates" ON public.exchange_rates
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read on exchange_rates" ON public.exchange_rates
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary insert today rate" ON public.exchange_rates
    FOR INSERT WITH CHECK (
        public.get_current_user_role() = 'secretary'
        AND date = CURRENT_DATE
    );

-- Policy: TRANSACTIONS
-- Owner: full access
CREATE POLICY "Owner full access on transactions" ON public.transactions
    FOR ALL USING (public.get_current_user_role() = 'owner');

-- Secretary: INSERT ONLY, SELECT ONLY (NO UPDATE, NO DELETE)
CREATE POLICY "Secretary insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary select transactions" ON public.transactions
    FOR SELECT USING (public.get_current_user_role() = 'secretary');

-- Doctor: READ ONLY, filtered by linked_clinic_id
CREATE POLICY "Doctor read own clinic transactions" ON public.transactions
    FOR SELECT USING (
        public.get_current_user_role() = 'doctor' 
        AND clinic_id = public.get_current_user_clinic_id()
    );

-- Rep: READ ONLY, filtered by linked_rep_id (prepared for later stage)
CREATE POLICY "Rep read own transactions" ON public.transactions
    FOR SELECT USING (
        public.get_current_user_role() = 'rep' 
        AND created_by = auth.uid()
    );

-- Policy: USERS
CREATE POLICY "Owner full access on users" ON public.users
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Users read own profile" ON public.users
    FOR SELECT USING (auth_id = auth.uid());

-- Policy: AUDIT LOG
CREATE POLICY "Owner full access on audit_log" ON public.audit_log
    FOR ALL USING (public.get_current_user_role() = 'owner');
