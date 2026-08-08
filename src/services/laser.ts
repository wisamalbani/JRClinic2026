import { supabase } from '../lib/supabase';
import {
  LaserStaff,
  LaserStaffPercentageHistory,
  LaserStaffSalaryHistory,
  LaserShotRateHistory,
  LaserTransaction,
  LaserWithdrawal,
} from '../types';

export async function getLaserStaff(): Promise<LaserStaff[]> {
  const { data, error } = await supabase
    .from('laser_staff')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching laser staff:', error);
    throw error;
  }
  return data || [];
}

export async function addLaserStaff(name: string): Promise<LaserStaff> {
  const { data, error } = await supabase
    .from('laser_staff')
    .insert([{ name, is_active: true }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleLaserStaffActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('laser_staff')
    .update({ is_active })
    .eq('id', id);

  if (error) throw error;
}

// Staff Percentage History
export async function getLaserStaffPercentageHistory(): Promise<LaserStaffPercentageHistory[]> {
  const { data, error } = await supabase
    .from('laser_staff_percentage_history')
    .select('*, laser_staff(*)')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addLaserStaffPercentage(
  staff_id: string,
  percentage: number,
  effective_from: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('laser_staff_percentage_history')
    .insert([{
      staff_id,
      percentage,
      effective_from,
      created_by: userData?.user?.id || null,
    }]);

  if (error) throw error;
}

// Staff Salary History
export async function getLaserStaffSalaryHistory(): Promise<LaserStaffSalaryHistory[]> {
  const { data, error } = await supabase
    .from('laser_staff_salary_history')
    .select('*, laser_staff(*)')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addLaserStaffSalary(
  staff_id: string,
  amount: number,
  currency: string,
  effective_from: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('laser_staff_salary_history')
    .insert([{
      staff_id,
      amount,
      currency,
      effective_from,
      created_by: userData?.user?.id || null,
    }]);

  if (error) throw error;
}

// Shot Rate History
export async function getLaserShotRateHistory(): Promise<LaserShotRateHistory[]> {
  const { data, error } = await supabase
    .from('laser_shot_rate_history')
    .select('*')
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addLaserShotRate(
  rate_per_shot: number,
  currency: string,
  effective_from: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('laser_shot_rate_history')
    .insert([{
      rate_per_shot,
      currency,
      effective_from,
      created_by: userData?.user?.id || null,
    }]);

  if (error) throw error;
}

// Transactions
export async function getLaserTransactions(startDate?: string, endDate?: string): Promise<LaserTransaction[]> {
  let query = supabase
    .from('laser_transactions')
    .select('*, laser_staff(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addLaserTransaction(tx: {
  date: string;
  type: 'income' | 'expense';
  patient_name?: string;
  staff_id?: string;
  shots_count?: number;
  amount: number;
  currency: string;
  exchange_rate_used?: number;
  description?: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();

  // Validate constraints on client side before insert as well
  if (tx.type === 'income') {
    if (!tx.patient_name || !tx.patient_name.trim()) {
      throw new Error('اسم المريضة إلزامي في حركات القبض');
    }
    if (!tx.staff_id) {
      throw new Error('اختيار الصبية إلزامي في حركات القبض');
    }
    if (tx.shots_count === undefined || tx.shots_count === null || tx.shots_count < 0) {
      throw new Error('عدد الضربات إلزامي ويجب أن يكون صفراً أو أكثر');
    }
  }

  const { error } = await supabase
    .from('laser_transactions')
    .insert([{
      date: tx.date,
      type: tx.type,
      patient_name: tx.type === 'income' ? tx.patient_name : null,
      staff_id: tx.type === 'income' ? tx.staff_id : null,
      shots_count: tx.type === 'income' ? tx.shots_count : null,
      amount: tx.amount,
      currency: tx.currency,
      exchange_rate_used: tx.exchange_rate_used || 1.0,
      description: tx.description || null,
      created_by: userData?.user?.id || null,
    }]);

  if (error) throw error;
}

// Withdrawals
export async function getLaserWithdrawals(startDate?: string, endDate?: string): Promise<LaserWithdrawal[]> {
  let query = supabase
    .from('laser_withdrawals')
    .select('*, laser_staff(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addLaserWithdrawal(w: {
  date: string;
  beneficiary_type: 'staff' | 'doctor' | 'center';
  staff_id?: string;
  amount: number;
  currency: string;
  notes?: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();

  if (w.beneficiary_type === 'staff' && !w.staff_id) {
    throw new Error('يرجى تحديد الصبية المستفيدة من السحب');
  }

  const { error } = await supabase
    .from('laser_withdrawals')
    .insert([{
      date: w.date,
      beneficiary_type: w.beneficiary_type,
      staff_id: w.beneficiary_type === 'staff' ? w.staff_id : null,
      amount: w.amount,
      currency: w.currency,
      notes: w.notes || null,
      created_by: userData?.user?.id || null,
    }]);

  if (error) throw error;
}

// REPORT CALCULATION HELPERS
export interface LaserStaffReportDetail {
  staff: LaserStaff;
  income: number;
  shotsCount: number;
  commissionAmount: number;
  salaryAmount: number;
  withdrawalsAmount: number;
}

export interface LaserMonthlyReportData {
  startDate: string;
  endDate: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalWithdrawals: number;
  staffDetails: LaserStaffReportDetail[];
  totalMaintenanceReserve: number;
  endingCashBalance: number;
  doctorWithdrawals: number;
  centerWithdrawals: number;
  totalStaffSalaries: number;
  netForDoctor: number;
}

export async function calculateLaserMonthlyReport(
  startDate: string,
  endDate: string
): Promise<LaserMonthlyReportData> {
  const staffList = await getLaserStaff();
  const percentageHistory = await getLaserStaffPercentageHistory();
  const salaryHistory = await getLaserStaffSalaryHistory();
  const shotRateHistory = await getLaserShotRateHistory();

  // Helper: Get effective percentage for a staff on a date
  const getEffectivePercentage = (staffId: string, date: string): number => {
    const valid = percentageHistory.filter(
      (p) => p.staff_id === staffId && p.effective_from <= date
    );
    if (valid.length === 0) return 0;
    return valid[0].percentage;
  };

  // Helper: Get effective salary for a staff on a date
  const getEffectiveSalary = (staffId: string, date: string): number => {
    const valid = salaryHistory.filter(
      (s) => s.staff_id === staffId && s.effective_from <= date
    );
    if (valid.length === 0) return 0;
    return valid[0].amount;
  };

  // Helper: Get effective shot rate on a date
  const getEffectiveShotRate = (date: string): number => {
    const valid = shotRateHistory.filter((r) => r.effective_from <= date);
    if (valid.length === 0) return 0;
    return valid[0].rate_per_shot;
  };

  // 1. Calculate Opening Balance before startDate
  const { data: priorTx } = await supabase
    .from('laser_transactions')
    .select('*')
    .lt('date', startDate);

  const { data: priorWd } = await supabase
    .from('laser_withdrawals')
    .select('*')
    .lt('date', startDate);

  let priorIncome = 0;
  let priorExpense = 0;
  (priorTx || []).forEach((t) => {
    const amt = Number(t.amount);
    if (t.type === 'income') priorIncome += amt;
    else if (t.type === 'expense') priorExpense += amt;
  });

  let priorWithdrawals = 0;
  (priorWd || []).forEach((w) => {
    priorWithdrawals += Number(w.amount);
  });

  const openingBalance = priorIncome - priorExpense - priorWithdrawals;

  // 2. Fetch Period Transactions and Withdrawals
  const { data: periodTx } = await supabase
    .from('laser_transactions')
    .select('*, laser_staff(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  const { data: periodWd } = await supabase
    .from('laser_withdrawals')
    .select('*, laser_staff(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalMaintenanceReserve = 0;

  (periodTx || []).forEach((t) => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      totalIncome += amt;
      const shots = Number(t.shots_count || 0);
      const rate = getEffectiveShotRate(t.date);
      totalMaintenanceReserve += shots * rate;
    } else if (t.type === 'expense') {
      totalExpenses += amt;
    }
  });

  let totalWithdrawals = 0;
  let doctorWithdrawals = 0;
  let centerWithdrawals = 0;

  const staffWithdrawalsMap: Record<string, number> = {};
  staffList.forEach((s) => (staffWithdrawalsMap[s.id] = 0));

  (periodWd || []).forEach((w) => {
    const amt = Number(w.amount);
    totalWithdrawals += amt;
    if (w.beneficiary_type === 'doctor') {
      doctorWithdrawals += amt;
    } else if (w.beneficiary_type === 'center') {
      centerWithdrawals += amt;
    } else if (w.beneficiary_type === 'staff' && w.staff_id) {
      staffWithdrawalsMap[w.staff_id] = (staffWithdrawalsMap[w.staff_id] || 0) + amt;
    }
  });

  // Calculate per staff metrics
  const staffDetails: LaserStaffReportDetail[] = staffList.map((staff) => {
    let staffIncome = 0;
    let staffShotsCount = 0;
    let staffCommissionAmount = 0;

    (periodTx || []).forEach((t) => {
      if (t.type === 'income' && t.staff_id === staff.id) {
        const amt = Number(t.amount);
        const shots = Number(t.shots_count || 0);
        staffIncome += amt;
        staffShotsCount += shots;

        const effectivePct = getEffectivePercentage(staff.id, t.date);
        staffCommissionAmount += amt * (effectivePct / 100);
      }
    });

    const salaryAmount = getEffectiveSalary(staff.id, endDate);
    const withdrawalsAmount = staffWithdrawalsMap[staff.id] || 0;

    return {
      staff,
      income: staffIncome,
      shotsCount: staffShotsCount,
      commissionAmount: staffCommissionAmount,
      salaryAmount,
      withdrawalsAmount,
    };
  });

  const totalStaffSalaries = staffDetails.reduce((acc, s) => acc + s.salaryAmount, 0);

  // Ending cash balance of the laser fund = Opening + Income - Expense - Withdrawals
  const endingCashBalance = openingBalance + totalIncome - totalExpenses - totalWithdrawals;

  // Remaining for Dr. Jihad = Ending Cash Balance - Maintenance Reserve
  const netForDoctor = endingCashBalance - totalMaintenanceReserve;

  return {
    startDate,
    endDate,
    openingBalance,
    totalIncome,
    totalExpenses,
    totalWithdrawals,
    staffDetails,
    totalMaintenanceReserve,
    endingCashBalance,
    doctorWithdrawals,
    centerWithdrawals,
    totalStaffSalaries,
    netForDoctor,
  };
}
