import { supabase } from '../lib/supabase';
import { UserProfile, Role, ReportPermission } from '../types';

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Failed to get users:', err);
    return [];
  }
}

export async function updateUserLinking(
  userId: string,
  updates: {
    role?: Role;
    linked_clinic_id?: string | null;
    linked_rep_id?: string | null;
    is_active?: boolean;
    full_name?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function getReportPermissionsForUser(userId: string): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('report_permissions')
      .select('report_key, is_enabled')
      .eq('user_id', userId);

    if (error) {
      console.warn('Error fetching report permissions:', error.message);
      return {};
    }

    const map: Record<string, boolean> = {};
    if (data) {
      data.forEach((row: { report_key: string; is_enabled: boolean }) => {
        map[row.report_key] = row.is_enabled;
      });
    }
    return map;
  } catch (err) {
    console.error('Failed to fetch report permissions:', err);
    return {};
  }
}

export async function saveReportPermissionsForUser(
  userId: string,
  permissionsMap: Record<string, boolean>
): Promise<void> {
  const rows = Object.entries(permissionsMap).map(([report_key, is_enabled]) => ({
    user_id: userId,
    report_key,
    is_enabled,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('report_permissions')
    .upsert(rows, { onConflict: 'user_id,report_key' });

  if (error) {
    console.error('Error saving report permissions:', error);
    throw error;
  }
}
