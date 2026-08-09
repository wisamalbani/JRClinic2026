import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseServiceRoleKey) {
      console.error('[admin-create-user] SUPABASE_SERVICE_ROLE_KEY missing on server');
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing in Supabase Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify Authorization Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-create-user] Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // User client to verify requester identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[admin-create-user] User token verification failed:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: `Unauthorized user token: ${userError?.message || 'Invalid session'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Admin Client with Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check requester role in public.users using adminClient
    const { data: requesterProfile, error: profileError } = await adminClient
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.role !== 'owner') {
      console.error('[admin-create-user] Forbidden access attempt by non-owner user:', user.email, profileError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only Owner can create or update user accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-create-user] Requester verified as Owner:', user.email);

    // 2. Parse Request Payload
    const body = await req.json();

    // Handle 'update' action for existing users
    if (body.action === 'update') {
      const { user_id, role, linked_clinic_id, linked_rep_id, linked_laser_staff_id, is_active, full_name } = body;
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id is required for update action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[admin-create-user] Updating user:', user_id, { role, linked_clinic_id, linked_rep_id, linked_laser_staff_id, is_active, full_name });

      const updates: Record<string, any> = {};
      if (role !== undefined) updates.role = role;
      if (linked_clinic_id !== undefined) updates.linked_clinic_id = linked_clinic_id || null;
      if (linked_rep_id !== undefined) updates.linked_rep_id = linked_rep_id || null;
      if (linked_laser_staff_id !== undefined) updates.linked_laser_staff_id = linked_laser_staff_id || null;
      if (is_active !== undefined) updates.is_active = is_active;
      if (full_name !== undefined) updates.full_name = full_name;

      // Try updating by id
      let { data: updatedRecord, error: updateError } = await adminClient
        .from('users')
        .update(updates)
        .eq('id', user_id)
        .select();

      // If 0 rows updated by id, try updating by auth_id
      if (!updateError && (!updatedRecord || updatedRecord.length === 0)) {
        const { data: authRecord, error: authErr } = await adminClient
          .from('users')
          .update(updates)
          .eq('auth_id', user_id)
          .select();
        updatedRecord = authRecord;
        updateError = authErr;
      }

      if (updateError) {
        console.error('[admin-create-user] Failed to update user profile:', updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update user profile: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[admin-create-user] User profile updated successfully:', updatedRecord);
      return new Response(
        JSON.stringify({ success: true, message: 'User updated successfully', user: updatedRecord }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, role, linked_clinic_id, linked_rep_id, linked_laser_staff_id, full_name } = body;

    console.log('[admin-create-user] Creating user payload:', { email, role, linked_clinic_id, linked_rep_id, linked_laser_staff_id });

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'email, password, and role are required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['owner', 'secretary', 'doctor', 'rep', 'viewer', 'laser_staff'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role "${role}". Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create User via Auth Admin API
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0] },
    });

    if (createError || !newAuthUser?.user) {
      console.error('[admin-create-user] Auth user creation failed:', createError?.message);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create auth user: ${createError?.message || 'Unknown Auth Error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = newAuthUser.user.id;
    console.log('[admin-create-user] Auth user created successfully. Auth ID:', newUserId);

    // 4. Upsert user record in public.users table with specific role & links
    const { data: userRecord, error: dbError } = await adminClient
      .from('users')
      .upsert(
        {
          auth_id: newUserId,
          email,
          role,
          linked_clinic_id: linked_clinic_id || null,
          linked_rep_id: linked_rep_id || null,
          linked_laser_staff_id: linked_laser_staff_id || null,
          full_name: full_name || email.split('@')[0],
          is_active: true,
        },
        { onConflict: 'auth_id' }
      )
      .select()
      .single();

    if (dbError) {
      console.error('[admin-create-user] public.users insert failed:', dbError.message);
      console.log('[admin-create-user] Rollback triggered: Deleting orphaned auth user:', newUserId);
      
      // Rollback: delete newly created auth user so no orphaned auth user remains
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(newUserId);
      if (deleteError) {
        console.error('[admin-create-user] Rollback deleteUser failed:', deleteError.message);
      } else {
        console.log('[admin-create-user] Rollback completed: Auth user deleted successfully.');
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to insert user profile in public.users: ${dbError.message} (Auth user creation was rolled back)`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-create-user] User created and linked successfully in public.users:', userRecord);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: userRecord,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[admin-create-user] Unexpected exception:', err?.message);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error in Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
