import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the user's auth token from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to verify user is admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (rolesError || !roles?.length) {
      console.error('Roles error:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase management token (from body or env)
    let bodyToken: string | undefined = undefined;
    try {
      const json = await req.json();
      bodyToken = json?.managementToken;
    } catch (_) {
      // no body provided, ignore
    }
    const managementToken = bodyToken || Deno.env.get('SUPABASE_MANAGEMENT_TOKEN');
    if (!managementToken) {
      console.error('Missing SUPABASE_MANAGEMENT_TOKEN and no token in body');
      return new Response(
        JSON.stringify({ error: 'Management token not configured', hint: 'Provide SUPABASE_MANAGEMENT_TOKEN secret or pass {managementToken} in request body' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project ID from URL
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    
    // Enable leaked password protection via Management API
    const managementResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hibp_enabled: true
        }),
      }
    );

    if (!managementResponse.ok) {
      const errorText = await managementResponse.text();
      console.error('Management API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to enable password protection',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await managementResponse.json();
    console.log('Password protection enabled successfully:', result);

    // Log admin action
    await supabase.rpc('log_admin_action', {
      action_type: 'enable_password_protection',
      table_name: 'auth_settings',
      record_id: null,
      new_data: { hibp_enabled: true }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Leaked password protection enabled successfully',
        hibp_enabled: result.hibp_enabled
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enable-password-protection function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});