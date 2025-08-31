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
      // 200 + success:false para não quebrar o frontend com non-2xx
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY não configurado.',
          hint: 'Crie uma API key em https://resend.com/api-keys e adicione em Settings > Functions > Secrets.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const atIdx = fromEmail.indexOf('@');
    const domain = atIdx >= 0 ? fromEmail.slice(atIdx + 1).toLowerCase() : '';
    if (!domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail de envio inválido.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Caso especial: remetente padrão da Resend
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

    // Verifica status do domínio na Resend (tenta subdomínio e depois domínio raiz)
    let verified = false;
    let status: string | undefined;
    let checkedDomain = domain;
    try {
      const listResp: any = await resend.domains.list();
      const domains: any[] = (listResp?.data) || [];
      const findByName = (name: string) => domains.find((d) => (d?.name || '').toLowerCase() === name);

      let match = findByName(domain);
      if (!match && domain.split('.').length > 2) {
        const apex = domain.split('.').slice(-2).join('.');
        match = findByName(apex);
        if (match) checkedDomain = apex;
      }

      status = match?.status;
      verified = status === 'verified';
    } catch (e: any) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao consultar domínios na Resend.',
          details: { message: e?.message || String(e) }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!verified) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Domínio não verificado na Resend: '${checkedDomain}'.`,
          hint: 'Acesse https://resend.com/domains, adicione/verifique o domínio e use um remetente desse domínio (ex.: noreply@seu-dominio.com).',
          details: { from_email: fromEmail, domain: checkedDomain, domain_status: status || 'not_found' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Domínio verificado => OK
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'resend',
        fallback: false,
        message: `Conexão OK. Domínio '${checkedDomain}' verificado na Resend.`,
        details: { from_email: fromEmail, domain: checkedDomain, domain_status: 'verified' }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in test-smtp-connection function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
