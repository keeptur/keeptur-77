import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bootstrapToken = Deno.env.get("ADMIN_BOOTSTRAP_TOKEN") ?? "";

    if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    if (!bootstrapToken) throw new Error("Missing ADMIN_BOOTSTRAP_TOKEN");

    const { email, password, token } = await req.json();
    if (!email || !password || !token) throw new Error("email, password e token são obrigatórios");
    if (token !== bootstrapToken) throw new Error("Token inválido");

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Create user via Admin API
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao obter ID do usuário criado");

    // Grant admin role
    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (roleError) throw roleError;

    // Create/Upsert account row
    await supabase.from("accounts").upsert({
      email,
      owner_user_id: userId,
      subscribed: false,
      seats_purchased: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
