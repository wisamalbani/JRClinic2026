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
    is_cash_movement BOOLEAN NOT NULL DEFAULT true,
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

-- Policy: DOCTOR PERCENTAGE HISTORY
CREATE POLICY "Owner full access on doctor_percentage_history" ON public.doctor_percentage_history
    FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Authenticated read doctor_percentage_history" ON public.doctor_percentage_history
    FOR SELECT TO authenticated USING (true);

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

CREATE POLICY "Secretary update today rate" ON public.exchange_rates
    FOR UPDATE USING (
        public.get_current_user_role() = 'secretary'
        AND date = CURRENT_DATE
    )
    WITH CHECK (
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

-- ============================================================================
-- PHASE 5: INVENTORY & MATERIAL CONSUMPTION MANAGEMENT
-- ============================================================================

-- 1. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    units_per_package INT NOT NULL CHECK (units_per_package > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REPS (المندوبون)
CREATE TABLE IF NOT EXISTS public.reps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MATERIAL BATCHES (دفعات المواد المشتراة/المستلمة)
CREATE TABLE IF NOT EXISTS public.material_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('rep', 'cash')),
    rep_id UUID REFERENCES public.reps(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    package_qty INT NOT NULL CHECK (package_qty > 0),
    unit_price_per_package NUMERIC(14,2) NOT NULL CHECK (unit_price_per_package >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
    remaining_units INT NOT NULL CHECK (remaining_units >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_rep_required CHECK (
        (source_type = 'rep' AND rep_id IS NOT NULL) OR
        (source_type = 'cash' AND rep_id IS NULL)
    )
);

-- 4. MATERIAL CONSUMPTION (تسجيل الاستهلاك)
CREATE TABLE IF NOT EXISTS public.material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.material_batches(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    quantity_units INT NOT NULL CHECK (quantity_units > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. REP PAYMENTS (تسديدات المندوبين)
CREATE TABLE IF NOT EXISTS public.rep_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rep_id UUID NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure expense category "استهلاك مواد" exists
INSERT INTO public.expense_categories (name) VALUES ('استهلاك مواد') ON CONFLICT (name) DO NOTHING;

-- TRIGGER & FUNCTION FOR MATERIAL CONSUMPTION
CREATE OR REPLACE FUNCTION public.process_material_consumption()
RETURNS TRIGGER AS $$
DECLARE
    v_batch RECORD;
    v_item RECORD;
    v_cat_id UUID;
    v_cash_box_id UUID;
    v_description TEXT;
BEGIN
    -- 1. Get batch details
    SELECT * INTO v_batch FROM public.material_batches WHERE id = NEW.batch_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'دفعة المواد غير موجودة';
    END IF;

    -- 2. Check remaining units
    IF v_batch.remaining_units < NEW.quantity_units THEN
        RAISE EXCEPTION 'الكمية المطلوبة (%) أكبر من الكمية المتاحة بالدفعة (%)', NEW.quantity_units, v_batch.remaining_units;
    END IF;

    -- 3. Get item details for description
    SELECT * INTO v_item FROM public.inventory_items WHERE id = v_batch.item_id;

    -- 4. Deduct remaining units from material_batches
    UPDATE public.material_batches
    SET remaining_units = remaining_units - NEW.quantity_units
    WHERE id = NEW.batch_id;

    -- 5. Get or Create expense category ID for "استهلاك مواد"
    SELECT id INTO v_cat_id FROM public.expense_categories WHERE name = 'استهلاك مواد' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO public.expense_categories (name) VALUES ('استهلاك مواد')
        RETURNING id INTO v_cat_id;
    END IF;

    -- 6. Get cash box ID ('المركز')
    SELECT id INTO v_cash_box_id FROM public.cash_boxes WHERE name = 'المركز' LIMIT 1;
    IF v_cash_box_id IS NULL THEN
        SELECT id INTO v_cash_box_id FROM public.cash_boxes LIMIT 1;
    END IF;

    -- 7. Build description text
    v_description := 'استهلاك مواد: ' || COALESCE(v_item.name, 'مادة');
    IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
        v_description := v_description || ' (' || NEW.notes || ')';
    END IF;

    -- 8. Auto insert transaction (Expense) - Non-cash movement
    INSERT INTO public.transactions (
        cash_box_id,
        date,
        type,
        amount,
        currency,
        exchange_rate_used,
        clinic_id,
        expense_category_id,
        is_suspense,
        is_cash_movement,
        description,
        created_by
    ) VALUES (
        v_cash_box_id,
        NEW.date,
        'expense',
        ROUND(NEW.quantity_units * v_batch.unit_cost, 2),
        v_batch.currency,
        1.0000,
        NEW.clinic_id,
        v_cat_id,
        false,
        false, -- is_cash_movement = false (لا يؤثر على رصيد الصندوق الكاش الفعلي)
        v_description,
        NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_process_material_consumption ON public.material_consumption;
CREATE TRIGGER trigger_process_material_consumption
    BEFORE INSERT ON public.material_consumption
    FOR EACH ROW
    EXECUTE FUNCTION public.process_material_consumption();

-- RLS POLICIES FOR PHASE 5
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access inventory_items" ON public.inventory_items FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access reps" ON public.reps FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access material_batches" ON public.material_batches FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access material_consumption" ON public.material_consumption FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access rep_payments" ON public.rep_payments FOR ALL USING (public.get_current_user_role() = 'owner');

CREATE POLICY "Secretary read inventory_items" ON public.inventory_items FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read reps" ON public.reps FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read material_batches" ON public.material_batches FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary insert material_batches" ON public.material_batches FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary insert material_consumption" ON public.material_consumption FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read material_consumption" ON public.material_consumption FOR SELECT USING (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary insert rep_payments" ON public.rep_payments FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read rep_payments" ON public.rep_payments FOR SELECT USING (public.get_current_user_role() = 'secretary');

-- Ensure is_cash_movement column exists on transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_cash_movement BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- PHASE 6: LASER FUND MANAGEMENT (صندوق الليزر المستقل)
-- ============================================================================

-- 1. LASER STAFF (كادر الليزر)
CREATE TABLE IF NOT EXISTS public.laser_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default staff 'روان' and 'عبير' if not existing
INSERT INTO public.laser_staff (name)
SELECT 'روان' WHERE NOT EXISTS (SELECT 1 FROM public.laser_staff WHERE name = 'روان');

INSERT INTO public.laser_staff (name)
SELECT 'عبير' WHERE NOT EXISTS (SELECT 1 FROM public.laser_staff WHERE name = 'عبير');

-- 2. LASER STAFF PERCENTAGE HISTORY (نسبة الصبية)
CREATE TABLE IF NOT EXISTS public.laser_staff_percentage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.laser_staff(id) ON DELETE CASCADE,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LASER STAFF SALARY HISTORY (راتب الصبية)
CREATE TABLE IF NOT EXISTS public.laser_staff_salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.laser_staff(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LASER SHOT RATE HISTORY (سعر الضربة لصيانة الجهاز)
CREATE TABLE IF NOT EXISTS public.laser_shot_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_per_shot NUMERIC(14,4) NOT NULL CHECK (rate_per_shot >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. LASER TRANSACTIONS (حركات صندوق الليزر: قبض / صرف)
CREATE TABLE IF NOT EXISTS public.laser_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    patient_name VARCHAR(255),
    staff_id UUID REFERENCES public.laser_staff(id) ON DELETE SET NULL,
    shots_count INT CHECK (shots_count IS NULL OR shots_count >= 0),
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    exchange_rate_used NUMERIC(14,4) NOT NULL DEFAULT 1.0,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_income_laser_fields CHECK (
        (type = 'income' AND patient_name IS NOT NULL AND staff_id IS NOT NULL AND shots_count IS NOT NULL) OR
        (type = 'expense')
    )
);

-- 6. LASER WITHDRAWALS (سحوبات صندوق الليزر)
CREATE TABLE IF NOT EXISTS public.laser_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    beneficiary_type VARCHAR(20) NOT NULL CHECK (beneficiary_type IN ('staff', 'doctor', 'center')),
    staff_id UUID REFERENCES public.laser_staff(id) ON DELETE SET NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_laser_withdrawal_staff CHECK (
        (beneficiary_type = 'staff' AND staff_id IS NOT NULL) OR
        (beneficiary_type IN ('doctor', 'center') AND staff_id IS NULL)
    )
);

-- RLS POLICIES FOR PHASE 6
ALTER TABLE public.laser_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laser_staff_percentage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laser_staff_salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laser_shot_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laser_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laser_withdrawals ENABLE ROW LEVEL SECURITY;

-- OWNER: Full access on all laser tables
CREATE POLICY "Owner full access laser_staff" ON public.laser_staff FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access laser_staff_percentage_history" ON public.laser_staff_percentage_history FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access laser_staff_salary_history" ON public.laser_staff_salary_history FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access laser_shot_rate_history" ON public.laser_shot_rate_history FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access laser_transactions" ON public.laser_transactions FOR ALL USING (public.get_current_user_role() = 'owner');
CREATE POLICY "Owner full access laser_withdrawals" ON public.laser_withdrawals FOR ALL USING (public.get_current_user_role() = 'owner');

-- SECRETARY: SELECT on staff & histories
CREATE POLICY "Secretary read laser_staff" ON public.laser_staff FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read laser_staff_percentage_history" ON public.laser_staff_percentage_history FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read laser_staff_salary_history" ON public.laser_staff_salary_history FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary read laser_shot_rate_history" ON public.laser_shot_rate_history FOR SELECT USING (public.get_current_user_role() = 'secretary');

-- SECRETARY: INSERT + SELECT on laser_transactions & laser_withdrawals
CREATE POLICY "Secretary read laser_transactions" ON public.laser_transactions FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary insert laser_transactions" ON public.laser_transactions FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');

CREATE POLICY "Secretary read laser_withdrawals" ON public.laser_withdrawals FOR SELECT USING (public.get_current_user_role() = 'secretary');
CREATE POLICY "Secretary insert laser_withdrawals" ON public.laser_withdrawals FOR INSERT WITH CHECK (public.get_current_user_role() = 'secretary');

-- ============================================================================
-- PHASE 7: REPORT PERMISSIONS & DOCTOR/REP USER LINKING
-- ============================================================================

-- 1. REPORT PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.report_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, report_key)
);

-- RLS POLICIES FOR REPORT PERMISSIONS
ALTER TABLE public.report_permissions ENABLE ROW LEVEL SECURITY;

-- Owner: Full Access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Owner full access report_permissions" 
    ON public.report_permissions FOR ALL 
    USING (public.get_current_user_role() = 'owner');

-- Users: Read own permission rows (user_id = current auth user ID)
CREATE POLICY "Users read own report_permissions" 
    ON public.report_permissions FOR SELECT 
    USING (user_id = auth.uid());


