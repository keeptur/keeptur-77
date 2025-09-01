import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PROCESSAMENTO MANUAL DE EMAILS PENDENTES ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Primeiro, chamar o processo de emails
    console.log('Chamando process-email-jobs...');
    const { data: processResult, error: processError } = await supabase.functions.invoke('process-email-jobs');

    if (processError) {
      console.error('Erro ao processar emails:', processError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar emails',
          details: processError.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Resultado do processamento:', processResult);

    // Verificar status após processamento
    const { data: remainingJobs } = await supabase
      .from('email_jobs')
      .select('id, status')
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Processamento de emails executado',
        process_result: processResult,
        remaining_pending: remainingJobs?.length || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Erro no processamento manual:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);