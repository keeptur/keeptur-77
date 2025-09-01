
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PROCESSANDO FILA DE EMAILS ===');
    console.log('Timestamp:', new Date().toISOString());

    // Buscar RESEND_API_KEY
    let RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
      const allVars = Deno.env.toObject();
      const candidates = Object.entries(allVars)
        .map(([k, v]) => ({
          original: k,
          normalized: k.replace(/[\r\n\t\s]/g, '').toUpperCase(),
          value: (v || '').trim(),
        }))
        .filter(k => k.normalized === 'RESEND_API_KEY')
        .filter(k => k.value.length > 0);
      const preferPattern = /^re_[A-Za-z0-9_-]{10,}$/;
      const best = candidates.find(c => preferPattern.test(c.value)) || candidates[0];
      if (best) {
        RESEND_API_KEY = best.value;
        console.log(`Encontrado RESEND_API_KEY: ${best.original}`);
      }
    }
    
    if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY não configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar jobs pendentes prontos para envio
    const { data: jobs, error: jobsError } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50); // Processar até 50 por vez

    if (jobsError) {
      console.error('Erro ao buscar jobs:', jobsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar jobs' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('Nenhum job pendente encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum email na fila', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Encontrados ${jobs.length} jobs para processar`);

    // Buscar configurações SMTP
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('from_email')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fromEmail = smtpSettings?.from_email || 'contato@keeptur.com';

    let processed = 0;
    let failed = 0;

    // Processar cada job
    for (const job of jobs) {
      try {
        console.log(`Processando job ${job.id} para ${job.to_email}`);

        // Marcar como processando
        await supabase
          .from('email_jobs')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString(),
            attempts: job.attempts + 1
          })
          .eq('id', job.id);

        // Buscar template
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('type', job.template_type)
          .maybeSingle();

        if (templateError || !template) {
          throw new Error(`Template '${job.template_type}' não encontrado`);
        }

        // Substituir variáveis no template
        let emailContent = template.html as string;
        let emailSubject = template.subject as string;

        // Adicionar logo se não estiver presente
        if (!emailContent.includes('keeptur-logo') && !emailContent.includes('<img')) {
          const logoHeader = `
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e5e5; margin-bottom: 30px;">
              <img src="https://lquuoriatdcspbcvgsbg.supabase.co/storage/v1/object/public/avatars/keeptur-logo.png" alt="Keeptur" style="max-height: 60px; height: auto;" />
            </div>
          `;
          emailContent = logoHeader + emailContent;
        }

        // Aplicar variáveis do job
        const variables = job.variables as Record<string, string>;
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailContent = emailContent.replace(regex, value);
          emailSubject = emailSubject.replace(regex, value);
        });

        // Enviar email
        let sendResult: any;
        try {
          sendResult = await resend.emails.send({
            from: `Keeptur <${fromEmail}>`,
            to: [job.to_email],
            subject: emailSubject,
            html: emailContent,
          });
        } catch (primaryErr: any) {
          // Fallback com remetente padrão
          console.log('Tentando fallback para', job.to_email);
          sendResult = await resend.emails.send({
            from: 'Keeptur <onboarding@resend.dev>',
            to: [job.to_email],
            subject: emailSubject + ' [automático]',
            html: emailContent,
          });
        }

        if (sendResult?.error) {
          throw new Error(sendResult.error.message || 'Erro do Resend');
        }

        // Marcar como enviado
        await supabase
          .from('email_jobs')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Log de sucesso
        await supabase
          .from('email_logs')
          .insert([{
            user_email: job.to_email,
            template_type: job.template_type,
            status: 'sent',
            metadata: { 
              job_id: job.id,
              resend_id: sendResult?.data?.id,
              from_email: fromEmail 
            }
          }]);

        processed++;
        console.log(`✓ Email enviado: ${job.to_email}`);

      } catch (error: any) {
        console.error(`✗ Erro no job ${job.id}:`, error.message);
        
        // Marcar como falhou
        await supabase
          .from('email_jobs')
          .update({ 
            status: job.attempts >= 3 ? 'failed' : 'pending', // Retry até 3 tentativas
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Log de erro
        await supabase
          .from('email_logs')
          .insert([{
            user_email: job.to_email,
            template_type: job.template_type,
            status: 'failed',
            error_message: error.message,
            metadata: { job_id: job.id }
          }]);

        failed++;
      }
    }

    console.log(`Processamento concluído: ${processed} enviados, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processamento concluído: ${processed} enviados, ${failed} falharam`,
        processed,
        failed,
        total_jobs: jobs.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Erro geral no processamento:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido no processamento da fila'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
