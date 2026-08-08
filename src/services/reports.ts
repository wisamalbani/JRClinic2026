import { supabase } from '../lib/supabase';
import { Transaction, DoctorPercentageHistory, Clinic, ExpenseCategory, CashBox } from '../types';

export interface PatientReportPayment {
  id: string;
  date: string;
  amount: number;
  currency: string; // 'SYP' | 'USD'
  exchange_rate_used: number;
  equivalent_amount: number; // In the opposite currency
  equivalent_currency: string;
  description?: string;
  clinic_name?: string;
  cash_box_name?: string;
}

export interface PatientReportResult {
  patientName: string;
  startDate?: string;
  endDate?: string;
  payments: PatientReportPayment[];
  totalPaidSYP: number; // Including converted USD payments
  totalPaidUSD: number; // Including converted SYP payments
  directSYPTotal: number;
  directUSDTotal: number;
}

export interface DoctorReportIncomeRow {
  transactionId: string;
  date: string;
  patientName: string;
  amountSYP: number;
  amountUSD: number;
  effectiveRate: number; // Percentage on that date
  doctorShareSYP: number;
  centerShareSYP: number;
  doctorShareUSD: number;
  centerShareUSD: number;
}

export interface DoctorReportExpenseRow {
  transactionId: string;
  date: string;
  categoryName: string;
  description?: string;
  amountSYP: number;
  amountUSD: number;
}

export interface DoctorReportResult {
  clinic: Clinic;
  startDate: string;
  endDate: string;
  incomes: DoctorReportIncomeRow[];
  expenses: DoctorReportExpenseRow[];
  totalRevenueSYP: number;
  totalRevenueUSD: number;
  totalExpenseSYP: number;
  totalExpenseUSD: number;
  netRevenueSYP: number; // Revenue - Expense
  netRevenueUSD: number;
  totalDoctorShareSYP: number;
  totalCenterShareSYP: number;
  totalDoctorShareUSD: number;
  totalCenterShareUSD: number;
  netDoctorRemainingSYP: number; // Doctor Share SYP - Expense SYP
  netDoctorRemainingUSD: number; // Doctor Share USD - Expense USD
}

export interface CashBoxStatementRow {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  patientName?: string;
  categoryName?: string;
  description?: string;
  amount: number;
  currency: string; // 'SYP' | 'USD'
  runningBalanceSYP: number;
  runningBalanceUSD: number;
}

export interface CashBoxStatementResult {
  cashBox: CashBox;
  startDate: string;
  endDate: string;
  openingBalanceSYP: number;
  openingBalanceUSD: number;
  rows: CashBoxStatementRow[];
  closingBalanceSYP: number;
  closingBalanceUSD: number;
  totalIncomeSYP: number;
  totalExpenseSYP: number;
  totalIncomeUSD: number;
  totalExpenseUSD: number;
}

export interface CustomReportFilters {
  categoryId?: string;
  clinicId?: string;
  cashBoxId?: string;
  type?: 'all' | 'income' | 'expense' | 'transfer';
  isSuspense?: 'all' | 'suspense' | 'normal';
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface CustomReportRow extends Transaction {
  clinic_name?: string;
  category_name?: string;
  cash_box_name?: string;
}

export interface CustomReportResult {
  filters: CustomReportFilters;
  transactions: CustomReportRow[];
  totalIncomeSYP: number;
  totalExpenseSYP: number;
  totalIncomeUSD: number;
  totalExpenseUSD: number;
  netSYP: number;
  netUSD: number;
}

// Utility: Normalize currency code
export function normalizeCurrency(currencyStr?: string): 'SYP' | 'USD' {
  if (!currencyStr) return 'SYP';
  const u = currencyStr.trim().toUpperCase();
  if (u === 'USD' || u === 'DOLLAR' || u === 'دولار' || u === '$') {
    return 'USD';
  }
  return 'SYP';
}

/**
 * 1. Patient Report
 */
export async function getPatientReport(
  patientNameQuery: string,
  startDate?: string,
  endDate?: string
): Promise<PatientReportResult> {
  let query = supabase.from('transactions').select('*');

  if (patientNameQuery.trim()) {
    query = query.ilike('patient_name', `%${patientNameQuery.trim()}%`);
  }

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data: txList, error } = await query.order('date', { ascending: true }).order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching patient report:', error);
    throw error;
  }

  // Master lookups
  const { data: clinics } = await supabase.from('clinics').select('id, number, doctor_name');
  const { data: cashBoxes } = await supabase.from('cash_boxes').select('id, name');

  const clinicsMap = new Map((clinics || []).map((c) => [c.id, `عيادة ${c.number} (${c.doctor_name})`]));
  const cashBoxesMap = new Map((cashBoxes || []).map((cb) => [cb.id, cb.name]));

  let directSYPTotal = 0;
  let directUSDTotal = 0;
  let totalPaidSYP = 0;
  let totalPaidUSD = 0;

  const payments: PatientReportPayment[] = (txList || []).map((tx) => {
    const normCurr = normalizeCurrency(tx.currency);
    const rate = Number(tx.exchange_rate_used) || 1;
    let equivAmount = 0;
    let equivCurrency = 'USD';

    if (normCurr === 'SYP') {
      directSYPTotal += Number(tx.amount);
      totalPaidSYP += Number(tx.amount);

      equivCurrency = 'USD';
      equivAmount = rate > 0 ? Number(tx.amount) / rate : 0;
      totalPaidUSD += equivAmount;
    } else {
      directUSDTotal += Number(tx.amount);
      totalPaidUSD += Number(tx.amount);

      equivCurrency = 'SYP';
      equivAmount = Number(tx.amount) * rate;
      totalPaidSYP += equivAmount;
    }

    return {
      id: tx.id,
      date: tx.date,
      amount: Number(tx.amount),
      currency: normCurr,
      exchange_rate_used: rate,
      equivalent_amount: equivAmount,
      equivalent_currency: equivCurrency,
      description: tx.description,
      clinic_name: tx.clinic_id ? clinicsMap.get(tx.clinic_id) : undefined,
      cash_box_name: tx.cash_box_id ? cashBoxesMap.get(tx.cash_box_id) : undefined,
    };
  });

  return {
    patientName: patientNameQuery,
    startDate,
    endDate,
    payments,
    totalPaidSYP,
    totalPaidUSD,
    directSYPTotal,
    directUSDTotal,
  };
}

/**
 * Helper: Find effective doctor percentage on a specific transaction date
 */
export function getEffectiveRateForDate(
  history: DoctorPercentageHistory[],
  targetDate: string
): number {
  if (!history || history.length === 0) return 0;
  // Filter history entries where effective_from <= targetDate
  const eligible = history.filter((h) => h.effective_from <= targetDate);
  if (eligible.length === 0) {
    // If targetDate is earlier than all history entries, return earliest entry
    return Number(history[0].percentage) || 0;
  }
  // Sort descending by effective_from then created_at
  eligible.sort((a, b) => {
    if (a.effective_from !== b.effective_from) {
      return b.effective_from.localeCompare(a.effective_from);
    }
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
  return Number(eligible[0].percentage) || 0;
}

/**
 * 2. Doctor / Clinic Report
 */
export async function getDoctorReport(
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<DoctorReportResult> {
  // 1. Clinic
  const { data: clinic, error: clinicErr } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single();

  if (clinicErr || !clinic) {
    throw clinicErr || new Error('العيادة غير موجودة');
  }

  // 2. Doctor Percentage History for this clinic
  const { data: historyData } = await supabase
    .from('doctor_percentage_history')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('effective_from', { ascending: true });

  const history: DoctorPercentageHistory[] = historyData || [];

  // 3. Transactions (Incomes and Expenses) for this clinic in range
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (txErr) {
    console.error('Error fetching clinic transactions:', txErr);
    throw txErr;
  }

  // 4. Expense Categories
  const { data: categories } = await supabase.from('expense_categories').select('id, name');
  const catMap = new Map((categories || []).map((c) => [c.id, c.name]));

  const incomes: DoctorReportIncomeRow[] = [];
  const expenses: DoctorReportExpenseRow[] = [];

  let totalRevenueSYP = 0;
  let totalRevenueUSD = 0;
  let totalExpenseSYP = 0;
  let totalExpenseUSD = 0;

  // Pass 1: Calculate total revenues and expenses for the period
  (txData || []).forEach((tx) => {
    const normCurr = normalizeCurrency(tx.currency);
    const amt = Number(tx.amount);

    if (tx.type === 'income') {
      if (normCurr === 'SYP') {
        totalRevenueSYP += amt;
      } else {
        totalRevenueUSD += amt;
      }
    } else if (tx.type === 'expense') {
      if (normCurr === 'SYP') {
        totalExpenseSYP += amt;
      } else {
        totalExpenseUSD += amt;
      }

      expenses.push({
        transactionId: tx.id,
        date: tx.date,
        categoryName: tx.expense_category_id ? catMap.get(tx.expense_category_id) || 'مصروف عام' : 'مصروف عام',
        description: tx.description,
        amountSYP: normCurr === 'SYP' ? amt : 0,
        amountUSD: normCurr === 'USD' ? amt : 0,
      });
    }
  });

  const netRevenueSYP = totalRevenueSYP - totalExpenseSYP;
  const netRevenueUSD = totalRevenueUSD - totalExpenseUSD;

  let totalDoctorShareSYP = 0;
  let totalCenterShareSYP = 0;
  let totalDoctorShareUSD = 0;
  let totalCenterShareUSD = 0;

  // Expense ratios for proportional deduction from each income transaction
  const expenseRatioSYP = totalRevenueSYP > 0 ? totalExpenseSYP / totalRevenueSYP : 0;
  const expenseRatioUSD = totalRevenueUSD > 0 ? totalExpenseUSD / totalRevenueUSD : 0;

  // Pass 2: Calculate doctor and center shares based on net revenue contribution of each income transaction
  (txData || []).forEach((tx) => {
    if (tx.type === 'income') {
      const normCurr = normalizeCurrency(tx.currency);
      const amt = Number(tx.amount);
      const effectiveRate = getEffectiveRateForDate(history, tx.date);
      const doctorPct = effectiveRate / 100;
      const centerPct = (100 - effectiveRate) / 100;

      let amtSYP = 0;
      let amtUSD = 0;
      let docShareSYP = 0;
      let cenShareSYP = 0;
      let docShareUSD = 0;
      let cenShareUSD = 0;

      if (normCurr === 'SYP') {
        amtSYP = amt;
        const netContributionSYP = amtSYP * (1 - expenseRatioSYP);
        docShareSYP = netContributionSYP * doctorPct;
        cenShareSYP = netContributionSYP * centerPct;
        totalDoctorShareSYP += docShareSYP;
        totalCenterShareSYP += cenShareSYP;
      } else {
        amtUSD = amt;
        const netContributionUSD = amtUSD * (1 - expenseRatioUSD);
        docShareUSD = netContributionUSD * doctorPct;
        cenShareUSD = netContributionUSD * centerPct;
        totalDoctorShareUSD += docShareUSD;
        totalCenterShareUSD += cenShareUSD;
      }

      incomes.push({
        transactionId: tx.id,
        date: tx.date,
        patientName: tx.patient_name || 'غير محدد',
        amountSYP: amtSYP,
        amountUSD: amtUSD,
        effectiveRate,
        doctorShareSYP: docShareSYP,
        centerShareSYP: cenShareSYP,
        doctorShareUSD: docShareUSD,
        centerShareUSD: cenShareUSD,
      });
    }
  });

  const netDoctorRemainingSYP = totalDoctorShareSYP;
  const netDoctorRemainingUSD = totalDoctorShareUSD;

  return {
    clinic,
    startDate,
    endDate,
    incomes,
    expenses,
    totalRevenueSYP,
    totalRevenueUSD,
    totalExpenseSYP,
    totalExpenseUSD,
    netRevenueSYP,
    netRevenueUSD,
    totalDoctorShareSYP,
    totalCenterShareSYP,
    totalDoctorShareUSD,
    totalCenterShareUSD,
    netDoctorRemainingSYP,
    netDoctorRemainingUSD,
  };
}

/**
 * 3. Cash Box Statement Report
 */
export async function getCashBoxStatementReport(
  cashBoxId: string,
  startDate: string,
  endDate: string
): Promise<CashBoxStatementResult> {
  // 1. Cash Box Info
  const { data: cashBox, error: cbErr } = await supabase
    .from('cash_boxes')
    .select('*')
    .eq('id', cashBoxId)
    .single();

  if (cbErr || !cashBox) {
    throw cbErr || new Error('الصندوق غير موجود');
  }

  // 2. Calculate Opening Balances before startDate
  const { data: priorTx, error: priorErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('cash_box_id', cashBoxId)
    .lt('date', startDate);

  if (priorErr) {
    console.error('Error fetching prior transactions:', priorErr);
  }

  let openingBalanceSYP = 0;
  let openingBalanceUSD = 0;

  (priorTx || []).forEach((tx) => {
    const normCurr = normalizeCurrency(tx.currency);
    const amt = Number(tx.amount);
    const multiplier = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 1; // transfer logic handled as logged

    if (normCurr === 'SYP') {
      openingBalanceSYP += amt * multiplier;
    } else {
      openingBalanceUSD += amt * multiplier;
    }
  });

  // 3. Transactions inside range [startDate, endDate]
  const { data: rangeTx, error: rangeErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('cash_box_id', cashBoxId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (rangeErr) {
    console.error('Error fetching range transactions:', rangeErr);
    throw rangeErr;
  }

  const { data: categories } = await supabase.from('expense_categories').select('id, name');
  const catMap = new Map((categories || []).map((c) => [c.id, c.name]));

  let currentSYP = openingBalanceSYP;
  let currentUSD = openingBalanceUSD;

  let totalIncomeSYP = 0;
  let totalExpenseSYP = 0;
  let totalIncomeUSD = 0;
  let totalExpenseUSD = 0;

  const rows: CashBoxStatementRow[] = (rangeTx || []).map((tx) => {
    const normCurr = normalizeCurrency(tx.currency);
    const amt = Number(tx.amount);

    if (tx.type === 'income') {
      if (normCurr === 'SYP') {
        currentSYP += amt;
        totalIncomeSYP += amt;
      } else {
        currentUSD += amt;
        totalIncomeUSD += amt;
      }
    } else if (tx.type === 'expense') {
      if (normCurr === 'SYP') {
        currentSYP -= amt;
        totalExpenseSYP += amt;
      } else {
        currentUSD -= amt;
        totalExpenseUSD += amt;
      }
    } else if (tx.type === 'transfer') {
      // Assuming transfer logged appropriately
      if (normCurr === 'SYP') {
        currentSYP += amt;
      } else {
        currentUSD += amt;
      }
    }

    return {
      id: tx.id,
      date: tx.date,
      type: tx.type,
      patientName: tx.patient_name,
      categoryName: tx.expense_category_id ? catMap.get(tx.expense_category_id) : undefined,
      description: tx.description,
      amount: amt,
      currency: normCurr,
      runningBalanceSYP: currentSYP,
      runningBalanceUSD: currentUSD,
    };
  });

  return {
    cashBox,
    startDate,
    endDate,
    openingBalanceSYP,
    openingBalanceUSD,
    rows,
    closingBalanceSYP: currentSYP,
    closingBalanceUSD: currentUSD,
    totalIncomeSYP,
    totalExpenseSYP,
    totalIncomeUSD,
    totalExpenseUSD,
  };
}

/**
 * 4. Custom Filtered Report
 */
export async function getCustomFilteredReport(
  filters: CustomReportFilters
): Promise<CustomReportResult> {
  let query = supabase.from('transactions').select('*');

  if (filters.categoryId) {
    query = query.eq('expense_category_id', filters.categoryId);
  }
  if (filters.clinicId) {
    query = query.eq('clinic_id', filters.clinicId);
  }
  if (filters.cashBoxId) {
    query = query.eq('cash_box_id', filters.cashBoxId);
  }
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.isSuspense && filters.isSuspense !== 'all') {
    query = query.eq('is_suspense', filters.isSuspense === 'suspense');
  }
  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data: txList, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom report:', error);
    throw error;
  }

  // Master lookups
  const { data: clinics } = await supabase.from('clinics').select('id, number, doctor_name');
  const { data: cashBoxes } = await supabase.from('cash_boxes').select('id, name');
  const { data: categories } = await supabase.from('expense_categories').select('id, name');

  const clinicsMap = new Map((clinics || []).map((c) => [c.id, `عيادة ${c.number} (${c.doctor_name})`]));
  const cashBoxesMap = new Map((cashBoxes || []).map((cb) => [cb.id, cb.name]));
  const catMap = new Map((categories || []).map((c) => [c.id, c.name]));

  let filteredList = txList || [];

  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().toLowerCase();
    filteredList = filteredList.filter(
      (tx) =>
        (tx.patient_name && tx.patient_name.toLowerCase().includes(term)) ||
        (tx.description && tx.description.toLowerCase().includes(term))
    );
  }

  let totalIncomeSYP = 0;
  let totalExpenseSYP = 0;
  let totalIncomeUSD = 0;
  let totalExpenseUSD = 0;

  const resultRows: CustomReportRow[] = filteredList.map((tx) => {
    const normCurr = normalizeCurrency(tx.currency);
    const amt = Number(tx.amount);

    if (tx.type === 'income') {
      if (normCurr === 'SYP') totalIncomeSYP += amt;
      else totalIncomeUSD += amt;
    } else if (tx.type === 'expense') {
      if (normCurr === 'SYP') totalExpenseSYP += amt;
      else totalExpenseUSD += amt;
    }

    return {
      ...tx,
      currency: normCurr,
      clinic_name: tx.clinic_id ? clinicsMap.get(tx.clinic_id) : undefined,
      cash_box_name: tx.cash_box_id ? cashBoxesMap.get(tx.cash_box_id) : undefined,
      category_name: tx.expense_category_id ? catMap.get(tx.expense_category_id) : undefined,
    };
  });

  return {
    filters,
    transactions: resultRows,
    totalIncomeSYP,
    totalExpenseSYP,
    totalIncomeUSD,
    totalExpenseUSD,
    netSYP: totalIncomeSYP - totalExpenseSYP,
    netUSD: totalIncomeUSD - totalExpenseUSD,
  };
}
