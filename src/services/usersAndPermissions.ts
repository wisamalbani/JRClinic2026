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
    linked_laser_staff_id?: string | null;
    is_active?: boolean;
    full_name?: string | null;
  }
): Promise<void> {
  if (!userId) {
    throw new Error('معرف المستخدم غير محدد');
  }

  const cleanUpdates: Record<string, any> = {};
  if (updates.role !== undefined) cleanUpdates.role = updates.role;
  if (updates.linked_clinic_id !== undefined) cleanUpdates.linked_clinic_id = updates.linked_clinic_id || null;
  if (updates.linked_rep_id !== undefined) cleanUpdates.linked_rep_id = updates.linked_rep_id || null;
  if (updates.linked_laser_staff_id !== undefined) cleanUpdates.linked_laser_staff_id = updates.linked_laser_staff_id || null;
  if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active;
  if (updates.full_name !== undefined) cleanUpdates.full_name = updates.full_name;

  // 1. Try client-side update by primary key id
  let { data, error } = await supabase
    .from('users')
    .update(cleanUpdates)
    .eq('id', userId)
    .select();

  // If 0 rows updated by id, try by auth_id
  if (!error && (!data || data.length === 0)) {
    const res = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('auth_id', userId)
      .select();
    data = res.data;
    error = res.error;
  }

  // If client-side update succeeded and updated at least 1 record
  if (!error && data && data.length > 0) {
    return;
  }

  if (error) {
    console.warn('Client-side user update failed:', error.message);
  } else {
    console.warn('Client-side update returned 0 rows (likely RLS restriction), attempting Edge Function update...');
  }

  // 2. Fallback to Edge Function (runs with admin service role)
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: {
        action: 'update',
        user_id: userId,
        ...cleanUpdates,
      },
    });

    if (fnError) {
      console.error('Edge function invocation error:', fnError);
      throw new Error(error?.message || fnError.message || 'فشل استدعاء دالة التحديث');
    }

    if (!fnData || fnData.success === false || fnData.error) {
      const errMsg = fnData?.error || fnData?.message || error?.message || 'فشل تحديث بيانات وتصاريح المستخدم';
      console.error('Edge function error payload:', errMsg);
      throw new Error(errMsg);
    }
  } catch (err: any) {
    console.error('Error in updateUserLinking:', err);
    throw new Error(err.message || error?.message || 'فشل تحديث بيانات المستخدم');
  }
}

export async function deleteUserAccount(userId: string, authId?: string): Promise<void> {
  if (!userId && !authId) {
    throw new Error('معرف المستخدم غير محدد');
  }

  const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-delete-user', {
    body: {
      target_user_id: userId,
      target_auth_id: authId,
    },
  });

  if (fnError) {
    console.error('Edge function delete error:', fnError);
    throw new Error(fnError.message || 'فشل استدعاء دالة حذف المستخدم (admin-delete-user)');
  }

  if (!fnData || fnData.success === false || fnData.error) {
    const errMsg = fnData?.error || fnData?.message || 'فشل حذف الحساب';
    console.error('Delete user error response:', errMsg);
    throw new Error(errMsg);
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
