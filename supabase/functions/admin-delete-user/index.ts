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
      console.error('[admin-delete-user] SUPABASE_SERVICE_ROLE_KEY missing on server');
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing in Supabase Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify Authorization Token
    console.log('[admin-delete-user] Step 1: Verifying requester identity token...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-delete-user] Missing Authorization header');
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
      console.error('[admin-delete-user] User token verification failed:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: `Unauthorized user token: ${userError?.message || 'Invalid session'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin Client with Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. Check requester role in public.users using adminClient
    console.log('[admin-delete-user] Step 2: Checking requester role for user:', user.email);
    const { data: requesterProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, role, auth_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.role !== 'owner') {
      console.error('[admin-delete-user] Forbidden deletion attempt by non-owner user:', user.email, profileError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only Owner can delete user accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-user] Requester verified as Owner:', user.email);

    // 3. Parse Request Payload
    const body = await req.json();
    console.log('[admin-delete-user] Step 3: Parsed deletion payload:', body);

    const targetUserId = body.target_user_id || body.user_id;
    const targetAuthId = body.target_auth_id;

    if (!targetUserId && !targetAuthId) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id or target_auth_id is required for deletion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the target record in public.users to get auth_id and id
    let targetRecord = null;

    if (targetUserId) {
      const { data: recById } = await adminClient
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      if (recById) {
        targetRecord = recById;
      }
    }

    if (!targetRecord && (targetAuthId || targetUserId)) {
      const queryAuthId = targetAuthId || targetUserId;
      const { data: recByAuth } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', queryAuthId)
        .maybeSingle();
      if (recByAuth) {
        targetRecord = recByAuth;
      }
    }

    const resolvedAuthId = targetRecord?.auth_id || targetAuthId || targetUserId;
    const resolvedProfileId = targetRecord?.id || targetUserId;

    // Explicitly prevent Owner from deleting their own account
    if (resolvedAuthId === user.id || resolvedProfileId === requesterProfile.id || resolvedAuthId === requesterProfile.auth_id) {
      console.warn('[admin-delete-user] Owner attempted to delete their own account:', user.email);
      return new Response(
        JSON.stringify({ success: false, error: 'لا يمكنك حذف حسابك الشخصي (حساب المالك)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-user] Step 4: Deleting Auth User from Supabase Auth:', resolvedAuthId);

    // 4. Delete user from Supabase Auth Admin API
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(resolvedAuthId);

    if (deleteAuthError) {
      console.error('[admin-delete-user] Failed to delete Auth user:', deleteAuthError.message);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to delete auth user: ${deleteAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-user] Step 5: Auth user deleted successfully from Supabase Auth.');

    // 5. Ensure row is also cleaned from public.users table
    const { error: deleteDbError } = await adminClient
      .from('users')
      .delete()
      .or(`id.eq.${resolvedProfileId},auth_id.eq.${resolvedAuthId}`);

    if (deleteDbError) {
      console.warn('[admin-delete-user] Warning deleting public.users row:', deleteDbError.message);
    } else {
      console.log('[admin-delete-user] Step 6: public.users profile row deleted successfully.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[admin-delete-user] Unexpected exception:', err?.message);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error in admin-delete-user Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
