import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMTPSettings {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from_email?: string;
  secure?: boolean;
}

interface TestConnectionRequest {
  smtp_settings?: SMTPSettings;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { smtp_settings }: TestConnectionRequest = await req.json().catch(() => ({ smtp_settings: {} }));

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falta configurar o RESEND_API_KEY nos secrets do Supabase.',
          hint: 'Crie uma API key em https://resend.com/api-keys e adicione em Settings > Functions > Secrets.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const fromEmail = smtp_settings?.from_email?.trim();
    if (!fromEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Informe o campo 'Email de Envio' (from_email).",
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const atIdx = fromEmail.indexOf('@');
    const domain = atIdx >= 0 ? fromEmail.slice(atIdx + 1).toLowerCase() : '';
    if (!domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail de envio inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If using Resend default sender
    if (domain === 'resend.dev') {
      return new Response(
        JSON.stringify({
          success: true,
          provider: 'resend',
          fallback: true,
          message: 'Conexão OK usando remetente padrão da Resend (onboarding@resend.dev). Recomenda-se verificar seu domínio para melhor entrega.',
          details: { from_email: fromEmail, domain }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check domain verification status in Resend
    let verified = false;
    let status: string | undefined;
    try {
      const listResp: any = await resend.domains.list();
      const domains: any[] = (listResp?.data) || [];
      const match = domains.find((d) => (d?.name || '').toLowerCase() === domain);
      status = match?.status;
      verified = status === 'verified';
    } catch (e) {
      // If listing fails, return a useful error instead of a false OK
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível consultar os domínios na Resend. Verifique a API key e tente novamente.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!verified) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Domínio '${domain}' não verificado na Resend.`,
          hint: 'Acesse https://resend.com/domains, adicione/verifique o domínio e use um remetente desse domínio (ex.: noreply@seu-dominio.com).',
          details: { from_email: fromEmail, domain, domain_status: status || 'not_found' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Domain is verified => consider connection OK
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'resend',
        fallback: false,
        message: `Conexão OK. Domínio '${domain}' verificado na Resend.`,
        details: { from_email: fromEmail, domain, domain_status: 'verified' }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in test-smtp-connection function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
