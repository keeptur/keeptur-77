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
    console.log('=== AUTO PROCESSAMENTO DE EMAILS ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se há emails pendentes
    const { data: pendingJobs, error: checkError } = await supabase
      .from('email_jobs')
      .select('id')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar jobs pendentes:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao verificar fila' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('Nenhum email pendente para processar');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum email pendente', has_pending: false }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Encontrados ${pendingJobs.length} emails pendentes. Chamando process-email-jobs...`);

    // Chamar a função de processamento
    const { data: processResult, error: processError } = await supabase.functions.invoke('process-email-jobs', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {}
    });

    if (processError) {
      console.error('Erro ao chamar process-email-jobs:', processError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar emails',
          details: processError.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Processamento de emails concluído:', processResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emails processados com sucesso',
        has_pending: true,
        process_result: processResult
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Erro no auto-processamento:', error);
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