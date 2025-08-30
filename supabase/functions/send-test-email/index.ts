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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, template_id, template_type }: SendTestEmailRequest = await req.json();

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

    const fromEmail = smtpSettings?.from_email || 'onboarding@resend.dev';

    // Replace variables in template with test data
    let emailContent = (template as any).html as string;
    let emailSubject = (template as any).subject as string;

    const testVariables: Record<string, string> = {
      '{{nome_usuario}}': 'Usuário Teste',
      '{{email}}': to_email,
      '{{nome_sistema}}': 'Keeptur',
      '{{data_vencimento}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      '{{dias_restantes}}': '30',
      '{{valor_plano}}': 'R$ 39,90',
      '{{nome_plano}}': 'Plano Premium',
      '{{link_pagamento}}': 'https://exemplo.com/pagamento',
      '{{link_acesso}}': 'https://exemplo.com/acesso'
    };

    Object.entries(testVariables).forEach(([variable, value]) => {
      emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
      emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
    });

    // Send email with Resend
    const result = await resend.emails.send({
      from: `Keeptur <${fromEmail}>`,
      to: [to_email],
      subject: emailSubject,
      html: emailContent,
    }) as any;

    if (result?.error) {
      throw result.error;
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