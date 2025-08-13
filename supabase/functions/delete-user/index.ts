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

    console.log(`Deletando usuário: ${userId}`)

    // 1. Deletar do subscribers se existir (usando user_id)
    const { error: subscriberError } = await supabaseClient
      .from('subscribers')
      .delete()
      .eq('user_id', userId);
    
    if (subscriberError) {
      console.log('Erro ao deletar subscriber:', subscriberError)
    }

    // 2. Deletar do user_roles
    const { error: rolesError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesError) {
      console.log('Erro ao deletar roles:', rolesError)
    }

    // 3. Deletar do profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.log('Erro ao deletar profile:', profileError)
    }

    // 4. Deletar do auth.users usando service role
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.log('Erro ao deletar do auth:', authError)
      // Se falhar no auth, não consideramos como erro fatal
    }

    console.log(`Usuário ${userId} deletado com sucesso`)

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