# نظام المحاسبة للمركز الطبي (Medical Center Accounting System) - Phase 1 Foundation

هذا المشروع يمثل **المرحلة الأولى (الأساس التأسيسي الهيكلي والأمني)** لنظام المحاسبة الخاص بمركز طبي، باستخدام **React + Vite** للواجهة الأمامية و **Supabase (PostgreSQL + Auth)** لقاعدة البيانات والتأمين.

---

## 📋 نظرة عامة على المرحلة الأولى

تتضمن هذه المرحلة التأسيسية البنية التحتية البرمجية والهيكلية الكاملة للنظام، وتشمل:
1. ربط وإعداد عميل **Supabase**.
2. بناء هيلكية البيانات للجداول المعتمدة والقيود (Constraints & Relations).
3. آلية المصادقة والحسابات (Supabase Auth).
4. تطبيق نظام الأدوار والديناميكية الصلاحيات (Flexible RBAC).
5. سياسات الوصول على مستوى السطر (Row Level Security - RLS).
6. شاشة تسجيل دخول وإعادة توجيه حسب الدور (Owner/Secretary ➔ Dashboard، Doctor/Rep ➔ قريباً).

---

## 🗄️ جداول قاعدة البيانات والعلاقات (Database Schema)

### 1. `clinics` (جدول العيادات)
يخزن معلومات العيادات الطبية الموجودة في المركز.
- `id` (UUID, Primary Key): المعرف الفريد للعيادة.
- `number` (VARCHAR(50), UNIQUE): رقم العيادة.
- `doctor_name` (VARCHAR(255)): اسم الطبيب المسؤول عن العيادة.
- `specialty` (VARCHAR(255)): التخصص الطبي.
- `is_active` (BOOLEAN, Default: true): حالة العيادة.
- `created_at` (TIMESTAMPTZ): تاريخ ووقت الإنشاء.

### 2. `doctor_percentage_history` (سجل نسبة الطبيب)
تتبع التاريخ والنسب المالية الخاصة بأطباء العيادات.
- `id` (UUID, Primary Key).
- `clinic_id` (UUID, Foreign Key -> `clinics.id`): العيادة المرتبطة.
- `percentage` (NUMERIC(5,2)): نسبة الطبيب (0 - 100%).
- `effective_from` (DATE): تاريخ بدء تطبيق النسبة.
- `created_by` (UUID, Foreign Key -> `auth.users.id`).
- `created_at` (TIMESTAMPTZ).

### 3. `cash_boxes` (جدول الصناديق)
يحتوي على الصناديق المالية المعتمَدة بالمركز.
- `id` (UUID, Primary Key).
- `name` (VARCHAR(100), UNIQUE): اسم الصندوق.
> **📌 التزام أمني وهيكلي إلزامي:** تم زراعة القيم التالية فقط حصراً: **"المركز"** و **"الليزر"**.

### 4. `expense_categories` (تصنيفات المصاريف)
- `id` (UUID, Primary Key).
- `name` (VARCHAR(100), UNIQUE): اسم التصنيف (مثل: صيانة أجهزة، مستلزمات طبية، فواتير، مصاريف نثرية).
- `is_active` (BOOLEAN).

### 5. `exchange_rates` (أسعار الصرف)
- `id` (UUID, Primary Key).
- `date` (DATE, UNIQUE): التاريخ (فريد لعدم تكرار سعر صرف بنفس اليوم).
- `rate` (NUMERIC(12,4)): سعر الصرف المعين.
- `source` (VARCHAR(100)): مصدر النشرة المالية.
- `created_by` (UUID).

### 6. `transactions` (الحركات المالية)
- `id` (UUID, Primary Key).
- `cash_box_id` (UUID, Foreign Key -> `cash_boxes.id`).
- `date` (DATE): تاريخ الحركة.
- `type` (VARCHAR(50)): نوع الحركة (`income`, `expense`, `transfer`).
- `amount` (NUMERIC(14,2)): المبلغ المالي.
- `currency` (VARCHAR(10), Default: 'SYP').
- `exchange_rate_used` (NUMERIC(12,4)).
- `patient_name` (VARCHAR(255), NULLABLE): اسم المريض.
- `clinic_id` (UUID, Foreign Key -> `clinics.id`, NULLABLE).
- `expense_category_id` (UUID, Foreign Key -> `expense_categories.id`, NULLABLE).
- `is_suspense` (BOOLEAN, Default: false): حساب معلق.
- `description` (TEXT): بيان الحركة.
- `created_by` (UUID).
- `created_at` (TIMESTAMPTZ).

### 7. `users` (جدول المستخدمين المخصص)
مرتبط بـ `auth.users` عبر `auth_id`.
- `id` (UUID, Primary Key).
- `auth_id` (UUID, Foreign Key -> `auth.users.id`, UNIQUE).
- `role` (VARCHAR(50)): الدور المحدد (`owner`, `secretary`, `doctor`, `rep`, `laser_staff`).
- `linked_clinic_id` (UUID, Foreign Key -> `clinics.id`, NULLABLE): العيادة المرتبطة في حال كان طبيباً.
- `linked_rep_id` (UUID, NULLABLE): المعرف المرتبط للمندوب.
- `email` (VARCHAR(255)).
- `full_name` (VARCHAR(255)).
- `is_active` (BOOLEAN).

### 8. `roles`, `permissions`, `role_permissions` (نظام الصلاحيات المرن)
- `roles`: معرفات الأدوار وأسمائها.
- `permissions`: قائمة الصلاحيات التفصيلية.
- `role_permissions`: الربط الديناميكي بين الأكواد والدور لإضافة دور خامس (موظفات الليزر) أو أدوار مستقبليلة دون إعادة هيكلة الكود.

### 9. `audit_log` (سجل التدقيق والعمليات)
- `id`, `user_id`, `action`, `table_name`, `record_id`, `old_value` (JSONB), `new_value` (JSONB), `created_at`.

---

## 🔒 الضوابط الأمنية والدوال (Security Constraints)

### 1. دالة إنشاء الحساب التلقائي `handle_new_user()`
تم تحديث وتثبيت الدالة في `schema.sql` بحيث تُعين القيمة الثابتة **`role = 'secretary'`** بحجم محدد داخل كود الدالة نفسه، وبدون قراءة أي قيمة من `NEW.raw_user_meta_data` نهائياً.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (auth_id, email, role, is_active)
    VALUES (NEW.id, NEW.email, 'secretary', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> **تغيير وترقية الأدوار:** ترقية أي مستخدم إلى دور المالك (`owner`) يتم حصراً من داخل لوحة تحكم المالك عبر تحديث مباشر على جدول `public.users`.

### 2. سياسات Row Level Security (RLS)
- **`owner`**: صلاحيات قراءة وكتابة وتعديل وحذف كاملة على جميع الجداول.
- **`secretary`**: إدخال جديد فقط (`INSERT`) على جدول `transactions` بدون إمكانية التعديل (`UPDATE`) أو الحذف (`DELETE`). قراءة الجداول المرجعية (`cash_boxes`, `clinics`, إلخ).
- **`doctor`**: قراءة فقط (`SELECT`) محصورة بالبيانات المرتبطة بعيادته (`linked_clinic_id`).
- **`rep`**: قراءة فقط (`SELECT`) محصورة ببياناته الخاصة (`linked_rep_id`).

---

## ⚙️ إعداد وتشغيل المشروع

### المتغيرات البيئية (`.env`)
تأكد من إعداد المتغيرات التالية:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### طريقة البدء:
1. انسخ محتوى الملف `schema.sql`.
2. الصق السكربت في **SQL Editor** داخل لوحة تحكم Supabase واضغط **Run**.
3. قم بإنشاء حساب أول، ثم لترقيته لـ Owner شغل الاستعلام:
   ```sql
   UPDATE public.users SET role = 'owner' WHERE email = 'your-email@example.com';
   ```
4. شغّل المشروع باستخدام `npm run dev`.
