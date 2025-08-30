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

// Determine Monde alias and username - prioritize real emails
const mondeEmailRegex = /^[^@]+@([a-z0-9-]+\.)*monde\.com\.br$/i;
let realEmail: string | null = null;

if (mondeToken) {
  const payload = decodeJwtPayload(mondeToken) as any;
  const possibleMonde = payload?.email;
  if (possibleMonde && mondeEmailRegex.test(String(possibleMonde))) {
    mondeAliasEmail = String(possibleMonde);
    username = mondeAliasEmail.split('@')[0];
  }
}

// If current email itself is a Monde email, extract username
if (email && mondeEmailRegex.test(email)) {
  if (!username) username = email.split('@')[0];
  
  // Try to find real email for this username
  if (username) {
    try {
      const { data: realEmailRecord } = await admin
        .from('subscribers')
        .select('email')
        .eq('username', username)
        .not('email', 'like', '%monde.com.br%')
        .maybeSingle();
        
      if (realEmailRecord) {
        realEmail = realEmailRecord.email;
        console.log(`Found real email for Monde user ${username}: ${realEmail}`);
      }
    } catch (error) {
      console.warn('Error looking for real email:', error);
    }
  }
} else if (email && !mondeEmailRegex.test(email)) {
  // This is already a real email
  realEmail = email;
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
    
// Use real email if found, otherwise use provided email
const finalEmail = realEmail || email;

// Consolidate duplicates: prefer real email, use Monde email as alias/username
const potentialEmails = [finalEmail];
if (mondeAliasEmail && mondeAliasEmail !== finalEmail) {
  potentialEmails.push(mondeAliasEmail);
}
if (email !== finalEmail) {
  potentialEmails.push(email);
}

// Find all potential duplicate records
const { data: allRecords } = await admin
  .from("subscribers")
  .select("*")
  .in("email", potentialEmails);

if (allRecords && allRecords.length > 1) {
  console.log(`Found ${allRecords.length} potential duplicates, consolidating...`);
  
  // Separate real email records from Monde email records
  const realRecords = allRecords.filter(r => !mondeEmailRegex.test(r.email));
  const mondeRecords = allRecords.filter(r => mondeEmailRegex.test(r.email));
  
  let primaryRecord = realRecords.length > 0 ? realRecords[0] : mondeRecords[0];
  const duplicateRecords = allRecords.filter(r => r.id !== primaryRecord.id);
  
  // If primary is a Monde email but we have a real email, switch to real email
  if (mondeEmailRegex.test(primaryRecord.email) && realRecords.length > 0) {
    primaryRecord = realRecords[0];
  }
  
  // Merge data from duplicates into primary record
  const update: any = {};
  
  for (const duplicate of duplicateRecords) {
    if (!primaryRecord.username && mondeEmailRegex.test(duplicate.email)) {
      update.username = duplicate.email.split('@')[0];
    }
    if (!primaryRecord.stripe_customer_id && duplicate.stripe_customer_id) {
      update.stripe_customer_id = duplicate.stripe_customer_id;
    }
    if (!primaryRecord.subscribed && duplicate.subscribed) {
      update.subscribed = true;
    }
    if (!primaryRecord.subscription_tier && duplicate.subscription_tier) {
      update.subscription_tier = duplicate.subscription_tier;
    }
    if (!primaryRecord.trial_start && duplicate.trial_start) {
      update.trial_start = duplicate.trial_start;
    }
    if (!primaryRecord.trial_end && duplicate.trial_end) {
      update.trial_end = duplicate.trial_end;
    }
    if (!primaryRecord.display_name && duplicate.display_name) {
      update.display_name = duplicate.display_name;
    }
    
    // Use latest subscription end date
    const primaryEnd = primaryRecord.subscription_end ? new Date(primaryRecord.subscription_end).getTime() : 0;
    const duplicateEnd = duplicate.subscription_end ? new Date(duplicate.subscription_end).getTime() : 0;
    if (duplicateEnd > primaryEnd) {
      update.subscription_end = duplicate.subscription_end;
    }
  }
  
  // Ensure we're using the real email as primary
  if (finalEmail !== primaryRecord.email) {
    update.email = finalEmail;
    if (mondeEmailRegex.test(primaryRecord.email)) {
      update.username = primaryRecord.email.split('@')[0];
    }
  }
  
  // Update primary record with consolidated data
  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    await admin.from("subscribers").update(update).eq("id", primaryRecord.id);
    console.log(`Updated primary record with consolidated data:`, update);
  }
  
  // Delete duplicate records
  for (const duplicate of duplicateRecords) {
    await admin.from("subscribers").delete().eq("id", duplicate.id);
    console.log(`Deleted duplicate record: ${duplicate.email}`);
  }
  
  existing = { ...primaryRecord, ...update };
} else if (allRecords && allRecords.length === 1) {
  existing = allRecords[0];
  
  // If existing record has wrong email (Monde when we have real), update it
  if (finalEmail !== existing.email) {
    const update: any = {
      email: finalEmail,
      updated_at: new Date().toISOString()
    };
    
    if (mondeEmailRegex.test(existing.email)) {
      update.username = existing.email.split('@')[0];
    }
    
    await admin.from("subscribers").update(update).eq("id", existing.id);
    existing = { ...existing, ...update };
    console.log(`Updated existing record email from ${allRecords[0].email} to ${finalEmail}`);
  }
}

    let subId: string | null = existing?.id ?? null;
    let trial_start = existing?.trial_start ?? null as string | null;
    let trial_end = existing?.trial_end ?? null as string | null;
    let subscribed = existing?.subscribed ?? false;

    if (existing?.id) {
      const update: any = {
        email: finalEmail,
        user_email: supabaseUser?.email || email, // Store the login email separately
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
        email: finalEmail,
        user_email: supabaseUser?.email || email, // Store the login email separately
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

    return new Response(JSON.stringify({ ok: true, id: subId, email: finalEmail, trial_start, trial_end, subscribed }), {
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