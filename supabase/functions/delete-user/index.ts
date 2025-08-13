import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Tentando deletar usuário: ${userId}`)

    // Check if user is the super admin (first admin created)
    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient
      .rpc('is_super_admin', { _user_id: userId });

    if (superAdminError) {
      console.log(`Erro ao verificar super admin: ${superAdminError.message}`);
    }

    if (isSuperAdmin) {
      console.log(`Tentativa de deletar super admin bloqueada: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'O usuário master não pode ser deletado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Primeiro buscar o email do usuário
    const { data: userAuth, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !userAuth?.user) {
      console.log(`Usuário não encontrado no auth: ${userError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = userAuth.user.email;
    console.log(`Email do usuário: ${userEmail}`);

    // 1. Deletar do subscribers se existir (usando user_id E email)
    const { error: subscriberError } = await supabaseClient
      .from('subscribers')
      .delete()
      .or(`user_id.eq.${userId}${userEmail ? `,email.eq.${userEmail}` : ''}`);
    
    if (subscriberError) {
      console.log('Erro ao deletar subscriber:', subscriberError)
    } else {
      console.log('Subscriber deletado com sucesso')
    }

    // 2. Deletar do user_roles
    const { error: rolesError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesError) {
      console.log('Erro ao deletar roles:', rolesError)
    } else {
      console.log('Roles deletadas com sucesso')
    }

    // 3. Deletar do profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.log('Erro ao deletar profile:', profileError)
    } else {
      console.log('Profile deletado com sucesso')
    }

    // 4. Deletar do auth.users usando service role
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.log('Erro ao deletar do auth:', authError)
      return new Response(
        JSON.stringify({ error: 'Erro ao deletar usuário do sistema de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Usuário ${userId} deletado com sucesso do auth`)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})