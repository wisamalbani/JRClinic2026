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
  is_cash_movement?: boolean;
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

export interface InventoryItem {
  id: string;
  name: string;
  units_per_package: number;
  created_at?: string;
}

export interface Rep {
  id: string;
  name: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface MaterialBatch {
  id: string;
  item_id: string;
  source_type: 'rep' | 'cash';
  rep_id?: string | null;
  purchase_date: string;
  package_qty: number;
  unit_price_per_package: number;
  currency: string;
  unit_cost: number;
  remaining_units: number;
  created_at?: string;
  // Join properties
  inventory_items?: InventoryItem;
  reps?: Rep;
}

export interface MaterialConsumption {
  id: string;
  batch_id: string;
  clinic_id: string;
  quantity_units: number;
  date: string;
  notes?: string | null;
  created_by?: string;
  created_at?: string;
  // Join properties
  material_batches?: MaterialBatch & { inventory_items?: InventoryItem; reps?: Rep };
  clinics?: Clinic;
}

export interface RepPayment {
  id: string;
  rep_id: string;
  date: string;
  amount: number;
  currency: string;
  notes?: string | null;
  created_by?: string;
  created_at?: string;
  reps?: Rep;
}

export interface LaserStaff {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface LaserStaffPercentageHistory {
  id: string;
  staff_id: string;
  percentage: number;
  effective_from: string;
  created_by?: string;
  created_at?: string;
  laser_staff?: LaserStaff;
}

export interface LaserStaffSalaryHistory {
  id: string;
  staff_id: string;
  amount: number;
  currency: string;
  effective_from: string;
  created_by?: string;
  created_at?: string;
  laser_staff?: LaserStaff;
}

export interface LaserShotRateHistory {
  id: string;
  rate_per_shot: number;
  currency: string;
  effective_from: string;
  created_by?: string;
  created_at?: string;
}

export interface LaserTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  patient_name?: string | null;
  staff_id?: string | null;
  shots_count?: number | null;
  amount: number;
  currency: string;
  exchange_rate_used: number;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  laser_staff?: LaserStaff;
}

export interface LaserWithdrawal {
  id: string;
  date: string;
  beneficiary_type: 'staff' | 'doctor' | 'center';
  staff_id?: string | null;
  amount: number;
  currency: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  laser_staff?: LaserStaff;
}

export interface ReportPermission {
  id: string;
  user_id: string;
  report_key: string;
  is_enabled: boolean;
  created_at?: string;
}

export const FIXED_REPORT_KEYS = {
  BOX_CENTER: 'box_center',
  BOX_LASER: 'box_laser',
  LASER_MONTHLY_REPORT: 'laser_monthly_report',
  SUSPENSE_TRANSACTIONS: 'suspense_transactions',
  FREE_REPORTS: 'free_reports',
} as const;

export const FIXED_REPORT_LABELS: Record<string, { label: string; category: string }> = {
  [FIXED_REPORT_KEYS.BOX_CENTER]: { label: 'كشف صندوق المركز', category: 'الصناديق' },
  [FIXED_REPORT_KEYS.BOX_LASER]: { label: 'كشف صندوق الليزر', category: 'الصناديق' },
  [FIXED_REPORT_KEYS.LASER_MONTHLY_REPORT]: { label: 'تقرير الليزر الشهري', category: 'تقارير الليزر' },
  [FIXED_REPORT_KEYS.SUSPENSE_TRANSACTIONS]: { label: 'الحركات المعلقة', category: 'الحركات' },
  [FIXED_REPORT_KEYS.FREE_REPORTS]: { label: 'تقارير حرة', category: 'أخرى' },
};

export function getClinicReportKey(clinicId: string): string {
  return `clinic_${clinicId}`;
}

export function getRepReportKey(repId: string): string {
  return `rep_${repId}`;
}



