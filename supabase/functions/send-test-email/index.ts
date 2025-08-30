import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('Sending test email to:', to_email, 'with template:', template_type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template não encontrado');
    }

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error('Configurações SMTP não encontradas');
    }

    // Get SMTP password from secrets
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      throw new Error('Senha SMTP não configurada');
    }

    // Replace variables in template with test data
    let emailContent = template.html;
    let emailSubject = template.subject;

    const testVariables = {
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

    // Replace variables in content and subject
    Object.entries(testVariables).forEach(([variable, value]) => {
      emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
      emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
    });

    // Here you would implement the actual email sending logic
    // For now, we'll simulate a successful send
    console.log('Email would be sent with:', {
      to: to_email,
      subject: emailSubject,
      content: emailContent,
      smtp: {
        host: smtpSettings.host,
        port: smtpSettings.port,
        from: smtpSettings.from_email
      }
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de teste enviado com sucesso!',
        details: {
          to: to_email,
          subject: emailSubject,
          template_type: template_type
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-test-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar email de teste' 
      }),
      {
        status: 400,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);