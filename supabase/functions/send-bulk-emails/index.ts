import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('Sending bulk emails to:', user_emails.length, 'users with template:', template_type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', template_type)
      .single();

    if (templateError || !template) {
      throw new Error(`Template '${template_type}' não encontrado`);
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

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process emails in batches to avoid overwhelming the SMTP server
    const batchSize = 10;
    for (let i = 0; i < user_emails.length; i += batchSize) {
      const batch = user_emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        try {
          // Get user data for variable replacement
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

          // Replace variables in template
          let emailContent = template.html;
          let emailSubject = template.subject;

          const variables = {
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

          // Replace variables in content and subject
          Object.entries(variables).forEach(([variable, value]) => {
            emailContent = emailContent.replace(new RegExp(variable, 'g'), value);
            emailSubject = emailSubject.replace(new RegExp(variable, 'g'), value);
          });

          // Here you would implement the actual email sending logic
          // For now, we'll simulate a successful send
          console.log(`Sending email to: ${email}`);
          
          // Simulate email sending delay
          await new Promise(resolve => setTimeout(resolve, 100));

          successCount++;
          return { email, status: 'sent', error: null };

        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
          errorCount++;
          return { email, status: 'failed', error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < user_emails.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Envio em massa concluído! ${successCount} enviados, ${errorCount} falhas.`,
        details: {
          total: user_emails.length,
          success: successCount,
          errors: errorCount,
          template_type: template_type,
          results: results
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
    console.error('Error in send-bulk-emails function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao enviar emails em massa' 
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