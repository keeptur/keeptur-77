import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://lquuoriatdcspbcvgsbg.supabase.co";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!anonKey || !serviceKey) {
      throw new Error("Missing Supabase keys in environment");
    }

    // Authenticated client (RLS, current user)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
      auth: { persistSession: false },
    });

    // Service client (bypass RLS for admin operations)
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json();
    const email: string = (body?.email || "").trim().toLowerCase();
    const name: string = (body?.name || "").trim();
    const makeAdmin: boolean = !!body?.makeAdmin;

    if (!email) throw new Error("E-mail é obrigatório");

    // Ensure requester is admin
    const { data: me } = await supabase.auth.getUser();
    const meId = me?.user?.id;
    if (!meId) return new Response(JSON.stringify({ error: "Não autenticado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", meId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Apenas administradores" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });

    // Try to find existing auth user by listing (admin API lacks direct get-by-email)
    let targetUserId: string | null = null;
    try {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (found) targetUserId = found.id;
    } catch (_) { /* ignore */ }

    if (!targetUserId) {
      const password = randomPassword(14);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });
      if (createErr) throw createErr;
      targetUserId = created.user?.id || null;
    }

    if (!targetUserId) throw new Error("Falha ao criar/obter usuário");

    // Upsert profile
    await admin.from("profiles").upsert({ id: targetUserId, email, full_name: name }).eq("id", targetUserId);

    // Grant admin role if requested
    if (makeAdmin) {
      await admin.from("user_roles").upsert({ user_id: targetUserId, role: "admin" }, { onConflict: "user_id,role" });
    }

    // Ensure subscriber exists for trial visibility
    const nowIso = new Date().toISOString();
    const { data: existingSub } = await admin.from("subscribers").select("id").eq("email", email).maybeSingle();
    if (!existingSub) {
      await admin.from("subscribers").insert({ email, user_id: targetUserId, display_name: name || email, subscribed: false, created_at: nowIso, updated_at: nowIso });
    }

    return new Response(JSON.stringify({ ok: true, user_id: targetUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});