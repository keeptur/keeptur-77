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
    const fallbackUrl = "https://lquuoriatdcspbcvgsbg.supabase.co"; // project fallback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || fallbackUrl;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bootstrapToken = Deno.env.get("ADMIN_BOOTSTRAP_TOKEN") ?? "";

    if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    if (!bootstrapToken) throw new Error("Missing ADMIN_BOOTSTRAP_TOKEN");

    const { email, password, token } = await req.json();
    if (!email || !password || !token) throw new Error("email, password e token são obrigatórios");
    if (token !== bootstrapToken) throw new Error("Token inválido");

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Create user via Admin API (idempotente)
    let userId: string | undefined;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      console.log("[bootstrap-admin] createUser error:", createError.message);
      // Se já existir, tenta localizar pelo email
      try {
        const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) throw listErr;
        const found = usersPage.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          userId = found.id;
        } else {
          throw createError;
        }
      } catch (e) {
        throw createError;
      }
    } else {
      userId = created.user?.id;
    }
    if (!userId) throw new Error("Falha ao obter ID do usuário (criação/listagem)");

    // Grant admin role (idempotente via unique constraint)
    const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) throw roleError;

    // Create/attach account row without relying on unique constraints
    const nowIso = new Date().toISOString();

    // 1) Try by owner_user_id
    const { data: byOwner, error: byOwnerErr } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (byOwnerErr) {
      console.log("[bootstrap-admin] accounts byOwner error:", byOwnerErr.message);
    }

    if (byOwner?.id) {
      const { error: updErr } = await supabase
        .from("accounts")
        .update({ email, subscribed: false, seats_purchased: 1, updated_at: nowIso })
        .eq("id", byOwner.id);
      if (updErr) throw updErr;
    } else {
      // 2) Try by email
      const { data: byEmail, error: byEmailErr } = await supabase
        .from("accounts")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (byEmailErr) {
        console.log("[bootstrap-admin] accounts byEmail error:", byEmailErr.message);
      }

      if (byEmail?.id) {
        const { error: updErr } = await supabase
          .from("accounts")
          .update({ owner_user_id: userId, subscribed: false, seats_purchased: 1, updated_at: nowIso })
          .eq("id", byEmail.id);
        if (updErr) throw updErr;
      } else {
        // 3) Insert new account
        const { error: insErr } = await supabase
          .from("accounts")
          .insert({ email, owner_user_id: userId, subscribed: false, seats_purchased: 1 });
        if (insErr) throw insErr;
      }
    }

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
