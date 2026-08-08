export type Role = 'owner' | 'secretary' | 'doctor' | 'rep' | 'laser_staff';

export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  role: Role;
  linked_clinic_id?: string | null;
  linked_rep_id?: string | null;
  is_active: boolean;
  full_name?: string | null;
  created_at?: string;
}

export interface Clinic {
  id: string;
  number: string;
  doctor_name: string;
  specialty: string;
  is_active: boolean;
  created_at?: string;
}

export interface DoctorPercentageHistory {
  id: string;
  clinic_id: string;
  percentage: number;
  effective_from: string;
  created_by?: string;
  created_at?: string;
}

export interface CashBox {
  id: string;
  name: string;
  created_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface ExchangeRate {
  id: string;
  date: string;
  rate: number;
  source?: string;
  created_by?: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  cash_box_id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  exchange_rate_used: number;
  patient_name?: string;
  clinic_id?: string;
  expense_category_id?: string;
  is_suspense: boolean;
  description?: string;
  created_by?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
}

export interface SystemRole {
  id: Role;
  display_name: string;
  description: string;
}

export interface SystemPermission {
  id: string;
  name: string;
  description: string;
}
