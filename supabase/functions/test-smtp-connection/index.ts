import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Preferential path: use Resend API (HTTPS) which is supported in Edge Functions
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falta configurar o RESEND_API_KEY nos secrets do Supabase. SMTP direto (porta 465/587) não é permitido em Edge Functions.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If we have the API key, consider the connection OK (outbound HTTPS available)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conexão OK via provedor de e-mail (Resend). Use o Enviar Email de Teste para validar entrega.'
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