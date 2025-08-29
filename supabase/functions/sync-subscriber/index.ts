import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to decode a JWT without verifying signature (for Monde token payload)
function decodeJwtPayload(token: string): { email?: string; name?: string; uid?: string } | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    if (!supabaseUrl || !anonKey) throw new Error("Supabase environment not configured");

    // Public client (for auth decoding if needed) and service client (bypass RLS)
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const admin = createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const { mondeToken, email: emailRaw, name: nameRaw, userId: userIdRaw, source = "monde" } = body as {
      mondeToken?: string;
      email?: string;
      name?: string;
      userId?: string;
      source?: string;
    };

let email = (emailRaw || "").trim();
let display_name = (nameRaw || "").trim();
let user_id = (userIdRaw || "").trim() || null;
let username: string | null = null;
let mondeAliasEmail: string | null = null;

if (!email && mondeToken) {
  const payload = decodeJwtPayload(mondeToken) as any;
  const uid: string | undefined = payload?.uid;
  if (payload?.email) email = String(payload.email);
  if (payload?.name) display_name = String(payload.name);
  
  // Fallback: fetch email from Monde People using uid
  if (!email && uid) {
    try {
      const res = await fetch(`https://web.monde.com.br/api/v2/people/${uid}`, {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${mondeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const attrEmail = data?.data?.attributes?.email;
        const attrName = data?.data?.attributes?.name;
        if (attrEmail) email = String(attrEmail);
        if (!display_name && attrName) display_name = String(attrName);
      }
    } catch (_) {
      // ignore network errors
    }
  }
}

// Get authenticated user info from Supabase
const authHeader = req.headers.get("Authorization");
let supabaseUser = null;
if (authHeader) {
  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    supabaseUser = userData.user;
    console.log("Authenticated Supabase user:", supabaseUser?.email);
  } catch (error) {
    console.warn("Could not authenticate Supabase user:", error);
  }
}

// Prioritize authenticated Supabase user data
if (supabaseUser?.email) {
  email = supabaseUser.email;
  user_id = supabaseUser.id;
  if (!display_name && supabaseUser.user_metadata?.full_name) {
    display_name = supabaseUser.user_metadata.full_name;
  }
  console.log(`Using authenticated Supabase user: ${email}`);
}

// Determine Monde alias and username (do NOT switch primary email)
const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
if (mondeToken) {
  const payload = decodeJwtPayload(mondeToken) as any;
  const possibleMonde = payload?.email;
  if (possibleMonde && mondeEmailRegex.test(String(possibleMonde))) {
    mondeAliasEmail = String(possibleMonde);
    username = mondeAliasEmail.split('@')[0];
  }
}
// If current email itself is a Monde email and username not set, derive username from it
if (!username && email && mondeEmailRegex.test(email)) {
  username = email.split('@')[0];
}

// Allow upsert for non-Monde emails even without Supabase auth when mondeToken is present
// (Business rule: We want first-time Monde users to appear in Admin and start trial)


if (!email) {
  return new Response(JSON.stringify({ error: "Missing email (or mondeToken with email)" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 400,
  });
}

const { data: settings } = await admin
  .from("settings")
  .select("trial_days")
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
const trialDays = Math.max(0, Number(settings?.trial_days ?? 7));

    const now = new Date();

    // Tenta encontrar um assinante existente pelo user_id ou email
    let existing;
    if (user_id) {
        const { data } = await admin.from("subscribers").select("*").eq("user_id", user_id).maybeSingle();
        existing = data;
    }
    
    if (!existing && email) {
        const { data } = await admin.from("subscribers").select("*").eq("email", email).maybeSingle();
        existing = data;
    }

    // Se encontrar pelo email mas o user_id for nulo, atualiza o user_id
    if (existing && !existing.user_id && user_id) {
        await admin.from("subscribers").update({ user_id }).eq('id', existing.id);
        existing.user_id = user_id;
    }
    
// Consolidate duplicates: prefer real email, use Monde email as alias/username
if (mondeAliasEmail && email && mondeAliasEmail.toLowerCase() !== email.toLowerCase()) {
  const { data: aliasRow } = await admin
    .from("subscribers")
    .select("*")
    .eq("email", mondeAliasEmail)
    .maybeSingle();

  const { data: realRow } = await admin
    .from("subscribers")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (aliasRow && realRow) {
    console.log(`Merging alias ${aliasRow.email} into real ${email}`);
    const update: any = {};
    if (!realRow.username) update.username = aliasRow.email.split('@')[0];
    if (!realRow.stripe_customer_id && aliasRow.stripe_customer_id) update.stripe_customer_id = aliasRow.stripe_customer_id;
    if (!realRow.subscribed && aliasRow.subscribed) update.subscribed = true;
    const endReal = realRow.subscription_end ? new Date(realRow.subscription_end).getTime() : 0;
    const endAlias = aliasRow.subscription_end ? new Date(aliasRow.subscription_end).getTime() : 0;
    if (endAlias > endReal) {
      update.subscription_end = aliasRow.subscription_end;
      if (aliasRow.subscription_tier) update.subscription_tier = aliasRow.subscription_tier;
    }
    if (!realRow.trial_start && aliasRow.trial_start) update.trial_start = aliasRow.trial_start;
    if (!realRow.trial_end && aliasRow.trial_end) update.trial_end = aliasRow.trial_end;
    if (!realRow.display_name && aliasRow.display_name) update.display_name = aliasRow.display_name;

    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString();
      await admin.from("subscribers").update(update).eq("id", realRow.id);
    }
    await admin.from("subscribers").delete().eq("id", aliasRow.id);
    existing = realRow;
  } else if (aliasRow && !realRow) {
    console.log(`Renaming alias ${aliasRow.email} to real email ${email}`);
    const update: any = {
      email,
      username: aliasRow.email.split('@')[0],
      updated_at: new Date().toISOString(),
    };
    await admin.from("subscribers").update(update).eq("id", aliasRow.id);
    existing = { ...aliasRow, ...update } as any;
  }
}

    let subId: string | null = existing?.id ?? null;
    let trial_start = existing?.trial_start ?? null as string | null;
    let trial_end = existing?.trial_end ?? null as string | null;
    let subscribed = existing?.subscribed ?? false;

    if (existing?.id) {
      const update: any = {
        email,
        last_login_at: now.toISOString(),
        display_name: display_name || existing.display_name || null,
        username: username || (existing as any).username || null,
        source,
      };
      // If there is no trial yet, start now
      if (!existing.trial_start || !existing.trial_end) {
        trial_start = now.toISOString();
        trial_end = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        update.trial_start = trial_start;
        update.trial_end = trial_end;
      }
      if (!existing.user_id && user_id) update.user_id = user_id;

      await admin.from("subscribers").update(update).eq("id", existing.id);
    } else {
      trial_start = now.toISOString();
      trial_end = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: inserted } = await admin.from("subscribers").insert({
        email,
        user_id,
        display_name: display_name || null,
        username: username || null,
        last_login_at: now.toISOString(),
        trial_start,
        trial_end,
        subscribed: false,
        source,
      }).select('id').single();
      subId = inserted?.id ?? null;
      subscribed = false;
    }

    return new Response(JSON.stringify({ ok: true, id: subId, email, trial_start, trial_end, subscribed }), {
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