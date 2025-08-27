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

// Prioritize @*.monde.com.br emails when monde_token is present
const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
if (mondeToken && email && !mondeEmailRegex.test(email)) {
  // If we have a monde_token but email is not @*.monde.com.br, 
  // try to get the Monde email from the token or reject non-Monde emails
  const payload = decodeJwtPayload(mondeToken) as any;
  const mondeEmail = payload?.email;
  if (mondeEmail && mondeEmailRegex.test(mondeEmail)) {
    email = String(mondeEmail);
  } else {
    return new Response(JSON.stringify({ 
      error: "E-mail deve ser @*.monde.com.br quando usando token Monde",
      invalid_email: email 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

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
    
    // Check for duplicate users with non-Monde emails when we have a Monde email
    if (mondeToken && mondeEmailRegex.test(email)) {
      // Try to find and consolidate any existing non-Monde email records
      const emailPrefix = email.split('@')[0];
      const { data: duplicates } = await admin
        .from("subscribers")
        .select("id, email, user_id, subscribed, trial_start, trial_end")
        .like("email", `${emailPrefix}@%`)
        .neq("email", email);
      
      if (duplicates && duplicates.length > 0) {
        console.log(`Found ${duplicates.length} potential duplicate(s) for ${email}`);
        // Update or merge data from the most recent duplicate
        const mostRecent = duplicates[0];
        if (mostRecent.subscribed || mostRecent.trial_start) {
          console.log(`Consolidating data from ${mostRecent.email} to ${email}`);
          // Keep the better subscription status
          if (!existing && (mostRecent.subscribed || mostRecent.trial_start)) {
            // Transfer subscription data to the Monde email
            trial_start = mostRecent.trial_start;
            trial_end = mostRecent.trial_end;
            subscribed = mostRecent.subscribed;
          }
        }
        // Remove duplicates
        for (const dup of duplicates) {
          await admin.from("subscribers").delete().eq("id", dup.id);
          console.log(`Removed duplicate subscriber: ${dup.email}`);
        }
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