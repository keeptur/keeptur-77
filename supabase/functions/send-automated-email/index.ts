
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendAutomatedEmailRequest {
  to_email: string;
  template_type: string;
  variables: Record<string, string>;
  delay_hours?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== NOVA VERSÃO - FUNÇÃO REDEPLOY v2.1 ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // Debug completo das variáveis de ambiente
    console.log('=== DEBUG VARIÁVEIS DE AMBIENTE ===');
    const allEnvVars = Object.keys(Deno.env.toObject());
    console.log('Todas as variáveis disponíveis:', allEnvVars);
    console.log('Variáveis que começam com RESEND:', allEnvVars.filter(key => key.startsWith('RESEND')));
    console.log('Variáveis que começam com SUPABASE:', allEnvVars.filter(key => key.startsWith('SUPABASE')));
    
    const requestBody = await req.json();
    console.log('Request body recebido:', JSON.stringify(requestBody, null, 2));

    const { to_email, template_type, variables = {}, delay_hours = 0 }: SendAutomatedEmailRequest = requestBody;

    console.log(`Dados extraídos: to_email=${to_email}, template_type=${template_type}, delay_hours=${delay_hours}`);

    // Validar dados obrigatórios
    if (!to_email || !template_type) {
      const errorMsg = 'Campos obrigatórios: to_email e template_type';
      console.error('Validation error:', errorMsg);
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('=== VERIFICAÇÃO RESEND_API_KEY ===');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    console.log('RESEND_API_KEY existe?', !!RESEND_API_KEY);
    console.log('RESEND_API_KEY length:', RESEND_API_KEY?.length || 0);
    console.log('RESEND_API_KEY primeiros 10 chars:', RESEND_API_KEY?.substring(0, 10) || 'undefined');
    
    if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
      console.error('RESEND_API_KEY não configurado ou vazio');
      console.log('Valor exato da variável:', JSON.stringify(RESEND_API_KEY));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY não configurado ou vazio',
          debug: {
            has_key: !!RESEND_API_KEY,
            key_length: RESEND_API_KEY?.length || 0,
            all_env_keys: allEnvVars
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('RESEND_API_KEY configurado e válido ✓');

    // Initialize Supabase client
    console.log('Verificando credenciais do Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials não configurados');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do banco não disponível' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('Credenciais Supabase configuradas ✓');

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Cliente Supabase inicializado ✓');

    // Se há delay, agendar para mais tarde
    if (delay_hours > 0) {
      console.log(`Email agendado para ${delay_hours} horas`);
      
      const scheduledFor = new Date(Date.now() + delay_hours * 60 * 60 * 1000);
      
      // Inserir na tabela de jobs
      const { error: jobError } = await supabase
        .from('email_jobs')
        .insert([{
          template_type,
          to_email,
          variables,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending'
        }]);

      if (jobError) {
        console.error('Erro ao agendar email:', jobError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao agendar email' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email agendado para ${delay_hours} horas`,
          scheduled_for: scheduledFor.toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar template no banco
    console.log(`Buscando template: ${template_type}`);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', template_type)
      .maybeSingle();

    if (templateError) {
      console.error('Erro ao buscar template:', templateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar template no banco', details: templateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!template) {
      console.error('Template não encontrado:', template_type);
      console.log('Templates disponíveis no banco...');
      const { data: allTemplates } = await supabase.from('email_templates').select('type');
      console.log('Templates encontrados:', allTemplates?.map(t => t.type));
      return new Response(
        JSON.stringify({ success: false, error: `Template '${template_type}' não encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log(`Template encontrado: ${template.subject}`);

    // Buscar configurações SMTP
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('from_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = smtpSettings?.from_email || 'contato@keeptur.com';

    // Substituir variáveis no template
    let emailContent = template.html as string;
    let emailSubject = template.subject as string;

    // Adicionar cabeçalho com logo automaticamente se não estiver presente
    if (!emailContent.includes('keeptur-logo') && !emailContent.includes('<img')) {
      const logoHeader = `
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e5e5; margin-bottom: 30px;">
          <img src="https://lquuoriatdcspbcvgsbg.supabase.co/storage/v1/object/public/avatars/keeptur-logo.png" alt="Keeptur" style="max-height: 60px; height: auto;" />
        </div>
      `;
      emailContent = logoHeader + emailContent;
    }

    // Variáveis padrão + variáveis fornecidas
    const allVariables = {
      '{{nome_usuario}}': variables.nome_usuario || 'Usuário',
      '{{email}}': variables.email || to_email,
      '{{nome_sistema}}': variables.nome_sistema || 'Keeptur',
      '{{empresa}}': variables.empresa || '',
      '{{subdominio}}': variables.subdominio || '',
      '{{dias_trial}}': variables.dias_trial || '14',
      '{{data_vencimento}}': variables.data_vencimento || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      '{{dias_restantes}}': variables.dias_restantes || '14',
      '{{valor_plano}}': variables.valor_plano || 'R$ 39,90',
      '{{nome_plano}}': variables.nome_plano || 'Plano Premium',
      '{{link_pagamento}}': variables.link_pagamento || `https://${variables.subdominio || 'app'}.keeptur.com/subscription`,
      '{{link_acesso}}': variables.link_acesso || `https://${variables.subdominio || 'app'}.keeptur.com`,
      ...Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [`{{${key}}}`, value])
      )
    };

    // Aplicar substituições
    Object.entries(allVariables).forEach(([variable, value]) => {
      const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
      emailContent = emailContent.replace(regex, value);
      emailSubject = emailSubject.replace(regex, value);
    });

    // Inicializar Resend
    const resend = new Resend(RESEND_API_KEY);

    // Tentativa de envio com fallback
    let sendResult: any;
    let errorMessage = '';
    
    try {
      console.log(`=== TENTATIVA DE ENVIO ===`);
      console.log(`Para: ${to_email}`);
      console.log(`De: Keeptur <${fromEmail}>`);
      console.log(`Assunto: ${emailSubject}`);
      console.log(`Tamanho do HTML: ${emailContent.length} caracteres`);
      
      sendResult = await resend.emails.send({
        from: `Keeptur <${fromEmail}>`,
        to: [to_email],
        subject: emailSubject,
        html: emailContent,
      }) as any;

      console.log('=== RESULTADO DO ENVIO ===');
      console.log('Email enviado com sucesso:', JSON.stringify(sendResult, null, 2));
    } catch (primaryErr: any) {
      console.error('=== ERRO NO ENVIO PRINCIPAL ===');
      console.error('Erro detalhado:', JSON.stringify(primaryErr, null, 2));
      console.error('Message:', primaryErr.message);
      console.error('Stack:', primaryErr.stack);
      errorMessage = primaryErr.message;
      
      // Tentativa com email fallback
      try {
        console.log('=== TENTATIVA FALLBACK ===');
        console.log('Tentando envio fallback com onboarding@resend.dev...');
        sendResult = await resend.emails.send({
          from: 'Keeptur <onboarding@resend.dev>',
          to: [to_email],
          subject: emailSubject + ' [automático]',
          html: emailContent,
        }) as any;

        console.log('=== RESULTADO FALLBACK ===');
        console.log('Fallback enviado com sucesso:', JSON.stringify(sendResult, null, 2));
        errorMessage = ''; // Limpar erro se fallback funcionou
      } catch (fallbackErr: any) {
        console.error('=== ERRO NO FALLBACK ===');
        console.error('Erro fallback detalhado:', JSON.stringify(fallbackErr, null, 2));
        errorMessage = `Primary: ${primaryErr.message}, Fallback: ${fallbackErr.message}`;
        throw new Error(errorMessage);
      }
    }

    console.log('Verificando resultado final...');
    if (sendResult?.error) {
      console.error('Erro no resultado do Resend:', sendResult.error);
      throw new Error(sendResult.error.message || 'Erro desconhecido do Resend');
    }
    console.log('Resultado validado com sucesso ✓');

    // Log de sucesso no banco
    try {
      await supabase
        .from('email_logs')
        .insert([{
          user_email: to_email,
          template_type: template_type,
          status: 'sent',
          metadata: { 
            variables, 
            resend_id: sendResult?.data?.id,
            from_email: fromEmail 
          }
        }]);
    } catch (logError) {
      console.error('Erro ao salvar log (sucesso):', logError);
      // Não falhar o request por causa do log
    }

    console.log(`Email automático enviado com sucesso: ${template_type} para ${to_email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email ${template_type} enviado automaticamente para ${to_email}`,
        template_type,
        sent_at: new Date().toISOString(),
        resend_id: sendResult?.data?.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-automated-email function:', error);
    
    // Tentar salvar log de erro se temos dados suficientes
    try {
      let requestBody: any = {};
      try {
        requestBody = await req.clone().json();
      } catch (parseError) {
        console.error('Failed to parse request body for error logging:', parseError);
      }
      
      const { to_email, template_type } = requestBody;
      
      if (to_email && template_type) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from('email_logs')
            .insert([{
              user_email: to_email,
              template_type: template_type,
              status: 'failed',
              error_message: error.message || 'Erro desconhecido'
            }]);
        }
      }
    } catch (logError) {
      console.error('Erro ao salvar log de erro:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar email automático',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
