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
      return new Response(
        JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify Authorization Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check requester role in public.users
    const { data: requesterProfile, error: profileError } = await userClient
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only Owner can create user accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse Request Payload
    const body = await req.json();
    const { email, password, role, linked_clinic_id, linked_rep_id, linked_laser_staff_id, full_name } = body;

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'email, password, and role are required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['owner', 'secretary', 'doctor', 'rep', 'viewer', 'laser_staff'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Admin Client with Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Create User via Auth Admin API
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0] },
    });

    if (createError || !newAuthUser.user) {
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createError?.message || 'Unknown error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = newAuthUser.user.id;

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
      return new Response(
        JSON.stringify({ error: `User auth created, but public.users record failed: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: userRecord,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
