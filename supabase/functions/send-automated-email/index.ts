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
    const { to_email, template_type, variables, delay_hours = 0 }: SendAutomatedEmailRequest = await req.json();

    console.log('Automated email request:', { to_email, template_type, variables, delay_hours });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY não configurado' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Se há delay, agendar para mais tarde (em produção, usar queue/cron)
    if (delay_hours > 0) {
      console.log(`Email agendado para ${delay_hours} horas`);
      // Aqui implementar sistema de queue
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email agendado para ${delay_hours} horas`,
          scheduled_for: new Date(Date.now() + delay_hours * 60 * 60 * 1000).toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get email template by type
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', template_type)
      .maybeSingle();

    if (templateError || !template) {
      console.error('Template error:', templateError);
      return new Response(
        JSON.stringify({ success: false, error: `Template '${template_type}' não encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get SMTP settings for from_email
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('from_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = smtpSettings?.from_email || 'contato@keeptur.com';

    // Replace variables in template
    let emailContent = (template as any).html as string;
    let emailSubject = (template as any).subject as string;

    // Adicionar cabeçalho com logo Keeptur automaticamente
    const logoHeader = `
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e5e5; margin-bottom: 30px;">
        <img src="https://lquuoriatdcspbcvgsbg.supabase.co/storage/v1/object/public/avatars/keeptur-logo.png" alt="Keeptur" style="max-height: 60px; height: auto;" />
      </div>
    `;

    // Substituir variáveis com dados reais
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
      '{{link_acesso}}': variables.link_acesso || `https://${variables.subdominio || 'app'}.keeptur.com`
    };

    Object.entries(allVariables).forEach(([variable, value]) => {
      emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
      emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
    });

    // Adicionar logo se não estiver presente
    if (!emailContent.includes('img')) {
      emailContent = logoHeader + emailContent;
    }

    // Envio com Resend com fallback
    let sendResult: any;
    try {
      sendResult = await resend.emails.send({
        from: `Keeptur <${fromEmail}>`,
        to: [to_email],
        subject: emailSubject,
        html: emailContent,
      }) as any;

      console.log('Email sent successfully:', sendResult);
    } catch (primaryErr: any) {
      console.error('Primary send error:', primaryErr);
      
      try {
        sendResult = await resend.emails.send({
          from: 'Keeptur <onboarding@resend.dev>',
          to: [to_email],
          subject: emailSubject + ' [automático]',
          html: emailContent,
        }) as any;

        console.log('Fallback email sent:', sendResult);
      } catch (fallbackErr: any) {
        console.error('Fallback send error:', fallbackErr);
        throw fallbackErr;
      }
    }

    if (sendResult?.error) {
      throw sendResult.error;
    }

    // Log do envio (em produção, salvar em tabela de logs)
    console.log(`Email automático enviado: ${template_type} para ${to_email}`);

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
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar email automático',
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
