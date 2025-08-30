import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  from_email: string;
  secure: boolean;
}

interface TestConnectionRequest {
  smtp_settings: SMTPSettings;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { smtp_settings }: TestConnectionRequest = await req.json();
    console.log('Testing SMTP connection:', smtp_settings);

    // Validate required fields
    if (!smtp_settings.host || !smtp_settings.port || !smtp_settings.from_email) {
      throw new Error('Host, porta e email de envio são obrigatórios');
    }

    // Get SMTP password from secrets
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      throw new Error('Senha SMTP não configurada. Configure a variável SMTP_PASSWORD nos secrets.');
    }

    // Create a simple test connection using Deno's native TCP
    try {
      console.log(`Attempting to connect to ${smtp_settings.host}:${smtp_settings.port}`);
      
      // For SMTP connection test, we'll try to establish a TCP connection
      const conn = await Deno.connect({
        hostname: smtp_settings.host,
        port: smtp_settings.port,
      });

      // Read the initial server response
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      const response = new TextDecoder().decode(buffer.subarray(0, bytesRead || 0));
      
      console.log('SMTP Server Response:', response);
      
      // Close the connection
      conn.close();

      // Check if we got a valid SMTP response (should start with 220)
      if (response.startsWith('220')) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Conexão SMTP estabelecida com sucesso!',
            server_response: response.trim()
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } else {
        throw new Error(`Resposta inesperada do servidor SMTP: ${response}`);
      }

    } catch (connectionError) {
      console.error('Connection error:', connectionError);
      throw new Error(`Falha ao conectar com o servidor SMTP: ${connectionError.message}`);
    }

  } catch (error: any) {
    console.error('Error in test-smtp-connection function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao testar conexão SMTP' 
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