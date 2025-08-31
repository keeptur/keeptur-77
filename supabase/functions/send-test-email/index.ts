import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendTestEmailRequest {
  to_email: string;
  template_id: string;
  template_type: string;
  logo_url?: string;
  base_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, template_id, template_type, logo_url, base_url }: SendTestEmailRequest = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configure o RESEND_API_KEY nos secrets do Supabase.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .maybeSingle();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ success: false, error: 'Template não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get SMTP settings just for from_email
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('from_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = smtpSettings?.from_email || 'contato@keeptur.com';

    // Replace variables in template with test data
    let emailContent = (template as any).html as string;
    let emailSubject = (template as any).subject as string;

    // Adicionar cabeçalho com logo se fornecido
    const logoHeader = logo_url ? `
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e5e5; margin-bottom: 30px;">
        <img src="${logo_url}" alt="Keeptur" style="max-height: 60px; height: auto;" />
      </div>
    ` : '';

    const testVariables: Record<string, string> = {
      '{{nome_usuario}}': 'Usuário Teste',
      '{{email}}': to_email,
      '{{nome_sistema}}': 'Keeptur',
      '{{data_vencimento}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      '{{dias_restantes}}': '30',
      '{{valor_plano}}': 'R$ 39,90',
      '{{nome_plano}}': 'Plano Premium',
      '{{link_pagamento}}': 'https://exemplo.com/pagamento',
      '{{link_acesso}}': base_url || 'https://exemplo.com/acesso'
    };

    Object.entries(testVariables).forEach(([variable, value]) => {
      emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
      emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
    });

    // Adicionar logo no início do conteúdo se não estiver presente
    if (logoHeader && !emailContent.includes('img')) {
      emailContent = logoHeader + emailContent;
    }

    // Send email with Resend (com fallback de remetente não verificado)
    let result: any = null;
    try {
      result = await resend.emails.send({
        from: `Keeptur <${fromEmail}>`,
        to: [to_email],
        subject: emailSubject,
        html: emailContent,
      }) as any;
    } catch (primaryError: any) {
      console.error('Primary send error:', primaryError);
      // Fallback: usar remetente padrão do Resend quando domínio não verificado ou erro 400
      try {
        const fallback = await resend.emails.send({
          from: 'Keeptur <onboarding@resend.dev>',
          to: [to_email],
          subject: emailSubject + ' [teste] ',
          html: emailContent,
        }) as any;

        if (fallback?.error) throw fallback.error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email de teste enviado com remetente padrão (domínio não verificado).',
            template_type,
            warning: 'Verifique o domínio/remetente configurado na Resend. Use um endereço @dominio_verificado.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (fallbackError: any) {
        console.error('Fallback send error:', fallbackError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: fallbackError?.message || primaryError?.message || 'Falha ao enviar (remetente não verificado ou chave inválida)'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    if (result?.error) {
      console.error('Primary send result with error:', result.error);
      try {
        const fallback = await resend.emails.send({
          from: 'Keeptur <onboarding@resend.dev>',
          to: [to_email],
          subject: emailSubject + ' [teste] ',
          html: emailContent,
        }) as any;
        if (fallback?.error) throw fallback.error;
        return new Response(
          JSON.stringify({ success: true, message: 'Email de teste enviado (fallback)', template_type, warning: 'Remetente não verificado. Ajuste o Email de Envio para um domínio verificado na Resend.' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (fallbackErr: any) {
        return new Response(
          JSON.stringify({ success: false, error: fallbackErr?.message || result?.error?.message || 'Falha ao enviar email' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email de teste enviado com sucesso!', template_type }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-test-email function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido ao enviar email de teste' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);