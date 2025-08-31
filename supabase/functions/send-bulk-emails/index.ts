import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendBulkEmailsRequest {
  template_type: string;
  user_emails: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_type, user_emails }: SendBulkEmailsRequest = await req.json();

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

    // Get email template by type
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', template_type)
      .maybeSingle();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ success: false, error: `Template '${template_type}' não encontrado` }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('from_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = smtpSettings?.from_email || 'contato@keeptur.com';

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    const batchSize = 50;
    for (let i = 0; i < user_emails.length; i += batchSize) {
      const batch = user_emails.slice(i, i + batchSize);

      const batchPromises = batch.map(async (email) => {
        try {
          // Personalize template per user when possible
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('email', email)
            .maybeSingle();

          let emailContent = (template as any).html as string;
          let emailSubject = (template as any).subject as string;

          // Adicionar cabeçalho com logo Keeptur
          const logoHeader = `
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e5e5; margin-bottom: 30px;">
              <img src="https://lquuoriatdcspbcvgsbg.supabase.co/storage/v1/object/public/avatars/keeptur-logo.png" alt="Keeptur" style="max-height: 60px; height: auto;" />
            </div>
          `;

          const variables: Record<string, string> = {
            '{{nome_usuario}}': profile?.full_name || 'Usuário',
            '{{email}}': email,
            '{{nome_sistema}}': 'Keeptur',
            '{{data_vencimento}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
            '{{dias_restantes}}': '30',
            '{{valor_plano}}': 'R$ 39,90',
            '{{nome_plano}}': 'Plano Premium',
            '{{link_pagamento}}': 'https://exemplo.com/pagamento',
            '{{link_acesso}}': 'https://exemplo.com/acesso'
          };

          Object.entries(variables).forEach(([variable, value]) => {
            emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
            emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
          });

          // Adicionar logo no início do conteúdo se não estiver presente
          if (!emailContent.includes('img')) {
            emailContent = logoHeader + emailContent;
          }

          // Envio com Resend com fallback
          let sendResult: any;
          try {
            sendResult = await resend.emails.send({
              from: `Keeptur <${fromEmail}>`,
              to: [email],
              subject: emailSubject,
              html: emailContent,
            }) as any;
          } catch (primaryErr: any) {
            try {
              sendResult = await resend.emails.send({
                from: 'Keeptur <onboarding@resend.dev>',
                to: [email],
                subject: emailSubject + ' [teste] ',
                html: emailContent,
              }) as any;
            } catch (fallbackErr: any) {
              throw fallbackErr;
            }
          }

          if (sendResult?.error) {
            throw sendResult.error;
          }

          successCount++;
          return { email, status: 'sent' };
        } catch (error: any) {
          errorCount++;
          return { email, status: 'failed', error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + batchSize < user_emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Envio em massa concluído! ${successCount} enviados, ${errorCount} falhas.`,
        details: { total: user_emails.length, success: successCount, errors: errorCount, template_type, results }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-bulk-emails function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido ao enviar emails em massa' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);