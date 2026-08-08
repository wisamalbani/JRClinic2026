import { supabase } from '../lib/supabase';
import { DoctorPercentageHistory } from '../types';

/**
 * Helper function (يمكن استخدامها لاحقاً بالتقارير):
 * بمعطى clinic_id وتاريخ، ترجع النسبة التي كانت سارية بذلك التاريخ
 * (أحدث سطر بـ effective_from <= التاريخ المطلوب).
 */
export async function getEffectiveDoctorPercentage(
  clinicId: string,
  targetDate: string = new Date().toISOString().split('T')[0]
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_percentage_history')
      .select('percentage')
      .eq('clinic_id', clinicId)
      .lte('effective_from', targetDate)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching effective percentage:', error);
      return null;
    }

    return data ? Number(data.percentage) : null;
  } catch (err) {
    console.error('Exception in getEffectiveDoctorPercentage:', err);
    return null;
  }
}

/**
 * Fetches all active clinics with their current effective percentage for today.
 */
export async function getClinicsWithCurrentPercentage() {
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: clinics, error: clinicsErr } = await supabase
    .from('clinics')
    .select('*')
    .order('number', { ascending: true });

  if (clinicsErr || !clinics) {
    throw clinicsErr || new Error('Failed to fetch clinics');
  }

  const { data: history, error: historyErr } = await supabase
    .from('doctor_percentage_history')
    .select('*')
    .lte('effective_from', todayStr)
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });

  if (historyErr) {
    console.error('Error fetching percentage history:', historyErr);
  }

  return clinics.map((clinic) => {
    const clinicHistory = (history || []).filter((h) => h.clinic_id === clinic.id);
    const currentRateObj = clinicHistory[0]; // ordered by effective_from DESC
    return {
      ...clinic,
      current_percentage: currentRateObj ? Number(currentRateObj.percentage) : null,
      current_effective_date: currentRateObj ? currentRateObj.effective_from : null,
    };
  });
}

/**
 * Fetches the full history of doctor percentage records for a specific clinic.
 */
export async function getClinicPercentageHistory(clinicId: string): Promise<DoctorPercentageHistory[]> {
  const { data, error } = await supabase
    .from('doctor_percentage_history')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching percentage history:', error);
    return [];
  }

  return data || [];
}
